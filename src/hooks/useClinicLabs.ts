
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export interface ClinicLab {
    id: string;
    name: string;
    address: string;
    phone: string;
    specialties: string[];
    isCustom: boolean;
    isFavorite?: boolean;
    // Platform specific
    email?: string;
    logo?: string;
    rating?: number;
    isVerified?: boolean;
    // UI specific compatibility
    reviewCount?: number;
    price?: {
        panoramic: number;
        periapical: number;
        bitewing: number;
        occlusal: number;
        coneBeam: number;
        gumAnalysis: number;
    };
    isAccredited?: boolean;
    workingHours?: string;
    responseTime?: string;
    services?: string[];
    delegates?: any[];
    establishmentYear?: number;
    licenseNumber?: string;
}

export const useClinicLabs = (clinicId: string) => {
    const [labs, setLabs] = useState<ClinicLab[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLabs = async () => {
        try {
            setLoading(true);

            // 1. Fetch Platform Labs
            // We use 'dental_laboratories' which should be readable by authenticated users via RLS
            // Remove strict filter for now to see if data exists at all
            const { data: platformLabs, error: platformError } = await supabase
                .from('dental_laboratories')
                .select('*');
            // .eq('account_status', 'active'); // Re-enable if stats is strictly enforced

            if (platformError) {
                console.warn('Error fetching platform labs (likely RLS or missing table):', platformError);
            }

            // 2. Fetch Custom Labs (Manual)
            // Handle error gracefully if table doesn't exist yet
            let customLabs: any[] = [];
            try {
                const { data, error } = await supabase
                    .from('clinic_custom_labs')
                    .select('*')
                    .eq('clinic_id', clinicId);

                if (error) {
                    console.warn('Could not fetch custom labs (likely missing table):', error);
                } else {
                    customLabs = data || [];
                }
            } catch (ignored) {
                console.warn('Error querying clinic_custom_labs');
            }

            // 3. Fetch Saved Favorites
            // Try 'doctor_saved_labs' based on Auth User first (migration 012)
            let favoriteIds = new Set<string>();

            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { data: favorites, error: favError } = await supabase
                    .from('doctor_saved_labs')
                    .select('lab_id')
                    .eq('doctor_id', user.id);

                if (!favError && favorites) {
                    favorites.forEach(f => favoriteIds.add(f.lab_id));
                } else if (favError) {
                    // Fallback: try clinic_lab_favorites
                    const { data: clinicFavs } = await supabase
                        .from('clinic_lab_favorites')
                        .select('lab_id')
                        .eq('clinic_id', clinicId);

                    if (clinicFavs) {
                        clinicFavs.forEach(f => favoriteIds.add(f.lab_id));
                    }
                }
            }

            const formattedPlatformLabs: ClinicLab[] = (platformLabs || []).map((lab: any) => ({
                id: lab.id,
                name: lab.name || lab.lab_name, // Handle potential column name differences
                address: lab.address || '',
                phone: lab.phone || '',
                specialties: [], // TODO: relationships
                isCustom: false,
                isFavorite: favoriteIds.has(lab.id) || (lab.user_id && favoriteIds.has(lab.user_id)),
                rating: lab.rating,
                isVerified: lab.is_active || false, // Map is_active to isVerified
                reviewCount: 0,
                price: { panoramic: 0, periapical: 0, bitewing: 0, occlusal: 0, coneBeam: 0, gumAnalysis: 0 },
                isAccredited: lab.is_active || false,
                workingHours: lab.working_hours || '09:00 - 17:00',
                responseTime: lab.response_time || '24h',
                services: [],
                delegates: [],
                // Additional lab info
                establishmentYear: lab.establishment_year ? parseInt(lab.establishment_year) : (lab.established_at ? new Date(lab.established_at).getFullYear() : undefined),
                licenseNumber: lab.license_number || undefined,
                // Pass user_id for favorite toggling if needed
                user_id: lab.user_id
            }));

            const formattedCustomLabs: ClinicLab[] = (customLabs || []).map((lab: any) => ({
                id: lab.id,
                name: lab.name,
                address: lab.address,
                phone: lab.phone,
                specialties: lab.specialties || [],
                isCustom: true,
                isFavorite: true, // Always favorite/saved if it's custom
                reviewCount: 0,
                price: { panoramic: 0, periapical: 0, bitewing: 0, occlusal: 0, coneBeam: 0, gumAnalysis: 0 },
                isAccredited: false,
                workingHours: '',
                responseTime: '',
                services: [],
                delegates: []
            }));

            setLabs([...formattedCustomLabs, ...formattedPlatformLabs]);
        } catch (err) {
            console.error('Error fetching clinic labs:', err);
            toast.error('حدث خطأ في تحميل بيانات المختبرات');
        } finally {
            setLoading(false);
        }
    };

    const addCustomLab = async (labData: Omit<ClinicLab, 'id' | 'isCustom'>) => {
        try {
            const { data, error } = await supabase
                .from('clinic_custom_labs')
                .insert({
                    clinic_id: clinicId,
                    name: labData.name,
                    address: labData.address,
                    phone: labData.phone,
                    specialties: labData.specialties
                })
                .select()
                .single();

            if (error) throw error;

            await fetchLabs();
            return data;
        } catch (err) {
            console.error('Error adding custom lab:', err);
            throw err;
        }
    };

    const toggleFavorite = async (labId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error('يجب تسجيل الدخول');
                return;
            }

            const lab = labs.find(l => l.id === labId);
            if (!lab) return;

            const isFav = lab.isFavorite;
            const targetIdForProfile = (lab as any).user_id; // Check if user_id exists (Platform Lab)

            if (isFav) {
                // Remove from both potential tables
                // 1. Remove from doctor_saved_labs (references profile/user_id)
                if (targetIdForProfile) {
                    await supabase.from('doctor_saved_labs')
                        .delete()
                        .match({ doctor_id: user.id, lab_id: targetIdForProfile });
                }

                // 2. Remove from clinic_lab_favorites (references lab table id)
                await supabase.from('clinic_lab_favorites')
                    .delete()
                    .match({ clinic_id: clinicId, lab_id: labId });

                // 3. Fallback: try removing by ID from doctor_saved_labs just in case it was saved that way previously
                await supabase.from('doctor_saved_labs')
                    .delete()
                    .match({ doctor_id: user.id, lab_id: labId });

                toast.success('تمت الإزالة من المفضلة');
            } else {
                // Try adding to doctor_saved_labs first (most reliable per schema if we have user_id)
                let addedToDoctor = false;

                if (targetIdForProfile) {
                    const { error: docError } = await supabase
                        .from('doctor_saved_labs')
                        .insert({ doctor_id: user.id, lab_id: targetIdForProfile });

                    if (!docError) addedToDoctor = true;
                    else console.warn('Failed to add user_id to doctor_saved_labs', docError);
                }

                // If platform lab but failed to add to doctor_saved_labs OR if it's a custom lab (no user_id)
                // Try adding to clinic_lab_favorites (using ID)
                if (!addedToDoctor) {
                    const { error: clinicError } = await supabase
                        .from('clinic_lab_favorites')
                        .insert({ clinic_id: clinicId, lab_id: labId });

                    if (clinicError && !addedToDoctor) {
                        // Last resort: try adding the raw ID to doctor_saved_labs (maybe it allows it?)
                        const { error: finalError } = await supabase
                            .from('doctor_saved_labs')
                            .insert({ doctor_id: user.id, lab_id: labId });

                        if (finalError) {
                            console.error('All save attempts failed', finalError);
                            toast.error('لم نتمكن من حفظ المختبر');
                            return;
                        }
                    }
                }
                toast.success('تمت الإضافة للمفضلة');
            }

            await fetchLabs();
        } catch (err) {
            console.error('Error toggling favorite:', err);
            toast.error('حدث خطأ في تغيير الحالة');
        }
    }

    useEffect(() => {
        if (clinicId) {
            fetchLabs();
        }
    }, [clinicId]);

    return {
        labs,
        loading,
        refresh: fetchLabs,
        addCustomLab,
        toggleFavorite
    };
};
