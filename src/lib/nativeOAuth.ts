import { supabase } from './supabase';
import { isNativeApp, isDesktopApp, getPublicOrigin, openExternalUrl } from './platform';
import { toast } from 'sonner';

const NATIVE_OAUTH_STORAGE_KEY = 'dental_native_oauth_bridge';
const PENDING_DEEPLINK_KEY = 'dental_pending_native_deeplink';
let activeChannel: any = null;
let lastAppliedAccessToken: string | null = null;

/**
 * Returns true if the current browser tab is acting as an external OAuth relay
 * for the Native Desktop or Android App, so pages like LoginPage do not redirect
 * to /doctor inside the external browser.
 */
export const isNativeOAuthRelayBrowser = (): boolean => {
  if (typeof window === 'undefined' || isNativeApp()) return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('native_oauth_return') === '1' || params.get('native_oauth')) {
      return true;
    }
    const rawStored = localStorage.getItem(NATIVE_OAUTH_STORAGE_KEY);
    if (rawStored) {
      const parsed = JSON.parse(rawStored);
      if (parsed?.sessionId && Date.now() - (parsed.timestamp || 0) < 15 * 60 * 1000) {
        return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
};

/**
 * Focuses the Tauri desktop window after OAuth completes in the system browser.
 */
const focusDesktopWindow = () => {
  if (!isDesktopApp()) return;
  try {
    const win = window as any;
    const tauriInvoke = win.__TAURI_INTERNALS__?.invoke || win.__TAURI__?.core?.invoke;
    if (typeof tauriInvoke === 'function') {
      tauriInvoke('focus_main_window').catch(() => {});
      tauriInvoke('plugin:window|unminimize', { label: 'main' }).catch(() => {});
      tauriInvoke('plugin:window|show', { label: 'main' }).catch(() => {});
      tauriInvoke('plugin:window|set_focus', { label: 'main' }).catch(() => {});
    }
  } catch {
    // ignore
  }
};

/**
 * Navigates the native app smoothly to the target dashboard after OAuth login succeeds.
 */
const redirectNativeAppAfterAuth = (role?: string) => {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (path !== '/login' && path !== '/register') return;

  let targetPath = '/doctor';
  if (role === 'patient' || localStorage.getItem('patient_oauth_pending') === '1') {
    targetPath = '/patient';
  } else if (role === 'supplier') {
    targetPath = '/supplier';
  } else if (role === 'laboratory') {
    targetPath = '/laboratory';
  } else if (role === 'admin') {
    targetPath = '/admin';
  }

  setTimeout(() => {
    if (window.location.pathname === '/login' || window.location.pathname === '/register') {
      window.history.pushState({}, '', targetPath);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, 250);
};

/**
 * Applies the OAuth session inside the native app (Desktop or Mobile)
 */
const applyNativeSession = async (accessToken: string, refreshToken: string, role?: string) => {
  if (!accessToken || !refreshToken) return;
  if (lastAppliedAccessToken === accessToken) return;
  lastAppliedAccessToken = accessToken;

  try {
    localStorage.removeItem(PENDING_DEEPLINK_KEY);
    if (role === 'patient') {
      localStorage.setItem('patient_oauth_pending', '1');
    }
    if (activeChannel) {
      try {
        supabase.removeChannel(activeChannel);
        activeChannel = null;
      } catch {
        // ignore
      }
    }

    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;

    focusDesktopWindow();
    toast.success('تم تسجيل الدخول بنجاح!');
    redirectNativeAppAfterAuth(role);
  } catch (err) {
    lastAppliedAccessToken = null;
    console.error('[NativeOAuth] Error setting session:', err);
  }
};

/**
 * Checks for any pending deep-link delivered by MainActivity.java on Android.
 */
const checkPendingAndroidDeepLink = () => {
  if (typeof window === 'undefined' || !isNativeApp()) return;
  try {
    const win = window as any;
    if (win.AndroidNative && typeof win.AndroidNative.consumePendingOAuthDeepLink === 'function') {
      const nativeLink = win.AndroidNative.consumePendingOAuthDeepLink();
      if (nativeLink && typeof nativeLink === 'string' && nativeLink.trim().length > 0) {
        win.__handleNativeOAuthDeepLink?.(nativeLink.trim());
        return;
      }
    }
    const storedLink = localStorage.getItem(PENDING_DEEPLINK_KEY);
    if (storedLink) {
      localStorage.removeItem(PENDING_DEEPLINK_KEY);
      win.__handleNativeOAuthDeepLink?.(storedLink);
    }
  } catch {
    // ignore
  }
};

/**
 * Starts Google or Facebook OAuth login.
 * - On Web: uses standard in-tab redirect.
 * - On Native Apps (Windows Desktop, Android, iOS): generates the direct OAuth URL,
 *   opens the main system browser directly to Google/Facebook, and automatically returns
 *   and focuses the app upon completion.
 */
export const startOAuthSignIn = async (
  provider: 'google' | 'facebook',
  role: 'doctor' | 'supplier' | 'laboratory' | 'patient' | string = 'doctor'
): Promise<void> => {
  if (role === 'patient') {
    localStorage.setItem('patient_oauth_pending', '1');
  }

  // Standard Web mode
  if (!isNativeApp()) {
    const redirectTo =
      role === 'patient'
        ? `${window.location.origin}?patient=true`
        : window.location.origin;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) throw error;
    return;
  }

  // Native App mode (Windows Desktop Tauri / Android APK / iOS IPA)
  const sessionId = `${Math.random().toString(36).slice(2, 11)}${Date.now().toString(36)}`;
  const platformType = isDesktopApp() ? 'desktop' : 'mobile';
  const win = window as any;
  const appPackage =
    (typeof win.AndroidNative?.getAppPackageName === 'function' && win.AndroidNative.getAppPackageName()) ||
    (import.meta.env.VITE_APP_TARGET === 'patient' ? 'com.dentalplatform.patient' : 'com.dentalplatform.pro');

  if (activeChannel) {
    try {
      supabase.removeChannel(activeChannel);
    } catch {
      // ignore
    }
  }

  // Listen for the session broadcast from the system browser
  activeChannel = supabase.channel(`oauth-handshake-${sessionId}`, {
    config: { broadcast: { ack: true } },
  });

  activeChannel
    .on('broadcast', { event: 'oauth-tokens' }, async (msg: any) => {
      const payload = msg?.payload || {};
      if (payload.access_token && payload.refresh_token) {
        await applyNativeSession(payload.access_token, payload.refresh_token, payload.role || role);
      }
    })
    .subscribe((status: string) => {
      if (status === 'SUBSCRIBED' && activeChannel) {
        activeChannel
          .send({
            type: 'broadcast',
            event: 'request-tokens',
            payload: { sessionId },
          })
          .catch(() => {});
      }
    });

  const publicOrigin = getPublicOrigin();
  const returnUrl = `${publicOrigin}/login?native_oauth_return=1&session_id=${encodeURIComponent(
    sessionId
  )}&role=${encodeURIComponent(role || 'doctor')}&platform=${encodeURIComponent(
    platformType
  )}&pkg=${encodeURIComponent(appPackage)}`;

  toast.info('جاري فتح المتصفح لإكمال تسجيل الدخول والعودة للتطبيق تلقائياً...');

  try {
    // Generate direct OAuth provider URL so the system browser goes straight to Google/Facebook
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: returnUrl,
        skipBrowserRedirect: true,
      },
    });

    if (!error && data?.url) {
      openExternalUrl(data.url);
      return;
    }
  } catch {
    // Fallback to bridge URL below
  }

  const bridgeUrl = `${publicOrigin}/login?native_oauth=${encodeURIComponent(
    provider
  )}&session_id=${encodeURIComponent(sessionId)}&role=${encodeURIComponent(
    role || 'doctor'
  )}&platform=${encodeURIComponent(platformType)}&pkg=${encodeURIComponent(appPackage)}`;

  openExternalUrl(bridgeUrl);
};

/**
 * Triggers automatic deep link navigation from the mobile system browser back into the native Android/iOS app.
 */
const triggerAutomaticAppOpen = (customSchemeUrl: string, androidIntentUrl: string | null) => {
  try {
    const isAndroidBrowser = /Android/i.test(navigator.userAgent);
    const primaryUrl = isAndroidBrowser && androidIntentUrl ? androidIntentUrl : customSchemeUrl;

    // 1. Immediate location redirect
    window.location.replace(primaryUrl);

    // 2. Programmatic anchor click fallback
    setTimeout(() => {
      try {
        const a = document.createElement('a');
        a.href = customSchemeUrl;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => a.remove(), 300);
      } catch {
        // ignore
      }
    }, 150);
  } catch {
    // ignore
  }
};

/**
 * Renders a confirmation UI in the system browser after OAuth completes
 * and triggers the deep link return to the app.
 */
const showBrowserReturnOverlay = (
  customSchemeUrl: string | null,
  androidIntentUrl: string | null,
  isMobile: boolean
) => {
  const existing = document.getElementById('dental-oauth-return-overlay');
  if (existing) existing.remove();

  const isAndroidBrowser = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  const buttonHref = isAndroidBrowser && androidIntentUrl ? androidIntentUrl : customSchemeUrl;

  const overlay = document.createElement('div');
  overlay.id = 'dental-oauth-return-overlay';
  overlay.dir = 'rtl';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 999999;
    background: linear-gradient(135deg, #030f21 0%, #0f2942 50%, #1e3a8a 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    font-family: 'Cairo', system-ui, sans-serif;
    color: #ffffff;
  `;

  overlay.innerHTML = `
    <div style="background: #ffffff; color: #0f172a; max-width: 420px; width: 100%; border-radius: 24px; padding: 32px 24px; text-align: center; box-shadow: 0 25px 50px rgba(0,0,0,0.35);">
      <div style="width: 68px; height: 68px; border-radius: 20px; background: #ecfdf5; color: #059669; display: flex; align-items: center; justify-content: center; margin: 0 auto 18px; font-size: 34px; border: 2px solid #a7f3d0;">
        ✓
      </div>
      <h2 style="font-size: 20px; font-weight: 900; margin-bottom: 10px; color: #0f172a;">
        تم تسجيل الدخول بنجاح!
      </h2>
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 22px;">
        تم ربط حسابك وتفعيل الجلسة داخل تطبيق <strong>منصة طب الأسنان (Dental Platform)</strong> تلقائياً.
        ${isMobile ? 'جاري فتح التطبيق وتوجيهك الآن...' : 'تم تحويلك إلى البرنامج على سطح المكتب تلقائياً.'}
      </p>
      ${
        buttonHref
          ? `<a id="dental-oauth-open-app-btn" href="${buttonHref}" style="display: block; width: 100%; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 800; font-size: 15px; padding: 13px 20px; border-radius: 14px; box-shadow: 0 4px 14px rgba(37,99,235,0.35);">
              فتح التطبيق الآن
            </a>`
          : `<button onclick="window.close()" style="width: 100%; background: #2563eb; color: #ffffff; border: none; font-family: inherit; font-weight: 800; font-size: 15px; padding: 13px 20px; border-radius: 14px; cursor: pointer;">
              إغلاق هذه الصفحة والعودة للبرنامج
            </button>`
      }
    </div>
  `;

  document.body.appendChild(overlay);
};

/**
 * Extracts access_token and refresh_token directly from URL hash or query parameters if present.
 */
const extractTokensFromCurrentUrl = (): { access_token: string; refresh_token: string } | null => {
  if (typeof window === 'undefined') return null;
  try {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const searchParams = new URLSearchParams(window.location.search);
    const access_token = hashParams.get('access_token') || searchParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token') || searchParams.get('refresh_token');
    if (access_token && refresh_token) {
      return { access_token, refresh_token };
    }
  } catch {
    // ignore
  }
  return null;
};

/**
 * Initializes the Native OAuth Bridge on both the System Browser and the Native App.
 * Call once in App.tsx.
 */
export const initNativeOAuthBridge = () => {
  if (typeof window === 'undefined') return;

  // 1. Register global handler for Android/iOS native deep links: dentalplatform://auth-callback?access_token=...&refresh_token=...
  (window as any).__handleNativeOAuthDeepLink = (urlOrAccessToken: string, maybeRefreshToken?: string) => {
    try {
      if (maybeRefreshToken) {
        applyNativeSession(urlOrAccessToken, maybeRefreshToken);
        return;
      }
      // Handle intent:// or custom scheme URLs
      const normalizedUrl = urlOrAccessToken.startsWith('intent://')
        ? urlOrAccessToken.replace(/^intent:\/\//, 'dentalplatform://').split('#Intent;')[0]
        : urlOrAccessToken;

      const parsed = new URL(normalizedUrl);
      const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''));
      const accessToken = parsed.searchParams.get('access_token') || hashParams.get('access_token');
      const refreshToken = parsed.searchParams.get('refresh_token') || hashParams.get('refresh_token');
      const role = parsed.searchParams.get('role') || hashParams.get('role') || undefined;
      if (accessToken && refreshToken) {
        applyNativeSession(accessToken, refreshToken, role);
      }
    } catch (e) {
      console.warn('[NativeOAuth] Could not parse deep link:', e);
    }
  };

  // 2. If running inside the Native App, check pending deep links on boot and whenever app resumes/focuses
  if (isNativeApp()) {
    checkPendingAndroidDeepLink();

    const handleResumeOrFocus = () => {
      checkPendingAndroidDeepLink();
      if (activeChannel) {
        activeChannel
          .send({
            type: 'broadcast',
            event: 'request-tokens',
            payload: {},
          })
          .catch(() => {});
      }
    };

    window.addEventListener('focus', handleResumeOrFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleResumeOrFocus();
      }
    });
    return;
  }

  // 3. System Browser Relay Mode
  const params = new URLSearchParams(window.location.search);
  const nativeOAuthProvider = params.get('native_oauth') as 'google' | 'facebook' | null;
  const urlSessionId = params.get('session_id');
  const urlRole = params.get('role') || 'doctor';
  const urlPlatform = params.get('platform') || 'desktop';
  const urlPkg = params.get('pkg') || 'com.dentalplatform.pro';

  // Step 3a: Fallback if system browser opened ?native_oauth=google&session_id=...
  if (nativeOAuthProvider && urlSessionId) {
    localStorage.setItem(
      NATIVE_OAUTH_STORAGE_KEY,
      JSON.stringify({
        sessionId: urlSessionId,
        role: urlRole,
        platform: urlPlatform,
        pkg: urlPkg,
        timestamp: Date.now(),
      })
    );

    if (urlRole === 'patient') {
      localStorage.setItem('patient_oauth_pending', '1');
    }

    const returnUrl = `${window.location.origin}/login?native_oauth_return=1&session_id=${encodeURIComponent(
      urlSessionId
    )}&role=${encodeURIComponent(urlRole)}&platform=${encodeURIComponent(
      urlPlatform
    )}&pkg=${encodeURIComponent(urlPkg)}`;

    supabase.auth.signInWithOAuth({
      provider: nativeOAuthProvider,
      options: { redirectTo: returnUrl },
    });
    return;
  }

  // Step 3b: Check if returning from Google/Facebook OAuth in the system browser
  const isOAuthReturn = params.get('native_oauth_return') === '1';
  const rawStored = localStorage.getItem(NATIVE_OAUTH_STORAGE_KEY);
  let bridgeInfo: {
    sessionId: string;
    role: string;
    platform: string;
    pkg?: string;
    timestamp: number;
  } | null = null;

  if (isOAuthReturn && urlSessionId) {
    bridgeInfo = {
      sessionId: urlSessionId,
      role: urlRole,
      platform: urlPlatform,
      pkg: urlPkg,
      timestamp: Date.now(),
    };
  } else if (rawStored) {
    try {
      const parsed = JSON.parse(rawStored);
      if (parsed?.sessionId && Date.now() - (parsed.timestamp || 0) < 15 * 60 * 1000) {
        bridgeInfo = parsed;
      } else {
        localStorage.removeItem(NATIVE_OAUTH_STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(NATIVE_OAUTH_STORAGE_KEY);
    }
  }

  if (!bridgeInfo) return;

  let dispatched = false;
  const dispatchSessionToNativeApp = async (session: { access_token: string; refresh_token: string }) => {
    if (dispatched || !session?.access_token || !session?.refresh_token || !bridgeInfo) return;
    dispatched = true;
    localStorage.removeItem(NATIVE_OAUTH_STORAGE_KEY);

    const { sessionId, role, platform, pkg } = bridgeInfo;
    const isMobile = platform === 'mobile' || /Android|iPhone|iPad/i.test(navigator.userAgent);
    const targetPkg = pkg || 'com.dentalplatform.pro';
    const queryStr = `access_token=${encodeURIComponent(
      session.access_token
    )}&refresh_token=${encodeURIComponent(session.refresh_token)}&role=${encodeURIComponent(role)}`;

    const customSchemeUrl = `dentalplatform://auth-callback?${queryStr}`;
    const androidIntentUrl = isMobile
      ? `intent://auth-callback?${queryStr}#Intent;scheme=dentalplatform;package=${targetPkg};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`
      : null;

    showBrowserReturnOverlay(customSchemeUrl, androidIntentUrl, isMobile);

    // If mobile, immediately trigger deep link to open the native app automatically
    if (isMobile) {
      triggerAutomaticAppOpen(customSchemeUrl, androidIntentUrl);
    }

    // Broadcast tokens over Supabase Realtime to the waiting Desktop/Mobile app
    const ch = supabase.channel(`oauth-handshake-${sessionId}`, {
      config: { broadcast: { ack: true } },
    });

    const sendPayload = () =>
      ch
        .send({
          type: 'broadcast',
          event: 'oauth-tokens',
          payload: {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            role,
          },
        })
        .catch(() => {});

    ch.on('broadcast', { event: 'request-tokens' }, () => {
      sendPayload();
    }).subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await sendPayload();
        // Keep broadcasting periodically for 45s in case the native app was paused in background
        const timers = [400, 1000, 2000, 3500, 6000, 10000, 15000, 22000, 30000, 42000].map(ms =>
          setTimeout(sendPayload, ms)
        );
        setTimeout(() => {
          timers.forEach(clearTimeout);
        }, 45000);
      }
    });
  };

  // Immediate extraction from URL hash (0ms delay if implicit flow tokens are in hash)
  const urlTokens = extractTokensFromCurrentUrl();
  if (urlTokens) {
    dispatchSessionToNativeApp(urlTokens);
    return;
  }

  // Fallback to Supabase Auth session detection (e.g. PKCE flow)
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      dispatchSessionToNativeApp(session);
    }
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      dispatchSessionToNativeApp(session);
    }
  });
};
