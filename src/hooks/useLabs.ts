import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getInstantCache, setCache, getCache } from '../lib/offline/db';

export interface Laboratory {
    id: string;
    lab_name: string;
    owner_name?: string;
    address: string;
    phone: string;
    governorate?: string;
    email?: string;
    rating: number;
    description?: string;
    specialties: string[];
    is_verified?: boolean;
    is_accredited?: boolean;
    working_hours?: string;
    response_time?: string;
    is_custom?: boolean;
    services?: Array<{
        name: string;
        price: number;
        time_estimate: number;
    }>;
}

export const useLabs = (options?: { clinicId?: string }) => {
    const { user } = useAuth();
    const cacheKey = `clinic_labs_${options?.clinicId || user?.id || 'all'}`;
    const initialCached = getInstantCache<{ labs: Laboratory[]; savedLabs: Laboratory[] }>(cacheKey);
    const [labs, setLabs] = useState<Laboratory[]>(initialCached?.labs || []);
    const [savedLabs, setSavedLabs] = useState<Laboratory[]>(initialCached?.savedLabs || []);
    const [loading, setLoading] = useState(!initialCached);
    const mountedRef = useRef(true);

    const fetchLabs = async (searchQuery: string = '', specialty?: string) => {
        if (!navigator.onLine) {
            const cached = await getCache<{ labs: Laboratory[]; savedLabs: Laboratory[] }>(cacheKey);
            if (cached && mountedRef.current) {
                setLabs(cached.labs || []);
                setSavedLabs(cached.savedLabs || []);
            }
            if (mountedRef.current) setLoading(false);
            return;
        }

        try {
            if (labs.length === 0 && savedLabs.length === 0) setLoading(true);

            // 1. Fetch Platform Labs
            let platformQuery = supabase
                .from('dental_laboratories')
                .select('*')
                .eq('account_status', 'active')
                .limit(50);

            if (searchQuery) platformQuery = platformQuery.ilike('lab_name', `%${searchQuery}%`);
            if (specialty) platformQuery = platformQuery.contains('specialties', [specialty]);

            const { data: platformData, error: platformError } = await platformQuery;
            if (platformError) throw platformError;

            // 2. Fetch Custom Labs
            let customLabsData: Laboratory[] = [];
            let targetClinicId = options?.clinicId;

            if (!targetClinicId && user) {
                const { data: clinic } = await supabase
                    .from('clinics')
                    .select('id')
                    .eq('owner_id', user.id)
                    .limit(1)
                    .maybeSingle();
                if (clinic) targetClinicId = clinic.id;
            }

            if (targetClinicId) {
                const { data: customData, error: customError } = await supabase
                    .from('clinic_custom_labs')
                    .select('*')
                    .eq('clinic_id', targetClinicId);

                if (!customError && customData) {
                    customLabsData = customData.map(l => ({
                        id: l.id,
                        lab_name: l.name,
                        address: l.address,
                        phone: l.phone,
                        governorate: 'Local',
                        rating: 0,
                        is_custom: true,
                        specialties: l.specialties || []
                    }));
                }
            }

            if (mountedRef.current) {
                setLabs(platformData || []);
                setSavedLabs(customLabsData);
                if (!searchQuery && !specialty) {
                    setCache(cacheKey, { labs: platformData || [], savedLabs: customLabsData }, 86400 * 30).catch(() => {});
                }
            }
        } catch {
            const cached = await getCache<{ labs: Laboratory[]; savedLabs: Laboratory[] }>(cacheKey);
            if (cached && mountedRef.current) {
                setLabs(cached.labs || []);
                setSavedLabs(cached.savedLabs || []);
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const getLabById = async (id: string) => {
        const localFound = [...labs, ...savedLabs].find(l => String(l.id) === String(id));
        if (!navigator.onLine) {
            return localFound || null;
        }
        try {
            const { data } = await supabase
                .from('dental_laboratories')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (data) return data as Laboratory;

            const { data: customData } = await supabase
                .from('clinic_custom_labs')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (customData) {
                return {
                    id: customData.id,
                    lab_name: customData.name,
                    address: customData.address,
                    phone: customData.phone,
                    governorate: 'Local',
                    rating: 0,
                    is_custom: true,
                    specialties: customData.specialties || []
                } as Laboratory;
            }

            return localFound || null;
        } catch {
            return localFound || null;
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        fetchLabs();
        return () => { mountedRef.current = false; };
    }, [options?.clinicId]);

    return {
        labs,
        savedLabs,
        loading,
        fetchLabs,
        getLabById
    };
};
