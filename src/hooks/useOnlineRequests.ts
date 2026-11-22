import { useState, useEffect, useRef } from 'react';
import { supabase, ensureFreshOnlineSession } from '../lib/supabase';
import { db, getInstantCache, getCache, setCache } from '../lib/offline/db';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export interface OnlineRequest {
    id: string;
    patientName: string;
    source: string;
    date: string;
    time: string;
    phone: string;
    status: 'pending' | 'confirmed' | 'cancelled';
    hasFile?: boolean;
    notes?: string;
    patientId?: string;
    patientUserId?: string;
    type?: string;
}

const onlineRequestsMemoryCache = new Map<string, OnlineRequest[]>();

function mapAppointmentRowToRequest(
    apt: any,
    existingPatientsMap: Record<string, string> = {}
): OnlineRequest {
    const clinicKey = apt.clinic_id ? String(apt.clinic_id) : '';
    const resolvedPatientId =
        apt.patient_id ||
        apt.patientId ||
        (apt.patient_user_id && clinicKey
            ? existingPatientsMap[`${clinicKey}_${apt.patient_user_id}`]
            : undefined) ||
        undefined;

    return {
        id: String(apt.id),
        patientName: apt.patient_name || apt.patientName || apt.title || 'مريض غير مسجل',
        source: apt.created_via || 'online',
        date: apt.appointment_date || apt.date || '',
        time: apt.appointment_time || apt.time || apt.start_time || '09:00',
        phone: apt.phone_number || apt.patient_phone || apt.patientPhone || apt.phone || '',
        status: (apt.status || 'pending') as 'pending' | 'confirmed' | 'cancelled',
        hasFile: !!resolvedPatientId,
        notes: apt.notes,
        patientId: resolvedPatientId ? String(resolvedPatientId) : undefined,
        patientUserId: apt.patient_user_id || apt.patientUserId || undefined,
        type: apt.type || apt.appointment_type || 'consultation',
    };
}

export const useOnlineRequests = (clinicId?: string) => {
    const { user } = useAuth();
    const cacheKey = `online_requests_${clinicId || 'all'}`;
    const mountedRef = useRef(true);

    const readSyncInitial = (): OnlineRequest[] | null => {
        const mem = onlineRequestsMemoryCache.get(cacheKey);
        if (mem) return mem;
        const instant = getInstantCache<OnlineRequest[]>(cacheKey);
        if (Array.isArray(instant)) {
            onlineRequestsMemoryCache.set(cacheKey, instant);
            return instant;
        }
        // Derive pending requests immediately from cached appointments if online_requests cache is not yet saved
        const cachedApts = getInstantCache<any[]>(`appointments_${clinicId || 'all'}`);
        if (Array.isArray(cachedApts)) {
            const derived = cachedApts
                .filter((a: any) => a.status === 'pending')
                .map((a: any) => mapAppointmentRowToRequest(a));
            return derived;
        }
        return null;
    };

    const initial = readSyncInitial();
    const [requests, setRequests] = useState<OnlineRequest[]>(initial || []);
    const [loading, setLoading] = useState<boolean>(
        initial === null && !!clinicId && (typeof navigator === 'undefined' || navigator.onLine)
    );

    const persistRequests = (mapped: OnlineRequest[]) => {
        onlineRequestsMemoryCache.set(cacheKey, mapped);
        setCache(cacheKey, mapped, 86400 * 30).catch(() => {});
        if (mountedRef.current) {
            setRequests(mapped);
        }
    };

    const loadFromLocal = async (): Promise<OnlineRequest[]> => {
        // 1. Check Dexie appointments table (always up-to-date with useAppointments + preloader)
        try {
            const [allLocalApts, allLocalPatients] = await Promise.all([
                db.appointments.toArray(),
                db.patients.toArray(),
            ]);

            const existingPatientsMap: Record<string, string> = {};
            for (const p of allLocalPatients) {
                const pData = (p.data || {}) as any;
                const pUserId = pData.patient_user_id;
                const pClinicId = String(p.clinic_id || pData.clinic_id || '');
                if (pUserId && pClinicId) {
                    existingPatientsMap[`${pClinicId}_${pUserId}`] = String(p.id);
                }
            }

            const pendingLocal = allLocalApts.filter((la) => {
                const aData = (la.data || {}) as any;
                const status = la.status || aData.status;
                if (status !== 'pending') return false;
                if (clinicId && clinicId !== 'all' && clinicId !== '0') {
                    return String(la.clinic_id) === String(clinicId) || String(aData.clinic_id) === String(clinicId);
                }
                return true;
            });

            if (pendingLocal.length > 0) {
                const mapped = pendingLocal
                    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
                    .map((la) => {
                        const aData = (la.data || {}) as any;
                        return mapAppointmentRowToRequest(
                            {
                                ...aData,
                                id: la.id,
                                clinic_id: la.clinic_id || aData.clinic_id,
                                patient_id: la.patient_id || aData.patient_id,
                                appointment_date: la.date || aData.appointment_date || aData.date,
                                appointment_time: la.time || aData.appointment_time || aData.time,
                                status: la.status || aData.status,
                                notes: la.notes || aData.notes,
                            },
                            existingPatientsMap
                        );
                    });
                onlineRequestsMemoryCache.set(cacheKey, mapped);
                if (mountedRef.current) setRequests(mapped);
                return mapped;
            }
        } catch {}

        // 2. Fallback to dedicated cache
        const cached = getInstantCache<OnlineRequest[]>(cacheKey) || (await getCache<OnlineRequest[]>(cacheKey));
        if (Array.isArray(cached)) {
            onlineRequestsMemoryCache.set(cacheKey, cached);
            if (mountedRef.current) setRequests(cached);
            return cached;
        }
        return [];
    };

    useEffect(() => {
        mountedRef.current = true;
        if (clinicId) {
            const syncCached = readSyncInitial();
            if (syncCached !== null) {
                setRequests(syncCached);
                setLoading(false);
            }
            fetchRequests();
        } else {
            setRequests([]);
            setLoading(false);
        }

        const handleRefresh = () => {
            if (clinicId) fetchRequests();
        };
        const handleAppointmentsMutated = () => {
            if (clinicId) {
                loadFromLocal().catch(() => {});
            }
        };

        window.addEventListener('dental-online-ready', handleRefresh);
        window.addEventListener('dental-auth-session-ready', handleRefresh);
        window.addEventListener('dental-sync-completed', handleRefresh);
        window.addEventListener('dental-clinic-preloaded', handleAppointmentsMutated);
        window.addEventListener('dental-appointments-mutated', handleAppointmentsMutated);

        return () => {
            mountedRef.current = false;
            window.removeEventListener('dental-online-ready', handleRefresh);
            window.removeEventListener('dental-auth-session-ready', handleRefresh);
            window.removeEventListener('dental-sync-completed', handleRefresh);
            window.removeEventListener('dental-clinic-preloaded', handleAppointmentsMutated);
            window.removeEventListener('dental-appointments-mutated', handleAppointmentsMutated);
        };
    }, [clinicId, user?.id]);

    const fetchRequests = async () => {
        if (!clinicId) {
            if (mountedRef.current) setLoading(false);
            return;
        }

        const localList = await loadFromLocal();
        if (localList.length > 0 && mountedRef.current) {
            setLoading(false);
        }

        if (!navigator.onLine) {
            if (mountedRef.current) setLoading(false);
            return;
        }

        const authed = await ensureFreshOnlineSession();
        if (!authed) {
            if (mountedRef.current) setLoading(false);
            return;
        }

        if (localList.length === 0 && requests.length === 0 && mountedRef.current) {
            setLoading(true);
        }

        try {
            let query = supabase
                .from('appointments')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (clinicId && clinicId !== 'all') {
                query = query.eq('clinic_id', clinicId);
            }

            const { data, error } = await query;

            if (error) throw error;

            if (data) {
                const userIds = Array.from(new Set(data.map((apt: any) => apt.patient_user_id).filter(Boolean)));
                const clinicIds = Array.from(new Set(data.map((apt: any) => apt.clinic_id).filter(Boolean)));

                let existingPatientsMap: Record<string, string> = {};

                if (userIds.length > 0 && clinicIds.length > 0) {
                    const { data: patientsData } = await supabase
                        .from('patients')
                        .select('id, patient_user_id, clinic_id')
                        .in('clinic_id', clinicIds)
                        .in('patient_user_id', userIds)
                        .is('deleted_at', null);

                    if (patientsData) {
                        patientsData.forEach(p => {
                            if (p.patient_user_id && p.clinic_id) {
                                existingPatientsMap[`${p.clinic_id}_${p.patient_user_id}`] = String(p.id);
                            }
                        });
                    }
                }

                const mapped: OnlineRequest[] = data.map((apt: any) =>
                    mapAppointmentRowToRequest(apt, existingPatientsMap)
                );
                persistRequests(mapped);
            }
        } catch (err) {
            console.error('Error fetching online requests:', err);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const notifyAppointmentsChanged = () => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('dental-online-requests-mutated', { detail: { clinicId } }));
        }
    };

    /**
     * confirmRequest — Smart confirmation:
     * - If appointment has patient_user_id (portal account):
     *   → Find or create a patient file in the clinic linked to that account
     *   → Update appointment with patient_id + status = 'confirmed'
     * - If no patient_user_id (guest booking):
     *   → Simply confirm the status, no file creation
     */
    const confirmRequest = async (requestId: string): Promise<boolean> => {
        if (!navigator.onLine) {
            toast.error('تأكيد طلبات الحجز الإلكتروني يتطلب اتصالاً بالإنترنت');
            return false;
        }
        try {
            await ensureFreshOnlineSession();

            // 1. Fetch full appointment data
            const { data: apt, error: fetchErr } = await supabase
                .from('appointments')
                .select('*')
                .eq('id', requestId)
                .single();

            if (fetchErr || !apt) {
                toast.error('تعذّر جلب بيانات الموعد');
                return false;
            }

            let linkedPatientId = apt.patient_id;

            // 2. Appointment is linked to a portal account
            if (apt.patient_user_id) {
                // 2a. Check if a patient file already exists for this clinic + user account
                const { data: existingPatient } = await supabase
                    .from('patients')
                    .select('id')
                    .eq('clinic_id', apt.clinic_id)
                    .eq('patient_user_id', apt.patient_user_id)
                    .is('deleted_at', null)
                    .maybeSingle();

                let patientFileId = existingPatient?.id;

                if (!patientFileId) {
                    // 2b. Create a new patient file linked to the portal account
                    const { data: newPatient, error: createErr } = await supabase
                        .from('patients')
                        .insert({
                            clinic_id: apt.clinic_id,
                            full_name: apt.patient_name,
                            phone: apt.phone_number || '',
                            patient_user_id: apt.patient_user_id,
                            status: 'active',
                        })
                        .select('id')
                        .single();

                    if (createErr) {
                        console.error('Failed to create patient file:', createErr);
                        // Still confirm the appointment even if file creation fails
                        await supabase
                            .from('appointments')
                            .update({ status: 'confirmed' })
                            .eq('id', requestId);
                        await db.appointments.update(String(requestId), { status: 'confirmed' }).catch(() => {});
                        persistRequests(requests.filter(r => String(r.id) !== String(requestId)));
                        notifyAppointmentsChanged();
                        toast.warning('تم التأكيد، لكن تعذّر إنشاء ملف المريض تلقائياً');
                        fetchRequests();
                        return true;
                    }

                    patientFileId = newPatient.id;
                }

                linkedPatientId = patientFileId;

                // 2c. Confirm appointment + link patient file
                const { error: updateErr } = await supabase
                    .from('appointments')
                    .update({
                        status: 'confirmed',
                        patient_id: patientFileId,
                    })
                    .eq('id', requestId);

                if (updateErr) throw updateErr;

                toast.success('✅ تم تأكيد الموعد وربطه بحساب المراجع تلقائياً');
            } else {
                // 3. Guest booking — confirm only
                const { error: updateErr } = await supabase
                    .from('appointments')
                    .update({ status: 'confirmed' })
                    .eq('id', requestId);

                if (updateErr) throw updateErr;

                toast.success('تم تأكيد الموعد');
            }

            // Update local Dexie & caches immediately
            await db.appointments
                .update(String(requestId), {
                    status: 'confirmed',
                    ...(linkedPatientId ? { patient_id: String(linkedPatientId) } : {}),
                })
                .catch(() => {});
            persistRequests(requests.filter(r => String(r.id) !== String(requestId)));
            notifyAppointmentsChanged();
            fetchRequests();
            return true;
        } catch (err) {
            console.error('Error confirming request:', err);
            toast.error('حدث خطأ أثناء التأكيد');
            return false;
        }
    };

    const cancelRequest = async (id: string): Promise<boolean> => {
        if (!navigator.onLine) {
            toast.error('إلغاء طلبات الحجز الإلكتروني يتطلب اتصالاً بالإنترنت');
            return false;
        }
        try {
            await ensureFreshOnlineSession();
            const { error } = await supabase
                .from('appointments')
                .update({ status: 'cancelled' })
                .eq('id', id);

            if (error) throw error;

            await db.appointments.update(String(id), { status: 'cancelled' }).catch(() => {});
            persistRequests(requests.filter(r => String(r.id) !== String(id)));
            notifyAppointmentsChanged();
            toast.success('تم إلغاء الطلب');
            fetchRequests();
            return true;
        } catch (err) {
            console.error('Error cancelling request:', err);
            toast.error('حدث خطأ أثناء الإلغاء');
            return false;
        }
    };

    const linkPatientToRequest = async (requestId: string, patientId: string) => {
        if (!navigator.onLine) {
            toast.error('ربط المريض بالطلب الإلكتروني يتطلب اتصالاً بالإنترنت');
            return false;
        }
        try {
            await ensureFreshOnlineSession();
            const { data: patient } = await supabase
                .from('patients')
                .select('full_name, patient_user_id')
                .eq('id', patientId)
                .single();

            const updateData: any = {
                patient_id: patientId,
                patient_name: patient?.full_name,
            };

            // Also propagate patient_user_id if the patient file has one
            if (patient?.patient_user_id) {
                updateData.patient_user_id = patient.patient_user_id;
            }

            const { error } = await supabase
                .from('appointments')
                .update(updateData)
                .eq('id', requestId);

            if (error) throw error;

            await db.appointments
                .update(String(requestId), { patient_id: String(patientId) })
                .catch(() => {});
            notifyAppointmentsChanged();
            toast.success('تم ربط المريض بالموعد بنجاح');
            fetchRequests();
            return true;
        } catch (err) {
            console.error('Error linking patient:', err);
            toast.error('فشل ربط المريض');
            return false;
        }
    };

    return {
        requests,
        loading,
        refresh: fetchRequests,
        confirmRequest,
        cancelRequest,
        linkPatientToRequest
    };
};
