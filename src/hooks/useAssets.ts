import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { addToSyncQueue } from '../lib/offline/db';
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

export const useAssets = (clinicId?: string) => {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalValue: 0,
        totalCost: 0,
        totalDepreciation: 0,
        assetCount: 0
    });

    const getLocalStorageKey = () => `clinic_assets_${clinicId || 'default'}`;

    const calculateDepreciation = (asset: Asset) => {
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
    };

    const processAssetsList = (items: any[]): Asset[] => {
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

            const dep = calculateDepreciation(baseAsset);

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

        setAssets(mappedAssets);
        setStats({
            totalValue,
            totalCost,
            totalDepreciation,
            assetCount: mappedAssets.length
        });

        return mappedAssets;
    };

    const loadFromLocalStorage = () => {
        try {
            const raw = localStorage.getItem(getLocalStorageKey());
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    processAssetsList(parsed);
                    return;
                }
            }
        } catch {}
        processAssetsList([]);
    };

    useEffect(() => {
        if (clinicId) {
            loadFromLocalStorage();
            setLoading(false);
            fetchAssets();
        }
    }, [clinicId]);

    const fetchAssets = async () => {
        if (!navigator.onLine) {
            loadFromLocalStorage();
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('assets')
                .select('*')
                .eq('clinic_id', clinicId || 0)
                .order('purchase_date', { ascending: false });

            if (error) {
                loadFromLocalStorage();
                return;
            }

            if (data) {
                processAssetsList(data);
                try {
                    localStorage.setItem(getLocalStorageKey(), JSON.stringify(data));
                } catch {}
            }
        } catch {
            loadFromLocalStorage();
        } finally {
            setLoading(false);
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
                const { data, error } = await supabase.from('assets').insert(dbPayload).select().single();
                if (!error && data) {
                    fetchAssets();
                    return data;
                }
            } catch {}
        }

        try {
            const raw = localStorage.getItem(getLocalStorageKey());
            const currentList: any[] = raw ? JSON.parse(raw) : [];
            const updatedList = [baseItem, ...currentList];
            localStorage.setItem(getLocalStorageKey(), JSON.stringify(updatedList));
            processAssetsList(updatedList);
            if (!navigator.onLine) {
                await addToSyncQueue('INSERT', 'assets', localId, dbPayload);
                toast.success('تم حفظ الأصل محلياً');
            }
        } catch (e) {
            console.error('[useAssets] Failed saving to localStorage:', e);
        }

        return baseItem;
    };

    const deleteAsset = async (id: string) => {
        if (navigator.onLine) {
            try {
                await supabase.from('assets').delete().eq('id', id);
            } catch {}
        } else {
            await addToSyncQueue('DELETE', 'assets', String(id), {});
        }

        try {
            const raw = localStorage.getItem(getLocalStorageKey());
            if (raw) {
                const currentList: any[] = JSON.parse(raw);
                const updatedList = currentList.filter(a => a.id !== id && a.id?.toString() !== id);
                localStorage.setItem(getLocalStorageKey(), JSON.stringify(updatedList));
                processAssetsList(updatedList);
                return;
            }
        } catch {}

        setAssets(prev => prev.filter(a => a.id !== id));
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
