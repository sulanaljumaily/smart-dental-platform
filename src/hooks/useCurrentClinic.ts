import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface CurrentClinic {
    id: string; // Returns stringified ID (e.g., "1")
    name: string;
    role: 'owner' | 'admin' | 'doctor' | 'staff';
    logo_url?: string;
    image_url?: string;
    image?: string;
    logo?: string;
    phone?: string;
    address?: string;
}

export const useCurrentClinic = () => {
    const { user } = useAuth();
    const [clinic, setClinic] = useState<CurrentClinic | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }
        fetchClinic();
    }, [user?.id]);

    const fetchClinic = async () => {
        try {
            if (!clinic) setLoading(true);

            // 1. Check if Owner
            const { data: ownedClinic } = await supabase
                .from('clinics')
                .select('id, name, logo_url, phone, address')
                .eq('owner_id', user!.id)
                .single();

            if (ownedClinic) {
                setClinic({
                    id: ownedClinic.id.toString(),
                    name: ownedClinic.name,
                    role: 'owner',
                    logo_url: ownedClinic.logo_url,
                    phone: ownedClinic.phone,
                    address: ownedClinic.address
                });
                return;
            }

            // 2. Check if Member
            const { data: memberParams } = await supabase
                .from('clinic_members')
                .select('clinic_id, role, clinic:clinics(name, logo_url, phone, address)')
                .eq('user_id', user!.id)
                .single();

            if (memberParams && (memberParams as any).clinic) {
                const c = (memberParams as any).clinic;
                setClinic({
                    id: memberParams.clinic_id.toString(),
                    name: c.name,
                    role: memberParams.role as any,
                    logo_url: c.logo_url,
                    phone: c.phone,
                    address: c.address
                });
                return;
            }

            // No clinic found
            setClinic(null);

        } catch (err) {
            console.error('Error fetching current clinic:', err);
        } finally {
            setLoading(false);
        }
    };

    return { clinic, loading, refresh: fetchClinic };
};
