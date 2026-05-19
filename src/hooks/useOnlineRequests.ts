import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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

export const useOnlineRequests = (clinicId?: string) => {
    const [requests, setRequests] = useState<OnlineRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (clinicId) {
            fetchRequests();
        }
    }, [clinicId]);

    const fetchRequests = async () => {
        setLoading(true);
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
                const mapped: OnlineRequest[] = data.map((apt: any) => ({
                    id: apt.id,
                    patientName: apt.patient_name || 'مريض غير مسجل',
                    source: apt.created_via || 'online',
                    date: apt.appointment_date || apt.date,
                    time: apt.appointment_time || apt.time,
                    phone: apt.phone_number || apt.phone || '',
                    status: apt.status,
                    hasFile: !!apt.patient_id,
                    notes: apt.notes,
                    patientId: apt.patient_id,
                    patientUserId: apt.patient_user_id,
                    type: apt.type
                }));
                setRequests(mapped);
            }
        } catch (err) {
            console.error('Error fetching online requests:', err);
        } finally {
            setLoading(false);
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
        try {
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
                        toast.warning('تم التأكيد، لكن تعذّر إنشاء ملف المريض تلقائياً');
                        fetchRequests();
                        return true;
                    }

                    patientFileId = newPatient.id;
                }

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

            fetchRequests();
            return true;
        } catch (err) {
            console.error('Error confirming request:', err);
            toast.error('حدث خطأ أثناء التأكيد');
            return false;
        }
    };

    const cancelRequest = async (id: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status: 'cancelled' })
                .eq('id', id);

            if (error) throw error;

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
        try {
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
