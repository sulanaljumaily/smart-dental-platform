/**
 * Dental Platform — Native & Web Push Notifications Bridge (100% Firebase-Free Capable)
 * Supports:
 * 1. Android APK: Native `AndroidNative.showNotification` + Firebase-free `NotificationPollReceiver` background AlarmManager
 * 2. Windows Desktop (Tauri v2): WebView2 native `window.Notification` (trusted Edge AUMID) + Rust WinRT Toast command fallback
 * 3. Web / PWA: Browser Notification API + ServiceWorker `showNotification` with automatic fallback
 * 4. Optional Capacitor PushNotifications FCM (if Firebase is added later)
 */
import { supabase } from './supabase';
import { isDesktopApp } from './platform';

const shownNotificationIds = new Set<string>();
const MAX_SHOWN_CACHE = 300;
const DELIVERED_STORAGE_PREFIX = 'dental_os_delivered_notifs_v1_';

const SUPABASE_URL_FALLBACK = 'https://nhueyaeyutfmadbgghfe.supabase.co';
const SUPABASE_ANON_FALLBACK =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odWV5YWV5dXRmbWFkYmdnaGZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MzcwNTYsImV4cCI6MjA4NDQxMzA1Nn0.56MIbpOtVu9b_fwEyo-hvlxGxA_E5c-nU7q1MSfTg-g';

export function getPersistedDeliveredIds(userId: string): Set<string> {
  if (!userId || typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELIVERED_STORAGE_PREFIX + userId);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

export function hasPersistedDeliveredStore(userId: string): boolean {
  if (!userId || typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(DELIVERED_STORAGE_PREFIX + userId) !== null;
  } catch {
    return false;
  }
}

export function savePersistedDeliveredIds(userId: string, ids: Set<string>): void {
  if (!userId || typeof localStorage === 'undefined') return;
  try {
    const trimmed = Array.from(ids).slice(-200);
    localStorage.setItem(DELIVERED_STORAGE_PREFIX + userId, JSON.stringify(trimmed));
  } catch {}
}

export function markNotificationShownLocally(id?: string | null, userId?: string | null): boolean {
  if (!id) return true;
  const key = String(id);
  if (shownNotificationIds.has(key)) return false;

  if (userId) {
    const persisted = getPersistedDeliveredIds(userId);
    if (persisted.has(key)) {
      shownNotificationIds.add(key);
      return false;
    }
    persisted.add(key);
    savePersistedDeliveredIds(userId, persisted);
  }

  shownNotificationIds.add(key);
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

/**
 * Syncs Supabase auth session to Android's native SharedPreferences so the
 * Firebase-free NotificationPollReceiver can poll & display Android status bar
 * notifications even when the app is completely closed and the phone is locked!
 */
export async function syncAndroidBackgroundNotificationSession(userId?: string | null): Promise<void> {
  if (typeof window === 'undefined') return;
  const androidBridge = (window as any).AndroidNative;
  if (!androidBridge) return;

  if (!userId) {
    try {
      if (typeof androidBridge.clearNotificationSession === 'function') {
        androidBridge.clearNotificationSession();
      }
    } catch {}
    return;
  }

  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (!session?.access_token) return;

    const url = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL_FALLBACK;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_FALLBACK;

    if (typeof androidBridge.saveNotificationSession === 'function') {
      androidBridge.saveNotificationSession(
        url,
        anonKey,
        session.access_token,
        session.refresh_token || '',
        userId
      );
    }
  } catch (err) {
    console.warn('[Push] Android background session sync skipped:', err);
  }
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

export async function requestDeviceNotificationPermission(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (typeof window === 'undefined') return 'unsupported';

  // 1. Android APK Native Bridge
  const androidBridge = (window as any).AndroidNative;
  if (androidBridge && typeof androidBridge.requestNotificationPermission === 'function') {
    try {
      androidBridge.requestNotificationPermission();
      return 'granted';
    } catch {}
  }

  // 2. Windows Desktop (Tauri WebView2 + Rust fallback)
  if (isDesktopApp()) {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission().catch(() => {});
      }
    } catch {}
    return 'granted';
  }

  // 3. Standard Web / PWA Notification API (MUST be called inside a click gesture on Chrome/Edge)
  if (!('Notification' in window)) return 'unsupported';
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

  // Register global tap handler for Android status-bar notifications
  if (onNavigate) {
    (window as any).__handleNativeNotifLink = (link: string) => {
      if (link) onNavigate(link);
    };
    cleanups.push(() => {
      delete (window as any).__handleNativeNotifLink;
    });
  }

  // 1. Android APK: sync session for Firebase-free background polling + request Android 13+ permission
  const androidBridge = (window as any).AndroidNative;
  if (androidBridge) {
    try {
      if (typeof androidBridge.requestNotificationPermission === 'function') {
        androidBridge.requestNotificationPermission();
      }
      await syncAndroidBackgroundNotificationSession(userId);
    } catch {}
  }

  // 2. Windows Desktop (Tauri v2): request WebView2 notification permission immediately + on first click
  if (isDesktopApp()) {
    requestDeviceNotificationPermission().catch(() => {});
    if ('Notification' in window && Notification.permission === 'default') {
      const askDesktop = () => {
        Notification.requestPermission().catch(() => {});
        window.removeEventListener('click', askDesktop);
      };
      window.addEventListener('click', askDesktop, { once: true });
      cleanups.push(() => window.removeEventListener('click', askDesktop));
    }
  }

  // 3. Optional Capacitor PushNotifications FCM (if configured with Firebase later)
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
  } else if (!isDesktopApp() && !androidBridge) {
    // 4. Web Browser / PWA: MUST use `click` (not `pointerdown`) for valid browser user activation!
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        const askOnClick = () => {
          Notification.requestPermission().catch(() => {});
          window.removeEventListener('click', askOnClick);
        };
        window.addEventListener('click', askOnClick, { once: true });
        cleanups.push(() => window.removeEventListener('click', askOnClick));
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
 * Displays a REAL native OS notification banner in:
 * - Android System Status Bar & Lock Screen (via `AndroidNative.showNotification` — Firebase-free!)
 * - Windows 10/11 Action Center (via WebView2 trusted Notification API + direct Rust WinRT Toast fallback!)
 * - Web Browser / PWA (via ServiceWorker `showNotification` with instant fallback to `new Notification`)
 */
export async function showNativeDeviceNotification(params: {
  id?: string;
  title: string;
  body: string;
  link?: string | null;
  imageUrl?: string | null;
  onNavigate?: (link: string) => void;
}): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const title = params.title || 'منصة طب الأسنان';
  const body = params.body || '';
  const origin =
    typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null'
      ? window.location.origin
      : '';
  const icon = origin ? `${origin}/icons/icon-192x192.png` : '/icons/icon-192x192.png';
  const badge = origin ? `${origin}/icons/icon-96x96.png` : '/icons/icon-96x96.png';

  // 1. Android APK Native System Notification Bar (Firebase-free!)
  const androidBridge = (window as any).AndroidNative;
  if (androidBridge && typeof androidBridge.showNotification === 'function') {
    try {
      androidBridge.showNotification(title, body, params.link || '/doctor/notifications');
      return true;
    } catch (err) {
      console.warn('[Push] AndroidNative.showNotification error:', err);
    }
  }

  // 2. Windows Desktop (Tauri v2):
  //    - When window is visible & WebView2 Notification permission is granted: use WebView2 `window.Notification`
  //      (signed Edge AUMID — proven working on Windows 10/11, instant, supports onclick window restore & navigation)
  //    - When hidden in System Tray (`document.hidden`) OR permission not yet granted: dispatch directly via
  //      Rust WinRT Toast (`send_native_notification`) so background notifications NEVER stall or get suppressed!
  if (isDesktopApp()) {
    const canUseWebView2 =
      'Notification' in window &&
      Notification.permission === 'granted' &&
      (typeof document === 'undefined' || !document.hidden);

    if (canUseWebView2) {
      try {
        const n = new window.Notification(title, {
          body,
          icon,
          dir: 'rtl',
          lang: 'ar',
          tag: params.id || `dental_${Date.now()}`,
        });
        n.onclick = async () => {
          try {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('show_main_window');
          } catch {}
          try {
            window.focus();
            if (params.link && params.onNavigate) params.onNavigate(params.link);
            n.close();
          } catch {}
        };
        return true;
      } catch (err) {
        console.warn('[Push] Desktop WebView2 Notification error, using Rust WinRT fallback:', err);
      }
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('send_native_notification', { title, body });
      return true;
    } catch (err) {
      console.warn('[Push] Rust send_native_notification failed:', err);
    }
    return false;
  }

  // 3. Web Browser / PWA Notification API
  if (!('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  const options: NotificationOptions = {
    body,
    icon,
    badge,
    dir: 'rtl',
    lang: 'ar',
    tag: params.id || `dental_${Date.now()}`,
    data: { link: params.link || '/doctor/notifications' },
  };

  // Try direct `new window.Notification` first (instant on Windows/macOS Chrome/Edge PWA with onclick focus+navigate).
  // On mobile Chrome PWA where direct constructor throws Illegal constructor, seamlessly fall back to Service Worker!
  try {
    const nativeNotif = new window.Notification(title, options);
    nativeNotif.onclick = () => {
      try {
        window.focus();
        if (params.link && params.onNavigate) {
          params.onNavigate(params.link);
        }
        nativeNotif.close();
      } catch {}
    };
    return true;
  } catch (directErr) {
    console.warn('[Push] Direct window.Notification unavailable, trying ServiceWorker:', directErr);
  }

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.active && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, options);
        return true;
      }
    } catch (swErr) {
      console.warn('[Push] SW showNotification failed:', swErr);
    }
  }

  return false;
}

/**
 * Non-blocking invocation of Supabase Edge Function `send-push-notification`
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
    // Graceful fallback: DB record + Realtime + 5s ID-based poll + Android Background Polling already deliver notifications
  }
}
