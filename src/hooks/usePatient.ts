import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Patient } from '../types';
import { db, addToSyncQueue, getInstantCache, setCache, getCache } from '../lib/offline/db';
import { getCachedPatientById } from './usePatients';
import { toast } from 'sonner';

const DEFAULT_MEDICAL_HISTORY_DATA = {
    vitals: { weight: '', height: '', bp: '', sugar: '', pulse: '' },
    conditions: [],
    allergies: [],
    habits: [],
    notes: ''
};

function normalizeMedicalHistory(raw: any): any {
    if (!raw) return [];
    if (Array.isArray(raw)) {
        return raw.map(item => String(item || '')).filter(Boolean);
    }
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed) return [];
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    return parsed.map(item => String(item || '')).filter(Boolean);
                }
            } catch {}
        }
        return trimmed.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
}

function getInitialPatientSync(patientId?: string): Patient | null {
    if (!patientId) return null;
    const targetId = String(patientId);
    const instantDetail = getInstantCache<Patient>('patient_detail_' + targetId);
    if (instantDetail) {
        return {
            ...instantDetail,
            medicalHistory: normalizeMedicalHistory(instantDetail.medicalHistory),
            medicalHistoryData: instantDetail.medicalHistoryData || DEFAULT_MEDICAL_HISTORY_DATA
        };
    }

    const fromList = getCachedPatientById(targetId);
    if (fromList) {
        return {
            id: String(fromList.id),
            name: fromList.name || 'مريض',
            age: Number(fromList.age) || 0,
            phone: fromList.phone || '',
            email: fromList.email || '',
            lastVisit: fromList.lastVisit || new Date().toISOString(),
            totalVisits: Number(fromList.totalVisits) || 1,
            balance: Number(fromList.balance) || 0,
            gender: fromList.gender || 'male',
            address: fromList.address || '',
            notes: fromList.notes || '',
            status: (fromList.status as any) || 'active',
            medicalHistory: normalizeMedicalHistory(fromList.medicalHistory),
            clinicId: fromList.clinicId,
            patientUserId: fromList.patient_user_id,
            medicalHistoryData: fromList.medicalHistoryData || DEFAULT_MEDICAL_HISTORY_DATA
        };
    }
    return null;
}

export const usePatient = (patientId: string | undefined) => {
    const initialPatient = getInitialPatientSync(patientId);
    const [patient, setPatient] = useState<Patient | null>(initialPatient);
    const [loading, setLoading] = useState<boolean>(!initialPatient && !!patientId);
    const [error, setError] = useState<string | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        if (!patientId) {
            setLoading(false);
            return;
        }
        const syncCached = getInitialPatientSync(patientId);
        if (syncCached) {
            setPatient(syncCached);
            setLoading(false);
        }
        fetchPatient();
        return () => { mountedRef.current = false; };
    }, [patientId]);

    const loadPatientFromLocalStore = async (targetId: string): Promise<Patient | null> => {
        try {
            let local = await db.patients.get(targetId);
            if (!local) {
                const all = await db.patients.toArray();
                local = all.find(item => String(item.id) === targetId);
            }
            if (local) {
                const d = (local.data || {}) as any;
                const mapped: Patient = {
                    id: String(local.id),
                    name: local.name || d.full_name || d.name || 'مريض محلي',
                    age: Number(d.age) || 0,
                    phone: local.phone || d.phone || '',
                    email: d.email || '',
                    lastVisit: d.last_visit_date || local.updated_at || local.created_at || new Date().toISOString(),
                    totalVisits: Number(d.total_visits) || 1,
                    balance: Number(d.balance) || 0,
                    gender: d.gender || 'male',
                    address: d.address || '',
                    notes: d.notes || '',
                    status: d.status || 'active',
                    medicalHistory: normalizeMedicalHistory(d.medical_history),
                    clinicId: String(local.clinic_id || d.clinic_id || ''),
                    patientUserId: d.patient_user_id,
                    medicalHistoryData: d.medical_history_data || DEFAULT_MEDICAL_HISTORY_DATA
                };
                return mapped;
            }
        } catch (e) {
            console.warn('[usePatient] Dexie lookup error:', e);
        }

        try {
            const cachedDetail = await getCache<Patient>('patient_detail_' + targetId);
            if (cachedDetail) {
                return {
                    ...cachedDetail,
                    medicalHistory: normalizeMedicalHistory(cachedDetail.medicalHistory),
                    medicalHistoryData: cachedDetail.medicalHistoryData || DEFAULT_MEDICAL_HISTORY_DATA
                };
            }
        } catch {}

        return getInitialPatientSync(targetId);
    };

    const fetchPatient = async () => {
        if (!patientId) {
            if (mountedRef.current) setLoading(false);
            return;
        }
        const targetId = String(patientId);

        // 1. محاولة التحميل الفوري من التخزين المحلي أولاً لفتح الملف بدون أي تأخير
        const localPatient = await loadPatientFromLocalStore(targetId);
        if (localPatient && mountedRef.current) {
            setPatient(localPatient);
            setError(null);
            setLoading(false);
        }

        // إذا كان الجهاز أوفلاين أو المريض محلياً غير مزامن (UUID)، لا نطلب من السيرفر
        const isUnsyncedUuid = isNaN(Number(targetId));
        if (!navigator.onLine || isUnsyncedUuid) {
            if (mountedRef.current) setLoading(false);
            return;
        }

        if (!localPatient && !patient) {
            setLoading(true);
        }

        try {
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .eq('id', targetId)
                .single();

            if (error) throw error;

            if (data && mountedRef.current) {
                const mappedPatient: Patient = {
                    id: String(data.id),
                    name: data.full_name || data.name || 'مريض',
                    age: Number(data.age) || 0,
                    phone: data.phone || '',
                    email: data.email || '',
                    lastVisit: data.last_visit_date || data.created_at || new Date().toISOString(),
                    totalVisits: Number(data.total_visits) || 1,
                    balance: Number(data.balance) || 0,
                    gender: data.gender || 'male',
                    address: data.address || '',
                    notes: data.notes || '',
                    status: data.status || 'active',
                    medicalHistory: normalizeMedicalHistory(data.medical_history),
                    clinicId: String(data.clinic_id || ''),
                    patientUserId: data.patient_user_id,
                    medicalHistoryData: data.medical_history_data || DEFAULT_MEDICAL_HISTORY_DATA
                };
                setPatient(mappedPatient);
                setError(null);
                setCache('patient_detail_' + targetId, mappedPatient, 86400 * 30).catch(() => {});

                try {
                    await db.patients.put({
                        id: String(data.id),
                        clinic_id: String(data.clinic_id || ''),
                        name: mappedPatient.name,
                        phone: mappedPatient.phone,
                        data: data,
                        synced: true,
                        created_at: data.created_at || new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                } catch {}
            }
        } catch (err: any) {
            if (err?.name === 'AbortError' || err?.message?.includes('AbortError')) return;
            const fallback = await loadPatientFromLocalStore(targetId);
            if (fallback && mountedRef.current) {
                setPatient(fallback);
                setError(null);
                return;
            }
            if (mountedRef.current && !patient) {
                setError(err.message || 'تعذر تحميل ملف المريض');
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const updatePatientProfile = async (updates: Partial<Patient>) => {
        if (!patientId) return;
        const targetId = String(patientId);

        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.full_name = updates.name;
        if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
        if (updates.age !== undefined) dbUpdates.age = Number(updates.age);
        if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
        if (updates.address !== undefined) dbUpdates.address = updates.address;
        if (updates.email !== undefined) dbUpdates.email = updates.email;
        if (updates.medicalHistoryData) {
            dbUpdates.medical_history_data = updates.medicalHistoryData;
            if (updates.medicalHistoryData.allergies) {
                dbUpdates.allergies = updates.medicalHistoryData.allergies;
                const alerts = [...(updates.medicalHistoryData.allergies || [])];
                dbUpdates.medical_history = alerts.join(',');
            }
        }
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

        const nextPatient = patient ? { ...patient, ...updates } : null;
        if (nextPatient) {
            setPatient(nextPatient);
            setCache('patient_detail_' + targetId, nextPatient, 86400 * 30).catch(() => {});
        }

        const saveToLocalDexie = async (synced: boolean) => {
            try {
                const existing = await db.patients.get(targetId);
                if (existing) {
                    const updatedData = { ...((existing.data as any) || {}), ...dbUpdates };
                    await db.patients.update(targetId, {
                        name: dbUpdates.full_name || existing.name,
                        phone: dbUpdates.phone || existing.phone,
                        data: updatedData,
                        synced: synced ? existing.synced : false,
                        updated_at: new Date().toISOString()
                    });
                }
            } catch {}
        };

        if (!navigator.onLine) {
            await saveToLocalDexie(false);
            await addToSyncQueue('UPDATE', 'patients', targetId, dbUpdates);
            toast.success('تم حفظ التغييرات محلياً (ستتم المزامنة تلقائياً عند الاتصال)');
            return;
        }

        try {
            const { error } = await supabase
                .from('patients')
                .update(dbUpdates)
                .eq('id', targetId);

            if (error) throw error;
            await saveToLocalDexie(true);
            toast.success('تم تحديث البيانات بنجاح');
        } catch {
            await saveToLocalDexie(false);
            await addToSyncQueue('UPDATE', 'patients', targetId, dbUpdates);
            toast.info('تم حفظ التغييرات محلياً (ستتم المزامنة عند توفر الإنترنت)');
        }
    };

    return {
        patient,
        loading,
        error,
        fetchPatient,
        updatePatientProfile
    };
};
