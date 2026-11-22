/**
 * Dental Platform — Clinic Full Offline Preloader
 * يقوم بالتحميل المسبق لجميع أقسام العيادة (الأصول، المخزون، العلاجات، المالية، المواعيد، طلبات الحجز الرقمية، الخطط العلاجية)
 * في Dexie و LocalStorage بمجرد فتح لوحة تحكم العيادة أونلاين، حتى تكون جميع التبويبات
 * جاهزة للعرض الفوري (0ms) عند انقطاع الإنترنت حتى لو لم يفتحها الطبيب مسبقاً.
 */
import { supabase, ensureFreshOnlineSession } from '../supabase';
import { db, LocalAppointment, setCache, getInstantCache } from './db';

const lastPreloadedAt = new Map<string, number>();
const PRELOAD_COOLDOWN_MS = 25000;

export async function preloadClinicOfflineData(clinicId?: string | null, force = false): Promise<void> {
  if (!clinicId || clinicId === '0' || clinicId === 'all') return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  const cid = String(clinicId);
  const lastAt = lastPreloadedAt.get(cid) || 0;
  if (!force && Date.now() - lastAt < PRELOAD_COOLDOWN_MS) return;

  const authed = await ensureFreshOnlineSession();
  if (!authed) return;

  lastPreloadedAt.set(cid, Date.now());

  try {
    const [assetsRes, treatmentsRes, inventoryRes, financeRes, appointmentsRes, plansRes, staffRes] = await Promise.allSettled([
      supabase
        .from('assets')
        .select('*')
        .eq('clinic_id', cid)
        .order('purchase_date', { ascending: false }),
      supabase
        .from('treatments')
        .select('*')
        .eq('clinic_id', cid),
      supabase
        .from('inventory')
        .select('*')
        .eq('clinic_id', cid),
      supabase
        .from('financial_transactions')
        .select('*, patient:patients!fk_fin_patients(full_name), staff_record:staff!fk_fin_staff_record(full_name), recorder_staff:staff!fk_fin_recorded_by_staff(full_name)')
        .eq('clinic_id', cid)
        .order('transaction_date', { ascending: false }),
      supabase
        .from('appointments')
        .select('*, staff:staff_id(full_name)')
        .eq('clinic_id', cid)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false }),
      supabase
        .from('tooth_treatment_plans')
        .select('*')
        .eq('clinic_id', cid),
      supabase
        .from('staff')
        .select('*')
        .eq('clinic_id', cid),
    ]);

    let updatedAny = false;

    // 1. Assets (الأصول الثابتة)
    if (assetsRes.status === 'fulfilled' && !assetsRes.value.error && Array.isArray(assetsRes.value.data)) {
      const cacheKey = `clinic_assets_${cid}`;
      const existing = getInstantCache<any[]>(cacheKey) || [];
      const unsynced = existing.filter(a => String(a.id).startsWith('asset-') || String(a.id).startsWith('offline_'));
      const merged = [...unsynced, ...assetsRes.value.data];
      await setCache(cacheKey, merged, 86400 * 30);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(merged));
      } catch {}
      updatedAny = true;
    }

    // 2. Treatments (العلاجات)
    if (treatmentsRes.status === 'fulfilled' && !treatmentsRes.value.error && Array.isArray(treatmentsRes.value.data)) {
      const cacheKey = `clinic_treatments_${cid}`;
      const mapped = treatmentsRes.value.data.map((t: any) => ({
        id: String(t.id),
        name: t.name,
        category: t.category,
        basePrice: Number(t.base_price) || 0,
        costEstimate: Number(t.cost_estimate) || 0,
        profitMargin: Number(t.profit_margin) || 0,
        popularity: t.popularity || 50,
        totalRevenue: Number(t.total_revenue || 0),
        expectedSessions: t.expected_sessions || 1,
        isActive: t.is_active !== false,
        isComplex: !!t.is_complex,
        defaultPhases: t.default_phases || [],
        clinicId: t.clinic_id?.toString(),
        scope: t.scope || 'tooth',
      }));
      const existing = getInstantCache<any[]>(cacheKey) || [];
      const unsynced = existing.filter(item => String(item.id).startsWith('offline_'));
      await setCache(cacheKey, [...unsynced, ...mapped], 86400 * 30);
      updatedAny = true;
    }

    // 3. Inventory (المخزون)
    if (inventoryRes.status === 'fulfilled' && !inventoryRes.value.error && Array.isArray(inventoryRes.value.data)) {
      const cacheKey = `clinic_inventory_${cid}`;
      const mapped = inventoryRes.value.data.map((i: any) => {
        const qty = Number(i.quantity) || 0;
        const minStock = Number(i.min_stock) || 0;
        const status = i.status || (qty <= 0 ? 'out_of_stock' : qty <= minStock ? 'low_stock' : 'available');
        return {
          id: String(i.id),
          name: i.item_name,
          category: i.category,
          quantity: qty,
          unitPrice: Number(i.unit_price) || 0,
          minStock,
          unit: i.unit || 'قطعة',
          lastRestockDate: i.last_restock_date,
          expiryDate: i.expiry_date,
          supplier: i.supplier_name,
          status,
          brand: i.brand,
          location: i.location,
          batchNumber: i.batch_number || '',
          notes: i.notes || '',
          clinicId: i.clinic_id?.toString(),
        };
      });
      const existing = getInstantCache<any[]>(cacheKey) || [];
      const unsynced = existing.filter(item => String(item.id).startsWith('offline_'));
      await setCache(cacheKey, [...unsynced, ...mapped], 86400 * 30);
      updatedAny = true;
    }

    // 4. Financial Transactions (المالية)
    let rawFinData: any[] | null = null;
    if (financeRes.status === 'fulfilled' && !financeRes.value.error && Array.isArray(financeRes.value.data)) {
      rawFinData = financeRes.value.data;
    } else {
      const fb = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('clinic_id', cid)
        .order('transaction_date', { ascending: false });
      if (!fb.error && Array.isArray(fb.data)) {
        rawFinData = fb.data;
      }
    }

    if (rawFinData) {
      const manualCacheKey = `finance_manual_tx_${cid}`;
      const mapped = rawFinData.map((t: any) => ({
        id: String(t.id),
        type: (t.type === 'expense' ? 'expense' : 'income') as 'income' | 'expense',
        amount: parseFloat(t.amount) || 0,
        date: t.transaction_date || new Date().toISOString(),
        description: t.description || '',
        category: t.category,
        paymentMethod: t.payment_method || 'cash',
        recordedById: t.recorded_by_staff_id?.toString(),
        doctorId: t.staff_record_id?.toString(),
        staffId: t.staff_record_id?.toString(),
        patientId: t.patient_id?.toString(),
        assistantId: t.assistant_id?.toString(),
        treatmentId: t.treatment_id?.toString(),
        sessionId: t.session_id?.toString(),
        inventoryItemId: t.inventory_item_id?.toString(),
        labRequestId: t.lab_request_id,
        extraCost: t.extra_cost,
        doctorName: t.staff_record?.full_name || '',
        recorderName: t.recorder_staff?.full_name || 'مسؤول النظام',
        relatedPerson: t.related_person || t.patient?.full_name || (t.type === 'expense' && t.category === 'salary' ? t.staff_record?.full_name : ''),
      }));
      const existing = getInstantCache<any[]>(manualCacheKey) || [];
      const unsynced = existing.filter(tx => String(tx.id).startsWith('offline_'));
      await setCache(manualCacheKey, [...unsynced, ...mapped], 86400 * 30);
      updatedAny = true;
    }

    // 5. Appointments & Pending Digital Booking Requests (المواعيد وطلبات الحجز الرقمية)
    let rawAptData: any[] | null = null;
    if (appointmentsRes.status === 'fulfilled' && !appointmentsRes.value.error && Array.isArray(appointmentsRes.value.data)) {
      rawAptData = appointmentsRes.value.data;
    } else {
      const fbApts = await supabase
        .from('appointments')
        .select('*')
        .eq('clinic_id', cid)
        .order('created_at', { ascending: false });
      if (!fbApts.error && Array.isArray(fbApts.data)) {
        rawAptData = fbApts.data;
      }
    }

    if (rawAptData) {
      const now = new Date().toISOString();
      const localItems: LocalAppointment[] = rawAptData.map((a: any) => ({
        id: String(a.id),
        clinic_id: String(a.clinic_id || cid),
        patient_id: a.patient_id ? String(a.patient_id) : '',
        doctor_id: a.staff_id ? String(a.staff_id) : undefined,
        title: a.title || 'موعد',
        date: a.appointment_date || a.date || '',
        time: a.appointment_time || a.time || a.start_time || '',
        status: a.status || 'scheduled',
        notes: a.notes || '',
        data: a,
        synced: true,
        created_at: a.created_at || now,
        updated_at: a.updated_at || now,
      }));
      try {
        const existingLocal = await db.appointments.where('clinic_id').equals(cid).toArray();
        const serverIds = new Set(localItems.map(item => String(item.id)));
        const staleIds = existingLocal
          .filter(la => la.synced !== false && !serverIds.has(String(la.id)))
          .map(la => la.id);
        if (localItems.length > 0) {
          await db.appointments.bulkPut(localItems);
        }
        if (staleIds.length > 0) {
          await db.appointments.bulkDelete(staleIds);
        }
      } catch {}

      const pendingRequests = rawAptData
        .filter((a: any) => a.status === 'pending')
        .map((a: any) => ({
          id: String(a.id),
          patientName: a.patient_name || 'مريض غير مسجل',
          source: a.created_via || 'online',
          date: a.appointment_date || a.date || '',
          time: a.appointment_time || a.time || a.start_time || '09:00',
          phone: a.phone_number || a.patient_phone || a.phone || '',
          status: 'pending' as const,
          hasFile: !!a.patient_id,
          notes: a.notes,
          patientId: a.patient_id ? String(a.patient_id) : undefined,
          patientUserId: a.patient_user_id || undefined,
          type: a.type || a.appointment_type || 'consultation',
        }));
      await setCache(`online_requests_${cid}`, pendingRequests, 86400 * 30);
      updatedAny = true;
    }

    // 6. Treatment Plans (for Offline Executive Reports & Debt Aging)
    if (plansRes.status === 'fulfilled' && !plansRes.value.error && Array.isArray(plansRes.value.data)) {
      await setCache(`clinic_plans_${cid}`, plansRes.value.data, 86400 * 30);
      updatedAny = true;
    }

    // 7. Raw Staff Snapshot (for Offline Executive Reports)
    if (staffRes.status === 'fulfilled' && !staffRes.value.error && Array.isArray(staffRes.value.data)) {
      await setCache(`clinic_raw_staff_${cid}`, staffRes.value.data, 86400 * 30);
      updatedAny = true;
    }

    if (updatedAny && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dental-clinic-preloaded', { detail: { clinicId: cid } }));
    }
  } catch (err) {
    console.warn('[ClinicPreloader] Background preload error:', err);
  }
}
