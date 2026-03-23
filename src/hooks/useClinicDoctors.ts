import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Doctor {
    id: string;
    name: string;
    role: string;
}

export const useClinicDoctors = (clinicId?: string) => {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (clinicId) {
            fetchDoctors();
        }
    }, [clinicId]);

    const fetchDoctors = async () => {
        try {
            setLoading(true);
            // Fetch members linked to this clinic
            const { data: members, error } = await supabase
                .from('clinic_members')
                .select(`
                    user_id,
                    role,
                    profile:profiles!clinic_members_user_id_fkey(full_name, role)
                `)
                .eq('clinic_id', clinicId);

            if (error) {
                // Fallback: If FK setup is tricky, fetch members then fetch profiles
                // Or maybe simpler: Fetch profiles who have this clinic_id if profiles has clinic_id?
                // Checking schema: profiles does NOT have clinic_id.
                // So we must rely on clinic_members.
                // If the foreign key name is unknown, we might fail.
                // Let's try explicit join or separate queries.
                console.error('Error fetching members join:', error);
                // Fallback strategy defined below
                throw error;
            }

            // Map results
            const docs = members
                .filter((m: any) => m.profile?.role === 'doctor' || m.role === 'doctor' || m.role === 'owner') // Include owners if they are doctors? simplified to just show all members for now or filter
                .map((m: any) => ({
                    id: m.user_id,
                    name: m.profile?.full_name || 'Unknown',
                    role: m.profile?.role || m.role
                }));

            setDoctors(docs);

        } catch (err) {
            // Fallback for demo / if join fails
            console.log('Trying fallback fetch for doctors...');
            // Just fetch all doctors? No, that leaks others.
            // Try fetching members first
            const { data: members } = await supabase.from('clinic_members').select('user_id').eq('clinic_id', clinicId);
            if (members && members.length > 0) {
                const ids = members.map(m => m.user_id);
                const { data: profiles } = await supabase.from('profiles').select('id, full_name, role').in('id', ids).eq('role', 'doctor');
                if (profiles) {
                    setDoctors(profiles.map(p => ({ id: p.id, name: p.full_name, role: p.role })));
                }
            }
        } finally {
            setLoading(false);
        }
    };

    return { doctors, loading, refresh: fetchDoctors };
};
