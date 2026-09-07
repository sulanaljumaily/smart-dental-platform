import React, { useEffect, useRef } from 'react';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { toast } from 'sonner';

/**
 * OfflineConnectionNotice
 * Handles offline status detection, automated background syncing,
 * and toast notifications without rendering an intrusive fixed banner card.
 */
export const OfflineConnectionNotice: React.FC = () => {
  const { isOnline, triggerSync } = useOfflineStatus();
  const prevOnlineRef = useRef(isOnline);

  useEffect(() => {
    // كشف حالة انقطاع الاتصال
    if (!isOnline && prevOnlineRef.current) {
      toast.warning('انقطع الاتصال بالإنترنت — تم تفعيل وضع عدم الاتصال (أوفلاين)', {
        description: 'يمكنك مواصلة العمل بحرية، وسيتم حفظ كافة البيانات محلياً على جهازك.',
        duration: 5000,
      });
    }

    // كشف حالة استعادة الاتصال
    if (isOnline && !prevOnlineRef.current) {
      triggerSync();

      toast.success('تمت استعادة الاتصال بالإنترنت', {
        description: 'جاري مزامنة السجلات والعمليات المعلقة تلقائياً مع السحابة...',
        duration: 4000,
      });
    }

    prevOnlineRef.current = isOnline;
  }, [isOnline, triggerSync]);

  // إزالة البطاقة البصرية بالكامل والاعتماد على إشعارات التوست الخفيفة
  return null;
};

export default OfflineConnectionNotice;
