import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { db, addToSyncQueue, LocalPatient } from '../lib/offline/db';
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
    notes?: string;
    patient_user_id?: string;
    user_id?: string;
}

const patientsCache = new Map<string, PatientData[]>();

export const usePatients = (clinicId?: string, clinicIds?: string[]) => {
    const { user } = useAuth();
    const cacheKey = clinicId || (clinicIds ? clinicIds.join(',') : 'all');
    const [patients, setPatients] = useState<PatientData[]>(() => patientsCache.get(cacheKey) || []);
    const [loading, setLoading] = useState(!patientsCache.has(cacheKey));
    const [error, setError] = useState<string | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        fetchPatients();
        return () => { mountedRef.current = false; };
    }, [clinicId, clinicIds?.join(','), user?.id]);

    const fetchPatients = async () => {
        // إذا كان الجهاز أوفلاين، استرجع السجلات محلياً فوراً من Dexie بدون انتظار مهلة الشبكة
        if (!navigator.onLine) {
            try {
                let localItems: LocalPatient[] = [];
                if (clinicId) {
                    localItems = await db.patients.where('clinic_id').equals(clinicId).toArray();
                } else if (clinicIds && clinicIds.length > 0) {
                    localItems = await db.patients.where('clinic_id').anyOf(clinicIds).toArray();
                } else {
                    localItems = await db.patients.toArray();
                }

                if (localItems.length > 0 && mountedRef.current) {
                    const mappedPatients: PatientData[] = localItems.map((lp) => {
                        const p = (lp.data || {}) as any;
                        return {
                            id: lp.id,
                            clinicId: lp.clinic_id,
                            name: lp.name || p.full_name || p.name || 'مريض محلي',
                            age: p.age || 0,
                            gender: p.gender || 'male',
                            phone: lp.phone || p.phone || '',
                            email: p.email,
                            address: p.address,
                            status: p.status || 'active',
                            paymentStatus: 'paid',
                            lastVisit: lp.updated_at || lp.created_at,
                            totalVisits: 1,
                            balance: 0,
                            medicalHistory: p.medical_history ? JSON.stringify(p.medical_history) : '',
                            notes: p.notes || '',
                            patient_user_id: p.patient_user_id,
                            user_id: p.user_id
                        };
                    });
                    setPatients(mappedPatients);
                    setError(null);
                }
            } catch (dexieErr) {
                console.warn('[usePatients] Dexie immediate offline load failed:', dexieErr);
            }
            if (mountedRef.current) setLoading(false);
            return;
        }

        if (!patientsCache.has(cacheKey)) {
            setLoading(true);
        }
        try {
            let query = supabase.from('patients').select('*').is('deleted_at', null);

            if (clinicId) {
                // Single clinic filter
                query = query.eq('clinic_id', clinicId);
            } else if (clinicIds !== undefined) {
                // Multiple clinics filter
                if (clinicIds.length === 0) {
                    // User has no clinics — return empty, don't fetch all
                    setPatients([]);
                    setLoading(false);
                    return;
                }
                query = query.in('clinic_id', clinicIds);
            }

            query = query.order('created_at', { ascending: false });

            const { data, error } = await query;

            if (error) throw error;

            const mappedPatients: PatientData[] = (data || []).map((p: any) => ({
                id: p.id?.toString(),
                clinicId: p.clinic_id?.toString(),
                name: p.full_name || p.name,
                age: p.age || 0,
                gender: p.gender || 'male',
                phone: p.phone,
                email: p.email,
                address: p.address,
                status: p.status || 'active',
                paymentStatus: 'paid', // Default
                lastVisit: p.created_at,
                totalVisits: 1, // Mock
                balance: 0,
                medicalHistory: p.medical_history ? JSON.stringify(p.medical_history) : '',
                notes: '',
                patient_user_id: p.patient_user_id,
                user_id: p.user_id
            }));

            patientsCache.set(cacheKey, mappedPatients);
            setPatients(mappedPatients);
            setError(null);

            // حفظ المرضى في Dexie للاسترجاع الفوري في وضع الأوفلاين
            try {
                const now = new Date().toISOString();
                const localItems: LocalPatient[] = (data || []).map((p: any) => ({
                    id: p.id?.toString(),
                    clinic_id: p.clinic_id?.toString() || clinicId || '',
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
                console.warn('[usePatients] Network error, attempting Dexie offline retrieval:', err);
                // محاولة استرجاع السجلات محلياً من Dexie
                try {
                    let localItems: LocalPatient[] = [];
                    if (clinicId) {
                        localItems = await db.patients.where('clinic_id').equals(clinicId).toArray();
                    } else if (clinicIds && clinicIds.length > 0) {
                        localItems = await db.patients.where('clinic_id').anyOf(clinicIds).toArray();
                    } else {
                        localItems = await db.patients.toArray();
                    }

                    if (localItems.length > 0) {
                        const mappedPatients: PatientData[] = localItems.map((lp) => {
                            const p = (lp.data || {}) as any;
                            return {
                                id: lp.id,
                                clinicId: lp.clinic_id,
                                name: lp.name || p.full_name || p.name || 'مريض محلي',
                                age: p.age || 0,
                                gender: p.gender || 'male',
                                phone: lp.phone || p.phone || '',
                                email: p.email,
                                address: p.address,
                                status: p.status || 'active',
                                paymentStatus: 'paid',
                                lastVisit: lp.updated_at || lp.created_at,
                                totalVisits: 1,
                                balance: 0,
                                medicalHistory: p.medical_history ? JSON.stringify(p.medical_history) : '',
                                notes: p.notes || '',
                                patient_user_id: p.patient_user_id,
                                user_id: p.user_id
                            };
                        });
                        setPatients(mappedPatients);
                        setError(null);
                        return;
                    }
                } catch (dexieErr) {
                    console.error('[usePatients] Dexie offline retrieval error:', dexieErr);
                }

                console.error('Error fetching patients:', err);
                setError('Failed to load patients');
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const logActivity = async (action: string, entityId: string, details: any) => {
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
        } catch (e) {
            console.error('Failed to log activity', e);
        }
    };

    const createPatient = async (newPatient: any) => {
        try {
            // Duplicate Check: Same name and phone in same clinic
            const { data: existing } = await supabase
                .from('patients')
                .select('id')
                .eq('clinic_id', clinicId || newPatient.clinicId || '101')
                .eq('full_name', newPatient.name)
                .eq('phone', newPatient.phone)
                .is('deleted_at', null)
                .maybeSingle();

            if (existing) {
                const error = new Error('patient_exists');
                (error as any).patientId = existing.id;
                throw error;
            }

            // إذا كان التطبيق أوفلاين، نحفظ مباشرة في قاعدة البيانات المحلية Dexie
            if (!navigator.onLine) {
                const localId = crypto.randomUUID();
                const offlineData = {
                    id: localId,
                    clinic_id: clinicId || newPatient.clinicId || '101',
                    full_name: newPatient.name,
                    phone: newPatient.phone,
                    age: newPatient.age,
                    gender: newPatient.gender,
                    email: newPatient.email,
                    address: newPatient.address,
                    notes: newPatient.notes,
                    medical_history: newPatient.medicalHistory ? JSON.parse(JSON.stringify(newPatient.medicalHistory)) : [],
                    status: 'active',
                    patient_user_id: null,
                    created_at: new Date().toISOString()
                };

                await db.patients.put({
                    id: localId,
                    clinic_id: offlineData.clinic_id,
                    name: offlineData.full_name,
                    phone: offlineData.phone,
                    data: offlineData,
                    synced: false,
                    created_at: offlineData.created_at,
                    updated_at: offlineData.created_at
                });

                await addToSyncQueue('INSERT', 'patients', localId, offlineData);
                toast.info('تم حفظ ملف المريض محلياً في وضع الأوفلاين (ستتم المزامنة تلقائياً عند الاتصال)');
                fetchPatients();
                return offlineData;
            }

            // Auto-lookup portal account by phone (Scenario E)
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
                clinic_id: clinicId || newPatient.clinicId || '101',
                full_name: newPatient.name,
                phone: newPatient.phone,
                age: newPatient.age,
                gender: newPatient.gender,
                email: newPatient.email,
                address: newPatient.address,
                notes: newPatient.notes,
                medical_history: newPatient.medicalHistory ? JSON.parse(JSON.stringify(newPatient.medicalHistory)) : [],
                status: 'active',
                patient_user_id: patientUserId
            };

            const { data, error } = await supabase.from('patients').insert(patientData).select().single();
            if (error) throw error;

            // حفظ في Dexie فوراً
            await db.patients.put({
                id: data.id.toString(),
                clinic_id: data.clinic_id.toString(),
                name: data.full_name,
                phone: data.phone || '',
                data,
                synced: true,
                created_at: data.created_at,
                updated_at: data.created_at
            }).catch(() => {});

            await logActivity('create_patient', data.id, { name: data.full_name });
            fetchPatients();
            return data;
        } catch (err: any) {
            if (err?.message === 'patient_exists') throw err;

            // في حالة فشل الشبكة، نقوم بالحفظ الاحتياطي في Dexie
            try {
                const localId = crypto.randomUUID();
                const offlineData = {
                    id: localId,
                    clinic_id: clinicId || newPatient.clinicId || '101',
                    full_name: newPatient.name,
                    phone: newPatient.phone,
                    age: newPatient.age,
                    gender: newPatient.gender,
                    email: newPatient.email,
                    address: newPatient.address,
                    notes: newPatient.notes,
                    medical_history: newPatient.medicalHistory ? JSON.parse(JSON.stringify(newPatient.medicalHistory)) : [],
                    status: 'active',
                    patient_user_id: null,
                    created_at: new Date().toISOString()
                };

                await db.patients.put({
                    id: localId,
                    clinic_id: offlineData.clinic_id,
                    name: offlineData.full_name,
                    phone: offlineData.phone,
                    data: offlineData,
                    synced: false,
                    created_at: offlineData.created_at,
                    updated_at: offlineData.created_at
                });

                await addToSyncQueue('INSERT', 'patients', localId, offlineData);
                toast.info('تعذر الاتصال بالسيرفر، تم حفظ ملف المريض محلياً (ستتم المزامنة تلقائياً)');
                fetchPatients();
                return offlineData;
            } catch (fallbackErr) {
                console.error('Offline fallback failed:', fallbackErr);
            }

            console.error('Error creating patient:', err);
            throw err;
        }
    };

    const updatePatient = async (id: string, updates: any) => {
        try {
            const dbUpdates: any = {};
            if (updates.name !== undefined) dbUpdates.full_name = updates.name;
            if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
            if (updates.status !== undefined) dbUpdates.status = updates.status;
            if (updates.age !== undefined) dbUpdates.age = Number(updates.age);
            if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
            if (updates.email !== undefined) dbUpdates.email = updates.email;
            if (updates.address !== undefined) dbUpdates.address = updates.address;
            if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

            if (!navigator.onLine) {
                const local = await db.patients.get(id);
                if (local) {
                    const updatedData = { ...((local.data as any) || {}), ...dbUpdates };
                    await db.patients.update(id, {
                        name: dbUpdates.full_name || local.name,
                        phone: dbUpdates.phone || local.phone,
                        data: updatedData,
                        synced: false,
                        updated_at: new Date().toISOString()
                    });
                    await addToSyncQueue('UPDATE', 'patients', id, dbUpdates);
                    toast.info('تم تحديث بيانات المريض محلياً');
                    fetchPatients();
                    return;
                }
            }

            const { error } = await supabase.from('patients').update(dbUpdates).eq('id', id);
            if (error) throw error;

            // تحديث Dexie محلياً أيضاً
            const local = await db.patients.get(id);
            if (local) {
                await db.patients.update(id, {
                    name: dbUpdates.full_name || local.name,
                    phone: dbUpdates.phone || local.phone,
                    data: { ...((local.data as any) || {}), ...dbUpdates },
                    updated_at: new Date().toISOString()
                }).catch(() => {});
            }

            await logActivity('update_patient', id, updates);
            fetchPatients();
        } catch (err) {
            console.error('Error updating patient:', err);
            throw err;
        }
    };

    const deletePatient = async (id: string) => {
        try {
            if (!navigator.onLine) {
                await db.patients.delete(id);
                await addToSyncQueue('UPDATE', 'patients', id, { deleted_at: new Date().toISOString() });
                toast.info('تم حذف المريض محلياً');
                fetchPatients();
                return;
            }

            const { error } = await supabase
                .from('patients')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            await db.patients.delete(id).catch(() => {});
            await logActivity('delete_patient', id, {});
            fetchPatients();
        } catch (err) {
            console.error('Error deleting patient:', err);
            throw err;
        }
    };

    // Check if we need to expose restorePatient?
    // Usually restore is done from Activity Log or Trash, which might use a generic restore function.
    // unlikely to be called from this hook unless we have a trash view.
    // check tasks: "Undo" from Activity Log.

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
