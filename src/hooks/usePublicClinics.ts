import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Clinic } from '../types';

export const usePublicClinics = () => {
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPublicClinics = async () => {
            try {
                // Fetch active clinics with showOnMap enabled in settings
                const { data, error } = await supabase
                    .from('clinics')
                    .select('*')
                    .eq('is_active', true)
                    .eq('settings->showOnMap', true)
                    .limit(100);

                if (error) throw error;

                // Fetch active approved subscriptions to verify owner privileges
                const { data: activeSubs } = await supabase
                    .from('subscription_requests')
                    .select('doctor_id, user_id, created_at, updated_at, payment_details, plan:subscription_plans(limits, gated_features, duration)')
                    .eq('status', 'approved');

                const activeOwnerFeatureMap = new Map<string, { featured: boolean; map: boolean; booking: boolean; articles: boolean }>();
                if (activeSubs) {
                    const now = new Date();
                    activeSubs.forEach((sub: any) => {
                        const ownerId = sub.doctor_id || sub.user_id;
                        if (!ownerId) return;
                        const bp = sub.payment_details?.billing_period || sub.plan?.duration || 'monthly';
                        const approvalDate = new Date(sub.updated_at || sub.created_at);
                        const endDate = new Date(approvalDate);
                        if (bp === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);
                        else if (bp === 'semi_annual') endDate.setMonth(endDate.getMonth() + 6);
                        else endDate.setMonth(endDate.getMonth() + 1);

                        if (now <= endDate) {
                            const gf = sub.plan?.gated_features || {};
                            activeOwnerFeatureMap.set(ownerId, {
                                featured: !!gf.featured,
                                map: gf.map !== undefined ? !!gf.map : true,
                                booking: !!gf.booking,
                                articles: !!gf.articles
                            });
                        }
                    });
                }

                if (data) {
                    const mapped: Clinic[] = data.map((c: any) => {
                        // Apply a subtle jitter to coordinates if they are exactly the same
                        // This prevents perfect overlap of markers
                        const jitterLat = (Math.random() - 0.5) * 0.0002;
                        const jitterLng = (Math.random() - 0.5) * 0.0002;

                        const ownerFeatures = c.owner_id ? activeOwnerFeatureMap.get(c.owner_id) : undefined;
                        const isFeaturedEligible = !!ownerFeatures?.featured;
                        const isBookingEligible = !!ownerFeatures?.booking;
                        const isArticlesEligible = !!ownerFeatures?.articles;

                        return {
                            id: c.id.toString(),
                            name: c.name,
                            address: c.address || '',
                            governorate: c.governorate || '',
                            phone: c.phone || '',
                            location: c.latitude && c.longitude
                                ? { lat: Number(c.latitude) + jitterLat, lng: Number(c.longitude) + jitterLng }
                                : { lat: 33.3152 + (Math.random() * 0.05 - 0.025), lng: 44.3661 + (Math.random() * 0.05 - 0.025) }, // Fallback randomly around Baghdad if missing
                            rating: 4.5,
                            specialties: c.specialties || ['طب أسنان عام'],
                            services: c.services || [],
                            workingHours: c.working_hours || '09:00 - 21:00',
                            image: c.image_url || 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=60',
                            coverImage: c.cover_url || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80',
                            description: c.description,
                            email: c.email,
                            owner_id: c.owner_id,
                            settings: {
                                ...(c.settings || {}),
                                articleSuggestions: (c.settings?.articleSuggestions === true) && isArticlesEligible
                            },
                            isFeatured: (c.is_featured === true) && isFeaturedEligible,
                            isDigitalBookingEnabled: (c.is_digital_booking === true) && isBookingEligible,
                        };
                    });
                    setClinics(mapped);
                }
            } catch (err) {
                console.error('Error fetching public clinics:', err);
                setClinics([]);
            } finally {
                setLoading(false);
            }
        };

        fetchPublicClinics();
    }, []);

    return { clinics, loading };
};