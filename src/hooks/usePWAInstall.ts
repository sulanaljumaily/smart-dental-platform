import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

interface UsePWAInstallReturn {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  installApp: () => Promise<void>;
}

const PWA_INSTALLED_KEY = 'dental_pwa_installed_v1';

function checkIsStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandaloneDisplay =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as any).standalone === true ||
    (typeof document !== 'undefined' && document.referrer.includes('android-app://'));

  if (isStandaloneDisplay) return true;

  try {
    if (localStorage.getItem(PWA_INSTALLED_KEY) === '1') {
      return true;
    }
  } catch {
    // ignore storage errors
  }

  return false;
}

export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => checkIsStandalonePWA());

  // Detect iOS (Safari doesn't fire beforeinstallprompt)
  const isIOS =
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream;

  useEffect(() => {
    // Check if already installed (standalone mode or previously installed)
    if (checkIsStandalonePWA()) {
      setIsInstalled(true);
      return;
    }

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        setIsInstallable(false);
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    }

    // Chrome / Edge / Android — fires beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      // If user reinstalled after uninstalling in browser, clear the flag when browser offers install prompt
      try {
        localStorage.removeItem(PWA_INSTALLED_KEY);
      } catch {}
      if (!checkIsStandalonePWA()) {
        setIsInstalled(false);
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setIsInstallable(true);
      }
    };

    const handleAppInstalled = () => {
      try {
        localStorage.setItem(PWA_INSTALLED_KEY, '1');
      } catch {}
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', handleAppInstalled);

    // iOS: show install hint even without the event
    if (isIOS && !checkIsStandalonePWA()) {
      setIsInstallable(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      }
    };
  }, [isIOS]);

  const installApp = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        try {
          localStorage.setItem(PWA_INSTALLED_KEY, '1');
        } catch {}
        setIsInstalled(true);
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    }
    // For iOS, the user sees a manual instructions toast (handled in component)
  };

  return { isInstallable, isInstalled, isIOS, installApp };
}
