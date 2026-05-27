import { useState, useEffect, useRef } from 'react';
import { Appointment } from '../types/appointments';
import { supabase } from '../lib/supabase';

export const useAppointments = (clinicId?: string) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
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
        setLoading(true);
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
                    status: a.status,
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

            setAppointments(mappedAppointments);
        } catch (err: any) {
            if (err?.name === 'AbortError' || err?.message?.includes('AbortError')) return;
            if (mountedRef.current) console.error('Error fetching appointments:', err);
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
        try {
            const cleanNote = cleanNotes(appointment.notes || '');
            const serializedMetadata = JSON.stringify(appointment.metadata || { calls: [], reminders: [] });
            const notesWithMetadata = `${cleanNote}\n\n--- [METADATA] ---\n${serializedMetadata}`;

            const newApt: any = {
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
                status: appointment.status || 'scheduled',
                title: appointment.title,
                priority: appointment.priority,
                notes: notesWithMetadata,
                cost: appointment.cost || 0,
                metadata: appointment.metadata || { calls: [], reminders: [] }
            };

            const { error } = await supabase.from('appointments').insert(newApt);
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
            fetchAppointments();
        } catch (err) {
            console.error('Error creating appointment:', err);
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
                status: updatedAppointment.status,
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
