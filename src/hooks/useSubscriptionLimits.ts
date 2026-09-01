import { useDoctorSubscription } from './useDoctorSubscription';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useSubscriptionLimits = (currentClinicId?: string) => {
    const { subscription, loading: subLoading } = useDoctorSubscription();
    const { user } = useAuth();
    const [counts, setCounts] = useState({
        clinics: 0,
        patients: 0,
        services: 0,
        aiUsedToday: 0
    });
    const [loadingCounts, setLoadingCounts] = useState(true);

    const limits = subscription?.plan?.limits || { max_clinics: 1, max_patients: 2, max_services: 2, max_ai: 0 };
    const features = subscription?.plan?.gatedFeatures || { map: false, booking: false, featured: false, articles: false };

    useEffect(() => {
        if (user) {
            fetchCounts();
        }
    }, [user, currentClinicId, subscription]);

    const fetchCounts = async () => {
        if (!user) return;
        setLoadingCounts(true);
        try {
            // 1. Global Clinics Count (Always per owner)
            const { count: clinicsCount } = await supabase
                .from('clinics')
                .select('*', { count: 'exact', head: true })
                .eq('owner_id', user.id);

            // 2. Patients Count
            let patientsCount = 0;
            if (currentClinicId) {
                const { count } = await supabase
                    .from('patients')
                    .select('*', { count: 'exact', head: true })
                    .eq('clinic_id', currentClinicId);
                patientsCount = count || 0;
            } else {
                // If no specific clinic is selected, get count for the doctor's primary/first clinic
                const { data: firstClinic } = await supabase
                    .from('clinics')
                    .select('id')
                    .eq('owner_id', user.id)
                    .limit(1)
                    .maybeSingle();

                if (firstClinic) {
                    const { count } = await supabase
                        .from('patients')
                        .select('*', { count: 'exact', head: true })
                        .eq('clinic_id', firstClinic.id);
                    patientsCount = count || 0;
                }
            }

            // 3. Services Count
            let servicesCount = 0;
            if (currentClinicId) {
                const { data: clinicData } = await supabase
                    .from('clinics')
                    .select('services')
                    .eq('id', currentClinicId)
                    .maybeSingle();
                servicesCount = Array.isArray(clinicData?.services) ? clinicData.services.length : 0;
            }

            // 4. AI Usage Count (Daily across doctor's account)
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const { count: aiCount } = await supabase
                .from('ai_analyses')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', startOfDay.toISOString());

            setCounts({
                clinics: clinicsCount || 0,
                patients: patientsCount,
                services: servicesCount,
                aiUsedToday: aiCount || 0
            });

        } catch (err) {
            console.error("Error fetching usage counts", err);
        } finally {
            setLoadingCounts(false);
        }
    };

    const checkLimit = (type: 'clinics' | 'patients' | 'services' | 'ai', currentOverrideCount?: number): { allowed: boolean, message?: string } => {
        const labels = {
            clinics: 'العيادات',
            patients: 'المرضى',
            services: 'الخدمات الطبية',
            ai: 'طلبات الذكاء الاصطناعي'
        };

        const contextLabels = {
            clinics: 'حسابك',
            patients: 'هذه العيادة',
            services: 'هذه العيادة',
            ai: 'اليوم'
        };

        let limit = 0;
        let current = currentOverrideCount !== undefined ? currentOverrideCount : 0;

        switch (type) {
            case 'clinics':
                limit = limits.max_clinics;
                if (currentOverrideCount === undefined) current = counts.clinics;
                break;
            case 'patients':
                limit = limits.max_patients;
                if (currentOverrideCount === undefined) current = counts.patients;
                break;
            case 'services':
                limit = limits.max_services;
                if (currentOverrideCount === undefined) current = counts.services;
                break;
            case 'ai':
                limit = limits.max_ai;
                if (currentOverrideCount === undefined) current = counts.aiUsedToday;
                break;
        }

        if (limit === -1) return { allowed: true };

        if (type === 'ai' && limit === 0) {
            return {
                allowed: false,
                message: subscription?.isExpired
                    ? 'لقد انتهت صلاحية باقتك السابقة وتم إيقاف ميزة الذكاء الاصطناعي. يرجى تجديد أو ترقية باقتك للاستفادة من الميزة.'
                    : 'ميزة التحليل بالذكاء الاصطناعي غير متاحة في الباقة المجانية. يرجى ترقية باقتك للاستفادة من الميزة.'
            };
        }

        if (current >= limit) {
            const planNote = subscription?.isExpired ? ' (تم الرجوع لحدود الباقة الأساسية لانتهاء الاشتراك)' : '';
            return {
                allowed: false,
                message: `لقد وصلت إلى الحد الأقصى المسموح به (${limit}) من ${labels[type]} في ${contextLabels[type]}${planNote}. يرجى ترقية باقتك لإضافة المزيد.`
            };
        }

        return { allowed: true };
    };

    const hasFeature = (feature: keyof typeof features): boolean => {
        if (subscription?.isExpired) {
            // When expired, feature is only available if the free plan explicitly grants it
            return !!features[feature];
        }
        return !!features[feature];
    };

    return {
        limits,
        features,
        counts,
        loading: subLoading || loadingCounts,
        checkLimit,
        hasFeature,
        planName: subscription?.plan?.name,
        isExpired: subscription?.isExpired || false,
        isActive: subscription?.isActive || false,
        refreshCounts: fetchCounts
    };
};
