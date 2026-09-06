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
