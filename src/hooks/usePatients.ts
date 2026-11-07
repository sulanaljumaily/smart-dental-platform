import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { db, addToSyncQueue, LocalPatient, getInstantCache, setCache } from '../lib/offline/db';
import { toast } from 'sonner';

export interface PatientData {
    id: string;
    clinicId: string;
    name: string;
    age: number;
    gender: 'male' | 'female';
    phone: string;
    email?: string;
    address?: string;
    status: 'active' | 'inactive' | 'emergency';
    paymentStatus: 'paid' | 'pending' | 'overdue';
    lastVisit: string;
    totalVisits: number;
    balance: number;
    medicalHistory?: string;
    medicalHistoryData?: any;
    notes?: string;
    patient_user_id?: string;
    user_id?: string;
    isOfflineUnsynced?: boolean;
}

const patientsCache = new Map<string, PatientData[]>();

export function getCachedPatientById(patientId?: string): PatientData | null {
    if (!patientId) return null;
    const target = String(patientId);
    for (const list of patientsCache.values()) {
        const found = list.find(p => String(p.id) === target);
        if (found) return found;
    }
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('dental_instant_cache_v1_patients_')) {
                const raw = localStorage.getItem(key);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.data) ? parsed.data : null);
                    if (list) {
                        const found = list.find((p: any) => p && String(p.id) === target);
                        if (found) return found as PatientData;
                    }
                }
            }
        }
    } catch {}
    return null;
}

function mapLocalPatientToPatientData(lp: LocalPatient): PatientData {
    const p = (lp.data || {}) as any;
    return {
        id: String(lp.id),
        clinicId: String(lp.clinic_id || p.clinic_id || ''),
        name: lp.name || p.full_name || p.name || 'مريض محلي',
        age: Number(p.age) || 0,
        gender: p.gender || 'male',
        phone: lp.phone || p.phone || '',
        email: p.email || '',
        address: p.address || '',
        status: p.status || 'active',
        paymentStatus: 'paid',
        lastVisit: lp.updated_at || lp.created_at || new Date().toISOString(),
        totalVisits: Number(p.total_visits) || 1,
        balance: Number(p.balance) || 0,
        medicalHistory: typeof p.medical_history === 'string'
            ? p.medical_history
            : (p.medical_history ? JSON.stringify(p.medical_history) : ''),
        medicalHistoryData: p.medical_history_data,
        notes: p.notes || '',
        patient_user_id: p.patient_user_id,
        user_id: p.user_id,
        isOfflineUnsynced: lp.synced === false
    };
}

export const usePatients = (clinicId?: string, clinicIds?: string[]) => {
    const { user } = useAuth();
    const cacheKey = clinicId || (clinicIds ? clinicIds.join(',') : 'all');

    const getInitialPatients = (): PatientData[] => {
        const mem = patientsCache.get(cacheKey);
        if (mem && mem.length > 0) return mem;
        const instant = getInstantCache<PatientData[]>('patients_' + cacheKey);
        if (instant && instant.length > 0) {
            patientsCache.set(cacheKey, instant);
            return instant;
        }
        // aggregated multi-clinic offline fallback
        // يُستخدم فقط عند تمرير قائمة عيادات محددة (مالك متعدد العيادات) ويُفلتر حسبها حصراً
        // حتى لا تظهر مرضى حسابات أخرى مخزنة على نفس الجهاز
        if (!clinicId && clinicIds && clinicIds.length > 0 && typeof localStorage !== 'undefined') {
            try {
                const allowed = new Set(clinicIds.map(String));
                const aggregated: PatientData[] = [];
                const seen = new Set<string>();
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith('dental_instant_cache_v1_patients_')) {
                        const raw = localStorage.getItem(k);
                        if (raw) {
                            const parsed = JSON.parse(raw);
                            const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.data) ? parsed.data : []);
                            for (const p of list) {
                                if (!p || !p.id || seen.has(String(p.id))) continue;
                                if (!allowed.has(String(p.clinicId ?? p.clinic_id))) continue;
                                seen.add(String(p.id));
                                aggregated.push(p);
                            }
                        }
                    }
                }
                if (aggregated.length > 0) {
                    patientsCache.set(cacheKey, aggregated);
                    return aggregated;
                }
            } catch {}
        }
        return [];
    };

    const initialList = getInitialPatients();
    const [patients, setPatients] = useState<PatientData[]>(initialList);
    const [loading, setLoading] = useState(initialList.length === 0);
    const [error, setError] = useState<string | null>(null);
    const mountedRef = useRef(true);

    const savePatientsToCache = (list: PatientData[]) => {
        patientsCache.set(cacheKey, list);
        setCache('patients_' + cacheKey, list, 86400 * 30).catch(() => {});
        if (mountedRef.current) {
            setPatients(list);
            setError(null);
        }
    };

    const loadPatientsFromDexie = async (): Promise<PatientData[]> => {
        try {
            const allLocal = await db.patients.toArray();
            const filtered = allLocal.filter(lp => {
                const pData = (lp.data || {}) as any;
                if (pData.deleted_at) return false;
                if (clinicId) {
                    return String(lp.clinic_id) === String(clinicId) || String(pData.clinic_id) === String(clinicId);
                }
                if (clinicIds && clinicIds.length > 0) {
                    const targetSet = new Set(clinicIds.map(String));
                    return targetSet.has(String(lp.clinic_id)) || targetSet.has(String(pData.clinic_id));
                }
                return true;
            });
            return filtered
                .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                .map(mapLocalPatientToPatientData);
        } catch (e) {
            console.warn('[usePatients] Dexie load error:', e);
            return [];
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        const cached = getInitialPatients();
        if (cached.length > 0) {
            setPatients(cached);
            setLoading(false);
        }
        fetchPatients();
        return () => { mountedRef.current = false; };
    }, [clinicId, clinicIds?.join(','), user?.id]);

    const fetchPatients = async () => {
        // 1. تحميل فوري من Dexie أولاً (سواء أونلاين أو أوفلاين) لضمان عدم التعليق
        const dexiePatients = await loadPatientsFromDexie();
        if (dexiePatients.length > 0 && mountedRef.current) {
            savePatientsToCache(dexiePatients);
            setLoading(false);
        }

        if (!navigator.onLine) {
            if (dexiePatients.length === 0) {
                const instant = getInstantCache<PatientData[]>('patients_' + cacheKey);
                if (instant && instant.length > 0 && mountedRef.current) {
                    setPatients(instant);
                }
            }
            if (mountedRef.current) setLoading(false);
            return;
        }

        if (patients.length === 0 && dexiePatients.length === 0) {
            setLoading(true);
        }

        try {
            let query = supabase.from('patients').select('*').is('deleted_at', null);

            if (clinicId) {
                query = query.eq('clinic_id', clinicId);
            } else if (clinicIds !== undefined) {
                if (clinicIds.length === 0) {
                    setPatients([]);
                    setLoading(false);
                    return;
                }
                query = query.in('clinic_id', clinicIds);
            }

            query = query.order('created_at', { ascending: false });

            const { data, error } = await query;
            if (error) throw error;

            const serverPatients: PatientData[] = (data || []).map((p: any) => ({
                id: String(p.id),
                clinicId: String(p.clinic_id || clinicId || ''),
                name: p.full_name || p.name || 'مريض',
                age: Number(p.age) || 0,
                gender: p.gender || 'male',
                phone: p.phone || '',
                email: p.email || '',
                address: p.address || '',
                status: p.status || 'active',
                paymentStatus: 'paid',
                lastVisit: p.last_visit_date || p.created_at || new Date().toISOString(),
                totalVisits: Number(p.total_visits) || 1,
                balance: Number(p.balance) || 0,
                medicalHistory: typeof p.medical_history === 'string'
                    ? p.medical_history
                    : (p.medical_history ? JSON.stringify(p.medical_history) : ''),
                medicalHistoryData: p.medical_history_data,
                notes: p.notes || '',
                patient_user_id: p.patient_user_id,
                user_id: p.user_id,
                isOfflineUnsynced: false
            }));

            // دمج أي مرضى مضافين أوفلاين ولم تتم مزامنتهم بعد حتى لا يختفوا قبل اكتمال المزامنة
            const unsyncedLocal = dexiePatients.filter(lp => lp.isOfflineUnsynced);
            const serverIds = new Set(serverPatients.map(sp => String(sp.id)));
            const mergedPatients = [
                ...unsyncedLocal.filter(lp => !serverIds.has(String(lp.id))),
                ...serverPatients
            ];

            savePatientsToCache(mergedPatients);

            // تحديث Dexie
            try {
                const now = new Date().toISOString();
                const localItems: LocalPatient[] = (data || []).map((p: any) => ({
                    id: String(p.id),
                    clinic_id: String(p.clinic_id || clinicId || ''),
                    name: p.full_name || p.name || '',
                    phone: p.phone || '',
                    data: p,
                    synced: true,
                    created_at: p.created_at || now,
                    updated_at: p.updated_at || now,
                }));
                if (localItems.length > 0) {
                    await db.patients.bulkPut(localItems);
                }
            } catch (dexieErr) {
                console.warn('[usePatients] Error caching patients to Dexie:', dexieErr);
            }
        } catch (err: any) {
            if (err?.name === 'AbortError' || err?.message?.includes('AbortError')) return;
            if (mountedRef.current) {
                const fallbackDexie = await loadPatientsFromDexie();
                if (fallbackDexie.length > 0) {
                    savePatientsToCache(fallbackDexie);
                    return;
                }
                const instant = getInstantCache<PatientData[]>('patients_' + cacheKey);
                if (instant && instant.length > 0) {
                    setPatients(instant);
                    setError(null);
                    return;
                }
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const logActivity = async (action: string, entityId: string, details: any) => {
        if (!navigator.onLine) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('activity_logs').insert({
                clinic_id: clinicId,
                user_id: user?.id,
                action_type: action,
                entity_type: 'patient',
                entity_id: entityId,
                details
            });
        } catch {}
    };

    const savePatientLocally = async (newPatient: any) => {
        const targetClinicId = String(clinicId || newPatient.clinicId || '101');
        const localId = crypto.randomUUID();
        const now = new Date().toISOString();
        const offlineData = {
            id: localId,
            clinic_id: Number.isNaN(Number(targetClinicId)) ? targetClinicId : Number(targetClinicId),
            full_name: newPatient.name,
            phone: newPatient.phone,
            age: Number(newPatient.age) || 0,
            gender: newPatient.gender || 'male',
            email: newPatient.email || '',
            address: newPatient.address || '',
            notes: newPatient.notes || '',
            medical_history: newPatient.medicalHistory ? JSON.parse(JSON.stringify(newPatient.medicalHistory)) : [],
            status: 'active',
            patient_user_id: null,
            created_at: now
        };

        const localRecord: LocalPatient = {
            id: localId,
            clinic_id: targetClinicId,
            name: offlineData.full_name,
            phone: offlineData.phone,
            data: offlineData,
            synced: false,
            created_at: now,
            updated_at: now
        };

        await db.patients.put(localRecord);
        await addToSyncQueue('INSERT', 'patients', localId, offlineData);

        const mappedNew = mapLocalPatientToPatientData(localRecord);
        const updatedList = [mappedNew, ...patients.filter(p => p.id !== localId)];
        savePatientsToCache(updatedList);
        setCache('patient_detail_' + localId, {
            id: localId,
            name: mappedNew.name,
            age: mappedNew.age,
            phone: mappedNew.phone,
            email: mappedNew.email,
            lastVisit: now,
            totalVisits: 1,
            balance: 0,
            gender: mappedNew.gender,
            address: mappedNew.address,
            notes: mappedNew.notes,
            status: 'active',
            medicalHistory: offlineData.medical_history,
            clinicId: targetClinicId,
            patientUserId: null,
            medicalHistoryData: {
                vitals: { weight: '', height: '', bp: '', sugar: '', pulse: '' },
                conditions: [],
                allergies: [],
                habits: [],
                notes: ''
            }
        }, 86400 * 30).catch(() => {});

        return offlineData;
    };

    const createPatient = async (newPatient: any) => {
        const targetClinicId = String(clinicId || newPatient.clinicId || '101');

        // فحص التكرار محلياً أولاً (يعمل في الأونلاين والأوفلاين)
        const existingLocal = patients.find(
            p =>
                String(p.clinicId) === targetClinicId &&
                p.name?.trim() === newPatient.name?.trim() &&
                p.phone?.trim() === newPatient.phone?.trim()
        );
        if (existingLocal) {
            const error = new Error('patient_exists');
            (error as any).patientId = existingLocal.id;
            throw error;
        }

        // إذا كان التطبيق أوفلاين، نحفظ فوراً في Dexie دون أي طلب شبكة
        if (!navigator.onLine) {
            const saved = await savePatientLocally(newPatient);
            toast.success('تم حفظ ملف المريض محلياً (ستتم المزامنة تلقائياً عند توفر الإنترنت)');
            return saved;
        }

        try {
            // Duplicate Check on server
            const { data: existing } = await supabase
                .from('patients')
                .select('id')
                .eq('clinic_id', targetClinicId)
                .eq('full_name', newPatient.name)
                .eq('phone', newPatient.phone)
                .is('deleted_at', null)
                .maybeSingle();

            if (existing) {
                const error = new Error('patient_exists');
                (error as any).patientId = existing.id;
                throw error;
            }

            let patientUserId = newPatient.patient_user_id || null;

            if (!patientUserId && newPatient.phone) {
                const sanitizedPhone = newPatient.phone.replace(/\D/g, '');
                const { data: matchingProfile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('phone', sanitizedPhone)
                    .eq('role', 'patient')
                    .maybeSingle();

                if (matchingProfile) {
                    patientUserId = matchingProfile.id;
                }
            }

            const patientData = {
                clinic_id: targetClinicId,
                full_name: newPatient.name,
                phone: newPatient.phone,
                age: Number(newPatient.age) || 0,
                gender: newPatient.gender || 'male',
                email: newPatient.email,
                address: newPatient.address,
                notes: newPatient.notes,
                medical_history: newPatient.medicalHistory ? JSON.parse(JSON.stringify(newPatient.medicalHistory)) : [],
                status: 'active',
                patient_user_id: patientUserId
            };

            const { data, error } = await supabase.from('patients').insert(patientData).select().single();
            if (error) throw error;

            const localRecord: LocalPatient = {
                id: String(data.id),
                clinic_id: String(data.clinic_id),
                name: data.full_name,
                phone: data.phone || '',
                data,
                synced: true,
                created_at: data.created_at,
                updated_at: data.created_at
            };
            await db.patients.put(localRecord).catch(() => {});

            const mappedNew = mapLocalPatientToPatientData(localRecord);
            savePatientsToCache([mappedNew, ...patients.filter(p => String(p.id) !== String(data.id))]);

            await logActivity('create_patient', String(data.id), { name: data.full_name });
            return data;
        } catch (err: any) {
            if (err?.message === 'patient_exists') throw err;
            // في حالة فشل الاتصال، نحفظ محلياً تلقائياً
            const saved = await savePatientLocally(newPatient);
            toast.info('تعذر الاتصال بالسيرفر، تم حفظ ملف المريض محلياً وستتم المزامنة تلقائياً');
            return saved;
        }
    };

    const updatePatient = async (id: string, updates: any) => {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.full_name = updates.name;
        if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.age !== undefined) dbUpdates.age = Number(updates.age);
        if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
        if (updates.email !== undefined) dbUpdates.email = updates.email;
        if (updates.address !== undefined) dbUpdates.address = updates.address;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

        const applyLocalUpdate = async (markUnsynced: boolean) => {
            const targetId = String(id);
            const local = await db.patients.get(targetId);
            const now = new Date().toISOString();
            if (local) {
                const updatedData = { ...((local.data as any) || {}), ...dbUpdates };
                await db.patients.update(targetId, {
                    name: dbUpdates.full_name || local.name,
                    phone: dbUpdates.phone || local.phone,
                    data: updatedData,
                    synced: markUnsynced ? false : local.synced,
                    updated_at: now
                }).catch(() => {});
            }
            const nextList = patients.map(p =>
                String(p.id) === targetId
                    ? {
                        ...p,
                        name: updates.name !== undefined ? updates.name : p.name,
                        phone: updates.phone !== undefined ? updates.phone : p.phone,
                        status: updates.status !== undefined ? updates.status : p.status,
                        age: updates.age !== undefined ? Number(updates.age) : p.age,
                        gender: updates.gender !== undefined ? updates.gender : p.gender,
                        email: updates.email !== undefined ? updates.email : p.email,
                        address: updates.address !== undefined ? updates.address : p.address,
                        notes: updates.notes !== undefined ? updates.notes : p.notes,
                    }
                    : p
            );
            savePatientsToCache(nextList);
        };

        if (!navigator.onLine) {
            await applyLocalUpdate(true);
            await addToSyncQueue('UPDATE', 'patients', String(id), dbUpdates);
            toast.success('تم تحديث بيانات المريض محلياً');
            return;
        }

        try {
            const { error } = await supabase.from('patients').update(dbUpdates).eq('id', id);
            if (error) throw error;
            await applyLocalUpdate(false);
            await logActivity('update_patient', id, updates);
        } catch {
            await applyLocalUpdate(true);
            await addToSyncQueue('UPDATE', 'patients', String(id), dbUpdates);
            toast.info('تم حفظ تعديلات المريض محلياً (ستتم المزامنة عند الاتصال)');
        }
    };

    const deletePatient = async (id: string) => {
        const targetId = String(id);
        const removeLocally = async () => {
            await db.patients.delete(targetId).catch(() => {});
            savePatientsToCache(patients.filter(p => String(p.id) !== targetId));
        };

        if (!navigator.onLine) {
            await removeLocally();
            await addToSyncQueue('UPDATE', 'patients', targetId, { deleted_at: new Date().toISOString() });
            toast.success('تم حذف المريض محلياً');
            return;
        }

        try {
            const { error } = await supabase
                .from('patients')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            await removeLocally();
            await logActivity('delete_patient', id, {});
        } catch {
            await removeLocally();
            await addToSyncQueue('UPDATE', 'patients', targetId, { deleted_at: new Date().toISOString() });
            toast.info('تم حذف المريض محلياً (ستتم المزامنة عند الاتصال)');
        }
    };

    return {
        patients,
        loading,
        error,
        createPatient,
        deletePatient,
        updatePatient,
        refresh: fetchPatients
    };
};
