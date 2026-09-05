import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, X } from 'lucide-react';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { toast } from 'sonner';

export const OfflineConnectionNotice: React.FC = () => {
  const { isOnline, syncStatus, pendingCount, triggerSync } = useOfflineStatus();
  const [showBanner, setShowBanner] = useState(false);
  const [isReconnected, setIsReconnected] = useState(false);
  const prevOnlineRef = useRef(isOnline);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // كشف حالة انقطاع الاتصال
    if (!isOnline && prevOnlineRef.current) {
      setIsReconnected(false);
      setShowBanner(true);
      toast.warning('انقطع الاتصال بالإنترنت — تم تفعيل وضع عدم الاتصال (أوفلاين)', {
        description: 'يمكنك مواصلة العمل بحرية، وسيتم حفظ كافة البيانات محلياً على جهازك.',
        duration: 5000,
      });
    }

    // كشف حالة استعادة الاتصال
    if (isOnline && !prevOnlineRef.current) {
      setIsReconnected(true);
      setShowBanner(true);
      triggerSync();

      toast.success('تمت استعادة الاتصال بالإنترنت', {
        description: 'جاري مزامنة السجلات والعمليات المعلقة تلقائياً مع السحابة...',
        duration: 4000,
      });

      // إخفاء تلقائي بعد 4.5 ثوانٍ من استعادة الاتصال
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        setShowBanner(false);
        setIsReconnected(false);
      }, 4500);
    }

    prevOnlineRef.current = isOnline;

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [isOnline, triggerSync]);

  // في حالة كان غير متصل أساساً عند تحميل الصفحة لأول مرة
  useEffect(() => {
    if (!navigator.onLine) {
      setShowBanner(true);
      setIsReconnected(false);
    }
  }, []);

  if (!showBanner) return null;

  return (
    <div
      className="fixed top-3 left-1/2 transform -translate-x-1/2 z-[99999] w-[92%] max-w-lg animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-auto"
      dir="rtl"
    >
      <div
        className={`rounded-2xl p-3.5 shadow-2xl border backdrop-blur-lg flex items-center justify-between gap-3 text-white transition-all ${
          isReconnected
            ? 'bg-emerald-600/95 border-emerald-400 shadow-emerald-500/20'
            : 'bg-amber-600/95 border-amber-400 shadow-amber-500/20'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
              isReconnected ? 'bg-emerald-500/40 text-white' : 'bg-amber-500/40 text-white animate-pulse'
            }`}
          >
            {isReconnected ? (
              <CheckCircle2 className="w-5 h-5 text-white" />
            ) : (
              <WifiOff className="w-5 h-5 text-white" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm leading-snug">
              {isReconnected ? 'تمت استعادة الاتصال بالإنترنت' : 'أنت الآن في وضع عدم الاتصال (أوفلاين)'}
            </h4>
            <p className="text-xs text-white/90 leading-tight mt-0.5 truncate">
              {isReconnected
                ? syncStatus === 'syncing'
                  ? 'جاري مزامنة السجلات المعلقة مع السحابة...'
                  : 'تم استئناف الاتصال بنجاح وجميع السجلات محدثة'
                : pendingCount > 0
                ? `النظام يعمل محلياً ولديك ${pendingCount} عملية بانتظار المزامنة`
                : 'النظام يعمل محلياً ويتم حفظ كافة التغييرات على جهازك'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isReconnected && syncStatus === 'syncing' && (
            <RefreshCw className="w-4 h-4 text-white animate-spin mx-1" />
          )}

          <button
            onClick={() => setShowBanner(false)}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white/90 hover:text-white"
            title="إغلاق الإشعار"
            aria-label="إغلاق الإشعار"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfflineConnectionNotice;
