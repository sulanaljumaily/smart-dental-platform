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

/**
 * تجميع المعاملات المخزنة محلياً (للعمل بدون إنترنت) من كاش useFinance وكاش هذا الـ hook.
 * - يُفلتر حسب العيادة عند تمريرها حتى لا تختلط معاملات العيادات الأخرى.
 * - يُزيل التكرار حسب المعرف.
 */
function aggregateCachedTransactions(clinicId?: string): Transaction[] {
    if (typeof localStorage === 'undefined') return [];
    const result: Transaction[] = [];
    const seen = new Set<string>();
    const PREFIX = 'dental_instant_cache_v1_';
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k || !k.startsWith(PREFIX)) continue;
            const shortKey = k.slice(PREFIX.length);
            const isFinance = shortKey.startsWith('finance_');
            const isOwnList = shortKey.startsWith('transactions_list_');
            if (!isFinance && !isOwnList) continue;
            const raw = localStorage.getItem(k);
            if (!raw) continue;
            const parsed = JSON.parse(raw);
            const list: any[] = Array.isArray(parsed)
                ? parsed
                : (Array.isArray(parsed?.transactions) ? parsed.transactions : []);
            for (const item of list) {
                if (!item || item.id === undefined || item.id === null) continue;
                const tid = String(item.id);
                if (seen.has(tid)) continue;
                const txClinic = String(item.clinicId ?? item.clinic_id ?? '');
                if (clinicId && txClinic !== String(clinicId)) continue;
                seen.add(tid);
                result.push({
                    id: tid,
                    clinicId: txClinic,
                    amount: parseFloat(item.amount) || 0,
                    type: item.type === 'expense' ? 'expense' : 'income',
                    category: item.category || 'عام',
                    description: item.description || '',
                    date: item.date || item.transaction_date || item.created_at || '',
                    status: item.status || 'completed',
                    patientId: item.patientId ?? item.patient_id
                });
            }
        }
    } catch {}
    return result;
}

export const useTransactions = (clinicId?: string) => {
    const cacheKey = `transactions_list_${clinicId || 'all'}`;
    const [transactions, setTransactions] = useState<Transaction[]>(() => {
        const cached = getInstantCache<Transaction[]>(cacheKey);
        if (cached && cached.length > 0) return cached;
        return aggregateCachedTransactions(clinicId);
    });
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
