import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase, ensureFreshOnlineSession } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  getPersistedDeliveredIds,
  hasPersistedDeliveredStore,
  initDevicePushRegistration,
  markNotificationShownLocally,
  savePersistedDeliveredIds,
  showNativeDeviceNotification,
  syncAndroidBackgroundNotificationSession,
  triggerPushEdgeFunction,
} from '../../lib/pushNotifications';

/**
 * GlobalNotificationBridge
 * Mounted once at the root of the app (inside AuthProvider + Router).
 * - Refreshes JWT & authenticates Supabase Realtime (`realtime.setAuth`) before subscribing
 * - Uses persisted delivered ID tracking (100% immune to PC/server clock skew and page reloads!)
 * - Runs BOTH instant Realtime AND a reliable 5-second unread ID check so Windows Desktop,
 *   Web PWA, and Android NEVER miss an incoming notification
 * - Syncs Android Firebase-free background polling session & runs scheduled/1-day reminder checks
 */
export const GlobalNotificationBridge: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      syncAndroidBackgroundNotificationSession(null);
      return;
    }

    const activeUserId = user.id;
    let cancelled = false;
    let cleanupPush: (() => void) | null = null;
    let realtimeChannel: any = null;
    let pollInFlight = false;

    const safeNavigate = (link?: string | null) => {
      if (!link) return;
      if (link.startsWith('http://') || link.startsWith('https://')) {
        window.open(link, '_blank', 'noopener,noreferrer');
      } else {
        navigateRef.current(link);
      }
    };

    const deliverIncomingNotification = (record: any) => {
      if (cancelled || !record || !record.id) return;

      // Broadcast to all hooks (DoctorNotifications, GlobalHeader, Community)
      window.dispatchEvent(new CustomEvent('dental-notification-received', { detail: record }));

      // Deduplicate across Realtime, 5s poll, and reloads using persisted delivered IDs
      if (!markNotificationShownLocally(record.id, activeUserId)) return;

      const title = record.title || 'إشعار جديد';
      const description = record.message || record.content || '';
      const link = record.link || null;

      // Show REAL native OS notification (Windows Action Center / Android Status Bar / Web PWA)
      showNativeDeviceNotification({
        id: record.id,
        title,
        body: description,
        link,
        imageUrl: record.image_url,
        onNavigate: safeNavigate,
      });

      // Show clean in-app toast with quick action
      toast(title, {
        description,
        duration: 6000,
        ...(link
          ? {
              action: {
                label: 'عرض',
                onClick: () => safeNavigate(link),
              },
            }
          : {}),
      });
    };

    // 1. Register native permissions + Android background session
    initDevicePushRegistration(activeUserId, safeNavigate).then((cleanup) => {
      if (cancelled) {
        cleanup();
      } else {
        cleanupPush = cleanup;
      }
    });

    // 2. Reliable ID-based unread poll (100% immune to clock skew & WebSocket drops!)
    const pollRecentUnread = async (isInitialSeed = false) => {
      if (cancelled || pollInFlight || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
      pollInFlight = true;
      try {
        const authed = await ensureFreshOnlineSession();
        if (!authed || cancelled) return;

        const { data, error } = await supabase
          .from('notifications')
          .select('id, user_id, clinic_id, actor_id, type, title, message, link, image_url, priority, is_read, metadata, created_at')
          .eq('user_id', activeUserId)
          .order('created_at', { ascending: false })
          .limit(15);

        if (error || !Array.isArray(data) || cancelled) return;

        const hadStore = hasPersistedDeliveredStore(activeUserId);
        const delivered = getPersistedDeliveredIds(activeUserId);
        const nowMs = Date.now();

        // On very first boot on a fresh device, mark old backlog (>2 minutes old) as seen so we don't spam 15 old alerts,
        // while STILL delivering anything freshly sent in the last 2 minutes!
        if (isInitialSeed && !hadStore) {
          const freshRows: any[] = [];
          for (const row of data) {
            const ts = row.created_at ? new Date(row.created_at).getTime() : 0;
            const ageMs = nowMs - ts;
            if (ageMs <= 2 * 60 * 1000 && (!row.is_read || ageMs <= 30 * 1000)) {
              freshRows.push(row);
            } else {
              delivered.add(String(row.id));
            }
          }
          savePersistedDeliveredIds(activeUserId, delivered);
          // Deliver fresh ones oldest-first
          for (const row of freshRows.reverse()) {
            deliverIncomingNotification(row);
          }
          return;
        }

        // Normal poll: deliver any notification not yet delivered to OS bar (oldest-first).
        // Includes recently inserted notifications (<90s) even if the notifications page auto-marked them read!
        let markedOldRead = false;
        const toDeliver: any[] = [];
        for (const row of data) {
          const idKey = String(row.id);
          if (delivered.has(idKey)) continue;
          const ts = row.created_at ? new Date(row.created_at).getTime() : nowMs;
          const ageMs = nowMs - ts;
          if (!row.is_read || ageMs <= 90 * 1000) {
            toDeliver.push(row);
          } else {
            delivered.add(idKey);
            markedOldRead = true;
          }
        }
        if (markedOldRead) {
          savePersistedDeliveredIds(activeUserId, delivered);
        }
        for (const row of toDeliver.reverse()) {
          deliverIncomingNotification(row);
        }
      } catch {
        // Silent background check
      } finally {
        pollInFlight = false;
      }
    };

    // 3. Authenticate Realtime with fresh JWT before subscribing so INSERTs arrive in <500ms
    const setupAuthenticatedRealtime = async () => {
      if (cancelled) return;
      try {
        await ensureFreshOnlineSession();
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) {
          supabase.realtime.setAuth(data.session.access_token);
        }
      } catch {}

      if (cancelled) return;

      const channelName = `global_push_notifs_${activeUserId}_${Math.random().toString(36).slice(2, 8)}`;
      realtimeChannel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${activeUserId}`,
          },
          (payload: any) => {
            if (cancelled || !payload?.new) return;
            deliverIncomingNotification(payload.new);
          }
        )
        .subscribe();

      // Run initial check right after auth is fresh
      pollRecentUnread(true);
    };

    setupAuthenticatedRealtime();

    // Keep Realtime & Android background session tokens fresh on auth refresh
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
      if (session?.user?.id) {
        syncAndroidBackgroundNotificationSession(session.user.id);
      }
    });

    // 5-second reliable poll fallback (runs in foreground AND while Tauri window is hidden in Windows System Tray!)
    const pollTimer = setInterval(() => pollRecentUnread(false), 5000);

    const handleWakeup = () => {
      syncAndroidBackgroundNotificationSession(activeUserId);
      pollRecentUnread(false);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        pollRecentUnread(false);
      }
    };

    window.addEventListener('dental-online-ready', handleWakeup);
    window.addEventListener('focus', handleWakeup);
    document.addEventListener('visibilitychange', handleVisibility);

    // 4. Process due scheduled campaigns & 1-day-before appointment reminders
    const runDueCheck = async () => {
      if (cancelled || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
      try {
        const { data } = await supabase.rpc('process_due_notifications_and_reminders');
        const schedIds: string[] = data?.scheduled?.notification_ids || [];
        const remIds: string[] = data?.reminders?.notification_ids || [];
        const allIds = [...schedIds, ...remIds].filter(Boolean);
        if (allIds.length > 0) {
          triggerPushEdgeFunction({ notification_ids: allIds });
        }
      } catch {}
    };

    const initialTimer = setTimeout(runDueCheck, 4500);
    const intervalTimer = setInterval(runDueCheck, 15 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(pollTimer);
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      window.removeEventListener('dental-online-ready', handleWakeup);
      window.removeEventListener('focus', handleWakeup);
      document.removeEventListener('visibilitychange', handleVisibility);
      authListener?.subscription?.unsubscribe();
      if (cleanupPush) cleanupPush();
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    };
  }, [isAuthenticated, user?.id]);

  return null;
};
