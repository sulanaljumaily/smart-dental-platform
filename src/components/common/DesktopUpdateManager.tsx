import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, Sparkles, X, ShieldAlert } from 'lucide-react';
import { usePlatform } from '@/contexts/PlatformContext';
import { isDesktopApp, openExternalUrl } from '@/lib/platform';

const CURRENT_DESKTOP_VERSION = '1.0.0';
const DISMISSED_VERSION_KEY = 'dental_desktop_dismissed_update_version';

function isVersionNewer(current: string, latest: string): boolean {
  if (!latest || latest.trim() === '' || latest.trim() === current.trim()) return false;
  const cParts = current.trim().replace(/^v/i, '').split('.').map(Number);
  const lParts = latest.trim().replace(/^v/i, '').split('.').map(Number);
  const len = Math.max(cParts.length, lParts.length);
  for (let i = 0; i < len; i++) {
    const c = cParts[i] || 0;
    const l = lParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

export const DesktopUpdateManager: React.FC = () => {
  const { appsConfig } = usePlatform();
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(DISMISSED_VERSION_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    // Re-evaluate if admin changes latestVersion live
    if (dismissedVersion && dismissedVersion !== appsConfig.windows.latestVersion) {
      setDismissedVersion(null);
    }
  }, [appsConfig.windows.latestVersion, dismissedVersion]);

  if (!isDesktopApp()) return null;

  const {
    autoUpdateEnabled,
    latestVersion,
    updateDownloadUrl,
    exeDownloadUrl,
    releaseNotes,
    forceUpdate,
  } = appsConfig.windows;

  if (!autoUpdateEnabled) return null;

  const downloadTarget = updateDownloadUrl || exeDownloadUrl;
  if (!downloadTarget) return null;

  const hasNewer = isVersionNewer(CURRENT_DESKTOP_VERSION, latestVersion);
  if (!hasNewer) return null;

  if (!forceUpdate && dismissedVersion === latestVersion) return null;

  const handleDismiss = () => {
    if (forceUpdate) return;
    setDismissedVersion(latestVersion);
    try {
      sessionStorage.setItem(DISMISSED_VERSION_KEY, latestVersion);
    } catch {
      // ignore
    }
  };

  const handleDownloadUpdate = async () => {
    await openExternalUrl(downloadTarget);
  };

  return (
    <div
      className="fixed inset-0 z-[300] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
      dir="rtl"
    >
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden">
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-[#0a192f] via-[#0c2d48] to-[#0D8ABC] p-6 text-white relative">
          {!forceUpdate && (
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
              <RefreshCw className="w-7 h-7 text-cyan-300 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 bg-cyan-400/20 text-cyan-200 border border-cyan-300/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold mb-1">
                <Sparkles className="w-3 h-3" />
                <span>تحديث جديد متوفر • v{latestVersion}</span>
              </div>
              <h3 className="font-bold text-lg">تحديث نظام إدارة العيادات</h3>
              <p className="text-xs text-white/80">الإصدار الحالي لديك: v{CURRENT_DESKTOP_VERSION}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {forceUpdate && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-xs text-red-800 font-bold">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <span>هذا التحديث ضروري لضمان استمرار عمل ومزامنة النظام بشكل سليم.</span>
            </div>
          )}

          {releaseNotes && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1.5">
              <div className="text-xs font-bold text-slate-800">ما الجديد في الإصدار {latestVersion}؟</div>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{releaseNotes}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleDownloadUpdate}
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#0D8ABC] to-[#085f85] hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تحميل وتثبيت التحديث الآن</span>
            </button>

            {!forceUpdate && (
              <button
                type="button"
                onClick={handleDismiss}
                className="py-3 px-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
              >
                لاحقاً
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
