import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction } from '../types';
import { useAppointments } from './useAppointments';
import { getInstantCache, setCache, getCache, addToSyncQueue } from '../lib/offline/db';
import { toast } from 'sonner';

const financeCache = new Map<string, { transactions: Transaction[]; stats: any }>();

function calculateFinanceStats(allTransactions: Transaction[]) {
    const income = allTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const expenses = allTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const currentMonth = new Date().getMonth();
    const prevMonthIncome = allTransactions
        .filter(t => t.type === 'income' && new Date(t.date).getMonth() === currentMonth - 1)
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const growth = prevMonthIncome > 0 ? ((income - prevMonthIncome) / prevMonthIncome) * 100 : 0;

    return {
        income,
        expenses,
        net: income - expenses,
        growth
    };
}

export const useFinance = (clinicId?: string, patientId?: string, staffId?: string) => {
    const targetClinicId = String(clinicId || '0');
    const cacheKey = `${targetClinicId}_${patientId || ''}_${staffId || ''}`;
    const clinicManualCacheKey = `finance_manual_tx_${targetClinicId}`;

    const getInitialData = () => {
        const mem = financeCache.get(cacheKey);
        if (mem) return mem;
        const instant = getInstantCache<{ transactions: Transaction[]; stats: any }>('finance_' + cacheKey);
        if (instant) {
            financeCache.set(cacheKey, instant);
            return instant;
        }
        // إذا كان لدينا كاش لمعاملات العيادة الكاملة، نفلتر منه فوراً للمريض أو الموظف
        const clinicManual = getInstantCache<Transaction[]>(clinicManualCacheKey);
        if (clinicManual && clinicManual.length > 0) {
            const filtered = clinicManual.filter(tx => {
                if (patientId && String(tx.patientId) !== String(patientId)) return false;
                if (staffId && String(tx.doctorId) !== String(staffId) && String(tx.staffId) !== String(staffId)) return false;
                return true;
            });
            const stats = calculateFinanceStats(filtered);
            return { transactions: filtered, stats };
        }
        return null;
    };

    const initialData = getInitialData();
    const [transactions, setTransactions] = useState<Transaction[]>(initialData?.transactions || []);
    const [loading, setLoading] = useState(!initialData && !!clinicId && clinicId !== '0');
    const [stats, setStats] = useState(initialData?.stats || {
        income: 0,
        expenses: 0,
        net: 0,
        growth: 0
    });
    const mountedRef = useRef(true);

    const { appointments } = useAppointments(clinicId || '0');

    const applyCombinedTransactions = (manualTxs: Transaction[]) => {
        const filteredManual = manualTxs.filter(tx => {
            if (patientId && String(tx.patientId) !== String(patientId)) return false;
            if (staffId && String(tx.doctorId) !== String(staffId) && String(tx.staffId) !== String(staffId)) return false;
            return true;
        });

        const appointmentTransactions: Transaction[] = appointments
            .filter(apt => apt.status === 'completed' && (Number(apt.cost) || 0) > 0)
            .filter(apt => !patientId || String(apt.patientId) === String(patientId))
            .filter(apt => !staffId || String(apt.doctorId) === String(staffId))
            .map(apt => ({
                id: `apt-${apt.id}`,
                type: 'income',
                amount: Number(apt.cost) || 0,
                staffRecordId: apt.doctorId,
                doctorId: apt.doctorId,
                date: apt.date,
                description: `جلسة علاج: ${apt.patientName || 'مريض'}`,
                category: apt.type === 'consultation' ? 'consultation' : 'treatment',
                paymentMethod: 'cash',
                doctorName: apt.doctorName,
                relatedPerson: apt.patientName,
                patientId: apt.patientId
            }));

        const allTransactions = [
            ...filteredManual,
            ...appointmentTransactions
        ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

        const calculatedStats = calculateFinanceStats(allTransactions);
        const payload = { transactions: allTransactions, stats: calculatedStats };
        financeCache.set(cacheKey, payload);
        setCache('finance_' + cacheKey, payload, 86400 * 30).catch(() => {});

        if (mountedRef.current) {
            setTransactions(allTransactions);
            setStats(calculatedStats);
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        if (clinicId && clinicId !== '0') {
            fetchFinancials();
        } else {
            setLoading(false);
        }
        return () => { mountedRef.current = false; };
    }, [clinicId, appointments.length, patientId, staffId]);

    const fetchFinancials = async () => {
        if (!clinicId || clinicId === '0') {
            if (mountedRef.current) setLoading(false);
            return;
        }

        // 1. تحميل فوري من الكاش المحلي
        const cachedManual = getInstantCache<Transaction[]>(clinicManualCacheKey) || (await getCache<Transaction[]>(clinicManualCacheKey)) || [];
        if (cachedManual.length > 0) {
            applyCombinedTransactions(cachedManual);
            if (mountedRef.current) setLoading(false);
        }

        const isUnsyncedPatient = patientId ? isNaN(Number(patientId)) : false;

        if (!navigator.onLine || isUnsyncedPatient) {
            applyCombinedTransactions(cachedManual);
            if (mountedRef.current) setLoading(false);
            return;
        }

        if (!financeCache.has(cacheKey) && cachedManual.length === 0) {
            setLoading(true);
        }

        try {
            let query = supabase
                .from('financial_transactions')
                .select('*, patient:patients!fk_fin_patients(full_name), staff_record:staff!fk_fin_staff_record(full_name), recorder_staff:staff!fk_fin_recorded_by_staff(full_name)')
                .eq('clinic_id', clinicId);

            if (patientId) {
                query = query.eq('patient_id', patientId);
            }
            if (staffId && !isNaN(Number(staffId))) {
                query = query.eq('staff_record_id', Number(staffId));
            }

            const { data: dbTransactions, error } = await query.order('transaction_date', { ascending: false });
            if (error) throw error;

            const serverMapped: Transaction[] = (dbTransactions || []).map(t => ({
                id: String(t.id),
                type: t.type as 'income' | 'expense',
                amount: parseFloat(t.amount) || 0,
                date: t.transaction_date || new Date().toISOString(),
                description: t.description || '',
                category: t.category,
                paymentMethod: t.payment_method || 'cash',
                recordedById: t.recorded_by_staff_id?.toString(),
                doctorId: t.staff_record_id?.toString(),
                staffId: t.staff_record_id?.toString(),
                patientId: t.patient_id?.toString(),
                assistantId: t.assistant_id?.toString(),
                treatmentId: t.treatment_id?.toString(),
                sessionId: t.session_id?.toString(),
                inventoryItemId: t.inventory_item_id?.toString(),
                labRequestId: t.lab_request_id,
                extraCost: t.extra_cost,
                doctorName: t.staff_record?.full_name || '',
                recorderName: t.recorder_staff?.full_name || 'مسؤول النظام',
                relatedPerson: t.related_person || t.patient?.full_name || (t.type === 'expense' && t.category === 'salary' ? t.staff_record?.full_name : '')
            }));

            // دمج أي معاملات مالية محلية غير مزامنة بعد (offline_tx_*)
            const unsyncedOffline = cachedManual.filter(tx => String(tx.id).startsWith('offline_'));
            const mergedManual = [...unsyncedOffline, ...serverMapped];

            if (!patientId && !staffId) {
                setCache(clinicManualCacheKey, mergedManual, 86400 * 30).catch(() => {});
            } else {
                // تحديث الكاش العام للعيادة بإضافة السجلات الجديدة دون مسح معاملات المرضى الآخرين
                const existingIds = new Set(mergedManual.map(m => String(m.id)));
                const combinedClinicCache = [
                    ...mergedManual,
                    ...cachedManual.filter(c => !existingIds.has(String(c.id)))
                ];
                setCache(clinicManualCacheKey, combinedClinicCache, 86400 * 30).catch(() => {});
            }

            applyCombinedTransactions(mergedManual);
        } catch (err: any) {
            if (err?.name === 'AbortError' || err?.message?.includes('AbortError')) return;
            applyCombinedTransactions(cachedManual);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const logActivity = async (action: string, entityId: string, details: any) => {
        if (!navigator.onLine) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('activity_logs').insert({
                clinic_id: clinicId,
                user_id: user?.id,
                action_type: action,
                entity_type: 'transaction',
                entity_id: entityId,
                details
            });
        } catch {}
    };

    const syncTreatmentPlanPaidAmount = async (treatmentId: string) => {
        if (!treatmentId || !navigator.onLine) return;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(treatmentId);
        if (!isUuid) return;

        try {
            const { data: txData, error: txError } = await supabase
                .from('financial_transactions')
                .select('amount')
                .eq('treatment_id', treatmentId)
                .eq('type', 'income');

            if (txError) throw txError;

            const totalPaid = txData?.reduce((sum, tx) => sum + parseFloat(tx.amount), 0) || 0;

            await supabase
                .from('tooth_treatment_plans')
                .update({ paid: totalPaid })
                .eq('id', treatmentId);
        } catch {}
    };

    const saveTransactionOffline = async (t: Omit<Transaction, 'id'>, dbPayload: any) => {
        const localId = `offline_tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const newTransaction: Transaction = {
            id: localId,
            type: t.type as 'income' | 'expense',
            amount: Number(t.amount) || 0,
            date: t.date || new Date().toISOString().split('T')[0],
            description: t.description || '',
            category: t.category,
            paymentMethod: t.paymentMethod || 'cash',
            recordedById: t.recordedById,
            recorderName: t.recorderName || 'مسؤول النظام',
            relatedPerson: t.relatedPerson || '',
            doctorName: t.doctorName || '',
            patientId: t.patientId ? String(t.patientId) : undefined,
            doctorId: t.doctorId ? String(t.doctorId) : undefined,
            staffId: t.staffId ? String(t.staffId) : undefined,
            treatmentId: t.treatmentId ? String(t.treatmentId) : undefined,
            sessionId: t.sessionId ? String(t.sessionId) : undefined,
            inventoryItemId: t.inventoryItemId ? String(t.inventoryItemId) : undefined,
            labRequestId: t.labRequestId,
            extraCost: t.extraCost
        };

        const currentManual = getInstantCache<Transaction[]>(clinicManualCacheKey) || [];
        const updatedManual = [newTransaction, ...currentManual];
        await setCache(clinicManualCacheKey, updatedManual, 86400 * 30);
        applyCombinedTransactions(updatedManual);

        await addToSyncQueue('INSERT', 'financial_transactions', localId, dbPayload);
        return newTransaction;
    };

    const addTransaction = async (t: Omit<Transaction, 'id'>) => {
        const staffRecordId = t.doctorId ? Number(t.doctorId) : (t.staffId ? Number(t.staffId) : null);
        const recorderStaffId = t.recordedById ? Number(t.recordedById) : null;

        const dbPayload = {
            clinic_id: Number.isNaN(Number(targetClinicId)) ? targetClinicId : Number(targetClinicId),
            amount: Number(t.amount) || 0,
            type: t.type,
            category: t.category,
            description: t.description,
            transaction_date: t.date || new Date().toISOString().split('T')[0],
            payment_method: t.paymentMethod || 'cash',
            status: 'completed',
            patient_id: t.patientId ? (isNaN(Number(t.patientId)) ? t.patientId : Number(t.patientId)) : null,
            related_person: t.relatedPerson || null,
            staff_record_id: staffRecordId !== null && !isNaN(Number(staffRecordId)) ? staffRecordId : null,
            recorded_by_staff_id: recorderStaffId !== null && !isNaN(Number(recorderStaffId)) ? recorderStaffId : null,
            treatment_id: t.treatmentId || null,
            session_id: t.sessionId || null,
            inventory_item_id: t.inventoryItemId || null,
            lab_request_id: t.labRequestId || null,
            extra_cost: t.extraCost || 0
        };

        const isPatientUnsynced = t.patientId ? isNaN(Number(t.patientId)) : false;

        if (!navigator.onLine || isPatientUnsynced) {
            const offlineTx = await saveTransactionOffline(t, dbPayload);
            toast.success('تم تسجيل المعاملة المالية محلياً (ستتم المزامنة تلقائياً عند الاتصال)');
            return offlineTx;
        }

        try {
            const { data, error } = await supabase
                .from('financial_transactions')
                .insert(dbPayload)
                .select('*, patient:patients!fk_fin_patients(full_name), staff_record:staff!fk_fin_staff_record(full_name), recorder_staff:staff!fk_fin_recorded_by_staff(full_name)')
                .single();

            if (error) throw error;

            if (data?.treatment_id) {
                await syncTreatmentPlanPaidAmount(data.treatment_id);
            }

            await logActivity('create_transaction', String(data.id), {
                amount: data.amount,
                type: data.type,
                category: data.category,
                patientName: data.patient?.full_name || ''
            });

            const newTransaction: Transaction = {
                id: String(data.id),
                type: data.type as 'income' | 'expense',
                amount: parseFloat(data.amount) || 0,
                date: data.transaction_date || t.date,
                description: data.description || t.description,
                category: data.category,
                paymentMethod: data.payment_method || 'cash',
                recordedById: data.recorded_by_staff_id?.toString(),
                recorderName: data.recorder_staff?.full_name || 'مسؤول النظام',
                relatedPerson: t.relatedPerson || data.related_person || data.patient?.full_name || (data.type === 'expense' && data.category === 'salary' ? data.staff_record?.full_name : ''),
                doctorName: data.staff_record?.full_name || '',
                patientId: t.patientId ? String(t.patientId) : undefined,
                doctorId: t.doctorId ? String(t.doctorId) : undefined,
                treatmentId: t.treatmentId ? String(t.treatmentId) : undefined
            };

            const currentManual = getInstantCache<Transaction[]>(clinicManualCacheKey) || [];
            const updatedManual = [newTransaction, ...currentManual.filter(item => String(item.id) !== String(newTransaction.id))];
            await setCache(clinicManualCacheKey, updatedManual, 86400 * 30);
            applyCombinedTransactions(updatedManual);

            return data;
        } catch {
            const offlineTx = await saveTransactionOffline(t, dbPayload);
            toast.info('تعذر الاتصال، تم حفظ المعاملة المالية محلياً وستتم المزامنة تلقائياً');
            return offlineTx;
        }
    };

    const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
        const targetId = String(id);
        const dbUpdates: any = {};
        if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
        if (updates.category !== undefined) dbUpdates.category = updates.category;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.date !== undefined) dbUpdates.transaction_date = updates.date;
        if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;
        if (updates.relatedPerson !== undefined) dbUpdates.related_person = updates.relatedPerson || null;
        if (updates.patientId !== undefined) dbUpdates.patient_id = updates.patientId || null;
        if (updates.doctorId !== undefined || updates.staffId !== undefined) {
            const docVal = updates.doctorId || updates.staffId;
            dbUpdates.staff_record_id = docVal && !isNaN(Number(docVal)) ? Number(docVal) : null;
        }
        if (updates.recordedById !== undefined) {
            dbUpdates.recorded_by_staff_id = updates.recordedById && !isNaN(Number(updates.recordedById)) ? Number(updates.recordedById) : null;
        }
        if (updates.treatmentId !== undefined) dbUpdates.treatment_id = updates.treatmentId || null;

        const applyLocalTxUpdate = async () => {
            const currentManual = getInstantCache<Transaction[]>(clinicManualCacheKey) || [];
            const updatedManual = currentManual.map(t => String(t.id) === targetId ? { ...t, ...updates } : t);
            await setCache(clinicManualCacheKey, updatedManual, 86400 * 30);
            applyCombinedTransactions(updatedManual);
        };

        if (!navigator.onLine || targetId.startsWith('offline_')) {
            await applyLocalTxUpdate();
            await addToSyncQueue('UPDATE', 'financial_transactions', targetId, dbUpdates);
            toast.success('تم تحديث المعاملة المالية محلياً');
            return;
        }

        try {
            const { error } = await supabase
                .from('financial_transactions')
                .update(dbUpdates)
                .eq('id', targetId);

            if (error) throw error;

            const { data: updatedTx } = await supabase
                .from('financial_transactions')
                .select('treatment_id')
                .eq('id', targetId)
                .maybeSingle();
            if (updatedTx?.treatment_id) {
                await syncTreatmentPlanPaidAmount(updatedTx.treatment_id);
            }

            await logActivity('update_transaction', targetId, updates);
            await applyLocalTxUpdate();
        } catch {
            await applyLocalTxUpdate();
            await addToSyncQueue('UPDATE', 'financial_transactions', targetId, dbUpdates);
            toast.info('تم حفظ تعديل المعاملة محلياً (ستتم المزامنة عند الاتصال)');
        }
    };

    const deleteTransaction = async (id: string) => {
        const targetId = String(id);
        const transactionToDelete = transactions.find(t => String(t.id) === targetId);

        const removeLocalTx = async () => {
            const currentManual = getInstantCache<Transaction[]>(clinicManualCacheKey) || [];
            const updatedManual = currentManual.filter(t => String(t.id) !== targetId);
            await setCache(clinicManualCacheKey, updatedManual, 86400 * 30);
            applyCombinedTransactions(updatedManual);
        };

        if (!navigator.onLine || targetId.startsWith('offline_')) {
            await removeLocalTx();
            await addToSyncQueue('DELETE', 'financial_transactions', targetId, {});
            toast.success('تم حذف المعاملة المالية محلياً');
            return;
        }

        try {
            const { error } = await supabase
                .from('financial_transactions')
                .delete()
                .eq('id', targetId);

            if (error) throw error;

            if (transactionToDelete?.treatmentId) {
                await syncTreatmentPlanPaidAmount(transactionToDelete.treatmentId);
            }

            await logActivity('delete_transaction', targetId, {
                amount: transactionToDelete?.amount,
                type: transactionToDelete?.type,
                reason: 'Manual deletion'
            });

            await removeLocalTx();
        } catch {
            await removeLocalTx();
            await addToSyncQueue('DELETE', 'financial_transactions', targetId, {});
            toast.info('تم حذف المعاملة محلياً (ستتم المزامنة عند الاتصال)');
        }
    };

    return {
        transactions,
        stats,
        loading,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        refresh: fetchFinancials
    };
};
