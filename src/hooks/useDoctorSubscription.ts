import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface PlanLimits {
    max_clinics: number;
    max_patients: number;
    max_services: number;
    max_ai: number; // -1 for unlimited, 0 for none, >0 for daily limit
}

export interface PlanGatedFeatures {
    map: boolean;
    booking: boolean;
    featured: boolean;
    articles: boolean;
}

export interface DoctorSubscription {
    id: string;
    plan: {
        id: string;
        name: string;
        features: string[];
        limits: PlanLimits;
        gatedFeatures: PlanGatedFeatures;
    };
    status: 'approved' | 'pending' | 'rejected' | 'cancelled' | 'expired' | 'free';
    startDate: string;
    endDate: string;
    daysRemaining: number;
    isExpired: boolean;
    isActive: boolean;
    originalPlanName?: string;
    originalPlanLimits?: PlanLimits;
}

const DEFAULT_FREE_LIMITS: PlanLimits = {
    max_clinics: 1,
    max_patients: 2,
    max_services: 2,
    max_ai: 0
};

const DEFAULT_FREE_GATED_FEATURES: PlanGatedFeatures = {
    map: false,
    booking: false,
    featured: false,
    articles: false
};

export const useDoctorSubscription = () => {
    const { user } = useAuth();
    const [subscription, setSubscription] = useState<DoctorSubscription | null>(null);
    const [loading, setLoading] = useState(true);
    const mountedRef = useRef(true);

    const fetchSubscription = async () => {
        if (!user) return;

        try {
            if (!subscription) setLoading(true);

            // 1. Fetch the default / free plan from database
            const { data: freePlanData } = await supabase
                .from('subscription_plans')
                .select('*')
                .or('slug.eq.basic-plan,name.ilike.%الأساسية%,name.ilike.%المجانية%')
                .eq('is_active', true)
                .limit(1)
                .maybeSingle();

            const freePlanLimits: PlanLimits = freePlanData?.limits || DEFAULT_FREE_LIMITS;
            const freePlanGated: PlanGatedFeatures = freePlanData?.gated_features || DEFAULT_FREE_GATED_FEATURES;
            const freePlanFeatures: string[] = Array.isArray(freePlanData?.features)
                ? freePlanData.features
                : (typeof freePlanData?.features === 'string'
                    ? tryParseJSON(freePlanData.features)
                    : ['إدارة عيادة واحدة', 'عدد محدود من المرضى']);

            // 2. Fetch the latest subscription request for the user
            const { data, error } = await supabase
                .from('subscription_requests')
                .select('*, plan:subscription_plans(*)')
                .or(`doctor_id.eq.${user.id},user_id.eq.${user.id}`)
                .in('status', ['approved', 'pending'])
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching subscription:', error);
            }

            if (data && data.status === 'approved') {
                const billingPeriod = data.payment_details?.billing_period || data.plan?.duration || 'monthly';
                const approvalDate = new Date(data.updated_at || data.created_at);
                const endDate = new Date(approvalDate);

                if (billingPeriod === 'yearly') {
                    endDate.setFullYear(endDate.getFullYear() + 1);
                } else if (billingPeriod === 'semi_annual') {
                    endDate.setMonth(endDate.getMonth() + 6);
                } else {
                    endDate.setMonth(endDate.getMonth() + 1);
                }

                const now = new Date();
                const isExpired = now > endDate;
                const diffTime = endDate.getTime() - now.getTime();
                const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

                const paidPlanLimits: PlanLimits = data.plan?.limits || DEFAULT_FREE_LIMITS;
                const paidPlanGated: PlanGatedFeatures = data.plan?.gated_features || DEFAULT_FREE_GATED_FEATURES;
                const paidPlanFeatures: string[] = Array.isArray(data.plan?.features)
                    ? data.plan.features
                    : (typeof data.plan?.features === 'string'
                        ? tryParseJSON(data.plan.features)
                        : []);

                if (isExpired) {
                    // Plan is EXPIRED -> Revert effective limits & gated features to the Free Plan
                    setSubscription({
                        id: data.id,
                        plan: {
                            id: freePlanData?.id || 'free',
                            name: `${data.plan?.name || 'الباقة السابقة'} (منتهية الصلاحية)`,
                            features: freePlanFeatures,
                            limits: freePlanLimits, // Enforce free plan limits
                            gatedFeatures: freePlanGated // Disable gated features
                        },
                        status: 'expired',
                        startDate: approvalDate.toISOString().split('T')[0],
                        endDate: endDate.toISOString().split('T')[0],
                        daysRemaining: 0,
                        isExpired: true,
                        isActive: false,
                        originalPlanName: data.plan?.name || 'الباقة المميزة',
                        originalPlanLimits: paidPlanLimits
                    });
                } else {
                    // Plan is ACTIVE and approved
                    setSubscription({
                        id: data.id,
                        plan: {
                            id: data.plan?.id || 'paid',
                            name: data.plan?.name || 'الباقة الحالية',
                            features: paidPlanFeatures,
                            limits: paidPlanLimits,
                            gatedFeatures: paidPlanGated
                        },
                        status: 'approved',
                        startDate: approvalDate.toISOString().split('T')[0],
                        endDate: endDate.toISOString().split('T')[0],
                        daysRemaining,
                        isExpired: false,
                        isActive: true
                    });
                }
            } else if (data && data.status === 'pending') {
                // Pending subscription request -> Still on free plan limits until approved
                setSubscription({
                    id: data.id,
                    plan: {
                        id: freePlanData?.id || 'free',
                        name: `${data.plan?.name || 'الباقة'} (قيد المراجعة)`,
                        features: freePlanFeatures,
                        limits: freePlanLimits,
                        gatedFeatures: freePlanGated
                    },
                    status: 'pending',
                    startDate: new Date(data.created_at).toISOString().split('T')[0],
                    endDate: 'قيد المراجعة',
                    daysRemaining: 0,
                    isExpired: false,
                    isActive: false
                });
            } else {
                // No subscription request -> Free Plan Default
                setSubscription({
                    id: freePlanData?.id || 'free',
                    plan: {
                        id: freePlanData?.id || 'free',
                        name: freePlanData?.name || 'الباقة الأساسية',
                        features: freePlanFeatures,
                        limits: freePlanLimits,
                        gatedFeatures: freePlanGated
                    },
                    status: 'free',
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: 'مدى الحياة',
                    daysRemaining: 9999,
                    isExpired: false,
                    isActive: true
                });
            }

        } catch (error: any) {
            if (error?.name === 'AbortError' || error?.message?.includes('AbortError')) return;
            if (mountedRef.current) console.error('Subscription fetch error:', error);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        fetchSubscription();
        return () => { mountedRef.current = false; };
    }, [user?.id]);

    return { subscription, loading, refresh: fetchSubscription };
};

const tryParseJSON = (jsonString: string): string[] => {
    try {
        const parsed = JSON.parse(jsonString);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
};
