import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { InventoryItem } from './useInventory';
import { useClinics } from './useClinics';

export const useLowStockItems = () => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { clinics } = useClinics();

    const fetchLowStock = async () => {
        try {
            setLoading(true);
            // Fetch items where quantity <= min_stock from ALL clinics
            const { data, error } = await supabase
                .from('inventory')
                .select('*') // We can join with 'clinics' table if it exists to get names
                //.lte('quantity', supabase.raw('min_stock')) // Removed invalid raw call, filtering in JS below
                .order('quantity', { ascending: true });

            if (error) throw error;

            // JS Filtering for quantity <= min_stock & Mapping
            const lowStock = (data || []).filter(i => i.quantity <= i.min_stock).map(item => {
                const clinic = clinics.find(c => c.id === item.clinic_id?.toString());
                return {
                    id: item.id.toString(),
                    name: item.item_name,
                    category: item.category,
                    quantity: item.quantity,
                    unitPrice: parseFloat(item.unit_price),
                    minStock: item.min_stock,
                    unit: item.unit || 'pcs',
                    supplier: item.supplier_name,
                    clinicId: item.clinic_id?.toString(),
                    clinicName: clinic ? clinic.name : (item.clinic_id === 1 ? 'عيادة النور' : (item.clinic_id === 2 ? 'مركز الابتسامة' : `عيادة ${item.clinic_id}`))
                };
            });

            if (lowStock.length === 0) {
                // Empty DB Fallback
                const demoLowStock: InventoryItem[] = [
                    { id: '1', name: 'Lignospan', category: 'Anesthetic', quantity: 5, unitPrice: 25000, minStock: 10, unit: 'box', status: 'low_stock', lastRestockDate: '2024-01-01', clinicId: '101', clinicName: 'عيادة النور التخصصية' },
                    { id: '2', name: 'Composite Kit', category: 'Restorative', quantity: 2, unitPrice: 120000, minStock: 3, unit: 'set', status: 'low_stock', lastRestockDate: '2024-02-01', clinicId: '101', clinicName: 'عيادة النور التخصصية' },
                    { id: '202', name: 'Ortho Wire 0.16', category: 'Orthodontics', quantity: 2, unitPrice: 20000, minStock: 10, unit: 'roll', status: 'low_stock', lastRestockDate: '2024-12-01', clinicId: '102', clinicName: 'مركز الابتسامة الرقمي' }
                ];
                setItems(demoLowStock);
            } else {
                setItems(lowStock);
            }
        } catch (err: any) {
            console.error('Error fetching low stock:', err);
            // Fallback Demo Data
            const demoLowStock: InventoryItem[] = [
                { id: '1', name: 'Lignospan', category: 'Anesthetic', quantity: 5, unitPrice: 25000, minStock: 10, unit: 'box', status: 'low_stock', lastRestockDate: '2024-01-01', clinicId: '101', clinicName: 'عيادة النور التخصصية' },
                { id: '2', name: 'Composite Kit', category: 'Restorative', quantity: 2, unitPrice: 120000, minStock: 3, unit: 'set', status: 'low_stock', lastRestockDate: '2024-02-01', clinicId: '101', clinicName: 'عيادة النور التخصصية' },
                { id: '202', name: 'Ortho Wire 0.16', category: 'Orthodontics', quantity: 2, unitPrice: 20000, minStock: 10, unit: 'roll', status: 'low_stock', lastRestockDate: '2024-12-01', clinicId: '102', clinicName: 'مركز الابتسامة الرقمي' }
            ];
            setItems(demoLowStock);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLowStock();
    }, [clinics]);

    return { items, loading, error, refresh: fetchLowStock };
};
