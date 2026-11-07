import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Clinic } from '../types';
import { setCache, getCache, getInstantCache } from '../lib/offline/db';

const clinicsMemoryCache: Record<string, Clinic[]> = {};

export function getCachedClinicsForUser(userId?: string): Clinic[] {
    if (!userId) {
        const keys = Object.keys(clinicsMemoryCache);
        if (keys.length > 0) return clinicsMemoryCache[keys[0]];
        return [];
    }
    if (clinicsMemoryCache[userId]?.length) {
        return clinicsMemoryCache[userId];
    }
    const instant = getInstantCache<Clinic[]>('user_clinics_' + userId);
    if (instant && instant.length > 0) {
        clinicsMemoryCache[userId] = instant;
        return instant;
    }
    return [];
}

export const useClinics = () => {
    const { user } = useAuth();
    const initialClinics = getCachedClinicsForUser(user?.id);
    const [clinics, setClinics] = useState<Clinic[]>(initialClinics);
    const [loading, setLoading] = useState<boolean>(initialClinics.length === 0);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        if (user) {
            const cached = getCachedClinicsForUser(user.id);
            if (cached.length > 0 && clinics.length === 0) {
                setClinics(cached);
                setLoading(false);
            }
            fetchClinics();
        } else {
            setLoading(false);
        }
        return () => { mountedRef.current = false; };
    }, [user?.id]);

    const fetchClinics = async () => {
        if (!user) {
            if (mountedRef.current) setLoading(false);
            return;
        }

        const cachedInstant = getCachedClinicsForUser(user.id);
        if (cachedInstant.length > 0) {
            if (mountedRef.current) {
                setClinics(cachedInstant);
                setLoading(false);
            }
        } else if (clinics.length === 0) {
            setLoading(true);
        }

        // إذا كان الجهاز أوفلاين، نسترجع من الكاش فوراً دون انتظار الشبكة
        if (!navigator.onLine) {
            try {
                const cached = await getCache<Clinic[]>('user_clinics_' + user.id);
                if (cached && cached.length > 0 && mountedRef.current) {
                    clinicsMemoryCache[user.id] = cached;
                    setClinics(cached);
                }
            } catch {}
            if (mountedRef.current) setLoading(false);
            return;
        }

        try {
            // 1. Fetch Clinics Owned by User
            const { data: ownedClinics, error: ownerError } = await supabase
                .from('clinics')
                .select('*')
                .eq('owner_id', user.id);

            if (ownerError) throw ownerError;

            // 2. Fetch Clinics where User is a Member (Staff)
            let memberClinics = [];
            try {
                const { data: staffData, error: staffError } = await supabase
                    .from('staff')
                    .select('clinic:clinics(*)')
                    .or(`user_id.eq.${user.id},auth_user_id.eq.${user.id}`)
                    .in('status', ['active', 'on_leave']);

                if (!staffError) {
                    memberClinics = staffData?.map((m: any) => m.clinic).filter(Boolean) || [];
                }
            } catch {}

            // 3. Merge and Deduplicate
            const allClinics = [...(ownedClinics || []), ...memberClinics].filter((c, index, self) =>
                index === self.findIndex((t) => (t.id === c.id))
            );

            // Map to Interface
            const mappedClinics: Clinic[] = allClinics.map((c: any) => ({
                id: c.id.toString(),
                name: c.name,
                phone: c.phone || '',
                location: (c.latitude && c.longitude)
                    ? { lat: c.latitude, lng: c.longitude }
                    : { lat: 33.3152, lng: 44.3661 },
                rating: 4.8,
                specialties: c.specialties || ['طب أسنان عام'],
                services: c.services || [],
                workingHours: (typeof c.working_hours === 'string' ? c.working_hours : '09:00 - 21:00'),
                image: c.image_url || c.image || 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=60',
                coverImage: c.cover_url || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80',
                description: c.description,
                email: c.email,
                owner_id: c.owner_id,
                settings: c.settings || {},
                isFeatured: c.is_featured || false,
                isDigitalBookingEnabled: c.is_digital_booking || false,
                governorate: c.governorate || '',
                address: c.address || '',
            }));

            if (mountedRef.current) {
                clinicsMemoryCache[user.id] = mappedClinics;
                setClinics(mappedClinics);
            }
            if (user?.id) {
                setCache('user_clinics_' + user.id, mappedClinics, 86400 * 30).catch(() => {});
            }
        } catch (err: any) {
            if (err?.name === 'AbortError' || err?.message?.includes('AbortError')) return;
            if (mountedRef.current && user?.id) {
                try {
                    const cached = await getCache<Clinic[]>('user_clinics_' + user.id);
                    if (cached && cached.length > 0) {
                        clinicsMemoryCache[user.id] = cached;
                        setClinics(cached);
                    }
                } catch {}
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const addClinic = async (clinicData: any) => {
        if (!user?.id) {
            throw new Error('User must be logged in to add a clinic');
        }
        const { data, error } = await supabase.from('clinics').insert({
            ...clinicData,
            owner_id: user.id
        }).select().single();

        if (error) throw error;
        fetchClinics();
        return data;
    };

    const updateClinic = async (id: string, updates: Partial<Clinic>) => {
        try {
            setClinics(prev => {
                const updated = prev.map(c => c.id === id ? { ...c, ...updates } : c);
                if (user?.id) {
                    clinicsMemoryCache[user.id] = updated;
                    setCache('user_clinics_' + user.id, updated, 86400 * 30).catch(() => {});
                }
                return updated;
            });

            const dbUpdates: any = { ...updates };
            if ('coverImage' in updates) {
                dbUpdates.cover_url = updates.coverImage;
                delete dbUpdates.coverImage;
            }
            if ('workingHours' in updates) {
                dbUpdates.working_hours = updates.workingHours;
                delete dbUpdates.workingHours;
            }
            if ('image' in updates) {
                dbUpdates.image_url = updates.image;
                delete dbUpdates.image;
            }
            if ('logo' in updates) {
                dbUpdates.image_url = updates.logo;
                delete dbUpdates.logo;
            }
            if ('location' in updates && updates.location) {
                dbUpdates.latitude = updates.location.lat;
                dbUpdates.longitude = updates.location.lng;
                delete dbUpdates.location;
            }
            if ('isFeatured' in updates) {
                dbUpdates.is_featured = updates.isFeatured;
                delete dbUpdates.isFeatured;
            }
            if ('isDigitalBookingEnabled' in updates) {
                dbUpdates.is_digital_booking = updates.isDigitalBookingEnabled;
                delete dbUpdates.isDigitalBookingEnabled;
            }

            const { error } = await supabase
                .from('clinics')
                .update(dbUpdates)
                .eq('id', id);

            if (error) throw error;
            fetchClinics();
        } catch (err) {
            console.error('Error updating clinic:', err);
            fetchClinics();
            throw err;
        }
    };

    const deleteClinic = async (id: string) => {
        const { error } = await supabase
            .from('clinics')
            .delete()
            .eq('id', id);

        if (error) throw error;
        setClinics(prev => {
            const updated = prev.filter(c => c.id !== id);
            if (user?.id) {
                clinicsMemoryCache[user.id] = updated;
                setCache('user_clinics_' + user.id, updated, 86400 * 30).catch(() => {});
            }
            return updated;
        });
    };

    return {
        clinics,
        loading,
        addClinic,
        updateClinic,
        deleteClinic,
        refresh: fetchClinics
    };
};
