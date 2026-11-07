import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getInstantCache, setCache, getCache } from '../lib/offline/db';

export interface Transaction {
    id: string;
    clinicId: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    description: string;
    date: string;
    status: 'pending' | 'completed' | 'cancelled';
    patientId?: string;
}

export const useTransactions = (clinicId?: string) => {
    const cacheKey = `transactions_list_${clinicId || 'all'}`;
    const initial = getInstantCache<Transaction[]>(cacheKey) || [];
    const [transactions, setTransactions] = useState<Transaction[]>(initial);
    const [loading, setLoading] = useState(false);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        fetchTransactions();
        return () => { mountedRef.current = false; };
    }, [clinicId]);

    const fetchTransactions = async () => {
        if (!navigator.onLine) {
            const cached = await getCache<Transaction[]>(cacheKey);
            if (cached && mountedRef.current) {
                setTransactions(cached);
            }
            if (mountedRef.current) setLoading(false);
            return;
        }

        if (transactions.length === 0) setLoading(true);
        try {
            let query = supabase
                .from('financial_transactions')
                .select('*')
                .order('transaction_date', { ascending: false });

            if (clinicId) {
                query = query.eq('clinic_id', parseInt(clinicId));
            }

            const { data, error } = await query;
            if (error) throw error;

            const mapped: Transaction[] = (data || []).map(t => ({
                id: String(t.id),
                clinicId: t.clinic_id?.toString(),
                amount: parseFloat(t.amount) || 0,
                type: t.type,
                category: t.category,
                description: t.description,
                date: t.transaction_date,
                status: t.status,
                patientId: t.patient_id?.toString()
            }));

            if (mountedRef.current) {
                setTransactions(mapped);
                setCache(cacheKey, mapped, 86400 * 30).catch(() => {});
            }
        } catch (error: any) {
            if (error?.name === 'AbortError' || error?.message?.includes('AbortError')) return;
            const cached = await getCache<Transaction[]>(cacheKey);
            if (cached && mountedRef.current) {
                setTransactions(cached);
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    return { transactions, loading, refresh: fetchTransactions };
};
