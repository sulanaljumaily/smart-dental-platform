import { useState, useEffect, useRef } from 'react';
import { supabase, ensureFreshOnlineSession } from '../lib/supabase';
import { addToSyncQueue, getInstantCache, getCache, setCache } from '../lib/offline/db';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export interface Asset {
    id: string;
    clinicId: string;
    name: string;
    description?: string;
    category: 'equipment' | 'furniture' | 'electronics' | 'software' | 'building' | 'other';
    purchaseDate: string;
    purchaseCost: number;
    currency: string;
    usefulLifeYears: number;
    salvageValue: number;
    status: 'active' | 'maintenance' | 'disposed' | 'sold' | 'written_off';
    location?: string;
    serialNumber?: string;
    supplier?: string;
    warrantyExpiry?: string;
    currentValue?: number;
    accumulatedDepreciation?: number;
    dailyDepreciation?: number;
}

const assetsMemoryCache = new Map<string, any[]>();

function computeDepreciation(asset: Asset) {
    const purchaseDate = new Date(asset.purchaseDate);
    const now = new Date();
    const lifeInDays = Math.max(1, (asset.usefulLifeYears || 5) * 365);
    const daysSincePurchase = Math.max(0, Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)));

    const depreciableAmount = asset.purchaseCost - (asset.salvageValue || 0);
    const dailyDepreciation = depreciableAmount / lifeInDays;

    let accumulatedDepreciation = dailyDepreciation * daysSincePurchase;
    if (accumulatedDepreciation > depreciableAmount) accumulatedDepreciation = depreciableAmount;

    const currentValue = asset.purchaseCost - accumulatedDepreciation;

    return {
        currentValue,
        accumulatedDepreciation,
        dailyDepreciation
    };
}

function mapRawAssetsWithStats(items: any[], clinicId?: string) {
    let totalValue = 0;
    let totalCost = 0;
    let totalDepreciation = 0;

    const mappedAssets: Asset[] = (items || []).map((a: any) => {
        const baseAsset: Asset = {
            id: a.id?.toString() || `asset-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            clinicId: (a.clinic_id || a.clinicId || clinicId || '0').toString(),
            name: a.name || 'أصل بدون اسم',
            description: a.description || '',
            category: a.category || 'equipment',
            purchaseDate: a.purchase_date || a.purchaseDate || new Date().toISOString(),
            purchaseCost: parseFloat(a.purchase_cost ?? a.purchaseCost ?? 0),
            currency: a.currency || 'IQD',
            usefulLifeYears: Number(a.useful_life_years ?? a.usefulLifeYears ?? 5),
            salvageValue: parseFloat(a.salvage_value ?? a.salvageValue ?? 0),
            status: a.status || 'active',
            location: a.location || '',
            serialNumber: a.serial_number || a.serialNumber || '',
            supplier: a.supplier || '',
            warrantyExpiry: a.warranty_expiry || a.warrantyExpiry || ''
        };

        const dep = computeDepreciation(baseAsset);

        if (baseAsset.status === 'active' || baseAsset.status === 'maintenance') {
            totalValue += dep.currentValue;
            totalCost += baseAsset.purchaseCost;
            totalDepreciation += dep.accumulatedDepreciation;
        }

        return {
            ...baseAsset,
            ...dep
        };
    });

    return {
        mappedAssets,
        stats: {
            totalValue,
            totalCost,
            totalDepreciation,
            assetCount: mappedAssets.length
        }
    };
}

export const useAssets = (clinicId?: string) => {
    const { user } = useAuth();
    const cacheKey = `clinic_assets_${clinicId || 'default'}`;
    const mountedRef = useRef(true);

    const readSyncLocalRaw = (): any[] => {
        const mem = assetsMemoryCache.get(cacheKey);
        if (mem && mem.length > 0) return mem;
        const instant = getInstantCache<any[]>(cacheKey);
        if (Array.isArray(instant) && instant.length > 0) {
            assetsMemoryCache.set(cacheKey, instant);
            return instant;
        }
        try {
            const legacyRaw = localStorage.getItem(cacheKey);
            if (legacyRaw) {
                const parsed = JSON.parse(legacyRaw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    assetsMemoryCache.set(cacheKey, parsed);
                    return parsed;
                }
            }
        } catch {}
        return [];
    };

    const initialRaw = readSyncLocalRaw();
    const initialComputed = mapRawAssetsWithStats(initialRaw, clinicId);

    const [assets, setAssets] = useState<Asset[]>(initialComputed.mappedAssets);
    const [loading, setLoading] = useState<boolean>(initialRaw.length === 0 && !!clinicId);
    const [stats, setStats] = useState(initialComputed.stats);

    const applyAndPersistAssets = (rawItems: any[], persist = true) => {
        assetsMemoryCache.set(cacheKey, rawItems);
        const { mappedAssets, stats: nextStats } = mapRawAssetsWithStats(rawItems, clinicId);
        if (mountedRef.current) {
            setAssets(mappedAssets);
            setStats(nextStats);
        }
        if (persist) {
            setCache(cacheKey, rawItems, 86400 * 30).catch(() => {});
            try {
                localStorage.setItem(cacheKey, JSON.stringify(rawItems));
            } catch {}
        }
        return mappedAssets;
    };

    const loadFromLocal = async (): Promise<any[]> => {
        const syncItems = readSyncLocalRaw();
        if (syncItems.length > 0) {
            applyAndPersistAssets(syncItems, false);
            return syncItems;
        }
        const dexieItems = await getCache<any[]>(cacheKey);
        if (Array.isArray(dexieItems) && dexieItems.length > 0) {
            applyAndPersistAssets(dexieItems, false);
            return dexieItems;
        }
        return [];
    };

    useEffect(() => {
        mountedRef.current = true;
        if (clinicId) {
            fetchAssets();
        } else {
            setLoading(false);
        }
        const handleRefresh = () => {
            if (clinicId) fetchAssets();
        };
        window.addEventListener('dental-online-ready', handleRefresh);
        window.addEventListener('dental-auth-session-ready', handleRefresh);
        window.addEventListener('dental-sync-completed', handleRefresh);
        window.addEventListener('dental-clinic-preloaded', handleRefresh);
        return () => {
            mountedRef.current = false;
            window.removeEventListener('dental-online-ready', handleRefresh);
            window.removeEventListener('dental-auth-session-ready', handleRefresh);
            window.removeEventListener('dental-sync-completed', handleRefresh);
            window.removeEventListener('dental-clinic-preloaded', handleRefresh);
        };
    }, [clinicId, user?.id]);

    const fetchAssets = async () => {
        if (!clinicId) {
            if (mountedRef.current) setLoading(false);
            return;
        }

        const localItems = await loadFromLocal();
        if (localItems.length > 0 && mountedRef.current) {
            setLoading(false);
        }

        if (!navigator.onLine) {
            if (mountedRef.current) setLoading(false);
            return;
        }

        const authed = await ensureFreshOnlineSession();
        if (!authed) {
            if (mountedRef.current) setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('assets')
                .select('*')
                .eq('clinic_id', clinicId)
                .order('purchase_date', { ascending: false });

            if (error) return;

            if (Array.isArray(data)) {
                const unsyncedLocal = localItems.filter(
                    a => String(a.id).startsWith('asset-') || String(a.id).startsWith('offline_')
                );
                const merged = [...unsyncedLocal, ...data];
                applyAndPersistAssets(merged, true);
            }
        } catch {
            // Keep existing local data intact on transient network failure
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const addAsset = async (asset: Omit<Asset, 'id' | 'currentValue' | 'accumulatedDepreciation' | 'dailyDepreciation'>) => {
        const localId = `asset-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const baseItem: any = {
            id: localId,
            clinic_id: clinicId || 0,
            clinicId: clinicId || '0',
            name: asset.name,
            description: asset.description || '',
            category: asset.category,
            purchase_date: asset.purchaseDate,
            purchaseDate: asset.purchaseDate,
            purchase_cost: asset.purchaseCost,
            purchaseCost: asset.purchaseCost,
            useful_life_years: asset.usefulLifeYears,
            usefulLifeYears: asset.usefulLifeYears,
            salvage_value: asset.salvageValue,
            salvageValue: asset.salvageValue,
            status: asset.status,
            location: asset.location || '',
            serial_number: asset.serialNumber || '',
            serialNumber: asset.serialNumber || '',
            supplier: asset.supplier || '',
            warranty_expiry: asset.warrantyExpiry || '',
            warrantyExpiry: asset.warrantyExpiry || ''
        };

        const dbPayload = {
            clinic_id: clinicId || 0,
            name: asset.name,
            description: asset.description,
            category: asset.category,
            purchase_date: asset.purchaseDate,
            purchase_cost: asset.purchaseCost,
            useful_life_years: asset.usefulLifeYears,
            salvage_value: asset.salvageValue,
            status: asset.status,
            location: asset.location,
            serial_number: asset.serialNumber,
            supplier: asset.supplier,
            warranty_expiry: asset.warrantyExpiry
        };

        if (navigator.onLine) {
            try {
                const authed = await ensureFreshOnlineSession();
                if (authed) {
                    const { data, error } = await supabase.from('assets').insert(dbPayload).select().single();
                    if (!error && data) {
                        const current = readSyncLocalRaw();
                        applyAndPersistAssets([data, ...current], true);
                        return data;
                    }
                }
            } catch {}
        }

        const currentList = readSyncLocalRaw();
        const updatedList = [baseItem, ...currentList];
        applyAndPersistAssets(updatedList, true);
        await addToSyncQueue('INSERT', 'assets', localId, dbPayload);
        toast.success('تم حفظ الأصل محلياً (ستتم المزامنة تلقائياً عند الاتصال)');

        return baseItem;
    };

    const deleteAsset = async (id: string) => {
        const targetId = String(id);
        const currentList = readSyncLocalRaw();
        const updatedList = currentList.filter(a => String(a.id) !== targetId);
        applyAndPersistAssets(updatedList, true);

        if (navigator.onLine && !targetId.startsWith('asset-') && !targetId.startsWith('offline_')) {
            try {
                await ensureFreshOnlineSession();
                await supabase.from('assets').delete().eq('id', targetId);
                return;
            } catch {}
        }

        if (!targetId.startsWith('asset-') && !targetId.startsWith('offline_')) {
            await addToSyncQueue('DELETE', 'assets', targetId, {});
        }
    };

    return {
        assets,
        loading,
        stats,
        addAsset,
        deleteAsset,
        refresh: fetchAssets
    };
};
