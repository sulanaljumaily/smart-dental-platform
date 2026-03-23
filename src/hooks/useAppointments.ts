import { useState, useEffect } from 'react';
import { Appointment } from '../types';
import { supabase } from '../lib/supabase';

export const useAppointments = (clinicId?: string) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAppointments();
    }, [clinicId]);

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            // First try with 'appointment_date' column (actual DB schema)
            let query = supabase
                .from('appointments')
                .select('*')
                .order('appointment_date', { ascending: false })
                .order('appointment_time', { ascending: false });

            if (clinicId) {
                query = query.eq('clinic_id', clinicId);
            }

            let { data, error } = await query;

            // If appointment_date doesn't exist, try 'date'
            if (error && error.code === '42703') {
                query = supabase
                    .from('appointments')
                    .select('*')
                    .order('created_at', { ascending: false }); // Fallback to created_at

                if (clinicId) {
                    query = query.eq('clinic_id', clinicId);
                }
                const result = await query;
                data = result.data;
                error = result.error;
            }

            if (error) throw error;

            const mappedAppointments: Appointment[] = (data || []).map((a: any) => ({
                id: a.id,
                clinicId: a.clinic_id?.toString(),
                patientId: a.patient_id?.toString(),
                patientName: a.patient_name,
                doctorId: a.doctor_id?.toString(),
                doctorName: a.doctor_name,
                date: a.appointment_date || a.date,
                time: a.appointment_time || a.time,
                type: a.type || a.appointment_type,
                status: a.status,
                notes: a.notes,
                cost: a.cost
            }));

            setAppointments(mappedAppointments);
        } catch (err: any) {
            console.error('Error fetching appointments:', err);
        } finally {
            setLoading(false);
        }
    };

    const createAppointment = async (appointment: Appointment) => {
        try {
            const newApt = {
                clinic_id: clinicId || appointment.clinicId || '101',
                patient_id: appointment.patientId,
                // Map doctorId to appropriate column
                staff_record_id: appointment.doctorId && !isNaN(Number(appointment.doctorId)) ? Number(appointment.doctorId) : null,
                doctor_id: appointment.doctorId && isNaN(Number(appointment.doctorId)) ? appointment.doctorId : null,

                patient_name: appointment.patientName,
                doctor_name: appointment.doctorName,
                date: appointment.date,
                time: appointment.time,
                type: appointment.type,
                status: appointment.status || 'scheduled',
                notes: appointment.notes,
                cost: appointment.cost || 0
            };

            const { error } = await supabase.from('appointments').insert(newApt);
            if (error) throw error;
            fetchAppointments();
        } catch (err) {
            console.error('Error creating appointment:', err);
        }
    };

    const updateAppointment = async (updatedAppointment: Appointment) => {
        try {
            const updates: any = {
                date: updatedAppointment.date,
                time: updatedAppointment.time,
                status: updatedAppointment.status,
                notes: updatedAppointment.notes
            };
            // Add other fields if needed

            const { error } = await supabase.from('appointments').update(updates).eq('id', updatedAppointment.id);
            if (error) throw error;
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
