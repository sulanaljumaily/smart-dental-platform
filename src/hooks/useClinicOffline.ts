/**
 * useClinicOffline — Hook شامل لدعم Offline في Clinic Dashboard
 * 
 * الميزات:
 * - تحميل جميع بيانات العيادة عند الاتصال الأول
 * - حفظ البيانات محلياً في IndexedDB
 * - العمل بدون إنترنت
 * - مزامنة تلقائية عند عودة الاتصال
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  db, 
  saveClinicData, 
  getClinicData, 
  preloadClinicData, 
  getAllClinicData,
  addToSyncQueue,
  LocalClinicData 
} from '../lib/offline/db';
import { runSync } from '../lib/offline/syncService';
import { useOfflineStatus } from './useOfflineStatus';

interface ClinicData {
  overview?: Record<string, unknown>;
  patients?: Record<string, unknown>[];
  appointments?: Record<string, unknown>[];
  staff?: Record<string, unknown>[];
  inventory?: Record<string, unknown>[];
}

interface UseClinicOfflineReturn {
  // البيانات
  clinicData: ClinicData | null;
  loading: boolean;
  error: string | null;
  
  // الحالة
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  lastSync: Date | null;
  
  // الإجراءات
  refreshData: () => Promise<void>;
  savePatientOffline: (patient: Record<string, unknown>) => Promise<void>;
  saveAppointmentOffline: (appointment: Record<string, unknown>) => Promise<void>;
  saveTreatmentOffline: (treatment: Record<string, unknown>) => Promise<void>;
  triggerSync: () => Promise<void>;
  
  // البيانات المحسوبة
  hasLocalData: boolean;
  dataAge: number | null;
}

export const useClinicOffline = (clinicId: string): UseClinicOfflineReturn => {
  const { isOnline, syncStatus, pendingCount, lastSync, triggerSync } = useOfflineStatus();
  
  const [clinicData, setClinicData] = useState<ClinicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLocalData, setHasLocalData] = useState(false);
  const [dataAge, setDataAge] = useState<number | null>(null);

  // جلب البيانات من السيرفر
  const fetchFromServer = useCallback(async () => {
    if (!clinicId || !isOnline) return;
    
    try {
      setLoading(true);
      
      // جلب overview
      const { data: overview } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', clinicId)
        .single();

      // جلب المرضى
      const { data: patients } = await supabase
        .from('patients')
        .select('*')
        .eq('clinic_id', clinicId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(500);

      // جلب المواعيد
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('date', { ascending: false })
        .limit(500);

      // جلب الموظفين
      const { data: staff } = await supabase
        .from('staff')
        .select('*')
        .eq('clinic_id', clinicId)
        .in('status', ['active', 'on_leave'])
        .limit(200);

      // جلب المخزون
      const { data: inventory } = await supabase
        .from('clinic_inventory')
        .select('*')
        .eq('clinic_id', clinicId)
        .limit(500);

      const data: ClinicData = {
        overview: overview || undefined,
        patients: patients || [],
        appointments: appointments || [],
        staff: staff || [],
        inventory: inventory || [],
      };

      // حفظ محلياً
      await preloadClinicData(clinicId, data);
      
      setClinicData(data);
      setHasLocalData(true);
      setDataAge(Date.now());
      setError(null);
    } catch (err) {
      console.error('Error fetching from server:', err);
      // في حالة الفشل، نستخدم البيانات المحلية إذا وجدت
      const localData = await getAllClinicData(clinicId);
      if (Object.keys(localData).length > 0) {
        setClinicData(localData as ClinicData);
        setHasLocalData(true);
      }
    } finally {
      setLoading(false);
    }
  }, [clinicId, isOnline]);

  // تحميل البيانات عند أول الاتصال أو من التخزين المحلي
  const loadClinicData = useCallback(async () => {
    if (!clinicId) return;
    
    setLoading(true);
    setError(null);

    try {
      // أولاً: محاولة تحميل من التخزين المحلي
      const localData = await getAllClinicData(clinicId);
      
      if (Object.keys(localData).length > 0) {
        setClinicData(localData as ClinicData);
        setHasLocalData(true);
        
        // حساب عمر البيانات
        const overview = localData.overview as { cached_at?: number } | undefined;
        if (overview?.cached_at) {
          setDataAge(Date.now() - overview.cached_at);
        }
        
        // إذا كان متصلاً بالإنترنت، حدث البيانات في الخلفية
        if (isOnline) {
          fetchFromServer();
        } else {
          setLoading(false);
        }
        return;
      }

      // إذا لم توجد بيانات محلية، جلب من السيرفر
      if (isOnline) {
        await fetchFromServer();
      } else {
        setError('لا توجد بيانات محفوظة محلياً ولا يوجد اتصال بالإنترنت');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error loading clinic data:', err);
      setError('فشل في تحميل بيانات العيادة');
      setLoading(false);
    }
  }, [clinicId, isOnline, fetchFromServer]);

  // حفظ patient محلياً
  const savePatientOffline = useCallback(async (patient: Record<string, unknown>) => {
    if (!clinicId) return;
    
    const patientData = {
      id: (patient.id as string) || crypto.randomUUID(),
      clinic_id: clinicId,
      name: (patient.name as string) || '',
      phone: (patient.phone as string) || '',
      data: patient,
      synced: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // حفظ في IndexedDB
    await db.patients.put(patientData);
    
    // إضافة لطابور المزامنة
    await addToSyncQueue('INSERT', 'patients', patientData.id, {
      ...patientData,
      full_name: patientData.name,
    });

    // تحديث البيانات المحلية
    const currentData = clinicData || {};
    const updatedPatients = [
      patientData.data,
      ...(currentData.patients || [])
    ];
    setClinicData({
      ...currentData,
      patients: updatedPatients,
    });

    // محاولة مزامنة فورية إذا كان متصلاً
    if (isOnline) {
      await runSync();
    }
  }, [clinicId, isOnline, clinicData]);

  // حفظ appointment محلياً
  const saveAppointmentOffline = useCallback(async (appointment: Record<string, unknown>) => {
    if (!clinicId) return;
    
    const appointmentData = {
      id: (appointment.id as string) || crypto.randomUUID(),
      clinic_id: clinicId,
      patient_id: (appointment.patient_id as string) || '',
      title: (appointment.title as string) || '',
      date: (appointment.date as string) || '',
      time: (appointment.time as string) || '',
      status: (appointment.status as string) || 'scheduled',
      notes: (appointment.notes as string) || '',
      data: appointment,
      synced: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // حفظ في IndexedDB
    await db.appointments.put(appointmentData);
    
    // إضافة لطابور المزامنة
    await addToSyncQueue('INSERT', 'appointments', appointmentData.id, appointmentData);

    // تحديث البيانات المحلية
    const currentData = clinicData || {};
    const updatedAppointments = [
      appointmentData.data,
      ...(currentData.appointments || [])
    ];
    setClinicData({
      ...currentData,
      appointments: updatedAppointments,
    });

    if (isOnline) {
      await runSync();
    }
  }, [clinicId, isOnline, clinicData]);

  // حفظ treatment محلياً
  const saveTreatmentOffline = useCallback(async (treatment: Record<string, unknown>) => {
    if (!clinicId) return;
    
    const treatmentData = {
      id: (treatment.id as string) || crypto.randomUUID(),
      clinic_id: clinicId,
      patient_id: (treatment.patient_id as string) || '',
      title: (treatment.title as string) || '',
      description: (treatment.description as string) || '',
      status: (treatment.status as 'planned' | 'in_progress' | 'completed' | 'cancelled') || 'planned',
      start_date: (treatment.start_date as string) || '',
      end_date: (treatment.end_date as string) || '',
      notes: (treatment.notes as string) || '',
      data: treatment,
      synced: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // حفظ في IndexedDB
    await db.treatments.put(treatmentData);
    
    // إضافة لطابور المزامنة
    await addToSyncQueue('INSERT', 'treatments', treatmentData.id, treatmentData);

    if (isOnline) {
      await runSync();
    }
  }, [clinicId, isOnline]);

  // تحديث البيانات
  const refreshData = useCallback(async () => {
    if (isOnline) {
      await fetchFromServer();
    }
  }, [isOnline, fetchFromServer]);

  // تحميل البيانات عند أول تحميل أو تغيير clinicId
  useEffect(() => {
    loadClinicData();
  }, [loadClinicData]);

  // الاستماع لأحداث الاتصال
  useEffect(() => {
    if (isOnline && clinicId) {
      fetchFromServer();
    }
  }, [isOnline, clinicId, fetchFromServer]);

  return {
    clinicData,
    loading,
    error,
    isOnline,
    isSyncing: syncStatus === 'syncing',
    pendingSyncCount: pendingCount,
    lastSync,
    refreshData,
    savePatientOffline,
    saveAppointmentOffline,
    saveTreatmentOffline,
    triggerSync: async () => { triggerSync(); },
    hasLocalData,
    dataAge,
  };
};

export default useClinicOffline;
