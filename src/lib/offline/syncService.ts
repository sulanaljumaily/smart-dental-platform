/**
 * Dental Platform — Sync Service
 * يُزامن البيانات المحلية مع Supabase عند عودة الاتصال
 */
import { supabase } from '../supabase';
import {
  getPendingSyncItems,
  removeSyncItem,
  updateSyncItemRetry,
  SyncQueueItem,
} from './db';

const MAX_RETRIES = 3;
const BATCH_SIZE = 10;

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

type SyncListener = (status: SyncStatus, pendingCount: number) => void;

// ── Sync Event Bus ────────────────────────────────────────────────────────
const listeners: Set<SyncListener> = new Set();

export function onSyncStatusChange(listener: SyncListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(status: SyncStatus, pendingCount = 0) {
  listeners.forEach(fn => fn(status, pendingCount));
}

// ── تنفيذ عملية واحدة على Supabase ────────────────────────────────────────
async function executeSyncItem(item: SyncQueueItem): Promise<void> {
  const { operation, table, record_id, data } = item;

  // جداول مسموح بها للعمل بدون إنترنت
  const allowedTables = ['patients', 'appointments', 'tasks', 'treatments', 'staff', 'clinic_inventory'];
  
  if (!allowedTables.includes(table)) {
    console.warn(`Table ${table} is not allowed for offline sync`);
    return;
  }

  switch (operation) {
    case 'INSERT':
      await supabase.from(table).insert(data);
      break;
    case 'UPDATE':
      await supabase.from(table).update(data).eq('id', record_id);
      break;
    case 'DELETE':
      await supabase.from(table).delete().eq('id', record_id);
      break;
  }
}

// ── دورة المزامنة الرئيسية ────────────────────────────────────────────────
let isSyncing = false;

export async function runSync(): Promise<void> {
  if (isSyncing || !navigator.onLine) return;

  const pendingItems = await getPendingSyncItems();
  if (pendingItems.length === 0) return;

  isSyncing = true;
  emit('syncing', pendingItems.length);

  // معالجة على دفعات (batch)
  const batches: SyncQueueItem[][] = [];
  for (let i = 0; i < pendingItems.length; i += BATCH_SIZE) {
    batches.push(pendingItems.slice(i, i + BATCH_SIZE));
  }

  let successCount = 0;
  let failCount = 0;

  for (const batch of batches) {
    await Promise.allSettled(
      batch.map(async (item) => {
        if (item.retries >= MAX_RETRIES) {
          // تجاوز الحد الأقصى للمحاولات — تخطي
          failCount++;
          return;
        }
        try {
          await executeSyncItem(item);
          if (item.id !== undefined) {
            await removeSyncItem(item.id);
          }
          successCount++;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          if (item.id !== undefined) {
            await updateSyncItemRetry(item.id, errorMsg);
          }
          failCount++;
        }
      })
    );
  }

  isSyncing = false;

  const remaining = await getPendingSyncItems();
  if (failCount > 0 && remaining.length > 0) {
    emit('error', remaining.length);
  } else {
    emit('success', 0);
  }
}

// ── إعداد المستمعين التلقائيين ────────────────────────────────────────────
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

function scheduleSync(delayMs = 1500) {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => runSync(), delayMs);
}

export function initSyncService() {
  // عند عودة الاتصال → مزامنة فورية
  window.addEventListener('online', () => {
    scheduleSync(1000);
  });

  // فحص دوري كل 5 دقائق
  setInterval(() => {
    if (navigator.onLine) runSync();
  }, 5 * 60 * 1000);

  // مزامنة أولية عند تشغيل التطبيق
  if (navigator.onLine) scheduleSync(3000);

  console.log('[SyncService] Initialized ✅');
}
