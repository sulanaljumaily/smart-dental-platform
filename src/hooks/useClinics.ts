import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, ensureFreshOnlineSession } from '../lib/supabase';
import { Clinic } from '../types';
import { setCache, getCache, getInstantCache } from '../lib/offline/db';
import { isRealClinicLogoUrl } from '../lib/printReceipt';
import {
    getCachedClinicLogo,
    cacheClinicLogo,
    getCachedClinicCover,
    cacheClinicCover,
    DEFAULT_OFFLINE_CLINIC_LOGO,
    DEFAULT_OFFLINE_CLINIC_COVER
} from '../lib/offline/imageCache';

const clinicsMemoryCache: Record<string, Clinic[]> = {};

function isExternalUnsplashPlaceholder(url?: string | null): boolean {
    if (!url || typeof url !== 'string') return false;
    return url.includes('images.unsplash.com');
}

function hydrateClinicOfflineImages(c: Clinic): Clinic {
    if (!c) return c;
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    const logoB64 = getCachedClinicLogo(c.id);
    const coverB64 = getCachedClinicCover(c.id);

    const rawImg = isExternalUnsplashPlaceholder(c.image) ? '' : (c.image || '');
    const rawCover = isExternalUnsplashPlaceholder(c.coverImage) ? '' : (c.coverImage || '');

    // If online and a custom remote image URL exists that isn't cached yet, cache it in the background
    if (!isOffline) {
        if (!logoB64 && rawImg && rawImg.startsWith('http')) {
            cacheClinicLogo(c.id, rawImg).catch(() => {});
        }
        if (!coverB64 && rawCover && rawCover.startsWith('http')) {
            cacheClinicCover(c.id, rawCover).catch(() => {});
        }
    }

    const resolvedImage =
        logoB64 ||
        (rawImg.startsWith('data:image/') ? rawImg : null) ||
        (isOffline ? DEFAULT_OFFLINE_CLINIC_LOGO : (rawImg || DEFAULT_OFFLINE_CLINIC_LOGO));

    const resolvedCover =
        coverB64 ||
        (rawCover.startsWith('data:image/') ? rawCover : null) ||
        (isOffline ? DEFAULT_OFFLINE_CLINIC_COVER : (rawCover || DEFAULT_OFFLINE_CLINIC_COVER));

    return {
        ...c,
        image: resolvedImage,
        logo: logoB64 || (isExternalUnsplashPlaceholder(c.logo) ? undefined : c.logo),
        coverImage: resolvedCover
    };
}

export function getCachedClinicsForUser(userId?: string): Clinic[] {
    if (userId) {
        if (clinicsMemoryCache[userId]?.length) {
            return clinicsMemoryCache[userId].map(hydrateClinicOfflineImages);
        }
        const instant = getInstantCache<Clinic[]>('user_clinics_' + userId);
        if (instant && instant.length > 0) {
            const hydrated = instant.map(hydrateClinicOfflineImages);
            clinicsMemoryCache[userId] = hydrated;
            return hydrated;
        }
    }
    const keys = Object.keys(clinicsMemoryCache);
    if (keys.length > 0 && clinicsMemoryCache[keys[0]]?.length) {
        return clinicsMemoryCache[keys[0]].map(hydrateClinicOfflineImages);
    }
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('dental_instant_cache_v1_user_clinics_')) {
                const raw = localStorage.getItem(k);
                if (!raw) continue;
                const parsed = JSON.parse(raw);
                const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.value) ? parsed.value : []);
                if (list.length > 0) {
                    return list.map(hydrateClinicOfflineImages);
                }
            }
        }
    } catch {}
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

        const handleImageCached = () => {
            if (!mountedRef.current) return;
            setClinics(prev => {
                if (prev.length === 0) return prev;
                const hydrated = prev.map(hydrateClinicOfflineImages);
                if (user?.id) {
                    clinicsMemoryCache[user.id] = hydrated;
                }
                return hydrated;
            });
        };
        const handleAuthOrOnline = () => {
            if (!mountedRef.current || !user) return;
            fetchClinics();
        };
        window.addEventListener('dental-offline-image-cached', handleImageCached);
        window.addEventListener('dental-auth-session-ready', handleAuthOrOnline);
        window.addEventListener('dental-online-ready', handleAuthOrOnline);
        return () => {
            mountedRef.current = false;
            window.removeEventListener('dental-offline-image-cached', handleImageCached);
            window.removeEventListener('dental-auth-session-ready', handleAuthOrOnline);
            window.removeEventListener('dental-online-ready', handleAuthOrOnline);
        };
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
                    const hydrated = cached.map(hydrateClinicOfflineImages);
                    clinicsMemoryCache[user.id] = hydrated;
                    setClinics(hydrated);
                }
            } catch {}
            if (mountedRef.current) setLoading(false);
            return;
        }

        const authed = await ensureFreshOnlineSession();
        if (!authed) {
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

            // Map to Interface & trigger background Base64 caching for both logo and cover
            const mappedClinics: Clinic[] = allClinics.map((c: any) => {
                const rawLogo = isExternalUnsplashPlaceholder(c.image_url || c.image) ? '' : (c.image_url || c.image || '');
                const realLogo = isRealClinicLogoUrl(rawLogo) ? rawLogo : '';
                const rawCover = isExternalUnsplashPlaceholder(c.cover_url || c.coverImage) ? '' : (c.cover_url || c.coverImage || '');
                const cachedLogoB64 = getCachedClinicLogo(c.id);
                const cachedCoverB64 = getCachedClinicCover(c.id);

                return {
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
                    image: cachedLogoB64 || rawLogo || DEFAULT_OFFLINE_CLINIC_LOGO,
                    logo: cachedLogoB64 || realLogo || undefined,
                    coverImage: cachedCoverB64 || rawCover || DEFAULT_OFFLINE_CLINIC_COVER,
                    description: c.description,
                    email: c.email,
                    owner_id: c.owner_id,
                    settings: c.settings || {},
                    isFeatured: c.is_featured || false,
                    isDigitalBookingEnabled: c.is_digital_booking || false,
                    governorate: c.governorate || '',
                    address: c.address || '',
                };
            });

            if (mountedRef.current) {
                clinicsMemoryCache[user.id] = mappedClinics;
                setClinics(mappedClinics);
            }
            if (user?.id) {
                setCache('user_clinics_' + user.id, mappedClinics, 86400 * 30).catch(() => {});
            }

            // Cache clinic logos and cover images as Base64 in background so they work 100% offline
            Promise.all(
                allClinics.map(async (c: any) => {
                    const rawLogo = c.image_url || c.image || '';
                    const rawCover = c.cover_url || c.coverImage || '';
                    if (rawLogo) await cacheClinicLogo(c.id, rawLogo).catch(() => null);
                    if (rawCover) await cacheClinicCover(c.id, rawCover).catch(() => null);
                })
            ).then(() => {
                const hydrated = mappedClinics.map(hydrateClinicOfflineImages);
                if (user?.id) {
                    clinicsMemoryCache[user.id] = hydrated;
                    setCache('user_clinics_' + user.id, hydrated, 86400 * 30).catch(() => {});
                }
                if (mountedRef.current) {
                    setClinics(hydrated);
                }
            }).catch(() => {});
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
