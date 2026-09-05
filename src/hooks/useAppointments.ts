import { useState, useEffect, useRef } from 'react';
import { Appointment } from '../types/appointments';
import { supabase } from '../lib/supabase';
import { db, addToSyncQueue, LocalAppointment } from '../lib/offline/db';
import { toast } from 'sonner';

const appointmentsCache = new Map<string, Appointment[]>();

export const useAppointments = (clinicId?: string) => {
    const cacheKey = clinicId || 'all';
    const [appointments, setAppointments] = useState<Appointment[]>(() => appointmentsCache.get(cacheKey) || []);
    const [loading, setLoading] = useState(!appointmentsCache.has(cacheKey));
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        // Only fetch when a clinic context is provided
        if (clinicId !== undefined) {
            fetchAppointments();
        } else {
            // No clinic context → clear data, don't fetch
            setAppointments([]);
            setLoading(false);
        }
        return () => { mountedRef.current = false; };
    }, [clinicId]);

    const fetchAppointments = async () => {
        // إذا كان الجهاز أوفلاين، استرجع المواعيد محلياً فوراً من Dexie
        if (!navigator.onLine) {
            try {
                let localItems: LocalAppointment[] = [];
                if (clinicId && clinicId !== 'all') {
                    localItems = await db.appointments.where('clinic_id').equals(clinicId).toArray();
                } else {
                    localItems = await db.appointments.toArray();
                }

                if (localItems.length > 0 && mountedRef.current) {
                    const mappedAppointments: Appointment[] = localItems.map((la) => {
                        const a = (la.data || {}) as any;
                        const metadata = (a.metadata && typeof a.metadata === 'object') ? a.metadata : { calls: [], reminders: [] };
                        return {
                            id: la.id,
                            clinicId: la.clinic_id,
                            patientId: la.patient_id,
                            patientName: a.patient_name || a.patient?.full_name || la.title || 'مريض محلي',
                            doctorId: la.doctor_id || a.staff_id?.toString(),
                            doctorName: a.doctor_name || a.staff?.full_name || 'الطبيب',
                            date: la.date || a.appointment_date || a.date || '',
                            time: la.time || a.appointment_time || a.time || '',
                            startTime: a.start_time || la.time,
                            endTime: a.end_time,
                            duration: a.duration || 30,
                            type: a.type || a.appointment_type || 'فحص',
                            status: (la.status === 'no_show' ? 'noshow' : la.status) as any,
                            title: la.title,
                            priority: a.priority || 'normal',
                            notes: la.notes || a.notes || '',
                            metadata: metadata,
                            cost: a.cost,
                            patientPhone: a.patient_phone || a.phone_number || a.phone || '',
                            createdAt: la.created_at,
                            createdBy: a.created_by || '',
                            patientUserId: a.patient_user_id || undefined
                        };
                    });
                    setAppointments(mappedAppointments);
                }
            } catch (dexieErr) {
                console.warn('[useAppointments] Immediate Dexie load failed:', dexieErr);
            }
            if (mountedRef.current) setLoading(false);
            return;
        }

        if (!appointmentsCache.has(cacheKey)) {
            setLoading(true);
        }
        try {
            // First try with 'appointment_date' column (actual DB schema)
            let query = supabase
                .from('appointments')
                .select('*, staff:staff_id(full_name)') // Join with staff to get name
                .order('appointment_date', { ascending: false })
                .order('appointment_time', { ascending: false });

            // Fetch user session first to apply fallback logic
            const { data: { user } } = await supabase.auth.getUser();

            if (clinicId && clinicId !== 'all') {
                query = query.eq('clinic_id', clinicId);
            } else if (user && user.user_metadata?.role !== 'admin') {
                // If 'all' is selected, strictly bind to user's clinics to prevent leaking
                const { data: ownedClinics } = await supabase.from('clinics').select('id').eq('owner_id', user.id);
                const { data: staffClinics } = await supabase.from('staff').select('clinic_id').or(`user_id.eq.${user.id},auth_user_id.eq.${user.id}`).in('status', ['active', 'on_leave']);
                
                const accessibleIds = [
                    ...(ownedClinics?.map(c => c.id) || []),
                    ...(staffClinics?.map(c => c.clinic_id) || [])
                ];
                
                if (accessibleIds.length > 0) {
                    query = query.in('clinic_id', accessibleIds);
                } else {
                    // Prevent returning anything if they have no clinics
                    query = query.in('clinic_id', [-1]); 
                }
            }

            let { data, error } = await query;

            // If appointment_date doesn't exist, try 'date'
            if (error && error.code === '42703') {
                query = supabase
                    .from('appointments')
                    .select('*, staff:staff_id(full_name)')
                    .order('created_at', { ascending: false }); // Fallback to created_at

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

                const result = await query;
                data = result.data;
                error = result.error;
            }

            if (error) throw error;

            const parseMetadata = (metadata: any, notes: string | null) => {
                if (metadata && (typeof metadata === 'object' || Array.isArray(metadata))) {
                    return metadata;
                }
                if (metadata && typeof metadata === 'string') {
                    try {
                        return JSON.parse(metadata);
                    } catch (e) {}
                }
                if (notes && notes.includes('--- [METADATA] ---')) {
                    const parts = notes.split('--- [METADATA] ---');
                    try {
                        return JSON.parse(parts[1].trim());
                    } catch (e) {}
                }
                return { calls: [], reminders: [] };
            };

            const cleanNotes = (notes: string | null) => {
                if (notes && notes.includes('--- [METADATA] ---')) {
                    return notes.split('--- [METADATA] ---')[0].trim();
                }
                return notes || '';
            };

            const mappedAppointments: Appointment[] = (data || []).map((a: any) => {
                const metadata = parseMetadata(a.metadata, a.notes);
                const notes = cleanNotes(a.notes);
                return {
                    id: a.id,
                    clinicId: a.clinic_id?.toString(),
                    patientId: a.patient_id?.toString(),
                    patientName: a.patient_name,
                    doctorId: a.staff_id?.toString(),
                    doctorName: a.doctor_name || a.staff?.full_name,
                    date: a.appointment_date || a.date,
                    time: a.appointment_time || a.time || a.start_time,
                    startTime: a.start_time || a.appointment_time,
                    endTime: a.end_time,
                    duration: a.duration || 30,
                    type: a.type || a.appointment_type,
                    status: a.status === 'no_show' ? 'noshow' : a.status,
                    title: a.title,
                    priority: a.priority || 'normal',
                    notes: notes,
                    metadata: metadata,
                    cost: a.cost,
                    patientPhone: a.patient_phone || a.phone_number || a.phone || '',
                    createdAt: a.created_at || '',
                    createdBy: a.created_by || '',
                    patientUserId: a.patient_user_id || undefined
                };
            });

            appointmentsCache.set(cacheKey, mappedAppointments);
            setAppointments(mappedAppointments);

            // حفظ المواعيد في Dexie للاسترجاع الفوري في وضع الأوفلاين
            try {
                const now = new Date().toISOString();
                const localItems: LocalAppointment[] = (data || []).map((a: any) => ({
                    id: a.id?.toString(),
                    clinic_id: a.clinic_id?.toString() || clinicId || '',
                    patient_id: a.patient_id?.toString() || '',
                    doctor_id: a.staff_id?.toString(),
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
            } catch (dexieErr) {
                console.warn('[useAppointments] Error caching appointments to Dexie:', dexieErr);
            }
        } catch (err: any) {
            if (err?.name === 'AbortError' || err?.message?.includes('AbortError')) return;
            if (mountedRef.current) {
                console.warn('[useAppointments] Network error, attempting Dexie offline retrieval:', err);
                // محاولة استرجاع المواعيد محلياً من Dexie
                try {
                    let localItems: LocalAppointment[] = [];
                    if (clinicId && clinicId !== 'all') {
                        localItems = await db.appointments.where('clinic_id').equals(clinicId).toArray();
                    } else {
                        localItems = await db.appointments.toArray();
                    }

                    if (localItems.length > 0) {
                        const mappedAppointments: Appointment[] = localItems.map((la) => {
                            const a = (la.data || {}) as any;
                            const metadata = (a.metadata && typeof a.metadata === 'object') ? a.metadata : { calls: [], reminders: [] };
                            return {
                                id: la.id,
                                clinicId: la.clinic_id,
                                patientId: la.patient_id,
                                patientName: a.patient_name || 'مريض',
                                doctorId: la.doctor_id,
                                doctorName: a.doctor_name,
                                date: la.date,
                                time: la.time,
                                startTime: a.start_time || la.time,
                                endTime: a.end_time,
                                duration: a.duration || 30,
                                type: a.type || 'checkup',
                                status: (la.status === 'no_show' ? 'noshow' : la.status) as any,
                                title: la.title,
                                priority: a.priority || 'normal',
                                notes: a.notes || '',
                                metadata: metadata,
                                cost: a.cost,
                                patientPhone: a.patient_phone || '',
                                createdAt: la.created_at,
                                createdBy: a.created_by || ''
                            };
                        });
                        setAppointments(mappedAppointments);
                        return;
                    }
                } catch (dexieErr) {
                    console.error('[useAppointments] Dexie offline retrieval error:', dexieErr);
                }

                console.error('Error fetching appointments:', err);
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const cleanNotes = (notes: string | null) => {
        if (notes && notes.includes('--- [METADATA] ---')) {
            return notes.split('--- [METADATA] ---')[0].trim();
        }
        return notes || '';
    };

    const createAppointment = async (appointment: Appointment) => {
        let newApt: any = null;
        try {
            const cleanNote = cleanNotes(appointment.notes || '');
            const serializedMetadata = JSON.stringify(appointment.metadata || { calls: [], reminders: [] });
            const notesWithMetadata = `${cleanNote}\n\n--- [METADATA] ---\n${serializedMetadata}`;

            newApt = {
                clinic_id: clinicId || appointment.clinicId || '101',
                patient_id: appointment.patientId,
                staff_id: appointment.doctorId ? Number(appointment.doctorId) : null,
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

            // إذا كان التطبيق أوفلاين، نحفظ مباشرة في Dexie ونضيف لطابور المزامنة
            if (!navigator.onLine) {
                const localId = crypto.randomUUID();
                const offlineApt = {
                    ...newApt,
                    id: localId,
                    created_at: new Date().toISOString()
                };

                await db.appointments.put({
                    id: localId,
                    clinic_id: offlineApt.clinic_id,
                    patient_id: offlineApt.patient_id,
                    doctor_id: appointment.doctorId,
                    title: offlineApt.title || 'موعد جديد',
                    date: offlineApt.appointment_date,
                    time: offlineApt.appointment_time,
                    status: offlineApt.status,
                    notes: offlineApt.notes,
                    data: offlineApt,
                    synced: false,
                    created_at: offlineApt.created_at,
                    updated_at: offlineApt.created_at
                });

                await addToSyncQueue('INSERT', 'appointments', localId, offlineApt);
                toast.info('تم حفظ الموعد محلياً في وضع الأوفلاين (ستتم المزامنة تلقائياً عند الاتصال)');
                fetchAppointments();
                return;
            }

            const { data: insertedData, error } = await supabase.from('appointments').insert(newApt).select().maybeSingle();
            if (error) {
                if (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('metadata')) {
                    const fallbackApt = { ...newApt };
                    delete fallbackApt.metadata;
                    const { error: fallbackError } = await supabase.from('appointments').insert(fallbackApt);
                    if (fallbackError) throw fallbackError;
                } else {
                    throw error;
                }
            }

            // حفظ في Dexie
            if (insertedData) {
                await db.appointments.put({
                    id: insertedData.id.toString(),
                    clinic_id: insertedData.clinic_id.toString(),
                    patient_id: insertedData.patient_id?.toString() || '',
                    doctor_id: insertedData.staff_id?.toString(),
                    title: insertedData.title || 'موعد',
                    date: insertedData.appointment_date || insertedData.date,
                    time: insertedData.appointment_time || insertedData.time,
                    status: insertedData.status || 'scheduled',
                    notes: insertedData.notes || '',
                    data: insertedData,
                    synced: true,
                    created_at: insertedData.created_at,
                    updated_at: insertedData.created_at
                }).catch(() => {});
            }

            fetchAppointments();
        } catch (err) {
            console.error('Error creating appointment, falling back to offline storage:', err);
            try {
                const localId = crypto.randomUUID();
                const offlineApt = {
                    ...newApt,
                    id: localId,
                    created_at: new Date().toISOString()
                };

                await db.appointments.put({
                    id: localId,
                    clinic_id: offlineApt.clinic_id,
                    patient_id: offlineApt.patient_id,
                    doctor_id: appointment.doctorId,
                    title: offlineApt.title || 'موعد جديد',
                    date: offlineApt.appointment_date,
                    time: offlineApt.appointment_time,
                    status: offlineApt.status,
                    notes: offlineApt.notes,
                    data: offlineApt,
                    synced: false,
                    created_at: offlineApt.created_at,
                    updated_at: offlineApt.created_at
                });

                await addToSyncQueue('INSERT', 'appointments', localId, offlineApt);
                toast.info('تعذر الاتصال، تم حفظ الموعد محلياً (ستتم المزامنة تلقائياً)');
                fetchAppointments();
            } catch (fallbackErr) {
                console.error('Offline appointment fallback error:', fallbackErr);
            }
        }
    };

    const updateAppointment = async (updatedAppointment: Appointment) => {
        try {
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
                staff_id: updatedAppointment.doctorId ? Number(updatedAppointment.doctorId) : null,
                doctor_name: updatedAppointment.doctorName || null,
                metadata: updatedAppointment.metadata || { calls: [], reminders: [] }
            };

            const { error } = await supabase.from('appointments').update(updates).eq('id', updatedAppointment.id);
            if (error) {
                if (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('metadata')) {
                    const fallbackUpdates = { ...updates };
                    delete fallbackUpdates.metadata;
                    const { error: fallbackError } = await supabase.from('appointments').update(fallbackUpdates).eq('id', updatedAppointment.id);
                    if (fallbackError) throw fallbackError;
                } else {
                    throw error;
                }
            }
            fetchAppointments();
        } catch (err) {
            console.error('Error updating appointment:', err);
        }
    };

    const deleteAppointment = async (id: string) => {
        try {
            const { error } = await supabase.from('appointments').delete().eq('id', id);
            if (error) throw error;
            fetchAppointments();
        } catch (err) {
            console.error('Error deleting appointment:', err);
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
