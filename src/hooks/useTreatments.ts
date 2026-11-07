import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getInstantCache, setCache, getCache, addToSyncQueue } from '../lib/offline/db';
import { toast } from 'sonner';

export interface TreatmentService {
    id: string;
    name: string;
    category: string;
    basePrice: number;
    costEstimate: number;
    profitMargin: number;
    popularity: number;
    totalRevenue: number;
    expectedSessions: number;
    isActive: boolean;
    isComplex: boolean;
    defaultPhases?: any[];
    clinicId?: string;
    scope?: 'tooth' | 'general' | 'both';
}

export const useTreatments = (clinicId?: string) => {
    const cacheKey = `clinic_treatments_${clinicId || 'all'}`;
    const initial = getInstantCache<TreatmentService[]>(cacheKey) || [];
    const [treatments, setTreatments] = useState<TreatmentService[]>(initial);
    const [loading, setLoading] = useState(initial.length === 0);
    const mountedRef = useRef(true);

    const saveTreatmentsCache = (items: TreatmentService[]) => {
        setCache(cacheKey, items, 86400 * 30).catch(() => {});
        if (mountedRef.current) {
            setTreatments(items);
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        const cached = getInstantCache<TreatmentService[]>(cacheKey);
        if (cached && cached.length > 0) {
            setTreatments(cached);
            setLoading(false);
        }
        fetchTreatments();
        return () => { mountedRef.current = false; };
    }, [clinicId]);

    const fetchTreatments = async () => {
        if (!navigator.onLine) {
            const cached = await getCache<TreatmentService[]>(cacheKey);
            if (cached && mountedRef.current) {
                setTreatments(cached);
            }
            if (mountedRef.current) setLoading(false);
            return;
        }

        if (treatments.length === 0) setLoading(true);
        try {
            let query = supabase.from('treatments').select('*');

            if (clinicId) {
                query = query.eq('clinic_id', clinicId);
            }

            const { data, error } = await query;
            if (error) throw error;

            const mappedItems: TreatmentService[] = (data || []).map((t: any) => ({
                id: t.id.toString(),
                name: t.name,
                category: t.category,
                basePrice: Number(t.base_price) || 0,
                costEstimate: Number(t.cost_estimate) || 0,
                profitMargin: Number(t.profit_margin) || 0,
                popularity: t.popularity || 50,
                totalRevenue: Number(t.total_revenue || 0),
                expectedSessions: t.expected_sessions || 1,
                isActive: t.is_active !== false,
                isComplex: !!t.is_complex,
                defaultPhases: t.default_phases || [],
                clinicId: t.clinic_id?.toString(),
                scope: t.scope || 'tooth'
            }));

            const currentCached = getInstantCache<TreatmentService[]>(cacheKey) || [];
            const unsyncedOffline = currentCached.filter(item => String(item.id).startsWith('offline_'));
            saveTreatmentsCache([...unsyncedOffline, ...mappedItems]);
        } catch {
            const cached = await getCache<TreatmentService[]>(cacheKey);
            if (cached && mountedRef.current) {
                setTreatments(cached);
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const addTreatment = async (newItem: Omit<TreatmentService, 'id' | 'popularity' | 'totalRevenue' | 'clinicId'>) => {
        const targetClinicId = clinicId || '101';
        const dbItem = {
            clinic_id: Number.isNaN(Number(targetClinicId)) ? targetClinicId : Number(targetClinicId),
            name: newItem.name,
            category: newItem.category,
            base_price: newItem.basePrice,
            cost_estimate: newItem.costEstimate,
            profit_margin: newItem.profitMargin,
            expected_sessions: newItem.expectedSessions,
            is_active: newItem.isActive,
            is_complex: newItem.isComplex,
            default_phases: newItem.defaultPhases || [],
            scope: newItem.scope || 'tooth'
        };

        const addLocally = async () => {
            const localId = `offline_trt_${Date.now()}`;
            const localTreatment: TreatmentService = {
                id: localId,
                name: newItem.name,
                category: newItem.category,
                basePrice: Number(newItem.basePrice) || 0,
                costEstimate: Number(newItem.costEstimate) || 0,
                profitMargin: Number(newItem.profitMargin) || 0,
                popularity: 50,
                totalRevenue: 0,
                expectedSessions: Number(newItem.expectedSessions) || 1,
                isActive: newItem.isActive !== false,
                isComplex: !!newItem.isComplex,
                defaultPhases: newItem.defaultPhases || [],
                clinicId: String(targetClinicId),
                scope: newItem.scope || 'tooth'
            };
            saveTreatmentsCache([localTreatment, ...treatments]);
            await addToSyncQueue('INSERT', 'treatments', localId, dbItem);
        };

        if (!navigator.onLine) {
            await addLocally();
            toast.success('تم إضافة العلاج محلياً (ستتم المزامنة تلقائياً عند الاتصال)');
            return;
        }

        try {
            const { error } = await supabase.from('treatments').insert([dbItem]);
            if (error) throw error;
            fetchTreatments();
        } catch {
            await addLocally();
            toast.info('تم حفظ العلاج محلياً (ستتم المزامنة عند الاتصال)');
        }
    };

    const updateTreatment = async (id: string, updates: Partial<TreatmentService>) => {
        const targetId = String(id);
        const nextList = treatments.map(t => String(t.id) === targetId ? { ...t, ...updates } : t);
        saveTreatmentsCache(nextList);

        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.basePrice !== undefined) dbUpdates.base_price = updates.basePrice;
        if (updates.costEstimate !== undefined) dbUpdates.cost_estimate = updates.costEstimate;
        if (updates.profitMargin !== undefined) dbUpdates.profit_margin = updates.profitMargin;
        if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
        if (updates.isComplex !== undefined) dbUpdates.is_complex = updates.isComplex;
        if (updates.expectedSessions !== undefined) dbUpdates.expected_sessions = updates.expectedSessions;
        if (updates.scope !== undefined) dbUpdates.scope = updates.scope;

        if (!navigator.onLine || targetId.startsWith('offline_')) {
            await addToSyncQueue('UPDATE', 'treatments', targetId, dbUpdates);
            toast.success('تم تحديث العلاج محلياً');
            return;
        }

        try {
            const { error } = await supabase.from('treatments').update(dbUpdates).eq('id', targetId);
            if (error) throw error;
        } catch {
            await addToSyncQueue('UPDATE', 'treatments', targetId, dbUpdates);
            toast.info('تم حفظ تعديل العلاج محلياً (ستتم المزامنة عند الاتصال)');
        }
    };

    const deleteTreatment = async (id: string) => {
        const targetId = String(id);
        saveTreatmentsCache(treatments.filter(t => String(t.id) !== targetId));

        if (!navigator.onLine || targetId.startsWith('offline_')) {
            await addToSyncQueue('DELETE', 'treatments', targetId, {});
            toast.success('تم حذف العلاج محلياً');
            return;
        }

        try {
            const { error } = await supabase.from('treatments').delete().eq('id', targetId);
            if (error) throw error;
        } catch {
            await addToSyncQueue('DELETE', 'treatments', targetId, {});
            toast.info('تم حذف العلاج محلياً (ستتم المزامنة عند الاتصال)');
        }
    };

    return {
        treatments,
        loading,
        addTreatment,
        updateTreatment,
        deleteTreatment,
        refresh: fetchTreatments
    };
};
