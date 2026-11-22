import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  initDevicePushRegistration,
  markNotificationShownLocally,
  showNativeDeviceNotification,
  triggerPushEdgeFunction,
} from '../../lib/pushNotifications';

/**
 * GlobalNotificationBridge
 * Mounted once at the root of the app (inside AuthProvider + Router).
 * - Registers FCM / Native OS notifications for all 4 roles (Doctors/Staff, Labs, Suppliers, Patients)
 * - Listens to Supabase Realtime INSERTs on `public.notifications` for the active user
 * - Pops native OS notification + clickable toast with instant navigation
 * - Periodically triggers scheduled campaigns & 1-day-before appointment reminders
 */
export const GlobalNotificationBridge: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    let cancelled = false;
    let cleanupPush: (() => void) | null = null;

    const safeNavigate = (link?: string | null) => {
      if (!link) return;
      if (link.startsWith('http://') || link.startsWith('https://')) {
        window.open(link, '_blank', 'noopener,noreferrer');
      } else {
        navigateRef.current(link);
      }
    };

    // 1. Register Capacitor FCM token / browser notification permission
    initDevicePushRegistration(user.id, safeNavigate).then((cleanup) => {
      if (cancelled) {
        cleanup();
      } else {
        cleanupPush = cleanup;
      }
    });

    // 2. Global Realtime subscription for incoming notifications for this user
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
          const record = payload.new;

          // Broadcast to all hooks (DoctorNotifications, GlobalHeader, Community)
          window.dispatchEvent(new CustomEvent('dental-notification-received', { detail: record }));

          // Deduplicate visual toast + OS notification across hooks
          if (!markNotificationShownLocally(record.id)) return;

          const title = record.title || 'إشعار جديد';
          const description = record.message || '';
          const link = record.link || null;

          // Show OS-level notification (Windows Action Center / Android / Web PWA)
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
        }
      )
      .subscribe();

    // 3. Process due scheduled campaigns & 1-day-before appointment reminders
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
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      if (cleanupPush) cleanupPush();
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user?.id]);

  return null;
};
