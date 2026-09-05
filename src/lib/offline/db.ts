/**
 * Dental Platform — Offline Database (IndexedDB via Dexie.js)
 * يُخزّن البيانات محلياً للعمل بدون إنترنت
 */
import Dexie, { Table } from 'dexie';

// ── أنواع البيانات المحلية ─────────────────────────────────────────────────

export interface LocalPatient {
  id: string;
  clinic_id: string;
  name: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  data: Record<string, unknown>; // بيانات إضافية
  synced: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalAppointment {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id?: string;
  title: string;
  date: string;
  time?: string;
  status: string;
  notes?: string;
  data: Record<string, unknown>;
  synced: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalTask {
  id: string;
  clinic_id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  data: Record<string, unknown>;
  synced: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalTreatment {
  id: string;
  clinic_id: string;
  patient_id: string;
  title: string;
  description?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  notes?: string;
  data: Record<string, unknown>;
  synced: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalClinicData {
  id?: number;
  clinic_id: string;
  data_type: 'overview' | 'patients' | 'appointments' | 'staff' | 'inventory';
  data: Record<string, unknown>;
  cached_at: number;
  expires_at: number;
}

export interface LocalMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  status: 'pending' | 'sent' | 'failed';
  synced: boolean;
  created_at: string;
}

export interface SyncQueueItem {
  id?: number; // auto-increment
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;         // 'patients' | 'appointments' | 'tasks' | 'messages' | 'treatments'
  record_id: string;
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
  last_error?: string;
}

export interface LocalCache {
  key: string;           // e.g., 'clinic_123_overview'
  data: unknown;
  cached_at: number;
  expires_at: number;    // timestamp
}

export interface LocalUserProfile {
  id: string;
  role?: string;
  profile_data: Record<string, unknown>;
  cached_at: number;
}

// ── تعريف قاعدة البيانات ───────────────────────────────────────────────────

export class DentalPlatformDB extends Dexie {
  patients!: Table<LocalPatient, string>;
  appointments!: Table<LocalAppointment, string>;
  tasks!: Table<LocalTask, string>;
  treatments!: Table<LocalTreatment, string>;
  messages!: Table<LocalMessage, string>;
  sync_queue!: Table<SyncQueueItem, number>;
  cache!: Table<LocalCache, string>;
  clinic_data!: Table<LocalClinicData, number>;
  user_profile!: Table<LocalUserProfile, string>;

  constructor() {
    super('DentalPlatformDB');
    this.version(2).stores({
      patients:     'id, clinic_id, synced, updated_at',
      appointments: 'id, clinic_id, patient_id, date, synced',
      tasks:        'id, clinic_id, user_id, status, synced',
      treatments:   'id, clinic_id, patient_id, status, synced',
      messages:     'id, conversation_id, synced, created_at',
      sync_queue:   '++id, table, operation, timestamp, retries',
      cache:        'key, expires_at',
      clinic_data:  '++id, clinic_id, data_type, cached_at',
      user_profile: 'id, role',
    });
  }
}

// Singleton instance
export const db = new DentalPlatformDB();

// ── دوال مساعدة للـ Cache ──────────────────────────────────────────────────

/** حفظ بيانات في الكاش المحلي */
export async function setCache(key: string, data: unknown, ttlSeconds = 300) {
  const now = Date.now();
  await db.cache.put({
    key,
    data,
    cached_at: now,
    expires_at: now + ttlSeconds * 1000,
  });
}

/** قراءة بيانات من الكاش (null إذا انتهت صلاحيتها) */
export async function getCache<T>(key: string): Promise<T | null> {
  const item = await db.cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expires_at) {
    await db.cache.delete(key);
    return null;
  }
  return item.data as T;
}

/** حذف الكاش المنتهي الصلاحية */
export async function cleanExpiredCache() {
  const now = Date.now();
  await db.cache.where('expires_at').below(now).delete();
}

// ── دوال مساعدة لطابور المزامنة ───────────────────────────────────────────

/** إضافة عملية لطابور المزامنة */
export async function addToSyncQueue(
  operation: SyncQueueItem['operation'],
  table: string,
  record_id: string,
  data: Record<string, unknown>
) {
  await db.sync_queue.add({
    operation,
    table,
    record_id,
    data,
    timestamp: Date.now(),
    retries: 0,
  });
}

/** الحصول على العناصر غير المتزامنة مرتبة بالأقدم أولاً */
export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  return db.sync_queue.orderBy('timestamp').toArray();
}

/** حذف عنصر من طابور المزامنة بعد نجاح الرفع */
export async function removeSyncItem(id: number) {
  await db.sync_queue.delete(id);
}

/** تحديث عدد المحاولات وسبب الفشل */
export async function updateSyncItemRetry(id: number, error: string) {
  const item = await db.sync_queue.get(id);
  if (item) {
    await db.sync_queue.update(id, {
      retries: (item.retries || 0) + 1,
      last_error: error,
    });
  }
}

/** عدد العناصر المنتظرة مزامنة */
export async function getSyncQueueCount(): Promise<number> {
  return db.sync_queue.count();
}

// ── دوال مساعدة للبيانات المحلية ───────────────────────────────────────────

/** حفظ بيانات العيادة مؤقتاً */
export async function saveClinicData(
  clinicId: string,
  dataType: LocalClinicData['data_type'],
  data: Record<string, unknown>,
  ttlSeconds = 3600 // ساعة واحدة كـ TTL افتراضي
) {
  const now = Date.now();
  await db.clinic_data.put({
    clinic_id: clinicId,
    data_type: dataType,
    data,
    cached_at: now,
    expires_at: now + ttlSeconds * 1000,
  });
}

/** قراءة بيانات العيادة من التخزين المحلي */
export async function getClinicData<T>(
  clinicId: string,
  dataType: LocalClinicData['data_type']
): Promise<T | null> {
  const item = await db.clinic_data
    .where({ clinic_id: clinicId, data_type: dataType })
    .first();
  
  if (!item) return null;
  if (Date.now() > item.expires_at) {
    if (item.id) await db.clinic_data.delete(item.id);
    return null;
  }
  return item.data as T;
}

/** حذف بيانات عيادة منتهية الصلاحية */
export async function clearExpiredClinicData() {
  const now = Date.now();
  await db.clinic_data.where('expires_at').below(now).delete();
}

/** حفظ جميع بيانات العيادة دفعة واحدة (للتخزين المؤقت) */
export async function preloadClinicData(
  clinicId: string,
  data: {
    overview?: Record<string, unknown>;
    patients?: Record<string, unknown>[];
    appointments?: Record<string, unknown>[];
    staff?: Record<string, unknown>[];
    inventory?: Record<string, unknown>[];
  }
) {
  const now = Date.now();
  const ttl = 3600 * 1000; // ساعة
  
  const items: LocalClinicData[] = [];
  
  if (data.overview) {
    items.push({
      clinic_id: clinicId,
      data_type: 'overview',
      data: data.overview,
      cached_at: now,
      expires_at: now + ttl,
    });
  }
  if (data.patients) {
    items.push({
      clinic_id: clinicId,
      data_type: 'patients',
      data: { patients: data.patients, count: data.patients.length },
      cached_at: now,
      expires_at: now + ttl,
    });
  }
  if (data.appointments) {
    items.push({
      clinic_id: clinicId,
      data_type: 'appointments',
      data: { appointments: data.appointments, count: data.appointments.length },
      cached_at: now,
      expires_at: now + ttl,
    });
  }
  if (data.staff) {
    items.push({
      clinic_id: clinicId,
      data_type: 'staff',
      data: { staff: data.staff, count: data.staff.length },
      cached_at: now,
      expires_at: now + ttl,
    });
  }
  if (data.inventory) {
    items.push({
      clinic_id: clinicId,
      data_type: 'inventory',
      data: { inventory: data.inventory, count: data.inventory.length },
      cached_at: now,
      expires_at: now + ttl,
    });
  }
  
  await db.clinic_data.bulkPut(items);
}

/** جلب كل بيانات العيادة دفعة واحدة */
export async function getAllClinicData(clinicId: string) {
  const items = await db.clinic_data
    .where('clinic_id')
    .equals(clinicId)
    .toArray();
  
  const result: Record<string, unknown> = {};
  for (const item of items) {
    result[item.data_type] = item.data;
  }
  return result;
}

// ── دوال Treatments ────────────────────────────────────────────────────────

/** حفظ treatment محلياً */
export async function saveTreatmentLocally(treatment: Omit<LocalTreatment, 'synced' | 'created_at' | 'updated_at'>) {
  const now = new Date().toISOString();
  await db.treatments.put({
    ...treatment,
    synced: false,
    created_at: now,
    updated_at: now,
  });
}

/** جلب treatments لمريض معين */
export async function getPatientTreatments(patientId: string): Promise<LocalTreatment[]> {
  return db.treatments.where('patient_id').equals(patientId).toArray();
}

/** جلب كل treatments للعيادة */
export async function getClinicTreatments(clinicId: string): Promise<LocalTreatment[]> {
  return db.treatments.where('clinic_id').equals(clinicId).toArray();
}
