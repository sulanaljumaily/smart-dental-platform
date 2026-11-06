import { supabase } from './supabase';
import { isNativeApp, isDesktopApp, getPublicOrigin, openExternalUrl } from './platform';
import { toast } from 'sonner';

const NATIVE_OAUTH_STORAGE_KEY = 'dental_native_oauth_bridge';
let activeChannel: any = null;

/**
 * Focuses the Tauri desktop window after OAuth completes in the system browser.
 */
const focusDesktopWindow = () => {
  if (!isDesktopApp()) return;
  try {
    const win = window as any;
    const tauriInvoke = win.__TAURI_INTERNALS__?.invoke || win.__TAURI__?.core?.invoke;
    if (typeof tauriInvoke === 'function') {
      tauriInvoke('plugin:window|unminimize', { label: 'main' }).catch(() => {});
      tauriInvoke('plugin:window|show', { label: 'main' }).catch(() => {});
      tauriInvoke('plugin:window|set_focus', { label: 'main' }).catch(() => {});
    }
  } catch {
    // ignore
  }
};

/**
 * Applies the OAuth session inside the native app (Desktop or Mobile)
 */
const applyNativeSession = async (accessToken: string, refreshToken: string, role?: string) => {
  if (!accessToken || !refreshToken) return;
  try {
    if (role === 'patient') {
      localStorage.setItem('patient_oauth_pending', '1');
    }
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;

    focusDesktopWindow();
    toast.success('تم تسجيل الدخول بنجاح والعودة إلى التطبيق!');
  } catch (err) {
    console.error('[NativeOAuth] Error setting session:', err);
  }
};

/**
 * Starts Google or Facebook OAuth login.
 * - On Web: uses standard in-tab redirect.
 * - On Native Apps (Windows Desktop, Android, iOS): opens the main system browser,
 *   completes OAuth on dental-platform.com, and returns the session to the app automatically.
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
        try {
          supabase.removeChannel(activeChannel);
          activeChannel = null;
        } catch {
          // ignore
        }
        await applyNativeSession(payload.access_token, payload.refresh_token, payload.role || role);
      }
    })
    .subscribe();

  const publicOrigin = getPublicOrigin();
  const bridgeUrl = `${publicOrigin}/login?native_oauth=${encodeURIComponent(
    provider
  )}&session_id=${encodeURIComponent(sessionId)}&role=${encodeURIComponent(
    role || 'doctor'
  )}&platform=${encodeURIComponent(platformType)}`;

  toast.info('جاري فتح المتصفح الرئيسي لإكمال تسجيل الدخول ثم إرجاعك للتطبيق تلقائياً...');
  openExternalUrl(bridgeUrl);
};

/**
 * Renders a confirmation UI in the system browser after OAuth completes
 * and triggers the deep link return to the app.
 */
const showBrowserReturnOverlay = (deepLinkUrl: string | null, isMobile: boolean) => {
  const existing = document.getElementById('dental-oauth-return-overlay');
  if (existing) existing.remove();

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
        ${isMobile ? 'سيتم تحويلك إلى التطبيق الآن...' : 'يمكنك الآن إغلاق هذه النافذة والعودة إلى البرنامج.'}
      </p>
      ${
        deepLinkUrl
          ? `<a href="${deepLinkUrl}" style="display: block; width: 100%; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 800; font-size: 15px; padding: 13px 20px; border-radius: 14px; box-shadow: 0 4px 14px rgba(37,99,235,0.35);">
              العودة إلى التطبيق الآن
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
      const parsed = new URL(urlOrAccessToken);
      const accessToken =
        parsed.searchParams.get('access_token') ||
        new URLSearchParams(parsed.hash.replace(/^#/, '')).get('access_token');
      const refreshToken =
        parsed.searchParams.get('refresh_token') ||
        new URLSearchParams(parsed.hash.replace(/^#/, '')).get('refresh_token');
      const role = parsed.searchParams.get('role') || undefined;
      if (accessToken && refreshToken) {
        applyNativeSession(accessToken, refreshToken, role);
      }
    } catch (e) {
      console.warn('[NativeOAuth] Could not parse deep link:', e);
    }
  };

  // Only run the browser-side relay when opened in the standard web browser
  if (isNativeApp()) return;

  const params = new URLSearchParams(window.location.search);
  const nativeOAuthProvider = params.get('native_oauth') as 'google' | 'facebook' | null;
  const urlSessionId = params.get('session_id');
  const urlRole = params.get('role') || 'doctor';
  const urlPlatform = params.get('platform') || 'desktop';

  // Step 1: System browser just opened ?native_oauth=google&session_id=...
  if (nativeOAuthProvider && urlSessionId) {
    localStorage.setItem(
      NATIVE_OAUTH_STORAGE_KEY,
      JSON.stringify({
        sessionId: urlSessionId,
        role: urlRole,
        platform: urlPlatform,
        timestamp: Date.now(),
      })
    );

    if (urlRole === 'patient') {
      localStorage.setItem('patient_oauth_pending', '1');
    }

    const returnUrl = `${window.location.origin}/login?native_oauth_return=1&session_id=${encodeURIComponent(
      urlSessionId
    )}&role=${encodeURIComponent(urlRole)}&platform=${encodeURIComponent(urlPlatform)}`;

    supabase.auth.signInWithOAuth({
      provider: nativeOAuthProvider,
      options: { redirectTo: returnUrl },
    });
    return;
  }

  // Step 2: Check if returning from Google/Facebook OAuth in the system browser
  const isOAuthReturn = params.get('native_oauth_return') === '1';
  const rawStored = localStorage.getItem(NATIVE_OAUTH_STORAGE_KEY);
  let bridgeInfo: { sessionId: string; role: string; platform: string; timestamp: number } | null = null;

  if (rawStored) {
    try {
      const parsed = JSON.parse(rawStored);
      // Valid for 15 minutes
      if (parsed?.sessionId && Date.now() - (parsed.timestamp || 0) < 15 * 60 * 1000) {
        bridgeInfo = parsed;
      } else {
        localStorage.removeItem(NATIVE_OAUTH_STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(NATIVE_OAUTH_STORAGE_KEY);
    }
  } else if (isOAuthReturn && urlSessionId) {
    bridgeInfo = {
      sessionId: urlSessionId,
      role: urlRole,
      platform: urlPlatform,
      timestamp: Date.now(),
    };
  }

  if (!bridgeInfo) return;

  let dispatched = false;
  const dispatchSessionToNativeApp = async (session: any) => {
    if (dispatched || !session?.access_token || !session?.refresh_token || !bridgeInfo) return;
    dispatched = true;
    localStorage.removeItem(NATIVE_OAUTH_STORAGE_KEY);

    const { sessionId, role, platform } = bridgeInfo;
    const isMobile = platform === 'mobile';
    const deepLinkUrl = isMobile
      ? `dentalplatform://auth-callback?access_token=${encodeURIComponent(
          session.access_token
        )}&refresh_token=${encodeURIComponent(session.refresh_token)}&role=${encodeURIComponent(role)}`
      : null;

    showBrowserReturnOverlay(deepLinkUrl, isMobile);

    // Broadcast tokens over Supabase Realtime to the waiting Desktop/Mobile app
    const ch = supabase.channel(`oauth-handshake-${sessionId}`, {
      config: { broadcast: { ack: true } },
    });

    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const sendPayload = () =>
          ch.send({
            type: 'broadcast',
            event: 'oauth-tokens',
            payload: {
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              role,
            },
          });

        await sendPayload();
        setTimeout(sendPayload, 800);
        setTimeout(sendPayload, 2200);
      }
    });

    // If mobile, also trigger deep link automatically to bring the app back to foreground
    if (deepLinkUrl) {
      setTimeout(() => {
        window.location.href = deepLinkUrl;
      }, 600);
    }
  };

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
