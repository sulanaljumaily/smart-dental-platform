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

  try {
    const win = window as any;
    if (win.AndroidNative && typeof win.AndroidNative.openExternalUrl === 'function') {
      win.AndroidNative.openExternalUrl(url);
      return;
    }
  } catch (e) {
    console.warn('AndroidNative.openExternalUrl failed, falling back:', e);
  }

  // Create and click an anchor element so Capacitor/iOS/Tauri WebView delegates intercept it cleanly
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

