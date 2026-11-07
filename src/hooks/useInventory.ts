import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getInstantCache, setCache, getCache, addToSyncQueue } from '../lib/offline/db';
import { toast } from 'sonner';

export interface InventoryItem {
    id: string;
    name: string;
    category: string;
    quantity: number;
    unitPrice: number;
    minStock: number;
    unit: string;
    lastRestockDate?: string;
    expiryDate?: string;
    supplier?: string;
    status: 'available' | 'low_stock' | 'out_of_stock' | 'expired';
    brand?: string;
    location?: string;
    batchNumber?: string;
    notes?: string;
    clinicId?: string;
    clinicName?: string;
}

function computeInventoryStatus(quantity: number, minStock: number): InventoryItem['status'] {
    if (quantity <= 0) return 'out_of_stock';
    if (quantity <= minStock) return 'low_stock';
    return 'available';
}

export const useInventory = (clinicId?: string) => {
    const cacheKey = `clinic_inventory_${clinicId || 'all'}`;
    const initial = getInstantCache<InventoryItem[]>(cacheKey) || [];
    const [inventory, setInventory] = useState<InventoryItem[]>(initial);
    const [loading, setLoading] = useState(initial.length === 0);
    const mountedRef = useRef(true);

    const saveInventoryCache = (items: InventoryItem[]) => {
        setCache(cacheKey, items, 86400 * 30).catch(() => {});
        if (mountedRef.current) {
            setInventory(items);
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        const cached = getInstantCache<InventoryItem[]>(cacheKey);
        if (cached && cached.length > 0) {
            setInventory(cached);
            setLoading(false);
        }
        fetchInventory();
        return () => { mountedRef.current = false; };
    }, [clinicId]);

    const fetchInventory = async () => {
        if (!navigator.onLine) {
            const cached = await getCache<InventoryItem[]>(cacheKey);
            if (cached && mountedRef.current) {
                setInventory(cached);
            }
            if (mountedRef.current) setLoading(false);
            return;
        }

        if (inventory.length === 0) setLoading(true);
        try {
            let query = supabase.from('inventory').select('*');

            if (clinicId) {
                query = query.eq('clinic_id', clinicId);
            }

            const { data, error } = await query;
            if (error) throw error;

            const mappedItems: InventoryItem[] = (data || []).map((i: any) => ({
                id: i.id.toString(),
                name: i.item_name,
                category: i.category,
                quantity: Number(i.quantity) || 0,
                unitPrice: Number(i.unit_price) || 0,
                minStock: Number(i.min_stock) || 0,
                unit: i.unit || 'قطعة',
                lastRestockDate: i.last_restock_date,
                expiryDate: i.expiry_date,
                supplier: i.supplier_name,
                status: i.status || computeInventoryStatus(Number(i.quantity) || 0, Number(i.min_stock) || 0),
                brand: i.brand,
                location: i.location,
                batchNumber: i.batch_number || '',
                notes: i.notes || '',
                clinicId: i.clinic_id?.toString()
            }));

            const currentCached = getInstantCache<InventoryItem[]>(cacheKey) || [];
            const unsyncedOffline = currentCached.filter(item => String(item.id).startsWith('offline_'));
            saveInventoryCache([...unsyncedOffline, ...mappedItems]);
        } catch {
            const cached = await getCache<InventoryItem[]>(cacheKey);
            if (cached && mountedRef.current) {
                setInventory(cached);
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const addItem = async (newItem: Omit<InventoryItem, 'id' | 'status'>) => {
        const targetClinicId = clinicId || '101';
        const dbItem = {
            clinic_id: Number.isNaN(Number(targetClinicId)) ? targetClinicId : Number(targetClinicId),
            item_name: newItem.name,
            category: newItem.category,
            quantity: Number(newItem.quantity) || 0,
            unit_price: Number(newItem.unitPrice) || 0,
            min_stock: Number(newItem.minStock) || 0,
            unit: newItem.unit,
            supplier_name: newItem.supplier,
            brand: newItem.brand,
            location: newItem.location,
            expiry_date: newItem.expiryDate
        };

        const addLocally = async () => {
            const localId = `offline_inv_${Date.now()}`;
            const localItem: InventoryItem = {
                id: localId,
                name: newItem.name,
                category: newItem.category,
                quantity: Number(newItem.quantity) || 0,
                unitPrice: Number(newItem.unitPrice) || 0,
                minStock: Number(newItem.minStock) || 0,
                unit: newItem.unit || 'قطعة',
                expiryDate: newItem.expiryDate,
                supplier: newItem.supplier,
                status: computeInventoryStatus(Number(newItem.quantity) || 0, Number(newItem.minStock) || 0),
                brand: newItem.brand,
                location: newItem.location,
                clinicId: String(targetClinicId)
            };
            saveInventoryCache([localItem, ...inventory]);
            await addToSyncQueue('INSERT', 'inventory', localId, dbItem);
        };

        if (!navigator.onLine) {
            await addLocally();
            toast.success('تم إضافة المادة للمخزون محلياً (ستتم المزامنة تلقائياً عند الاتصال)');
            return;
        }

        try {
            const { error } = await supabase.from('inventory').insert([dbItem]);
            if (error) throw error;
            fetchInventory();
        } catch {
            await addLocally();
            toast.info('تم حفظ المادة محلياً (ستتم المزامنة عند الاتصال)');
        }
    };

    const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
        const targetId = String(id);
        const nextList = inventory.map(i => {
            if (String(i.id) !== targetId) return i;
            const updated = { ...i, ...updates };
            updated.status = computeInventoryStatus(updated.quantity, updated.minStock);
            return updated;
        });
        saveInventoryCache(nextList);

        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.item_name = updates.name;
        if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
        if (updates.minStock !== undefined) dbUpdates.min_stock = updates.minStock;
        if (updates.unitPrice !== undefined) dbUpdates.unit_price = updates.unitPrice;
        if (updates.expiryDate !== undefined) dbUpdates.expiry_date = updates.expiryDate;
        if (updates.supplier !== undefined) dbUpdates.supplier_name = updates.supplier;
        if (updates.location !== undefined) dbUpdates.location = updates.location;

        if (!navigator.onLine || targetId.startsWith('offline_')) {
            await addToSyncQueue('UPDATE', 'inventory', targetId, dbUpdates);
            toast.success('تم تحديث المخزون محلياً');
            return;
        }

        try {
            const { error } = await supabase.from('inventory').update(dbUpdates).eq('id', targetId);
            if (error) throw error;
            fetchInventory();
        } catch {
            await addToSyncQueue('UPDATE', 'inventory', targetId, dbUpdates);
            toast.info('تم حفظ تعديل المخزون محلياً (ستتم المزامنة عند الاتصال)');
        }
    };

    const deleteItem = async (id: string) => {
        const targetId = String(id);
        saveInventoryCache(inventory.filter(i => String(i.id) !== targetId));

        if (!navigator.onLine || targetId.startsWith('offline_')) {
            await addToSyncQueue('DELETE', 'inventory', targetId, {});
            toast.success('تم حذف المادة محلياً');
            return;
        }

        try {
            const { error } = await supabase.from('inventory').delete().eq('id', targetId);
            if (error) throw error;
        } catch {
            await addToSyncQueue('DELETE', 'inventory', targetId, {});
            toast.info('تم حذف المادة محلياً (ستتم المزامنة عند الاتصال)');
        }
    };

    return {
        inventory,
        loading,
        addItem,
        updateItem,
        deleteItem,
        refresh: fetchInventory
    };
};
