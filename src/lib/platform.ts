import { Capacitor } from '@capacitor/core';

/**
 * Returns true if running inside Tauri (Windows, macOS, Linux desktop app).
 */
export const isDesktopApp = (): boolean => {
  if (typeof window === 'undefined') return false;

  return (
    window.location.protocol === 'tauri:' ||
    window.location.protocol === 'asset:' ||
    window.location.protocol === 'file:' ||
    (window as any).__TAURI__ !== undefined ||
    (window as any).__TAURI_INTERNALS__ !== undefined
  );
};

/**
 * Returns true if running inside Capacitor native mobile app (Android / iOS).
 */
export const isMobileApp = (): boolean => {
  if (typeof window === 'undefined') return false;

  return (
    Capacitor.isNativePlatform() ||
    window.location.protocol === 'capacitor:' ||
    // Capacitor Android default scheme https://localhost
    (window.location.hostname === 'localhost' && window.location.port === '' && window.location.protocol === 'https:')
  );
};

/**
 * Returns true if running as an installed native application (mobile or desktop).
 * Returns false when running in standard web mode (e.g. https://dental-platform.com).
 */
export const isNativeApp = (): boolean => {
  return isMobileApp() || isDesktopApp();
};

/**
 * Returns true if running in standard web mode.
 */
export const isWeb = (): boolean => {
  return !isNativeApp();
};

/**
 * Returns the public web origin (https://dental-platform.com) when running inside
 * a native mobile/desktop app so QR codes and external links resolve to the live website
 * instead of https://localhost, capacitor://localhost, or http://tauri.localhost.
 */
export const getPublicOrigin = (): string => {
  if (typeof window === 'undefined') return 'https://dental-platform.com';
  return isNativeApp() ? 'https://dental-platform.com' : window.location.origin;
};

/**
 * Opens an external URL in the device's default system browser on Mobile/Desktop apps,
 * or in a new tab on Web.
 */
export const openExternalUrl = (url: string): void => {
  if (typeof window === 'undefined') return;

  const win = window as any;

  // 1. Android Native Bridge
  try {
    if (win.AndroidNative && typeof win.AndroidNative.openExternalUrl === 'function') {
      win.AndroidNative.openExternalUrl(url);
      return;
    }
  } catch (e) {
    console.warn('AndroidNative.openExternalUrl failed, falling back:', e);
  }

  // 2. Tauri Desktop (Windows / macOS / Linux) via tauri-plugin-shell
  if (isDesktopApp()) {
    try {
      const tauriInvoke = win.__TAURI_INTERNALS__?.invoke || win.__TAURI__?.core?.invoke;
      if (typeof tauriInvoke === 'function') {
        tauriInvoke('plugin:shell|open', { path: url }).catch((err: any) => {
          console.warn('Tauri shell open failed, falling back:', err);
          window.open(url, '_blank');
        });
        return;
      }
    } catch (e) {
      console.warn('Tauri invoke failed, falling back:', e);
    }
  }

  // 3. Capacitor iOS / Web fallback
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export interface SharePayload {
  title?: string;
  text?: string;
  url?: string;
}

/**
 * Opens a sleek native-styled Share Sheet dialog on Desktop / browsers where Web Share API is unavailable.
 */
function openUniversalShareModal({ title = 'مشاركة', text = '', url = '' }: SharePayload): void {
  if (typeof document === 'undefined') return;

  const existing = document.getElementById('dental-universal-share-modal');
  if (existing) existing.remove();

  const fullText = [text.trim(), url.trim()].filter(Boolean).join('\n');

  const overlay = document.createElement('div');
  overlay.id = 'dental-universal-share-modal';
  overlay.dir = 'rtl';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 100000;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    font-family: 'Cairo', 'Tajawal', system-ui, -apple-system, sans-serif;
  `;

  const card = document.createElement('div');
  card.style.cssText = `
    background: #ffffff;
    border-radius: 20px;
    width: 100%;
    max-width: 400px;
    padding: 20px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    border: 1px solid #e2e8f0;
    color: #0f172a;
  `;

  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #f1f5f9;">
      <div style="font-weight:800;font-size:16px;color:#0f172a;">${title}</div>
      <button id="dental-share-close" type="button" style="background:#f1f5f9;border:none;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:18px;line-height:1;color:#475569;display:flex;align-items:center;justify-content:center;">&times;</button>
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;font-size:12px;color:#475569;margin-bottom:16px;max-height:84px;overflow-y:auto;word-break:break-all;line-height:1.6;">
      ${fullText.replace(/</g, '&lt;').replace(/\n/g, '<br/>')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:12px;">
      <button id="dental-share-wa" type="button" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:11px;border-radius:12px;border:1px solid #bbf7d0;background:#f0fdf4;color:#15803d;font-weight:700;font-size:13px;cursor:pointer;">
        <span>واتساب (WhatsApp)</span>
      </button>
      <button id="dental-share-tg" type="button" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:11px;border-radius:12px;border:1px solid #bae6fd;background:#f0f9ff;color:#0369a1;font-weight:700;font-size:13px;cursor:pointer;">
        <span>تيليجرام (Telegram)</span>
      </button>
      <button id="dental-share-mail" type="button" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:11px;border-radius:12px;border:1px solid #e2e8f0;background:#f8fafc;color:#334155;font-weight:700;font-size:13px;cursor:pointer;">
        <span>البريد الإلكتروني</span>
      </button>
      <button id="dental-share-sms" type="button" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:11px;border-radius:12px;border:1px solid #ddd6fe;background:#f5f3ff;color:#6d28d9;font-weight:700;font-size:13px;cursor:pointer;">
        <span>رسالة نصية (SMS)</span>
      </button>
    </div>
    <button id="dental-share-copy" type="button" style="width:100%;padding:11px;border-radius:12px;border:none;background:#2563eb;color:#ffffff;font-weight:700;font-size:13px;cursor:pointer;">
      نسخ الرابط والنص
    </button>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  card.querySelector('#dental-share-close')?.addEventListener('click', close);

  card.querySelector('#dental-share-wa')?.addEventListener('click', () => {
    openExternalUrl(`https://wa.me/?text=${encodeURIComponent(fullText)}`);
    close();
  });
  card.querySelector('#dental-share-tg')?.addEventListener('click', () => {
    const tgUrl = url
      ? `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text || title)}`
      : `https://t.me/share/url?url=${encodeURIComponent(getPublicOrigin())}&text=${encodeURIComponent(fullText)}`;
    openExternalUrl(tgUrl);
    close();
  });
  card.querySelector('#dental-share-mail')?.addEventListener('click', () => {
    openExternalUrl(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(fullText)}`);
    close();
  });
  card.querySelector('#dental-share-sms')?.addEventListener('click', () => {
    openExternalUrl(`sms:?body=${encodeURIComponent(fullText)}`);
    close();
  });
  card.querySelector('#dental-share-copy')?.addEventListener('click', async () => {
    const copyBtn = card.querySelector('#dental-share-copy') as HTMLButtonElement | null;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url || fullText);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url || fullText;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      if (copyBtn) {
        copyBtn.textContent = '✓ تم النسخ بنجاح!';
        copyBtn.style.background = '#16a34a';
      }
      setTimeout(close, 900);
    } catch {
      close();
    }
  });
}

/**
 * Universal Share Helper across Android APK, iOS IPA, Windows Desktop, and Web browsers.
 * Always opens the device's native share sheet (or the Universal Share Dialog fallback on desktop).
 */
export const shareContent = async ({ title = 'مشاركة', text = '', url = '' }: SharePayload): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  const win = window as any;

  // 1. Android Native Bridge (Intent.ACTION_SEND Chooser)
  try {
    if (win.AndroidNative && typeof win.AndroidNative.shareContent === 'function') {
      win.AndroidNative.shareContent(title, text, url);
      return true;
    }
  } catch (e) {
    console.warn('AndroidNative.shareContent error:', e);
  }

  // 2. Standard Web Share API (iOS WKWebView, Android Chrome, Windows Edge/WebView2, macOS Safari)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const shareData: ShareData = { title };
      if (text) shareData.text = text;
      if (url && /^https?:\/\//i.test(url)) {
        shareData.url = url;
      } else if (url) {
        shareData.text = [text, url].filter(Boolean).join('\n');
      }
      await navigator.share(shareData);
      return true;
    } catch (err: any) {
      if (err?.name === 'AbortError') return true;
      console.warn('navigator.share unavailable or rejected, opening universal share sheet:', err);
    }
  }

  // 3. Universal Share Sheet Modal (Windows Desktop / non-WebShare browsers)
  openUniversalShareModal({ title, text, url });
  return true;
};
