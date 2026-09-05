/**
 * ClinicOfflineIndicator — مؤشر حالة الاتصال والمزامنة للعيادة
 */
import React from 'react';
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff, Clock } from 'lucide-react';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';

interface ClinicOfflineIndicatorProps {
  compact?: boolean;
  showDetails?: boolean;
}

export const ClinicOfflineIndicator: React.FC<ClinicOfflineIndicatorProps> = ({ 
  compact = false,
  showDetails = true 
}) => {
  const { isOnline, syncStatus, pendingCount, lastSync, triggerSync } = useOfflineStatus();

  // تنسيق آخر مزامنة
  const formatLastSync = (date: Date | null) => {
    if (!date) return 'لم تتم المزامنة بعد';
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
        color: 'text-red-600 bg-red-50 border-red-200',
        text: 'أوفلاين (العمل محلياً)',
        bgColor: 'bg-red-50'
      };
    }
    
    if (syncStatus === 'syncing') {
      return {
        icon: <RefreshCw className="w-4 h-4 animate-spin" />,
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        text: 'جاري المزامنة...',
        bgColor: 'bg-blue-50'
      };
    }
    
    if (syncStatus === 'error') {
      return {
        icon: <CloudOff className="w-4 h-4" />,
        color: 'text-orange-600 bg-orange-50 border-orange-200',
        text: 'خطأ في المزامنة',
        bgColor: 'bg-orange-50'
      };
    }
    
    if (pendingCount > 0) {
      return {
        icon: <Cloud className="w-4 h-4" />,
        color: 'text-amber-600 bg-amber-50 border-amber-200',
        text: `${pendingCount} عمليات بانتظار المزامنة`,
        bgColor: 'bg-amber-50'
      };
    }
    
    return {
      icon: <Wifi className="w-4 h-4" />,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      text: 'متصل ومحدث',
      bgColor: 'bg-emerald-50'
    };
  };

  const status = getStatusConfig();

  if (compact) {
    return (
      <button
        onClick={triggerSync}
        disabled={!isOnline || syncStatus === 'syncing'}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${status.color}`}
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

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${status.color}`}>
      <button
        onClick={triggerSync}
        disabled={!isOnline || syncStatus === 'syncing'}
        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
      >
        {status.icon}
        <span>{status.text}</span>
      </button>
      
      {showDetails && isOnline && (
        <>
          <div className="w-px h-3 bg-current opacity-20" />
          <div className="flex items-center gap-1 opacity-80">
            <Clock className="w-3 h-3" />
            <span>{formatLastSync(lastSync)}</span>
          </div>
          
          {pendingCount > 0 && (
            <>
              <div className="w-px h-3 bg-current opacity-20" />
              <span className="font-bold text-amber-700">
                {pendingCount} معلقة
              </span>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ClinicOfflineIndicator;
