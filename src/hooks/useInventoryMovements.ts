import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface InventoryMovement {
    id: string;
    clinicId: string;
    itemId: string;
    itemName: string;
    movementType: 'in' | 'out' | 'adjustment';
    quantity: number;
    unitCost: number;
    totalCost: number;
    departmentId?: string;
    departmentName?: string;
    recipientId?: string;
    recipientName?: string;
    recordedById?: string;
    recorderName?: string;
    reason?: string;
    notes?: string;
    createdAt: string;
}

export const useInventoryMovements = (clinicId?: string) => {
    const [movements, setMovements] = useState<InventoryMovement[]>([]);
    const [loading, setLoading] = useState(true);

    const getLocalStorageKey = useCallback(() => `inventory_movements_${clinicId || 'default'}`, [clinicId]);

    const fetchMovements = useCallback(async () => {
        if (!clinicId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // 1. Try Supabase
            const { data, error } = await supabase
                .from('inventory_movements')
                .select(`
                    *,
                    inventory:inventory(item_name),
                    department:clinic_departments(name)
                `)
                .eq('clinic_id', clinicId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                const mapped: InventoryMovement[] = data.map((m: any) => ({
                    id: m.id.toString(),
                    clinicId: m.clinic_id.toString(),
                    itemId: m.item_id?.toString() || '',
                    itemName: m.inventory?.item_name || m.notes?.split(' - ')[0] || 'مادة مخزون',
                    movementType: m.movement_type || 'out',
                    quantity: Number(m.quantity) || 0,
                    unitCost: Number(m.unit_cost) || 0,
                    totalCost: Number(m.total_cost) || 0,
                    departmentId: m.department_id?.toString(),
                    departmentName: m.department?.name || m.department_name,
                    recipientId: m.recipient_id?.toString(),
                    recipientName: m.recipient_name,
                    recordedById: m.recorded_by_id?.toString(),
                    recorderName: m.recorder_name,
                    reason: m.reason,
                    notes: m.notes,
                    createdAt: m.created_at
                }));

                setMovements(mapped);
                localStorage.setItem(getLocalStorageKey(), JSON.stringify(mapped));
                setLoading(false);
                return;
            }

            // Fallback from localStorage
            const local = localStorage.getItem(getLocalStorageKey());
            if (local) {
                try {
                    setMovements(JSON.parse(local));
                } catch {
                    setMovements([]);
                }
            }
        } catch (err) {
            console.error('Error fetching inventory movements:', err);
            const local = localStorage.getItem(getLocalStorageKey());
            if (local) {
                try {
                    setMovements(JSON.parse(local));
                } catch {
                    setMovements([]);
                }
            }
        } finally {
            setLoading(false);
        }
    }, [clinicId, getLocalStorageKey]);

    useEffect(() => {
        fetchMovements();
    }, [fetchMovements]);

    const logMovement = async (newMovement: Omit<InventoryMovement, 'id' | 'createdAt'>) => {
        const movement: InventoryMovement = {
            ...newMovement,
            id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            createdAt: new Date().toISOString()
        };

        // Optimistic UI update
        const updated = [movement, ...movements];
        setMovements(updated);
        localStorage.setItem(getLocalStorageKey(), JSON.stringify(updated));

        // Try DB insertion
        try {
            const dbPayload: any = {
                clinic_id: clinicId,
                item_id: movement.itemId,
                movement_type: movement.movementType,
                quantity: movement.quantity,
                unit_cost: movement.unitCost,
                total_cost: movement.totalCost,
                department_id: movement.departmentId || null,
                recipient_name: movement.recipientName || null,
                recorder_name: movement.recorderName || null,
                reason: movement.reason || null,
                notes: movement.notes || null
            };

            if (movement.recipientId && !isNaN(Number(movement.recipientId))) {
                dbPayload.recipient_id = Number(movement.recipientId);
            }
            if (movement.recordedById && !isNaN(Number(movement.recordedById))) {
                dbPayload.recorded_by_id = Number(movement.recordedById);
            }

            const { data, error } = await supabase
                .from('inventory_movements')
                .insert([dbPayload])
                .select();

            if (!error && data && data.length > 0) {
                const realId = data[0].id.toString();
                const synced = updated.map(m => m.id === movement.id ? { ...m, id: realId } : m);
                setMovements(synced);
                localStorage.setItem(getLocalStorageKey(), JSON.stringify(synced));
            }
        } catch (err) {
            console.warn('Could not save movement to DB, saved locally:', err);
        }

        return movement;
    };

    return {
        movements,
        loading,
        logMovement,
        refresh: fetchMovements
    };
};
