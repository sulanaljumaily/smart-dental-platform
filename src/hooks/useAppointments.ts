import { useState, useEffect, useRef } from 'react';
import { Appointment } from '../types/appointments';
import { supabase } from '../lib/supabase';
import { db, addToSyncQueue, LocalAppointment, getInstantCache, setCache } from '../lib/offline/db';
import { toast } from 'sonner';

const appointmentsCache = new Map<string, Appointment[]>();

const cleanNotes = (notes: string | null | undefined) => {
    if (notes && notes.includes('--- [METADATA] ---')) {
        return notes.split('--- [METADATA] ---')[0].trim();
    }
    return notes || '';
};

const parseMetadata = (metadata: any, notes: string | null | undefined) => {
    if (metadata && (typeof metadata === 'object' || Array.isArray(metadata))) {
        return metadata;
    }
    if (metadata && typeof metadata === 'string') {
        try {
            return JSON.parse(metadata);
        } catch {}
    }
    if (notes && notes.includes('--- [METADATA] ---')) {
        const parts = notes.split('--- [METADATA] ---');
        try {
            return JSON.parse(parts[1].trim());
        } catch {}
    }
    return { calls: [], reminders: [] };
};

function mapLocalToAppointment(la: LocalAppointment): Appointment {
    const a = (la.data || {}) as any;
    const metadata = parseMetadata(a.metadata, la.notes || a.notes);
    return {
        id: String(la.id),
        clinicId: String(la.clinic_id || a.clinic_id || ''),
        patientId: String(la.patient_id || a.patient_id || ''),
        patientName: a.patient_name || a.patient?.full_name || la.title || 'مريض',
        doctorId: la.doctor_id || (a.staff_id ? String(a.staff_id) : undefined),
        doctorName: a.doctor_name || a.staff?.full_name || 'الطبيب',
        date: la.date || a.appointment_date || a.date || '',
        time: la.time || a.appointment_time || a.time || a.start_time || '09:00',
        startTime: a.start_time || la.time || a.appointment_time || '09:00',
        endTime: a.end_time,
        duration: (Number(a.duration) || 30) as any,
        type: (a.type || a.appointment_type || 'consultation') as any,
        status: (la.status === 'no_show' ? 'noshow' : (la.status || a.status || 'scheduled')) as any,
        title: la.title || a.title || '',
        priority: a.priority || 'normal',
        notes: cleanNotes(la.notes || a.notes),
        metadata,
        cost: Number(a.cost) || 0,
        patientPhone: a.patient_phone || a.phone_number || a.phone || '',
        createdAt: la.created_at || a.created_at || new Date().toISOString(),
        createdBy: a.created_by || '',
        patientUserId: a.patient_user_id || undefined
    };
}

export const useAppointments = (clinicId?: string) => {
    const cacheKey = clinicId || 'all';

    const getInitialList = (): Appointment[] => {
        const mem = appointmentsCache.get(cacheKey);
        if (mem && mem.length > 0) return mem;
        const instant = getInstantCache<Appointment[]>('appointments_' + cacheKey);
        if (instant && instant.length > 0) {
            appointmentsCache.set(cacheKey, instant);
            return instant;
        }
        return [];
    };

    const initial = getInitialList();
    const [appointments, setAppointments] = useState<Appointment[]>(initial);
    const [loading, setLoading] = useState(initial.length === 0 && clinicId !== undefined);
    const mountedRef = useRef(true);

    const saveAppointmentsToCache = (list: Appointment[]) => {
        appointmentsCache.set(cacheKey, list);
        setCache('appointments_' + cacheKey, list, 86400 * 30).catch(() => {});
        if (mountedRef.current) {
            setAppointments(list);
        }
    };

    const loadFromDexie = async (): Promise<{ mapped: Appointment[]; raw: LocalAppointment[] }> => {
        try {
            const allLocal = await db.appointments.toArray();
            const filtered = allLocal.filter(la => {
                if (!clinicId || clinicId === 'all' || clinicId === '0') return true;
                const aData = (la.data || {}) as any;
                return String(la.clinic_id) === String(clinicId) || String(aData.clinic_id) === String(clinicId);
            });
            const sorted = filtered.sort((a, b) => {
                const dateCmp = String(b.date || '').localeCompare(String(a.date || ''));
                if (dateCmp !== 0) return dateCmp;
                return String(b.time || '').localeCompare(String(a.time || ''));
            });
            return {
                mapped: sorted.map(mapLocalToAppointment),
                raw: sorted
            };
        } catch (e) {
            console.warn('[useAppointments] Dexie read error:', e);
            return { mapped: [], raw: [] };
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        if (clinicId !== undefined && clinicId !== '0') {
            const cached = getInitialList();
            if (cached.length > 0) {
                setAppointments(cached);
                setLoading(false);
            }
            fetchAppointments();
        } else {
            setAppointments([]);
            setLoading(false);
        }
        return () => { mountedRef.current = false; };
    }, [clinicId]);

    const fetchAppointments = async () => {
        if (clinicId === undefined || clinicId === '0') {
            if (mountedRef.current) setLoading(false);
            return;
        }

        // 1. قراءة فورية من Dexie
        const { mapped: dexieList, raw: dexieRaw } = await loadFromDexie();
        if (dexieList.length > 0 && mountedRef.current) {
            saveAppointmentsToCache(dexieList);
            setLoading(false);
        }

        if (!navigator.onLine) {
            if (dexieList.length === 0) {
                const instant = getInstantCache<Appointment[]>('appointments_' + cacheKey);
                if (instant && instant.length > 0 && mountedRef.current) {
                    setAppointments(instant);
                }
            }
            if (mountedRef.current) setLoading(false);
            return;
        }

        if (appointments.length === 0 && dexieList.length === 0) {
            setLoading(true);
        }

        try {
            let query = supabase
                .from('appointments')
                .select('*, staff:staff_id(full_name)')
                .order('appointment_date', { ascending: false })
                .order('appointment_time', { ascending: false });

            const { data: { user } } = await supabase.auth.getUser();

            if (clinicId && clinicId !== 'all') {
                query = query.eq('clinic_id', clinicId);
            } else if (user && user.user_metadata?.role !== 'admin') {
                const { data: ownedClinics } = await supabase.from('clinics').select('id').eq('owner_id', user.id);
                const { data: staffClinics } = await supabase.from('staff').select('clinic_id').or(`user_id.eq.${user.id},auth_user_id.eq.${user.id}`).in('status', ['active', 'on_leave']);

                const accessibleIds = [
                    ...(ownedClinics?.map(c => c.id) || []),
                    ...(staffClinics?.map(c => c.clinic_id) || [])
                ];

                if (accessibleIds.length > 0) {
                    query = query.in('clinic_id', accessibleIds);
                } else {
                    query = query.in('clinic_id', [-1]);
                }
            }

            let { data, error } = await query;

            if (error && error.code === '42703') {
                query = supabase
                    .from('appointments')
                    .select('*, staff:staff_id(full_name)')
                    .order('created_at', { ascending: false });

                if (clinicId && clinicId !== 'all') {
                    query = query.eq('clinic_id', clinicId);
                }
                const result = await query;
                data = result.data;
                error = result.error;
            }

            if (error) throw error;

            const serverAppointments: Appointment[] = (data || []).map((a: any) => {
                const metadata = parseMetadata(a.metadata, a.notes);
                const notes = cleanNotes(a.notes);
                return {
                    id: String(a.id),
                    clinicId: String(a.clinic_id || clinicId || ''),
                    patientId: a.patient_id ? String(a.patient_id) : '',
                    patientName: a.patient_name || 'مريض',
                    doctorId: a.staff_id ? String(a.staff_id) : undefined,
                    doctorName: a.doctor_name || a.staff?.full_name,
                    date: a.appointment_date || a.date || '',
                    time: a.appointment_time || a.time || a.start_time || '09:00',
                    startTime: a.start_time || a.appointment_time || '09:00',
                    endTime: a.end_time,
                    duration: (Number(a.duration) || 30) as any,
                    type: a.type || a.appointment_type || 'consultation',
                    status: a.status === 'no_show' ? 'noshow' : a.status,
                    title: a.title || '',
                    priority: a.priority || 'normal',
                    notes,
                    metadata,
                    cost: Number(a.cost) || 0,
                    patientPhone: a.patient_phone || a.phone_number || a.phone || '',
                    createdAt: a.created_at || '',
                    createdBy: a.created_by || '',
                    patientUserId: a.patient_user_id || undefined
                };
            });

            // دمج أي مواعيد مضافة أوفلاين لم تكتمل مزامنتها بعد
            const unsyncedRaw = dexieRaw.filter(la => la.synced === false);
            const serverIds = new Set(serverAppointments.map(sa => String(sa.id)));
            const merged = [
                ...unsyncedRaw.filter(la => !serverIds.has(String(la.id))).map(mapLocalToAppointment),
                ...serverAppointments
            ];

            saveAppointmentsToCache(merged);

            try {
                const now = new Date().toISOString();
                const localItems: LocalAppointment[] = (data || []).map((a: any) => ({
                    id: String(a.id),
                    clinic_id: String(a.clinic_id || clinicId || ''),
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
                    updated_at: a.updated_at || now
                }));
                if (localItems.length > 0) {
                    await db.appointments.bulkPut(localItems);
                }
            } catch {}
        } catch (err: any) {
            if (err?.name === 'AbortError' || err?.message?.includes('AbortError')) return;
            if (mountedRef.current) {
                const { mapped: fallbackList } = await loadFromDexie();
                if (fallbackList.length > 0) {
                    saveAppointmentsToCache(fallbackList);
                    return;
                }
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const saveAppointmentOffline = async (appointment: Appointment, newAptPayload: any) => {
        const localId = crypto.randomUUID();
        const now = new Date().toISOString();
        const targetClinicId = String(clinicId || appointment.clinicId || '101');
        const offlineApt = {
            ...newAptPayload,
            id: localId,
            clinic_id: Number.isNaN(Number(targetClinicId)) ? targetClinicId : Number(targetClinicId),
            created_at: now
        };

        const localRecord: LocalAppointment = {
            id: localId,
            clinic_id: targetClinicId,
            patient_id: String(appointment.patientId || ''),
            doctor_id: appointment.doctorId ? String(appointment.doctorId) : undefined,
            title: offlineApt.title || 'موعد جديد',
            date: offlineApt.appointment_date || '',
            time: offlineApt.appointment_time || '09:00',
            status: offlineApt.status || 'scheduled',
            notes: offlineApt.notes || '',
            data: offlineApt,
            synced: false,
            created_at: now,
            updated_at: now
        };

        await db.appointments.put(localRecord);
        await addToSyncQueue('INSERT', 'appointments', localId, offlineApt);

        const mappedNew = mapLocalToAppointment(localRecord);
        saveAppointmentsToCache([mappedNew, ...appointments]);
    };

    const createAppointment = async (appointment: Appointment) => {
        const cleanNote = cleanNotes(appointment.notes || '');
        const serializedMetadata = JSON.stringify(appointment.metadata || { calls: [], reminders: [] });
        const notesWithMetadata = `${cleanNote}\n\n--- [METADATA] ---\n${serializedMetadata}`;
        const targetClinicId = String(clinicId || appointment.clinicId || '101');

        const newApt: any = {
            clinic_id: Number.isNaN(Number(targetClinicId)) ? targetClinicId : Number(targetClinicId),
            patient_id: appointment.patientId && !isNaN(Number(appointment.patientId))
                ? Number(appointment.patientId)
                : appointment.patientId,
            staff_id: appointment.doctorId && !isNaN(Number(appointment.doctorId)) ? Number(appointment.doctorId) : null,
            patient_name: appointment.patientName,
            doctor_name: appointment.doctorName,
            appointment_date: appointment.date,
            appointment_time: appointment.startTime || appointment.time,
            start_time: appointment.startTime || appointment.time,
            end_time: appointment.endTime,
            duration: appointment.duration,
            type: appointment.type,
            status: (appointment.status === 'noshow' ? 'no_show' : appointment.status) || 'scheduled',
            title: appointment.title,
            priority: appointment.priority,
            notes: notesWithMetadata,
            cost: appointment.cost || 0,
            metadata: appointment.metadata || { calls: [], reminders: [] }
        };

        // إذا كان الجهاز أوفلاين أو المريض نفسه مضافاً أوفلاين ولم يُزامن بعد
        const isPatientUnsynced = appointment.patientId ? isNaN(Number(appointment.patientId)) : false;

        if (!navigator.onLine || isPatientUnsynced) {
            await saveAppointmentOffline(appointment, newApt);
            toast.success('تم حفظ الموعد محلياً (ستتم المزامنة تلقائياً عند توفر الإنترنت)');
            return;
        }

        try {
            let insertedData: any = null;
            const { data, error } = await supabase.from('appointments').insert(newApt).select().maybeSingle();
            if (error) {
                if (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('metadata')) {
                    const fallbackApt = { ...newApt };
                    delete fallbackApt.metadata;
                    const { data: fbData, error: fallbackError } = await supabase.from('appointments').insert(fallbackApt).select().maybeSingle();
                    if (fallbackError) throw fallbackError;
                    insertedData = fbData;
                } else {
                    throw error;
                }
            } else {
                insertedData = data;
            }

            if (insertedData) {
                const localRecord: LocalAppointment = {
                    id: String(insertedData.id),
                    clinic_id: String(insertedData.clinic_id),
                    patient_id: insertedData.patient_id ? String(insertedData.patient_id) : '',
                    doctor_id: insertedData.staff_id ? String(insertedData.staff_id) : undefined,
                    title: insertedData.title || 'موعد',
                    date: insertedData.appointment_date || insertedData.date || '',
                    time: insertedData.appointment_time || insertedData.time || '',
                    status: insertedData.status || 'scheduled',
                    notes: insertedData.notes || '',
                    data: insertedData,
                    synced: true,
                    created_at: insertedData.created_at || new Date().toISOString(),
                    updated_at: insertedData.created_at || new Date().toISOString()
                };
                await db.appointments.put(localRecord).catch(() => {});
            }

            fetchAppointments();
        } catch {
            await saveAppointmentOffline(appointment, newApt);
            toast.info('تعذر الاتصال، تم حفظ الموعد محلياً وستتم المزامنة تلقائياً');
        }
    };

    const updateAppointment = async (updatedAppointment: Appointment) => {
        const targetId = String(updatedAppointment.id);
        const cleanNote = cleanNotes(updatedAppointment.notes || '');
        const serializedMetadata = JSON.stringify(updatedAppointment.metadata || { calls: [], reminders: [] });
        const notesWithMetadata = `${cleanNote}\n\n--- [METADATA] ---\n${serializedMetadata}`;

        const updates: any = {
            appointment_date: updatedAppointment.date,
            appointment_time: updatedAppointment.startTime || updatedAppointment.time,
            start_time: updatedAppointment.startTime || updatedAppointment.time,
            end_time: updatedAppointment.endTime,
            duration: updatedAppointment.duration,
            status: updatedAppointment.status === 'noshow' ? 'no_show' : updatedAppointment.status,
            type: updatedAppointment.type,
            title: updatedAppointment.title,
            priority: updatedAppointment.priority,
            notes: notesWithMetadata,
            staff_id: updatedAppointment.doctorId && !isNaN(Number(updatedAppointment.doctorId)) ? Number(updatedAppointment.doctorId) : null,
            doctor_name: updatedAppointment.doctorName || null,
            cost: updatedAppointment.cost,
            metadata: updatedAppointment.metadata || { calls: [], reminders: [] }
        };

        const applyLocalUpdate = async (markUnsynced: boolean) => {
            try {
                const existing = await db.appointments.get(targetId);
                const now = new Date().toISOString();
                if (existing) {
                    const nextData = { ...((existing.data as any) || {}), ...updates };
                    await db.appointments.update(targetId, {
                        title: updates.title || existing.title,
                        date: updates.appointment_date || existing.date,
                        time: updates.appointment_time || existing.time,
                        status: updates.status || existing.status,
                        notes: updates.notes || existing.notes,
                        doctor_id: updatedAppointment.doctorId ? String(updatedAppointment.doctorId) : existing.doctor_id,
                        data: nextData,
                        synced: markUnsynced ? false : existing.synced,
                        updated_at: now
                    });
                }
            } catch {}

            const nextList = appointments.map(a =>
                String(a.id) === targetId
                    ? { ...a, ...updatedAppointment, notes: cleanNote }
                    : a
            );
            saveAppointmentsToCache(nextList);
        };

        if (!navigator.onLine || isNaN(Number(targetId))) {
            await applyLocalUpdate(true);
            await addToSyncQueue('UPDATE', 'appointments', targetId, updates);
            toast.success('تم تحديث الموعد محلياً');
            return;
        }

        try {
            const { error } = await supabase.from('appointments').update(updates).eq('id', targetId);
            if (error) {
                if (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('metadata')) {
                    const fallbackUpdates = { ...updates };
                    delete fallbackUpdates.metadata;
                    const { error: fallbackError } = await supabase.from('appointments').update(fallbackUpdates).eq('id', targetId);
                    if (fallbackError) throw fallbackError;
                } else {
                    throw error;
                }
            }
            await applyLocalUpdate(false);
            fetchAppointments();
        } catch {
            await applyLocalUpdate(true);
            await addToSyncQueue('UPDATE', 'appointments', targetId, updates);
            toast.info('تم حفظ تعديل الموعد محلياً (ستتم المزامنة عند الاتصال)');
        }
    };

    const deleteAppointment = async (id: string) => {
        const targetId = String(id);
        const removeLocal = async () => {
            await db.appointments.delete(targetId).catch(() => {});
            saveAppointmentsToCache(appointments.filter(a => String(a.id) !== targetId));
        };

        if (!navigator.onLine || isNaN(Number(targetId))) {
            await removeLocal();
            await addToSyncQueue('DELETE', 'appointments', targetId, {});
            toast.success('تم حذف الموعد محلياً');
            return;
        }

        try {
            const { error } = await supabase.from('appointments').delete().eq('id', targetId);
            if (error) throw error;
            await removeLocal();
        } catch {
            await removeLocal();
            await addToSyncQueue('DELETE', 'appointments', targetId, {});
            toast.info('تم حذف الموعد محلياً (ستتم المزامنة عند الاتصال)');
        }
    };

    return {
        appointments,
        loading,
        createAppointment,
        updateAppointment,
        deleteAppointment,
        refresh: fetchAppointments
    };
};
