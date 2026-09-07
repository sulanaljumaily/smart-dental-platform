import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { isMobileApp } from '../../lib/platform';
import { toast } from 'sonner';

/**
 * NativeBackButtonHandler
 * Intercepts the Android hardware navigation back button.
 * - Closes any open dialogs/modals/drawers first.
 * - Navigates backward in app history if available.
 * - Returns to root '/' if on a sub-page without history.
 * - Prompts double-tap to exit on root or main dashboard pages.
 */
export const NativeBackButtonHandler: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const locationRef = useRef(location);
  const navigateRef = useRef(navigate);
  const lastBackPressTimeRef = useRef<number>(0);

  useEffect(() => {
    locationRef.current = location;
    navigateRef.current = navigate;
  }, [location, navigate]);

  useEffect(() => {
    // Only register on native mobile platforms (Android)
    if (!isMobileApp()) {
      return;
    }

    let listenerHandle: PluginListenerHandle | null = null;

    const setupListener = async () => {
      try {
        listenerHandle = await CapApp.addListener('backButton', () => {
          // 1. Check for open dialogs / modals / drawers / popovers / sheets
          // Radix UI dialogs: [role="dialog"], [role="alertdialog"], [data-state="open"]
          const openDialog = document.querySelector(
            '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [aria-modal="true"]'
          );
          if (openDialog) {
            // Dispatch Escape key to gracefully trigger Radix onOpenChange(false) or onDismiss
            const escEvent = new KeyboardEvent('keydown', {
              key: 'Escape',
              code: 'Escape',
              keyCode: 27,
              which: 27,
              bubbles: true,
              cancelable: true,
            });
            document.dispatchEvent(escEvent);
            return;
          }

          // 2. Check for active custom mobile menus or drawer overlays
          const openMobileMenuCloseBtn = document.querySelector<HTMLButtonElement>(
            '[data-mobile-menu-close], button[aria-label="إغلاق القائمة"], button[aria-label="Close menu"]'
          );
          if (openMobileMenuCloseBtn && openMobileMenuCloseBtn.offsetParent !== null) {
            openMobileMenuCloseBtn.click();
            return;
          }

          const currentPath = locationRef.current.pathname.toLowerCase().replace(/\/$/, '');
          const isRootPath =
            currentPath === '' ||
            currentPath === '/login' ||
            currentPath === '/patient-login' ||
            currentPath === '/welcome-doctor' ||
            currentPath === '/welcome-lab' ||
            currentPath === '/welcome-supplier';

          const isDashboardRoot =
            currentPath === '/doctor' ||
            currentPath === '/doctor/dashboard' ||
            currentPath === '/patient' ||
            currentPath === '/patient/dashboard' ||
            currentPath === '/laboratory' ||
            currentPath === '/laboratory/dashboard' ||
            currentPath === '/supplier' ||
            currentPath === '/supplier/dashboard' ||
            currentPath === '/admin' ||
            currentPath === '/admin/dashboard';

          // History check in React Router v6 (window.history.state.idx)
          const historyIdx = (window.history.state as any)?.idx;
          const hasHistory = typeof historyIdx === 'number' ? historyIdx > 0 : window.history.length > 1;

          // If there is preceding navigation history and not already at root, go back
          if (hasHistory && !isRootPath) {
            navigateRef.current(-1);
            return;
          }

          // If on a sub-page without history (direct link / deep link), go to root
          if (!isRootPath && !isDashboardRoot) {
            navigateRef.current('/', { replace: true });
            return;
          }

          // At root or dashboard home: Double-tap back button to exit
          const now = Date.now();
          if (now - lastBackPressTimeRef.current < 2000) {
            CapApp.exitApp();
          } else {
            lastBackPressTimeRef.current = now;
            toast.info('اضغط مرة أخرى للخروج من التطبيق', {
              duration: 2000,
            });
          }
        });
      } catch (e) {
        console.warn('NativeBackButtonHandler initialization failed:', e);
      }
    };

    setupListener();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, []);

  return null;
};

export default NativeBackButtonHandler;
