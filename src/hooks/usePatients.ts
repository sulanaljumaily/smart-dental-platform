import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

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
}

export const usePatients = (clinicId?: string) => {
    const { user } = useAuth();
    const [patients, setPatients] = useState<PatientData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchPatients();
    }, [clinicId, user]);

    const fetchPatients = async () => {
        setLoading(true);
        try {
            let query = supabase.from('patients').select('*');

            if (clinicId) {
                query = query.eq('clinic_id', clinicId);
            } else if (user?.id) {
                // If no specific clinic, filter by user access (implied RLS or verify here)
                // For now, let RLS handle it, or filter in memory if RLS is broad
            }

            const { data, error } = await query;

            if (error) throw error;

            const mappedPatients: PatientData[] = (data || []).map((p: any) => ({
                id: p.id,
                clinicId: p.clinic_id?.toString(),
                name: p.full_name || p.name, // Handle both
                age: p.age || 0,
                gender: p.gender || 'male',
                phone: p.phone,
                email: p.email,
                address: p.address,
                status: 'active', // Default
                paymentStatus: 'paid', // Default
                lastVisit: p.created_at,
                totalVisits: 1, // Mock
                balance: 0,
                medicalHistory: p.medical_history ? JSON.stringify(p.medical_history) : '',
                notes: ''
            }));

            setPatients(mappedPatients);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching patients:', err);
            setError('Failed to load patients');
        } finally {
            setLoading(false);
        }
    };

    const createPatient = async (newPatient: any) => {
        try {
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
                status: 'active'
            };

            const { data, error } = await supabase.from('patients').insert(patientData).select().single();
            if (error) throw error;

            fetchPatients();
            return data;
        } catch (err) {
            console.error('Error creating patient:', err);
            throw err;
        }
    };

    const updatePatient = async (id: string, updates: any) => {
        try {
            const dbUpdates: any = {};
            if (updates.name) dbUpdates.full_name = updates.name;
            if (updates.phone) dbUpdates.phone = updates.phone;
            if (updates.status) dbUpdates.status = updates.status;
            // Add other fields mapping as needed

            const { error } = await supabase.from('patients').update(dbUpdates).eq('id', id);
            if (error) throw error;

            fetchPatients();
        } catch (err) {
            console.error('Error updating patient:', err);
        }
    };

    const deletePatient = async (id: string) => {
        try {
            const { error } = await supabase.from('patients').delete().eq('id', id);
            if (error) throw error;

            fetchPatients();
        } catch (err) {
            console.error('Error deleting patient:', err);
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
