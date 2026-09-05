/**
 * ClinicOfflineIndicator — بطاقة مؤشر حالة الاتصال والمزامنة للعيادة
 */
import React from 'react';
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff, Clock, CheckCircle2 } from 'lucide-react';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';

interface ClinicOfflineIndicatorProps {
  compact?: boolean;
  showDetails?: boolean;
  className?: string;
}

export const ClinicOfflineIndicator: React.FC<ClinicOfflineIndicatorProps> = ({ 
  compact = false,
  showDetails = true,
  className = ''
}) => {
  const { isOnline, syncStatus, pendingCount, lastSync, triggerSync } = useOfflineStatus();

  // تنسيق تاريخ آخر مزامنة
  const formatLastSync = (date: Date | null) => {
    if (!date) return 'لم تتم بعد';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${Math.floor(hours / 24)} يوم`;
  };

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        icon: <WifiOff className="w-4 h-4" />,
        badgeColor: 'text-red-700 bg-red-100 border-red-200',
        cardBorder: 'border-red-200 bg-red-50/60',
        text: 'أوفلاين (العمل محلياً)',
        description: 'يتم حفظ السجلات محلياً في الذاكرة السريعة'
      };
    }
    
    if (syncStatus === 'syncing') {
      return {
        icon: <RefreshCw className="w-4 h-4 animate-spin" />,
        badgeColor: 'text-blue-700 bg-blue-100 border-blue-200',
        cardBorder: 'border-blue-200 bg-blue-50/60',
        text: 'جاري المزامنة...',
        description: 'يتم الآن رفع التعديلات ومزامنتها مع الخادم'
      };
    }
    
    if (syncStatus === 'error') {
      return {
        icon: <CloudOff className="w-4 h-4" />,
        badgeColor: 'text-orange-700 bg-orange-100 border-orange-200',
        cardBorder: 'border-orange-200 bg-orange-50/60',
        text: 'خطأ في المزامنة',
        description: 'تعذر رفع بعض السجلات، سيتم تكرار المحاولة تلقائياً'
      };
    }
    
    if (pendingCount > 0) {
      return {
        icon: <Cloud className="w-4 h-4" />,
        badgeColor: 'text-amber-700 bg-amber-100 border-amber-200',
        cardBorder: 'border-amber-200 bg-amber-50/60',
        text: `${pendingCount} عمليات بانتظار المزامنة`,
        description: 'توجد تعديلات محلية جاهزة للمزامنة'
      };
    }
    
    return {
      icon: <CheckCircle2 className="w-4 h-4" />,
      badgeColor: 'text-emerald-700 bg-emerald-100 border-emerald-200',
      cardBorder: 'border-emerald-200 bg-emerald-50/50',
      text: 'متصل ومحدث',
      description: 'جميع السجلات متزامنة مع السحابة'
    };
  };

  const status = getStatusConfig();

  // النسخة المصغرة عند الحاجة
  if (compact) {
    return (
      <button
        onClick={triggerSync}
        disabled={!isOnline || syncStatus === 'syncing'}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${status.badgeColor} ${className}`}
        title={status.text}
      >
        {status.icon}
        <span>{status.text}</span>
        {pendingCount > 0 && (
          <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
        )}
      </button>
    );
  }

  // بطاقة حالة المزامنة داخل قائمة وبطاقة الإشعارات
  return (
    <div className={`p-3 m-2 rounded-xl border transition-all ${status.cardBorder} ${className}`} dir="rtl">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-white shadow-xs text-gray-700">
            {isOnline ? <Wifi className="w-4 h-4 text-emerald-600" /> : <WifiOff className="w-4 h-4 text-red-600" />}
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">حالة المزامنة السحابية</h4>
            <p className="text-[11px] text-gray-500">{status.description}</p>
          </div>
        </div>

        {/* شارة الحالة */}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${status.badgeColor}`}>
          {status.icon}
          <span>{status.text}</span>
        </span>
      </div>

      {showDetails && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-200/50 text-[11px] text-gray-600">
          <div className="flex items-center gap-1 text-gray-500">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>آخر مزامنة: <strong>{formatLastSync(lastSync)}</strong></span>
          </div>

          <button
            onClick={triggerSync}
            disabled={!isOnline || syncStatus === 'syncing'}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            <span>{syncStatus === 'syncing' ? 'جاري التحديث...' : 'مزامنة الآن'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ClinicOfflineIndicator;
