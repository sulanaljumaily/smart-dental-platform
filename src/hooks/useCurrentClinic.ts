import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { setCache, getCache, getInstantCache } from '../lib/offline/db';
import { getCachedClinicsForUser } from './useClinics';
import { cacheClinicLogoAsBase64, isRealClinicLogoUrl } from '../lib/printReceipt';

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

function getLogoForClinic(clinicId: string | number, rawUrl?: string): string | undefined {
    try {
        const b64 = localStorage.getItem(`dental_clinic_logo_b64_${clinicId}`);
        if (b64) return b64;
    } catch {}
    if (isRealClinicLogoUrl(rawUrl)) return rawUrl;
    return undefined;
}

function getInitialCurrentClinic(userId?: string, targetClinicId?: string): CurrentClinic | null {
    const userClinics = getCachedClinicsForUser(userId);
    if (targetClinicId && userClinics.length > 0) {
        const matched = userClinics.find(c => String(c.id) === String(targetClinicId));
        if (matched) {
            return {
                id: matched.id,
                name: matched.name,
                role: 'owner',
                logo_url: getLogoForClinic(matched.id, matched.logo || matched.image),
                phone: matched.phone,
                address: matched.address
            };
        }
    }
    if (userId) {
        const cacheKey = targetClinicId ? `current_clinic_${userId}_${targetClinicId}` : `current_clinic_${userId}`;
        const cached = getInstantCache<CurrentClinic>(cacheKey) || getInstantCache<CurrentClinic>('current_clinic_' + userId);
        if (cached && (!targetClinicId || String(cached.id) === String(targetClinicId))) {
            return {
                ...cached,
                logo_url: getLogoForClinic(cached.id, cached.logo_url || cached.image_url || cached.image)
            };
        }
    }
    if (userClinics.length > 0) {
        const first = userClinics[0];
        return {
            id: first.id,
            name: first.name,
            role: 'owner',
            logo_url: getLogoForClinic(first.id, first.logo || first.image),
            phone: first.phone,
            address: first.address
        };
    }
    return null;
}

export const useCurrentClinic = (targetClinicId?: string) => {
    const { user } = useAuth();
    const initial = getInitialCurrentClinic(user?.id, targetClinicId);
    const [clinic, setClinic] = useState<CurrentClinic | null>(initial);
    const [loading, setLoading] = useState<boolean>(!initial && !!user);

    useEffect(() => {
        if (!user) {
            const fallback = getInitialCurrentClinic(undefined, targetClinicId);
            if (fallback) setClinic(fallback);
            setLoading(false);
            return;
        }
        const cached = getInitialCurrentClinic(user.id, targetClinicId);
        if (cached) {
            setClinic(cached);
            setLoading(false);
        }
        fetchClinic();
    }, [user?.id, targetClinicId]);

    const fetchClinic = async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        const cacheKey = targetClinicId ? `current_clinic_${user.id}_${targetClinicId}` : `current_clinic_${user.id}`;

        if (!navigator.onLine) {
            const cached = await getCache<CurrentClinic>(cacheKey);
            if (cached) {
                setClinic({
                    ...cached,
                    logo_url: getLogoForClinic(cached.id, cached.logo_url || cached.image_url)
                });
                setLoading(false);
                return;
            }
            const fallback = getInitialCurrentClinic(user.id, targetClinicId);
            if (fallback) {
                setClinic(fallback);
            }
            setLoading(false);
            return;
        }

        try {
            if (!clinic) setLoading(true);

            // If targetClinicId is explicitly provided, fetch that exact clinic first
            if (targetClinicId) {
                const { data: specificClinic } = await supabase
                    .from('clinics')
                    .select('id, name, image_url, phone, address, owner_id')
                    .eq('id', targetClinicId)
                    .maybeSingle();

                if (specificClinic) {
                    const realLogo = isRealClinicLogoUrl(specificClinic.image_url) ? specificClinic.image_url : undefined;
                    if (realLogo) {
                        cacheClinicLogoAsBase64(specificClinic.id, realLogo).catch(() => {});
                    }
                    const currentObj: CurrentClinic = {
                        id: specificClinic.id.toString(),
                        name: specificClinic.name,
                        role: specificClinic.owner_id === user.id ? 'owner' : 'doctor',
                        logo_url: getLogoForClinic(specificClinic.id, realLogo),
                        image_url: realLogo,
                        phone: specificClinic.phone,
                        address: specificClinic.address
                    };
                    setClinic(currentObj);
                    setCache(cacheKey, currentObj, 86400 * 30).catch(() => {});
                    setCache('current_clinic_' + user.id, currentObj, 86400 * 30).catch(() => {});
                    return;
                }
            }

            // 1. Check if Owner
            const { data: ownedClinic } = await supabase
                .from('clinics')
                .select('id, name, image_url, phone, address')
                .eq('owner_id', user.id)
                .limit(1)
                .maybeSingle();

            if (ownedClinic) {
                const realLogo = isRealClinicLogoUrl(ownedClinic.image_url) ? ownedClinic.image_url : undefined;
                if (realLogo) {
                    cacheClinicLogoAsBase64(ownedClinic.id, realLogo).catch(() => {});
                }
                const currentObj: CurrentClinic = {
                    id: ownedClinic.id.toString(),
                    name: ownedClinic.name,
                    role: 'owner',
                    logo_url: getLogoForClinic(ownedClinic.id, realLogo),
                    image_url: realLogo,
                    phone: ownedClinic.phone,
                    address: ownedClinic.address
                };
                setClinic(currentObj);
                setCache('current_clinic_' + user.id, currentObj, 86400 * 30).catch(() => {});
                return;
            }

            // 2. Check if Staff Member
            const { data: staffMember } = await supabase
                .from('staff')
                .select('clinic_id, role, clinic:clinics(id, name, image_url, phone, address)')
                .or(`user_id.eq.${user.id},auth_user_id.eq.${user.id}`)
                .in('status', ['active', 'on_leave'])
                .limit(1)
                .maybeSingle();

            if (staffMember && (staffMember as any).clinic) {
                const c = (staffMember as any).clinic;
                const realLogo = isRealClinicLogoUrl(c.image_url) ? c.image_url : undefined;
                if (realLogo) {
                    cacheClinicLogoAsBase64(c.id || staffMember.clinic_id, realLogo).catch(() => {});
                }
                const currentObj: CurrentClinic = {
                    id: (c.id || staffMember.clinic_id).toString(),
                    name: c.name,
                    role: (staffMember.role as any) || 'staff',
                    logo_url: getLogoForClinic(c.id || staffMember.clinic_id, realLogo),
                    image_url: realLogo,
                    phone: c.phone,
                    address: c.address
                };
                setClinic(currentObj);
                setCache('current_clinic_' + user.id, currentObj, 86400 * 30).catch(() => {});
                return;
            }

            const fallback = getInitialCurrentClinic(user.id, targetClinicId);
            if (fallback) {
                setClinic(fallback);
            } else {
                setClinic(null);
            }
        } catch {
            const fallback = getInitialCurrentClinic(user.id, targetClinicId);
            if (fallback) setClinic(fallback);
        } finally {
            setLoading(false);
        }
    };

    return { clinic, loading, refresh: fetchClinic };
};
