/**
 * Dental Platform — Native & Web Push Notifications Bridge
 * Supports:
 * 1. Capacitor PushNotifications (Android / iOS FCM tokens saved in `user_push_tokens`)
 * 2. Windows Desktop (Tauri WebView2) & Web/PWA Native OS Notification API
 * 3. Direct non-blocking invocation of Supabase Edge Function `send-push-notification`
 */
import { supabase } from './supabase';
import { isDesktopApp } from './platform';

const shownNotificationIds = new Set<string>();
const MAX_SHOWN_CACHE = 200;

export function markNotificationShownLocally(id?: string | null): boolean {
  if (!id) return true;
  if (shownNotificationIds.has(id)) return false;
  shownNotificationIds.add(id);
  if (shownNotificationIds.size > MAX_SHOWN_CACHE) {
    const first = shownNotificationIds.values().next().value;
    if (first) shownNotificationIds.delete(first);
  }
  return true;
}

export function detectPushPlatform(): 'android' | 'ios' | 'desktop' | 'web' {
  if (typeof window === 'undefined') return 'web';
  const cap = (window as any).Capacitor;
  if (cap?.isNativePlatform?.()) {
    const p = String(cap.getPlatform?.() || '').toLowerCase();
    if (p === 'ios') return 'ios';
    if (p === 'android') return 'android';
  }
  if (isDesktopApp()) return 'desktop';
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  return 'web';
}

export async function savePushTokenToSupabase(userId: string, token: string): Promise<void> {
  if (!userId || !token) return;
  try {
    const platform = detectPushPlatform();
    const appTarget = import.meta.env.VITE_BUILD_TARGET || 'web';
    const deviceName =
      typeof navigator !== 'undefined'
        ? navigator.userAgent.slice(0, 120)
        : platform;

    await supabase.from('user_push_tokens').upsert(
      {
        user_id: userId,
        token,
        platform,
        app_target: appTarget,
        device_name: deviceName,
        is_active: true,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' }
    );
  } catch (err) {
    console.warn('[Push] Failed to save device push token:', err);
  }
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return 'default';
  }
}

export async function initDevicePushRegistration(
  userId: string,
  onNavigate?: (link: string) => void
): Promise<() => void> {
  const cleanups: Array<() => void> = [];

  if (!userId || typeof window === 'undefined') {
    return () => {};
  }

  // 1. Capacitor Native Push Notifications (Android / iOS FCM)
  const cap = (window as any).Capacitor;
  const pushPlugin = cap?.Plugins?.PushNotifications;

  if (cap?.isNativePlatform?.() && pushPlugin) {
    try {
      let permStatus = await pushPlugin.checkPermissions();
      if (permStatus?.receive === 'prompt') {
        permStatus = await pushPlugin.requestPermissions();
      }
      if (permStatus?.receive === 'granted') {
        const regHandle = await pushPlugin.addListener('registration', (tokenObj: { value?: string }) => {
          if (tokenObj?.value) {
            savePushTokenToSupabase(userId, tokenObj.value);
          }
        });
        const actionHandle = await pushPlugin.addListener('pushNotificationActionPerformed', (action: any) => {
          const link = action?.notification?.data?.link;
          if (link && onNavigate) {
            onNavigate(link);
          }
        });
        if (regHandle?.remove) cleanups.push(() => regHandle.remove());
        if (actionHandle?.remove) cleanups.push(() => actionHandle.remove());

        await pushPlugin.register();
      }
    } catch (err) {
      console.warn('[Push] Capacitor PushNotifications init skipped:', err);
    }
  } else {
    // 2. Web / PWA / Windows Tauri Desktop: request OS Notification permission quietly
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        // Request permission on first interaction or quietly
        const askOnce = () => {
          requestBrowserNotificationPermission().catch(() => {});
          window.removeEventListener('pointerdown', askOnce);
        };
        window.addEventListener('pointerdown', askOnce, { once: true });
        cleanups.push(() => window.removeEventListener('pointerdown', askOnce));
      }
    } catch {}
  }

  return () => {
    for (const fn of cleanups) {
      try {
        fn();
      } catch {}
    }
  };
}

/**
 * Displays a native OS notification banner (Windows Action Center / Android / Web PWA)
 */
export async function showNativeDeviceNotification(params: {
  id?: string;
  title: string;
  body: string;
  link?: string | null;
  imageUrl?: string | null;
  onNavigate?: (link: string) => void;
}): Promise<void> {
  if (typeof window === 'undefined') return;

  // 1. Android WebView native bridge (if exposed in MainActivity)
  const androidBridge = (window as any).AndroidNative;
  if (androidBridge && typeof androidBridge.showNotification === 'function') {
    try {
      androidBridge.showNotification(params.title, params.body, params.link || '');
      return;
    } catch {}
  }

  // 2. Browser / PWA / Windows WebView2 Notification API
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const icon = '/icons/icon-192x192.png';
    const options: NotificationOptions = {
      body: params.body,
      icon,
      badge: '/icons/icon-96x96.png',
      dir: 'rtl',
      lang: 'ar',
      tag: params.id || `dental_${Date.now()}`,
      data: { link: params.link || '/doctor/notifications' },
    };

    // Prefer Service Worker notification on PWA/mobile browsers if active
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(params.title, options);
        return;
      }
    }

    const nativeNotif = new Notification(params.title, options);
    nativeNotif.onclick = () => {
      try {
        window.focus();
        if (params.link && params.onNavigate) {
          params.onNavigate(params.link);
        }
        nativeNotif.close();
      } catch {}
    };
  } catch (err) {
    console.warn('[Push] Native Notification display skipped:', err);
  }
}

/**
 * Non-blocking invocation of Supabase Edge Function `send-push-notification`
 * Works alongside DB Webhooks so FCM pushes dispatch immediately whenever available.
 */
export async function triggerPushEdgeFunction(payload: {
  notification_ids?: string[];
  user_ids?: string[];
  title?: string;
  body?: string;
  link?: string | null;
  image_url?: string | null;
  action?: 'process_scheduled';
}): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  try {
    await supabase.functions.invoke('send-push-notification', {
      body: payload,
    });
  } catch {
    // Graceful fallback: DB record + Supabase Realtime already delivered to active devices
  }
}
