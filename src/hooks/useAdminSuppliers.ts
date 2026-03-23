import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Helper interface for Supplier
export interface Supplier {
    id: string;
    companyName: string;
    ownerName: string;
    email: string;
    phoneNumber: string;
    category: string;
    location: string;
    status: 'pending' | 'approved' | 'active' | 'rejected' | 'suspended';
    commissionPercentage: number;
    totalSales: number;
    pendingCommission: number;
    rating: number;
    ordersCount: number;
    productsCount: number;
    joinDate: string;
    description?: string;
    documents?: string[];
}

export function useAdminSuppliers() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSuppliers = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from('suppliers')
                .select(`
                    *,
                    products:products(count)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                // Map data from snake_case DB to camelCase Interface
                const mapped: Supplier[] = data.map((s: any) => ({
                    id: s.id,
                    companyName: s.name || 'Unknown Company',
                    ownerName: s.contact_person || s.owner_name || 'N/A',
                    email: s.email || '',
                    phoneNumber: s.phone || s.phone_number || 'N/A',
                    category: s.category || 'General',
                    location: s.address || s.location || 'Baghdad',
                    status: s.is_verified ? 'approved' : 'pending', // Derived from is_verified (status column doesn't exist)
                    commissionPercentage: s.commission_percentage || 0,
                    totalSales: s.total_sales || 0,
                    pendingCommission: s.pending_commission || 0,
                    rating: s.rating || 5,
                    ordersCount: s.orders_count || 0,
                    productsCount: s.products ? s.products[0]?.count : (s.supplier_products ? s.supplier_products[0]?.count : 0),
                    joinDate: s.created_at || new Date().toISOString(),
                    description: s.description,
                    documents: s.documents || []
                }));
                setSuppliers(mapped);
            } else {
                setSuppliers([]);
            }

        } catch (err: any) {
            console.error('Error fetching suppliers:', err);
            setError(err.message);
            // Don't fallback to mocks anymore, rely on DB (even if empty initially)
            // setSuppliers([]); 
        } finally {
            setLoading(false);
        }
    };

    const updateCommissionRate = async (supplierId: string, rate: number) => {
        try {
            // Optimistic update
            setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, commissionPercentage: rate } : s));

            const { error } = await supabase
                .from('suppliers')
                .update({ commission_percentage: rate })
                .eq('id', supplierId);

            if (error) throw error;
            return true;
        } catch (err) {
            console.error('Error updating commission:', err);
            return false;
        }
    };

    const updateSupplierStatus = async (supplierId: string, status: 'approved' | 'rejected' | 'suspended') => {
        try {
            setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, status } : s));

            // Map status to is_verified boolean (status column doesn't exist in DB)
            const is_verified = status === 'approved';

            const { error } = await supabase
                .from('suppliers')
                .update({ is_verified })
                .eq('id', supplierId);

            if (error) throw error;
            return true;
        } catch (err) {
            console.error('Error updating status:', err);
            return false;
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const clearCommission = async (supplierId: string) => {
        try {
            const supplier = suppliers.find(s => s.id === supplierId);
            if (!supplier || supplier.pendingCommission <= 0) return false;

            // 1. Record the Transaction
            await supabase.from('financial_transactions').insert({
                supplier_id: supplierId,
                amount: supplier.pendingCommission,
                type: 'expense', // Expense for platform (payout)
                category: 'commission_clearance',
                status: 'completed',
                transaction_date: new Date().toISOString(),
                description: `Commission Payout for ${supplier.companyName}`
            });

            // 2. Clear Pending Commission
            const { error } = await supabase
                .from('suppliers')
                .update({ pending_commission: 0 })
                .eq('id', supplierId);

            if (error) throw error;

            // 3. Update Local State
            setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, pendingCommission: 0 } : s));
            return true;
        } catch (err) {
            console.error('Error clearing commission:', err);
            return false;
        }
    };

    return {
        suppliers,
        loading,
        error,
        fetchSuppliers,
        updateCommissionRate,
        updateSupplierStatus,
        clearCommission
    };
}
