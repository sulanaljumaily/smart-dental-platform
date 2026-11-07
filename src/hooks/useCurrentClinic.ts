import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { setCache, getCache, getInstantCache } from '../lib/offline/db';
import { getCachedClinicsForUser } from './useClinics';

export interface CurrentClinic {
    id: string;
    name: string;
    role: 'owner' | 'admin' | 'doctor' | 'staff';
    logo_url?: string;
    image_url?: string;
    image?: string;
    logo?: string;
    phone?: string;
    address?: string;
}

function getInitialCurrentClinic(userId?: string): CurrentClinic | null {
    if (!userId) return null;
    const cached = getInstantCache<CurrentClinic>('current_clinic_' + userId);
    if (cached) return cached;
    const userClinics = getCachedClinicsForUser(userId);
    if (userClinics.length > 0) {
        const first = userClinics[0];
        return {
            id: first.id,
            name: first.name,
            role: 'owner',
            logo_url: first.image,
            phone: first.phone,
            address: first.address
        };
    }
    return null;
}

export const useCurrentClinic = () => {
    const { user } = useAuth();
    const initial = getInitialCurrentClinic(user?.id);
    const [clinic, setClinic] = useState<CurrentClinic | null>(initial);
    const [loading, setLoading] = useState<boolean>(!initial && !!user);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }
        const cached = getInitialCurrentClinic(user.id);
        if (cached && !clinic) {
            setClinic(cached);
            setLoading(false);
        }
        fetchClinic();
    }, [user?.id]);

    const fetchClinic = async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        if (!navigator.onLine) {
            const cached = await getCache<CurrentClinic>('current_clinic_' + user.id);
            if (cached) {
                setClinic(cached);
                setLoading(false);
                return;
            }
            const fallback = getInitialCurrentClinic(user.id);
            if (fallback) {
                setClinic(fallback);
            }
            setLoading(false);
            return;
        }

        try {
            if (!clinic) setLoading(true);

            // 1. Check if Owner
            const { data: ownedClinic } = await supabase
                .from('clinics')
                .select('id, name, logo_url, phone, address')
                .eq('owner_id', user.id)
                .limit(1)
                .maybeSingle();

            if (ownedClinic) {
                const currentObj: CurrentClinic = {
                    id: ownedClinic.id.toString(),
                    name: ownedClinic.name,
                    role: 'owner',
                    logo_url: ownedClinic.logo_url,
                    phone: ownedClinic.phone,
                    address: ownedClinic.address
                };
                setClinic(currentObj);
                setCache('current_clinic_' + user.id, currentObj, 86400 * 30).catch(() => {});
                return;
            }

            // 2. Check if Member
            const { data: memberParams } = await supabase
                .from('clinic_members')
                .select('clinic_id, role, clinic:clinics(name, logo_url, phone, address)')
                .eq('user_id', user.id)
                .limit(1)
                .maybeSingle();

            if (memberParams && (memberParams as any).clinic) {
                const c = (memberParams as any).clinic;
                const currentObj: CurrentClinic = {
                    id: memberParams.clinic_id.toString(),
                    name: c.name,
                    role: memberParams.role as any,
                    logo_url: c.logo_url,
                    phone: c.phone,
                    address: c.address
                };
                setClinic(currentObj);
                setCache('current_clinic_' + user.id, currentObj, 86400 * 30).catch(() => {});
                return;
            }

            const fallback = getInitialCurrentClinic(user.id);
            if (fallback) {
                setClinic(fallback);
            } else {
                setClinic(null);
            }
        } catch {
            const fallback = getInitialCurrentClinic(user.id);
            if (fallback) setClinic(fallback);
        } finally {
            setLoading(false);
        }
    };

    return { clinic, loading, refresh: fetchClinic };
};
