import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  initDevicePushRegistration,
  markNotificationShownLocally,
  showNativeDeviceNotification,
  syncAndroidBackgroundNotificationSession,
  triggerPushEdgeFunction,
} from '../../lib/pushNotifications';

/**
 * GlobalNotificationBridge
 * Mounted once at the root of the app (inside AuthProvider + Router).
 * - Syncs Android Firebase-free background polling session so notifications arrive even when closed/locked
 * - Uses Tauri v2 native notification plugin on Windows Desktop so banners appear in Windows Action Center
 * - Subscribes to Supabase Realtime + 12-second lightweight poll fallback so ZERO notifications are ever missed
 * - Periodically triggers scheduled campaigns & 1-day-before appointment reminders
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

    let cancelled = false;
    let cleanupPush: (() => void) | null = null;
    let lastCheckedIso = new Date().toISOString();

    const safeNavigate = (link?: string | null) => {
      if (!link) return;
      if (link.startsWith('http://') || link.startsWith('https://')) {
        window.open(link, '_blank', 'noopener,noreferrer');
      } else {
        navigateRef.current(link);
      }
    };

    const deliverIncomingNotification = (record: any) => {
      if (cancelled || !record) return;

      if (record.created_at && record.created_at > lastCheckedIso) {
        lastCheckedIso = record.created_at;
      }

      // Broadcast to all hooks (DoctorNotifications, GlobalHeader, Community)
      window.dispatchEvent(new CustomEvent('dental-notification-received', { detail: record }));

      // Deduplicate visual toast + OS notification bar across Realtime & Poll fallback
      if (!markNotificationShownLocally(record.id)) return;

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
    initDevicePushRegistration(user.id, safeNavigate).then((cleanup) => {
      if (cancelled) {
        cleanup();
      } else {
        cleanupPush = cleanup;
      }
    });

    // Keep Android background session token refreshed on auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled && session?.user?.id) {
        syncAndroidBackgroundNotificationSession(session.user.id);
      }
    });

    // 2. Global Realtime subscription for instant (<1s) notification delivery
    const channelName = `global_push_notifs_${user.id}_${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (cancelled || !payload?.new) return;
          deliverIncomingNotification(payload.new);
        }
      )
      .subscribe();

    // 3. Lightweight 12-second poll fallback (catches any notification if WebSocket dropped on Desktop/Mobile)
    const pollUnreadFallback = async () => {
      if (cancelled || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('id, user_id, clinic_id, actor_id, type, title, message, link, image_url, priority, is_read, metadata, created_at')
          .eq('user_id', user.id)
          .eq('is_read', false)
          .gt('created_at', lastCheckedIso)
          .order('created_at', { ascending: true })
          .limit(10);

        if (!error && Array.isArray(data) && data.length > 0) {
          for (const row of data) {
            deliverIncomingNotification(row);
          }
        }
      } catch {
        // Silent background check
      }
    };

    const pollTimer = setInterval(pollUnreadFallback, 12000);

    // Also poll immediately when window returns online or regains focus
    const handleWakeup = () => {
      syncAndroidBackgroundNotificationSession(user.id);
      pollUnreadFallback();
    };
    window.addEventListener('dental-online-ready', handleWakeup);
    window.addEventListener('focus', handleWakeup);

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
      } catch {
        // Non-blocking background maintenance
      }
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
      authListener?.subscription?.unsubscribe();
      if (cleanupPush) cleanupPush();
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user?.id]);

  return null;
};
