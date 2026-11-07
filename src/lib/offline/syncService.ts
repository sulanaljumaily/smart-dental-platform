/**
 * Dental Platform — Sync Service
 * يُزامن البيانات المحلية مع Supabase عند عودة الاتصال بالترتيب الزمني مع ربط المعرفات المؤقتة
 */
import { supabase } from '../supabase';
import {
  db,
  getPendingSyncItems,
  removeSyncItem,
  updateSyncItemRetry,
  SyncQueueItem,
} from './db';

const MAX_RETRIES = 4;

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

const ALLOWED_TABLES = [
  'patients',
  'appointments',
  'financial_transactions',
  'tooth_treatment_plans',
  'treatment_sessions',
  'patient_teeth',
  'treatments',
  'inventory',
  'clinic_inventory',
  'assets',
  'dental_lab_orders',
  'clinic_tasks',
  'tasks',
  'staff',
];

// الجداول التي تستخدم معرفات رقمية تلقائية (Serial / BigInt) في قاعدة البيانات
const INTEGER_PK_TABLES = new Set([
  'patients',
  'appointments',
  'financial_transactions',
  'treatments',
  'inventory',
  'clinic_inventory',
  'dental_lab_orders',
  'clinic_tasks',
  'tasks',
  'staff',
]);

function isTempOrNonNumericId(val: unknown): boolean {
  if (val === undefined || val === null) return false;
  const str = String(val);
  if (str.startsWith('offline_') || str.startsWith('local_') || str.startsWith('temp_')) return true;
  return isNaN(Number(str));
}

/**
 * استبدال المعرف المؤقت بالمعرف الحقيقي في طابور المزامنة والذاكرة المحلية
 */
async function propagateResolvedId(
  table: string,
  oldId: string,
  newId: string,
  remainingItems: SyncQueueItem[]
) {
  if (!oldId || !newId || oldId === newId) return;

  // تحديث الجداول المحلية في Dexie
  try {
    if (table === 'patients') {
      const existing = await db.patients.get(oldId);
      if (existing) {
        await db.patients.delete(oldId);
        await db.patients.put({ ...existing, id: newId, synced: true });
      }
    } else if (table === 'appointments') {
      const existing = await db.appointments.get(oldId);
      if (existing) {
        await db.appointments.delete(oldId);
        await db.appointments.put({ ...existing, id: newId, synced: true });
      }
    }
  } catch (e) {
    console.warn('[SyncService] Failed to update local Dexie record ID:', e);
  }

  // تحديث العمليات اللاحقة في طابور المزامنة التي تشير إلى المعرف المؤقت
  for (const pending of remainingItems) {
    let changed = false;
    if (pending.record_id === oldId && pending.table === table) {
      pending.record_id = newId;
      changed = true;
    }
    if (pending.data && typeof pending.data === 'object') {
      if (table === 'patients' && String(pending.data.patient_id) === oldId) {
        pending.data.patient_id = Number.isNaN(Number(newId)) ? newId : Number(newId);
        changed = true;
      }
      if (table === 'tooth_treatment_plans' && String(pending.data.treatment_plan_id) === oldId) {
        pending.data.treatment_plan_id = newId;
        changed = true;
      }
      if (table === 'tooth_treatment_plans' && String(pending.data.treatment_id) === oldId) {
        pending.data.treatment_id = newId;
        changed = true;
      }
      if (table === 'appointments' && String(pending.data.appointment_id) === oldId) {
        pending.data.appointment_id = Number.isNaN(Number(newId)) ? newId : Number(newId);
        changed = true;
      }
      if (pending.table === table && String(pending.data.id) === oldId) {
        pending.data.id = Number.isNaN(Number(newId)) ? newId : Number(newId);
        changed = true;
      }
    }
    if (changed && pending.id !== undefined) {
      try {
        await db.sync_queue.update(pending.id, {
          record_id: pending.record_id,
          data: pending.data,
        });
      } catch {}
    }
  }
}

// ── تنفيذ عملية واحدة على Supabase ────────────────────────────────────────
async function executeSyncItem(
  item: SyncQueueItem,
  remainingItems: SyncQueueItem[]
): Promise<void> {
  const { operation, table, record_id, data } = item;

  if (!ALLOWED_TABLES.includes(table)) {
    console.warn(`[SyncService] Table ${table} is not in allowed list, skipping.`);
    return;
  }

  const targetTable = table === 'clinic_inventory' ? 'inventory' : table === 'tasks' ? 'clinic_tasks' : table;
  const payload = data ? { ...data } : {};

  // تنظيف الحقول المحلية فقط التي لا توجد في جداول Supabase
  delete payload.synced;

  switch (operation) {
    case 'INSERT': {
      if (INTEGER_PK_TABLES.has(targetTable) && isTempOrNonNumericId(payload.id)) {
        delete payload.id;
      } else if (typeof payload.id === 'string' && payload.id.startsWith('offline_')) {
        delete payload.id;
      }

      const { data: inserted, error } = await supabase
        .from(targetTable)
        .insert(payload)
        .select('id')
        .maybeSingle();

      if (error) throw new Error(error.message);

      if (inserted?.id !== undefined && inserted?.id !== null) {
        const newId = String(inserted.id);
        await propagateResolvedId(targetTable, String(record_id), newId, remainingItems);
      } else if (targetTable === 'patients') {
        await db.patients.update(String(record_id), { synced: true }).catch(() => {});
      } else if (targetTable === 'appointments') {
        await db.appointments.update(String(record_id), { synced: true }).catch(() => {});
      }
      break;
    }

    case 'UPSERT': {
      const onConflict =
        targetTable === 'patient_teeth'
          ? 'patient_id,tooth_number'
          : (payload._onConflict as string | undefined);
      delete payload._onConflict;

      const query = onConflict
        ? supabase.from(targetTable).upsert(payload, { onConflict })
        : supabase.from(targetTable).upsert(payload);

      const { error } = await query;
      if (error) throw new Error(error.message);
      break;
    }

    case 'UPDATE': {
      delete payload.id;
      // إذا كان السجل لا يزال بمعرف مؤقت لم يُزامن بعد، نتخطى التحديث المباشر
      if (INTEGER_PK_TABLES.has(targetTable) && isTempOrNonNumericId(record_id)) {
        return;
      }
      const { error } = await supabase.from(targetTable).update(payload).eq('id', record_id);
      if (error) throw new Error(error.message);
      break;
    }

    case 'DELETE': {
      if (INTEGER_PK_TABLES.has(targetTable) && isTempOrNonNumericId(record_id)) {
        // السجل لم يُرفع للسيرفر أصلاً وتم حذفه محلياً
        return;
      }
      const { error } = await supabase.from(targetTable).delete().eq('id', record_id);
      if (error) throw new Error(error.message);
      break;
    }
  }
}

// ── دورة المزامنة الرئيسية (متسلسلة لضمان الاعتمادية بين الجداول) ────────────
let isSyncing = false;

export async function runSync(): Promise<void> {
  if (isSyncing || !navigator.onLine) return;

  const pendingItems = await getPendingSyncItems();
  if (pendingItems.length === 0) return;

  isSyncing = true;
  emit('syncing', pendingItems.length);

  let failCount = 0;

  for (let i = 0; i < pendingItems.length; i++) {
    if (!navigator.onLine) break;
    const item = pendingItems[i];
    const remainingItems = pendingItems.slice(i + 1);

    if (item.retries >= MAX_RETRIES) {
      // إزالة العملية التالفة بعد استنفاد المحاولات حتى لا تعطل الطابور للأبد
      if (item.id !== undefined) {
        await removeSyncItem(item.id);
      }
      continue;
    }

    try {
      await executeSyncItem(item, remainingItems);
      if (item.id !== undefined) {
        await removeSyncItem(item.id);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[SyncService] Failed syncing ${item.table} (${item.operation}):`, errorMsg);
      if (item.id !== undefined) {
        await updateSyncItemRetry(item.id, errorMsg);
      }
      failCount++;
    }
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
let initialized = false;

export function scheduleSync(delayMs = 1500) {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => runSync(), delayMs);
}

export function initSyncService() {
  if (initialized) return;
  initialized = true;

  // عند عودة الاتصال → مزامنة فورية
  window.addEventListener('online', () => {
    scheduleSync(1000);
  });

  // فحص دوري كل دقيقتين
  setInterval(() => {
    if (navigator.onLine) runSync();
  }, 2 * 60 * 1000);

  // مزامنة أولية عند تشغيل التطبيق
  if (navigator.onLine) scheduleSync(2500);

  console.log('[SyncService] Initialized ✅');
}
