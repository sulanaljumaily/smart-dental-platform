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
  setCache,
  getInstantCache,
  SyncQueueItem,
} from './db';

const RESOLVED_PATIENT_IDS_KEY = 'dental_resolved_patient_ids_v1';

function readResolvedPatientMap(): Record<string, string> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(RESOLVED_PATIENT_IDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return {};
}

export function recordResolvedPatientId(oldId: string, newId: string) {
  if (!oldId || !newId || oldId === newId || typeof localStorage === 'undefined') return;
  try {
    const map = readResolvedPatientMap();
    map[String(oldId)] = String(newId);
    localStorage.setItem(RESOLVED_PATIENT_IDS_KEY, JSON.stringify(map));
  } catch {}
}

/**
 * إذا كان المريض قد أُضيف أوفلاين بمعرف مؤقت (UUID) ثم تمت مزامنته وحصل على معرف رقمي جديد،
 * تُعيد هذه الدالة المعرف الرقمي الجديد دائماً.
 */
export function getResolvedPatientId(id?: string | number | null): string {
  if (id === undefined || id === null) return '';
  const str = String(id);
  const map = readResolvedPatientMap();
  return map[str] || str;
}

/**
 * استرجاع المعرف المحلي الأصلي (offline_id) للمريض إن وُجد،
 * لضمان بقاء رابط بوابة المراجع ورمز QR ثابتين 100% قبل وبعد المزامنة.
 */
export function getOriginalOfflinePatientId(id?: string | number | null): string | null {
  if (id === undefined || id === null) return null;
  const str = String(id);
  if (isTempOrNonNumericId(str)) return str;
  const map = readResolvedPatientMap();
  for (const [oldId, newId] of Object.entries(map)) {
    if (String(newId) === str) return oldId;
  }
  try {
    const cachedDetail = getInstantCache<any>('patient_detail_' + str);
    const offlineId =
      cachedDetail?.medicalHistoryData?.offline_id ||
      cachedDetail?.medical_history_data?.offline_id;
    if (offlineId) return String(offlineId);
  } catch {}
  return null;
}

/**
 * تُعيد المعرف الثابت الدائم لبوابة المراجع ورمز QR بحيث يكون الرابط المطبوع
 * أو المشارك في وضع الأوفلاين مطابقاً 100% للرابط في قاعدة البيانات بعد المزامنة.
 */
export function getPermanentPatientPortalSlug(
  patientOrId?: any,
  fallbackId?: string | number | null
): string {
  if (patientOrId && typeof patientOrId === 'object') {
    const fromObj =
      patientOrId.medicalHistoryData?.offline_id ||
      patientOrId.medical_history_data?.offline_id ||
      patientOrId.data?.medical_history_data?.offline_id;
    if (fromObj) return String(fromObj);
    const candidateId = patientOrId.id ?? fallbackId;
    const orig = getOriginalOfflinePatientId(candidateId);
    if (orig) return orig;
    return String(candidateId || '0');
  }
  const targetId = patientOrId ?? fallbackId;
  const orig = getOriginalOfflinePatientId(targetId);
  if (orig) return orig;
  return String(targetId || '0');
}

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
  'patient_files',
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
  'patient_files',
  'treatments',
  'inventory',
  'clinic_inventory',
  'dental_lab_orders',
  'clinic_tasks',
  'tasks',
  'staff',
]);

function base64DataUrlToBlob(dataUrl: string, fallbackMime = 'image/jpeg'): Blob {
  const parts = dataUrl.split(',');
  const header = parts[0] || '';
  const base64 = parts[1] || '';
  const mimeMatch = header.match(/data:([^;]+);base64/i);
  const mime = mimeMatch ? mimeMatch[1] : fallbackMime;
  const binaryStr = atob(base64);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function isTempOrNonNumericId(val: unknown): boolean {
  if (val === undefined || val === null) return false;
  const str = String(val);
  if (str.startsWith('offline_') || str.startsWith('local_') || str.startsWith('temp_')) return true;
  return isNaN(Number(str));
}

/**
 * ترحيل وتحديث كافة نسخ الكاش المحلي (localStorage + Dexie) فور حصول المريض المضاف أوفلاين على معرف رقمي من السيرفر
 */
async function migrateLocalPatientCaches(oldId: string, newId: string) {
  const PREFIX = 'dental_instant_cache_v1_';
  try {
    // 1. ترحيل تفاصيل المريض patient_detail_
    const oldDetail = getInstantCache<any>('patient_detail_' + oldId);
    if (oldDetail) {
      const updatedDetail = {
        ...oldDetail,
        id: String(newId),
        isOfflineUnsynced: false,
        medicalHistoryData: {
          ...(oldDetail.medicalHistoryData || {}),
          offline_id: oldDetail.medicalHistoryData?.offline_id || oldId,
        },
      };
      await setCache('patient_detail_' + newId, updatedDetail, 86400 * 30);
      await setCache('patient_detail_' + oldId, updatedDetail, 86400 * 30);
    }

    // 2. ترحيل خطط العلاج وحالات الأسنان والملفات
    const oldPlans = getInstantCache<any[]>('patient_plans_' + oldId);
    if (Array.isArray(oldPlans)) {
      const updatedPlans = oldPlans.map((p: any) => ({ ...p, patientId: String(newId) }));
      await setCache('patient_plans_' + newId, updatedPlans, 86400 * 30);
    }
    const oldTeeth = getInstantCache<any[]>('patient_teeth_' + oldId);
    if (Array.isArray(oldTeeth)) {
      await setCache('patient_teeth_' + newId, oldTeeth, 86400 * 30);
    }
    const oldFiles = getInstantCache<any[]>('patient_files_' + oldId);
    if (Array.isArray(oldFiles)) {
      await setCache('patient_files_' + newId, oldFiles, 86400 * 30);
    }
    if (typeof localStorage !== 'undefined') {
      try {
        const legacyFilesRaw = localStorage.getItem('dental_instant_patient_files_' + oldId);
        if (legacyFilesRaw) {
          localStorage.setItem('dental_instant_patient_files_' + newId, legacyFilesRaw);
        }
      } catch {}
    }

    if (typeof localStorage === 'undefined') return;

    // 3. تحديث قوائم المرضى والمعاملات المالية والمواعيد في localStorage
    const keysToProcess: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keysToProcess.push(k);
    }

    for (const fullKey of keysToProcess) {
      const shortKey = fullKey.slice(PREFIX.length);
      const raw = localStorage.getItem(fullKey);
      if (!raw) continue;

      if (shortKey.startsWith('patients_')) {
        try {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            let modified = false;
            const nextList = list.map((p: any) => {
              if (p && String(p.id) === String(oldId)) {
                modified = true;
                return {
                  ...p,
                  id: String(newId),
                  isOfflineUnsynced: false,
                  medicalHistoryData: {
                    ...(p.medicalHistoryData || {}),
                    offline_id: p.medicalHistoryData?.offline_id || oldId,
                  },
                };
              }
              return p;
            });
            if (modified) {
              await setCache(shortKey, nextList, 86400 * 30);
            }
          }
        } catch {}
      } else if (shortKey.startsWith('finance_')) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            let modified = false;
            const nextTx = parsed.map((tx: any) => {
              if (tx && (String(tx.patientId) === String(oldId) || String(tx.patient_id) === String(oldId))) {
                modified = true;
                return { ...tx, patientId: String(newId), patient_id: String(newId) };
              }
              return tx;
            });
            if (modified) {
              await setCache(shortKey, nextTx, 86400 * 30);
            }
          } else if (parsed && Array.isArray(parsed.transactions)) {
            let modified = false;
            const nextTx = parsed.transactions.map((tx: any) => {
              if (tx && (String(tx.patientId) === String(oldId) || String(tx.patient_id) === String(oldId))) {
                modified = true;
                return { ...tx, patientId: String(newId), patient_id: String(newId) };
              }
              return tx;
            });
            const updatedObj = { ...parsed, transactions: nextTx };
            if (shortKey.includes(`_${oldId}_`)) {
              const newShortKey = shortKey.replace(`_${oldId}_`, `_${newId}_`);
              await setCache(newShortKey, updatedObj, 86400 * 30);
            }
            if (modified) {
              await setCache(shortKey, updatedObj, 86400 * 30);
            }
          }
        } catch {}
      } else if (shortKey.startsWith('appointments_')) {
        try {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            let modified = false;
            const nextList = list.map((apt: any) => {
              if (apt && String(apt.patientId) === String(oldId)) {
                modified = true;
                return { ...apt, patientId: String(newId) };
              }
              return apt;
            });
            if (modified) {
              await setCache(shortKey, nextList, 86400 * 30);
            }
          }
        } catch {}
      }
    }
  } catch (e) {
    console.warn('[SyncService] migrateLocalPatientCaches error:', e);
  }
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

  // تحديث الجداول المحلية في Dexie والكاش المحلي
  try {
    if (table === 'patients') {
      recordResolvedPatientId(oldId, newId);
      const existing = await db.patients.get(oldId);
      if (existing) {
        const existingData = (existing.data || {}) as Record<string, any>;
        const existingMedData = (existingData.medical_history_data || {}) as Record<string, any>;
        const updatedData = {
          ...existingData,
          id: Number.isNaN(Number(newId)) ? newId : Number(newId),
          medical_history_data: {
            ...existingMedData,
            offline_id: existingMedData.offline_id || oldId,
          },
        };
        await db.patients.delete(oldId);
        await db.patients.put({ ...existing, id: newId, data: updatedData, synced: true });
      }
      // تحديث المواعيد والعلاجات المحلية المرتبطة بالمريض في Dexie
      const localApts = await db.appointments.where('patient_id').equals(oldId).toArray().catch(() => []);
      for (const apt of localApts) {
        await db.appointments.update(apt.id, { patient_id: newId }).catch(() => {});
      }
      await migrateLocalPatientCaches(oldId, newId);
    } else if (table === 'appointments') {
      const existing = await db.appointments.get(oldId);
      if (existing) {
        await db.appointments.delete(oldId);
        await db.appointments.put({ ...existing, id: newId, synced: true });
      }
    } else if (table === 'tooth_treatment_plans') {
      // تحديث معرف الخطة العلاجية في الكاش المحلي
      if (typeof localStorage !== 'undefined') {
        const PREFIX = 'dental_instant_cache_v1_patient_plans_';
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(PREFIX)) {
            try {
              const raw = localStorage.getItem(k);
              if (!raw) continue;
              const plans = JSON.parse(raw);
              if (Array.isArray(plans) && plans.some((p: any) => String(p.id) === String(oldId))) {
                const updated = plans.map((p: any) => (String(p.id) === String(oldId) ? { ...p, id: String(newId) } : p));
                await setCache(k.slice('dental_instant_cache_v1_'.length), updated, 86400 * 30);
              }
            } catch {}
          }
        }
      }
    } else if (table === 'patient_files') {
      if (typeof localStorage !== 'undefined') {
        const PREFIX1 = 'dental_instant_cache_v1_patient_files_';
        const PREFIX2 = 'dental_instant_patient_files_';
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k) continue;
          if (k.startsWith(PREFIX1)) {
            try {
              const raw = localStorage.getItem(k);
              if (!raw) continue;
              const files = JSON.parse(raw);
              if (Array.isArray(files) && files.some((f: any) => String(f.id) === String(oldId))) {
                const updated = files.map((f: any) =>
                  String(f.id) === String(oldId) ? { ...f, id: String(newId), isOfflineUnsynced: false } : f
                );
                await setCache(k.slice('dental_instant_cache_v1_'.length), updated, 86400 * 30);
              }
            } catch {}
          } else if (k.startsWith(PREFIX2)) {
            try {
              const raw = localStorage.getItem(k);
              if (!raw) continue;
              const parsed = JSON.parse(raw);
              const list = Array.isArray(parsed?.data) ? parsed.data : Array.isArray(parsed) ? parsed : null;
              if (list && list.some((f: any) => String(f.id) === String(oldId))) {
                const updated = list.map((f: any) =>
                  String(f.id) === String(oldId) ? { ...f, id: String(newId), isOfflineUnsynced: false } : f
                );
                localStorage.setItem(k, JSON.stringify({ data: updated, timestamp: Date.now() }));
              }
            } catch {}
          }
        }
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

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('dental-sync-id-resolved', {
        detail: { table, oldId: String(oldId), newId: String(newId) },
      })
    );
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
  delete payload.isOfflineUnsynced;

  if (targetTable !== 'patients' && payload.patient_id && isTempOrNonNumericId(payload.patient_id)) {
    const resolvedPid = getResolvedPatientId(String(payload.patient_id));
    if (resolvedPid && !isTempOrNonNumericId(resolvedPid)) {
      payload.patient_id = Number(resolvedPid);
    }
  }

  // إذا كان الملف مرفوعاً في الأرشيف أثناء وضع الأوفلاين (مخزن بصيغة Base64)، نرفعه أولاً إلى Supabase Storage
  if (
    targetTable === 'patient_files' &&
    typeof payload._offline_file_b64 === 'string' &&
    payload._offline_file_b64.startsWith('data:')
  ) {
    const b64Data = String(payload._offline_file_b64);
    const mimeType = String(payload._offline_file_mime || 'image/jpeg');
    const bucket = String(payload._offline_bucket || 'patient-docs');
    const folderType = String(payload._offline_folder || 'xrays');
    const blob = base64DataUrlToBlob(b64Data, mimeType);
    const rawName = String(payload.name || 'file.jpg');
    const extMatch = rawName.split('.').pop();
    const ext = extMatch && extMatch.length <= 5 ? extMatch : mimeType.includes('pdf') ? 'pdf' : 'jpg';
    const filePath = `${payload.patient_id}/${folderType}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

    const { error: storageErr } = await supabase.storage
      .from(bucket)
      .upload(filePath, blob, { contentType: blob.type });

    if (storageErr) {
      throw new Error(storageErr.message);
    }

    const { data: pubUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    if (pubUrlData?.publicUrl) {
      payload.url = pubUrlData.publicUrl;
    }
  }

  delete payload._offline_file_b64;
  delete payload._offline_file_mime;
  delete payload._offline_bucket;
  delete payload._offline_folder;

  switch (operation) {
    case 'INSERT': {
      if (targetTable === 'patients' && isTempOrNonNumericId(record_id)) {
        const currentMed =
          payload.medical_history_data && typeof payload.medical_history_data === 'object'
            ? (payload.medical_history_data as Record<string, unknown>)
            : {};
        payload.medical_history_data = {
          ...currentMed,
          offline_id: currentMed.offline_id || String(record_id),
        };
      }
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

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('dental-sync-completed', {
        detail: { remaining: remaining.length, failCount },
      })
    );
  }
}

// ── إعداد المستمعين التلقائيين ────────────────────────────────────────────
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let initialized = false;

export function scheduleSync(delayMs = 800) {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => runSync(), delayMs);
}

export function initSyncService() {
  if (initialized) return;
  initialized = true;

  // عند عودة الاتصال → مزامنة فورية سريعة
  window.addEventListener('online', () => {
    scheduleSync(500);
  });

  // عند إضافة عنصر جديد للطابور أثناء توفر الإنترنت → مزامنة فورية
  window.addEventListener('dental-sync-queued', () => {
    if (navigator.onLine) scheduleSync(400);
  });

  // فحص دوري كل 45 ثانية
  setInterval(() => {
    if (navigator.onLine) runSync();
  }, 45 * 1000);

  // مزامنة أولية عند تشغيل التطبيق
  if (navigator.onLine) scheduleSync(1200);

  console.log('[SyncService] Initialized ✅');
}
