import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Download,
  Smartphone,
  X,
  Share,
  Monitor,
  Globe,
  Clock,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { usePlatform } from '@/contexts/PlatformContext';
import { isNativeApp } from '@/lib/platform';

interface PWAInstallButtonProps {
  variant?: 'floating' | 'banner' | 'button';
}

function shouldShowPWAInstall(pathname: string, search: string): boolean {
  const cleanPath = pathname.replace(/\/$/, '').toLowerCase();

  // 1. Doctor Center: ONLY show in /doctor (overview)
  if (cleanPath.startsWith('/doctor')) {
    return cleanPath === '/doctor' || cleanPath === '/doctor-welcome';
  }

  // 2. Supplier Center: ONLY show in /supplier (overview)
  if (cleanPath.startsWith('/supplier')) {
    if (cleanPath !== '/supplier' && cleanPath !== '/supplier-welcome') return false;
    const params = new URLSearchParams(search);
    const tab = params.get('tab');
    return !tab || tab === 'overview';
  }

  // 3. Patient Center: ONLY show in /patient (overview)
  if (cleanPath.startsWith('/patient')) {
    return cleanPath === '/patient';
  }

  // 4. Lab Center & Admin Center: NEVER show
  if (cleanPath.startsWith('/laboratory') || cleanPath.startsWith('/admin')) {
    return false;
  }

  // 5. Public / general pages: ALWAYS show
  return true;
}

function isProContextPath(pathname: string): boolean {
  const p = pathname.toLowerCase();
  return (
    p.startsWith('/doctor') ||
    p.startsWith('/supplier') ||
    p.startsWith('/laboratory') ||
    p.startsWith('/lab')
  );
}

export function PWAInstallButton({ variant = 'floating' }: PWAInstallButtonProps) {
  const location = useLocation();
  const { isInstallable, isInstalled, isIOS, installApp } = usePWAInstall();
  const { appsConfig } = usePlatform();

  const [showModal, setShowModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Never show inside already-installed native apps (Windows EXE / Android APK / iOS App)
  if (isNativeApp()) return null;

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isAndroid = /Android/i.test(ua);
  const isIOSDevice =
    isIOS ||
    /iPad|iPhone|iPod/.test(ua) ||
    (typeof navigator !== 'undefined' &&
      navigator.platform === 'MacIntel' &&
      navigator.maxTouchPoints > 1);
  const isDesktop = !isAndroid && !isIOSDevice;

  const showOnRoute = shouldShowPWAInstall(location.pathname, location.search);
  const isProRoute = isProContextPath(location.pathname);

  const hasDesktopOptions =
    appsConfig.windows.exeStatus !== 'hidden' || appsConfig.windows.pwaEnabled;
  const hasAndroidOptions =
    appsConfig.android.playStoreStatus !== 'hidden' ||
    appsConfig.android.directApkEnabled ||
    appsConfig.android.pwaEnabled;
  const hasIOSOptions =
    appsConfig.ios.appStoreStatus !== 'hidden' || appsConfig.ios.homeScreenGuideEnabled;

  const hasOptionsForDevice = isDesktop
    ? hasDesktopOptions
    : isAndroid
    ? hasAndroidOptions
    : hasIOSOptions;

  // On desktop, even if PWA is already installed, the user may still want the Windows offline .exe
  if (!showOnRoute || dismissed || !hasOptionsForDevice) return null;
  if (!isDesktop && isInstalled && appsConfig.android.playStoreStatus === 'hidden' && !appsConfig.android.directApkEnabled && appsConfig.ios.appStoreStatus === 'hidden') {
    return null;
  }

  const handleOpenModal = () => {
    setStatusMessage(null);
    setShowModal(true);
  };

  const handleWindowsExeClick = () => {
    const { exeStatus, exeDownloadUrl, exeComingSoonMessage } = appsConfig.windows;
    if (exeStatus === 'coming_soon') {
      const msg = exeComingSoonMessage || 'نسخة الويندوز ستتوفر للتحميل قريباً!';
      setStatusMessage(msg);
      toast.info(msg);
      return;
    }
    if (!exeDownloadUrl) {
      const msg = 'رابط تحميل نسخة الويندوز غير مضاف حالياً، يرجى المحاولة لاحقاً أو تثبيت نسخة الويب السريعة.';
      setStatusMessage(msg);
      toast.info(msg);
      return;
    }
    window.open(exeDownloadUrl, '_blank', 'noopener,noreferrer');
    toast.success('بدأ تحميل ملف تنصيب نسخة الويندوز');
    setShowModal(false);
  };

  const handleWebPWAClick = async () => {
    if (isInstallable) {
      await installApp();
      setShowModal(false);
    } else {
      const msg =
        'لتثبيت نسخة الويب السريعة: اضغط على أيقونة التثبيت (⊕) في شريط عنوان المتصفح بالأعلى، أو من قائمة المتصفح اختر "تثبيت التطبيق / Install App".';
      setStatusMessage(msg);
      toast.info(msg);
    }
  };

  const handlePlayStoreClick = () => {
    const { playStoreStatus, playStoreProUrl, playStorePatientUrl, playStoreComingSoonMessage } =
      appsConfig.android;

    if (playStoreStatus === 'coming_soon') {
      const msg =
        playStoreComingSoonMessage ||
        'تطبيق المنصة على Google Play سيتوفر قريباً! يمكنك حالياً تحميل نسخة APK المباشرة أو تثبيت نسخة الويب.';
      setStatusMessage(msg);
      toast.info(msg);
      return;
    }

    const targetUrl = isProRoute
      ? playStoreProUrl || playStorePatientUrl
      : playStorePatientUrl || playStoreProUrl;

    if (!targetUrl) {
      const msg =
        playStoreComingSoonMessage ||
        'رابط متجر Google Play سيتوفر قريباً! يمكنك استخدام التحميل المباشر APK.';
      setStatusMessage(msg);
      toast.info(msg);
      return;
    }

    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    setShowModal(false);
  };

  const handleDirectApkClick = () => {
    const { directApkProUrl, directApkPatientUrl } = appsConfig.android;
    const targetUrl = isProRoute
      ? directApkProUrl || directApkPatientUrl
      : directApkPatientUrl || directApkProUrl;

    if (!targetUrl) {
      const msg = 'رابط ملف الـ APK المباشر قيد التحديث حالياً، يمكنك تثبيت نسخة الويب السريعة فوراً.';
      setStatusMessage(msg);
      toast.info(msg);
      return;
    }

    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    toast.success('بدأ تحميل ملف تطبيق الأندرويد (APK)');
    setShowModal(false);
  };

  const handleAppStoreClick = () => {
    const { appStoreStatus, appStoreProUrl, appStorePatientUrl, appStoreComingSoonMessage } =
      appsConfig.ios;

    if (appStoreStatus === 'coming_soon') {
      const msg =
        appStoreComingSoonMessage ||
        'تطبيق المنصة على Apple App Store سيتوفر قريباً! يمكنك حالياً إضافته إلى الشاشة الرئيسية عبر متصفح Safari.';
      setStatusMessage(msg);
      toast.info(msg);
      return;
    }

    const targetUrl = isProRoute
      ? appStoreProUrl || appStorePatientUrl
      : appStorePatientUrl || appStoreProUrl;

    if (!targetUrl) {
      const msg =
        appStoreComingSoonMessage ||
        'تطبيق المنصة على App Store سيتوفر قريباً! استخدم خيار الإضافة إلى الشاشة الرئيسية أدناه.';
      setStatusMessage(msg);
      toast.info(msg);
      return;
    }

    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    setShowModal(false);
  };

  // Smart Multi-Option Install Modal
  const InstallOptionsModal = () => (
    <div
      className="fixed inset-0 z-[250] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      dir="rtl"
      onClick={() => setShowModal(false)}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden mb-14 sm:mb-0 animate-in slide-in-from-bottom-6 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0a192f] via-[#0c2d48] to-[#0D8ABC] p-5 text-white relative">
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3.5">
            <img
              src="/icons/icon-96x96.png"
              alt="Dental Platform"
              className="w-14 h-14 rounded-2xl border-2 border-white/30 shadow-lg bg-white p-0.5"
            />
            <div>
              <div className="inline-flex items-center gap-1 bg-cyan-400/20 text-cyan-200 border border-cyan-300/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold mb-1">
                <Sparkles className="w-3 h-3" />
                <span>
                  {isDesktop
                    ? 'نسخة الحاسوب وسطح المكتب'
                    : isAndroid
                    ? 'نسخة هواتف الأندرويد'
                    : 'نسخة أجهزة الآيفون والآيباد'}
                </span>
              </div>
              <h3 className="font-bold text-lg leading-snug">تثبيت تطبيق المنصة الذكية</h3>
              <p className="text-xs text-white/80">اختر طريقة التثبيت المناسبة لجهازك</p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
          {/* Status / Coming Soon Alert */}
          {statusMessage && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-amber-900 text-xs leading-relaxed animate-in fade-in duration-200">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{statusMessage}</div>
            </div>
          )}

          {/* ================= DESKTOP OPTIONS (WINDOWS EXE + WEB PWA) ================= */}
          {isDesktop && (
            <>
              {appsConfig.windows.exeStatus !== 'hidden' && (
                <button
                  type="button"
                  onClick={handleWindowsExeClick}
                  className="w-full text-right p-4 rounded-2xl border-2 border-blue-100 hover:border-[#0D8ABC] bg-gradient-to-l from-blue-50/70 to-white hover:shadow-md transition-all group flex items-start gap-3.5"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D8ABC] to-[#085f85] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <Monitor className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-gray-900 text-sm">
                        {appsConfig.windows.exeTitle || 'تثبيت نسخة ويندوز (أوفلاين)'}
                      </span>
                      {appsConfig.windows.exeStatus === 'coming_soon' ? (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          قريباً
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-blue-100 text-[#0D8ABC] px-2 py-0.5 rounded-full shrink-0">
                          برنامج Windows .EXE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      {appsConfig.windows.exeSubtitle ||
                        'برنامج سطح المكتب المتكامل • يعمل بدون إنترنت ويدعم الطابعات الحرارية'}
                    </p>
                  </div>
                </button>
              )}

              {appsConfig.windows.pwaEnabled && (
                <button
                  type="button"
                  onClick={handleWebPWAClick}
                  className="w-full text-right p-4 rounded-2xl border border-gray-200 hover:border-teal-500 bg-white hover:bg-teal-50/30 hover:shadow-md transition-all group flex items-start gap-3.5"
                >
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-gray-900 text-sm">
                        {appsConfig.windows.pwaTitle || 'تثبيت نسخة الويب السريعة'}
                      </span>
                      <span className="text-[10px] font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full shrink-0">
                        تثبيت فوري
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      {appsConfig.windows.pwaSubtitle ||
                        'تثبيت مباشر خفيف على المتصفح للوصول السريع من سطح المكتب'}
                    </p>
                  </div>
                </button>
              )}
            </>
          )}

          {/* ================= ANDROID OPTIONS (GOOGLE PLAY + DIRECT APK + PWA) ================= */}
          {isAndroid && (
            <>
              {appsConfig.android.playStoreStatus !== 'hidden' && (
                <button
                  type="button"
                  onClick={handlePlayStoreClick}
                  className="w-full text-right p-4 rounded-2xl border-2 border-emerald-100 hover:border-emerald-500 bg-gradient-to-l from-emerald-50/60 to-white hover:shadow-md transition-all group flex items-center gap-3.5"
                >
                  {/* Google Play SVG Icon */}
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-gray-900 text-sm">متجر Google Play</span>
                      {appsConfig.android.playStoreStatus === 'coming_soon' ? (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          سيتوفر قريباً
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                          <ExternalLink className="w-3 h-3" />
                          رسمي
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {appsConfig.android.playStoreStatus === 'coming_soon'
                        ? 'اضغط هنا لمعرفة تفاصيل توفر التطبيق على متجر Google Play'
                        : 'تحميل وتثبيت التطبيق الرسمي مباشرة من متجر Google Play'}
                    </p>
                  </div>
                </button>
              )}

              {appsConfig.android.directApkEnabled && (
                <button
                  type="button"
                  onClick={handleDirectApkClick}
                  className="w-full text-right p-4 rounded-2xl border border-blue-200 hover:border-[#0D8ABC] bg-blue-50/40 hover:bg-blue-50/80 transition-all group flex items-center gap-3.5"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#0D8ABC] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <Download className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-gray-900 text-sm">
                        {appsConfig.android.directApkTitle || 'تحميل تطبيق الأندرويد المباشر (APK)'}
                      </span>
                      <span className="text-[10px] font-bold bg-blue-100 text-[#0D8ABC] px-2 py-0.5 rounded-full shrink-0">
                        APK مباشر
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      تثبيت مباشر وسريع لملف التطبيق على هاتفك الأندرويد
                    </p>
                  </div>
                </button>
              )}

              {appsConfig.android.pwaEnabled && (
                <button
                  type="button"
                  onClick={handleWebPWAClick}
                  className="w-full text-right p-4 rounded-2xl border border-gray-200 hover:border-teal-500 bg-white transition-all group flex items-center gap-3.5"
                >
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-gray-900 text-sm">
                        تثبيت نسخة الويب السريعة (PWA)
                      </span>
                      <span className="text-[10px] font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full shrink-0">
                        بدون مساحة
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      إضافة أيقونة المنصة للشاشة الرئيسية بضغطة واحدة
                    </p>
                  </div>
                </button>
              )}
            </>
          )}

          {/* ================= iOS OPTIONS (APP STORE + SAFARI ADD TO HOME SCREEN) ================= */}
          {isIOSDevice && (
            <>
              {appsConfig.ios.appStoreStatus !== 'hidden' && (
                <button
                  type="button"
                  onClick={handleAppStoreClick}
                  className="w-full text-right p-4 rounded-2xl border-2 border-slate-200 hover:border-slate-800 bg-gradient-to-l from-slate-50 to-white hover:shadow-md transition-all group flex items-center gap-3.5"
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.96 6.33c.67-.81 1.12-1.94 1-3.08-.96.04-2.13.64-2.82 1.45-.61.7-.115 1.86-1.01 2.97 1.08.08 2.16-.53 2.83-1.34z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-gray-900 text-sm">متجر Apple App Store</span>
                      {appsConfig.ios.appStoreStatus === 'coming_soon' ? (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          سيتوفر قريباً
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full shrink-0">
                          App Store
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {appsConfig.ios.appStoreStatus === 'coming_soon'
                        ? 'اضغط هنا لمعرفة تفاصيل توفر التطبيق على متجر App Store'
                        : 'تحميل التطبيق الرسمي لأجهزة iPhone و iPad'}
                    </p>
                  </div>
                </button>
              )}

              {appsConfig.ios.homeScreenGuideEnabled && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 text-xs">
                      التثبيت الفوري على الشاشة الرئيسية (Safari):
                    </span>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      خطوات سريعة
                    </span>
                  </div>
                  <div className="space-y-2 text-xs text-gray-700">
                    <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-blue-100/80">
                      <span className="w-5 h-5 bg-[#0D8ABC] text-white rounded-full flex items-center justify-center text-[11px] font-bold shrink-0">
                        1
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>اضغط على أيقونة</span>
                        <Share className="w-3.5 h-3.5 text-[#0D8ABC]" />
                        <span className="font-bold text-[#0D8ABC]">المشاركة (Share)</span>
                        <span>أسفل متصفح Safari</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-blue-100/80">
                      <span className="w-5 h-5 bg-[#0D8ABC] text-white rounded-full flex items-center justify-center text-[11px] font-bold shrink-0">
                        2
                      </span>
                      <div>
                        اختر <span className="font-bold">«إضافة إلى الشاشة الرئيسية»</span> (Add to Home Screen)
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-emerald-100">
                      <span className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[11px] font-bold shrink-0">
                        3
                      </span>
                      <div className="flex items-center gap-1">
                        <span>اضغط</span>
                        <span className="font-bold text-emerald-700">«إضافة» (Add)</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-gray-500">نظام إدارة العيادات - Dental Platform</span>
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="px-4 py-1.5 rounded-xl bg-gray-200/80 hover:bg-gray-300 text-gray-700 text-xs font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );

  // ── Floating variant (above bottom nav) ────────────────────────────────────
  if (variant === 'floating') {
    return (
      <>
        <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-2 animate-in slide-in-from-bottom-4 fade-in duration-500">
          <div className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-gradient-to-r from-[#0D8ABC] to-[#0a6fa0] text-white rounded-full shadow-lg shadow-blue-400/40 border border-white/20">
            <img
              src="/icons/icon-72x72.png"
              alt=""
              className="w-7 h-7 rounded-full border-2 border-white/40"
            />

            <button
              type="button"
              onClick={handleOpenModal}
              className="flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              تثبيت التطبيق
            </button>

            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors mr-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {showModal && <InstallOptionsModal />}
      </>
    );
  }

  // ── Banner variant (top of page) ───────────────────────────────────────────
  if (variant === 'banner') {
    return (
      <>
        <div className="relative flex items-center justify-between gap-3 px-4 py-2.5 bg-gradient-to-r from-[#0D8ABC] to-[#0a6fa0] text-white text-sm shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <img src="/icons/icon-72x72.png" alt="logo" className="w-6 h-6 rounded-lg" />
            </div>
            <div className="leading-tight">
              <p className="font-bold text-sm">Dental Platform</p>
              <p className="text-white/80 text-xs">ثبّت التطبيق للوصول السريع</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenModal}
              className="flex items-center gap-1.5 bg-white text-[#0D8ABC] font-bold text-xs px-3 py-1.5 rounded-full hover:bg-blue-50 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              تثبيت
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {showModal && <InstallOptionsModal />}
      </>
    );
  }

  // ── Small icon button variant ───────────────────────────────────────────────
  return (
    <>
      <button
        type="button"
        onClick={handleOpenModal}
        title="تثبيت التطبيق"
        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#0D8ABC] to-[#0a6fa0] text-white text-sm font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md shadow-blue-200"
      >
        <Smartphone className="w-4 h-4" />
        <span className="hidden sm:inline">تثبيت</span>
      </button>
      {showModal && <InstallOptionsModal />}
    </>
  );
}
