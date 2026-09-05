/**
 * useOfflineStatus — Hook مركزي لمراقبة حالة الاتصال والمزامنة
 */
import { useState, useEffect, useCallback } from 'react';
import { getSyncQueueCount } from '../lib/offline/db';
import { onSyncStatusChange, runSync, SyncStatus } from '../lib/offline/syncService';

export interface OfflineState {
  isOnline: boolean;
  syncStatus: SyncStatus;
  pendingCount: number;       // عدد العمليات في طابور المزامنة
  lastSync: Date | null;      // آخر مزامنة ناجحة
  triggerSync: () => void;    // مزامنة يدوية
}

export function useOfflineStatus(): OfflineState {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // تحديث عداد الانتظار
  const refreshCount = useCallback(async () => {
    try {
      const count = await getSyncQueueCount();
      setPendingCount(count);
    } catch {
      // IndexedDB might not be initialized yet
    }
  }, []);

  useEffect(() => {
    // مراقبة حالة الاتصال
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // الاستماع لتغييرات حالة المزامنة
    const unsubscribe = onSyncStatusChange((status, count) => {
      setSyncStatus(status);
      setPendingCount(count);
      if (status === 'success') {
        setLastSync(new Date());
        // العودة لـ idle بعد 3 ثوانٍ
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    });

    // حساب أولي
    refreshCount();

    // تحديث العداد كل 30 ثانية
    const interval = setInterval(refreshCount, 30_000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
      clearInterval(interval);
    };
  }, [refreshCount]);

  const triggerSync = useCallback(() => {
    if (isOnline) runSync();
  }, [isOnline]);

  return { isOnline, syncStatus, pendingCount, lastSync, triggerSync };
}
