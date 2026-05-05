import React, { useState } from 'react';
import { Download, Smartphone, X, Share } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'floating' | 'banner' | 'button';
}

export function PWAInstallButton({ variant = 'floating' }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, installApp } = usePWAInstall();
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || dismissed || !isInstallable) return null;

  const handleClick = () => {
    if (isIOS) {
      setShowIOSHint(true);
    } else {
      installApp();
    }
  };

  // iOS Instructions Modal (shared)
  const IOSModal = () => (
    <div
      className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-end justify-center p-4"
      onClick={() => setShowIOSHint(false)}
    >
      <div
        className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl mb-20"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <img src="/icons/icon-96x96.png" alt="logo" className="w-12 h-12 rounded-2xl shadow" />
          <div>
            <h3 className="font-bold text-gray-900">تثبيت DentalPlatform</h3>
            <p className="text-xs text-gray-500">على جهاز iPhone / iPad</p>
          </div>
        </div>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
            <div className="flex items-center gap-2 flex-wrap">
              <span>اضغط أيقونة</span>
              <Share className="w-4 h-4 text-blue-500" />
              <span className="font-medium text-blue-700">المشاركة</span>
              <span>في المتصفح</span>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
            <div>اختر <span className="font-bold">"إضافة إلى الشاشة الرئيسية"</span></div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
            <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
            <div>اضغط <span className="font-bold text-green-700">إضافة</span> لتثبيت التطبيق</div>
          </div>
        </div>
        <button
          onClick={() => setShowIOSHint(false)}
          className="w-full mt-4 py-2.5 bg-[#0D8ABC] text-white font-bold rounded-2xl hover:bg-[#0a6fa0] transition-colors"
        >
          فهمت
        </button>
      </div>
    </div>
  );

  // ── Floating variant (above bottom nav) ────────────────────────────────────
  if (variant === 'floating') {
    return (
      <>
        {/* Floating pill — sits just above the bottom nav bar (bottom-20 ≈ 80px) */}
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-2 animate-in slide-in-from-bottom-4 fade-in duration-500">
          <div className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-gradient-to-r from-[#0D8ABC] to-[#0a6fa0] text-white rounded-full shadow-lg shadow-blue-400/40 border border-white/20">
            {/* App icon */}
            <img src="/icons/icon-72x72.png" alt="" className="w-7 h-7 rounded-full border-2 border-white/40" />

            {/* Install button */}
            <button
              onClick={handleClick}
              className="flex items-center gap-1.5 text-xs font-bold"
            >
              <Download className="w-3.5 h-3.5" />
              تثبيت التطبيق
            </button>

            {/* Dismiss */}
            <button
              onClick={() => setDismissed(true)}
              className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors mr-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {showIOSHint && <IOSModal />}
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
              <p className="font-bold text-sm">DentalPlatform</p>
              <p className="text-white/80 text-xs">ثبّت التطبيق للوصول السريع</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClick}
              className="flex items-center gap-1.5 bg-white text-[#0D8ABC] font-bold text-xs px-3 py-1.5 rounded-full hover:bg-blue-50 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              تثبيت
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {showIOSHint && <IOSModal />}
      </>
    );
  }

  // ── Small icon button variant ───────────────────────────────────────────────
  return (
    <>
      <button
        onClick={handleClick}
        title="تثبيت التطبيق"
        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#0D8ABC] to-[#0a6fa0] text-white text-sm font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md shadow-blue-200"
      >
        <Smartphone className="w-4 h-4" />
        <span className="hidden sm:inline">تثبيت</span>
      </button>
      {showIOSHint && <IOSModal />}
    </>
  );
}
