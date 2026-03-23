import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction } from '../types';
import { useAppointments } from './useAppointments';

export const useFinance = (clinicId?: string, patientId?: string, staffId?: string) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        income: 0,
        expenses: 0,
        net: 0,
        growth: 0
    });

    const { appointments } = useAppointments(clinicId || '0');

    useEffect(() => {
        if (clinicId) {
            fetchFinancials();
        }
    }, [clinicId, appointments, patientId, staffId]);

    const fetchFinancials = async () => {
        setLoading(true);
        try {
            // 1. Fetch Manual Transactions from Supabase
            console.log('Fetching financials for clinicId:', clinicId, 'patientId:', patientId, 'staffId:', staffId);
            let query = supabase
                .from('financial_transactions')
                // Note: Using explicit foreign key hinting for multiple staff relations
                .select('*, patient:patients!patient_id(full_name), doctor:staff!doctor_id(full_name), recorder:staff!recorded_by(full_name)')
                .eq('clinic_id', clinicId || 0);

            if (patientId) {
                query = query.eq('patient_id', patientId);
            }
            if (staffId) {
                // Filter by staff_record_id OR doctor_id
                // Use OR syntax if possible, or decide logic. 
                // For now, assume usage sets staffId (numeric)
                if (!isNaN(Number(staffId))) {
                    query = query.eq('staff_record_id', staffId);
                } else {
                    query = query.eq('doctor_id', staffId);
                }
            }

            const { data: dbTransactions, error } = await query
                .order('transaction_date', { ascending: false });

            if (error) console.error('Error fetching transactions:', error);

            let mappedTransactions: Transaction[] = [];

            if (dbTransactions) {
                mappedTransactions = dbTransactions.map(t => ({
                    id: t.id.toString(),
                    type: t.type as 'income' | 'expense',
                    amount: parseFloat(t.amount),
                    date: t.transaction_date || new Date().toISOString(),
                    description: t.description || '',
                    category: t.category,
                    paymentMethod: t.payment_method || 'cash',
                    recordedById: t.recorded_by?.toString(),
                    doctorId: t.doctor_id?.toString(),
                    patientId: t.patient_id?.toString(),
                    assistantId: t.assistant_id?.toString(),
                    treatmentId: t.treatment_id?.toString(),
                    inventoryItemId: t.inventory_item_id?.toString(),
                    labRequestId: t.lab_request_id,
                    extraCost: t.extra_cost,
                    relatedPerson: t.patient?.full_name || (t.type === 'expense' && t.category === 'salary' ? t.doctor?.full_name : ''),
                    doctorName: t.doctor?.full_name || '',
                    recorderName: t.recorder?.full_name || 'مسؤول النظام'
                }));
            }

            // 2. Automated Income from Completed Appointments
            // Only include if no staffId filter OR if staffId matches appointment doctor
            const appointmentTransactions: Transaction[] = appointments
                .filter(apt => apt.status === 'completed' && apt.cost > 0)
                .filter(apt => !patientId || apt.patientId === patientId)
                .filter(apt => !staffId || apt.doctorId === staffId)
                .map(apt => ({
                    id: `apt-${apt.id}`, // Virtual ID
                    type: 'income',
                    amount: apt.cost || 0,
                    // Add staff_record_id if doctorId is numeric string? 
                    // CreateOrderModal passes UUID if available, or name.
                    // Here we assume appointment.doctorId might be UUID or INT?
                    // Logic: if appointment.doctorId is valid UUID -> doctor_id
                    // If numeric -> staff_record_id
                    staffRecordId: !isNaN(Number(apt.doctorId)) ? Number(apt.doctorId).toString() : undefined,
                    doctorId: isNaN(Number(apt.doctorId)) ? apt.doctorId : undefined,
                    date: apt.date,
                    description: `جلسة علاج: ${apt.patientName || 'مريض'}`,
                    // Dynamic Category based on appointment type
                    category: apt.type === 'consultation' ? 'consultation' : 'treatment',
                    paymentMethod: 'cash',
                    doctorName: apt.doctorName,
                    relatedPerson: apt.patientName
                }));

            // 3. Combine
            const allTransactions = [
                ...mappedTransactions,
                ...appointmentTransactions
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            // Remove duplicates check if needed, but IDs differ.

            setTransactions(allTransactions);

            // 4. Calculate Stats
            const income = allTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
            const expenses = allTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

            // Calculate previous month for growth (simple approximation)
            const currentMonth = new Date().getMonth();
            const prevMonthIncome = allTransactions
                .filter(t => t.type === 'income' && new Date(t.date).getMonth() === currentMonth - 1)
                .reduce((sum, t) => sum + t.amount, 0);

            const growth = prevMonthIncome > 0 ? ((income - prevMonthIncome) / prevMonthIncome) * 100 : 0;

            setStats({
                income,
                expenses,
                net: income - expenses,
                growth
            });

        } catch (err) {
            console.error('Finance fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const addTransaction = async (t: Omit<Transaction, 'id'>) => {
        try {
            console.log('Adding transaction:', t);

            // Map staffId to doctor_id for Salary transactions
            const mappedDoctorId = t.doctorId || (t.category === 'salary' ? t.staffId : null);

            const { data, error } = await supabase.from('financial_transactions').insert({
                clinic_id: clinicId || 0,
                amount: t.amount,
                type: t.type,
                category: t.category,
                description: t.description,
                transaction_date: t.date,
                payment_method: t.paymentMethod,
                status: 'completed',
                patient_id: t.patientId || null,
                recorded_by: t.recordedById || null,
                // Smart Mapping
                // If doctorId is numeric -> staff_record_id
                staff_record_id: t.doctorId && !isNaN(Number(t.doctorId)) ? Number(t.doctorId)
                    : (t.category === 'salary' && t.staffId && !isNaN(Number(t.staffId))) ? Number(t.staffId) : null,
                doctor_id: t.doctorId && isNaN(Number(t.doctorId)) ? t.doctorId : null, // Only if UUID
                assistant_id: t.assistantId || null,
                treatment_id: t.treatmentId || null,
                inventory_item_id: t.inventoryItemId || null,
                lab_request_id: t.labRequestId || null,
                extra_cost: t.extraCost || 0
            }).select('*, patient:patients(full_name), doctor:staff!doctor_id(full_name), recorder:staff!recorded_by(full_name)').single();

            if (error) throw error;

            // Manual State Update for Immediate Feedback
            const newTransaction: Transaction = {
                id: data.id.toString(),
                type: data.type as 'income' | 'expense',
                amount: parseFloat(data.amount),
                date: data.transaction_date || t.date,
                description: data.description || t.description,
                category: data.category,
                paymentMethod: data.payment_method || 'cash',
                recordedById: data.recorded_by?.toString(),
                recorderName: data.recorder?.full_name || 'مسؤول النظام',
                relatedPerson: data.patient?.full_name || (data.type === 'expense' && data.category === 'salary' ? data.doctor?.full_name : ''),
                doctorName: data.doctor?.full_name || '',
                // Map other potential fields if needed for immediate display
                patientId: t.patientId,
                doctorId: t.doctorId
            };

            setTransactions(prev => [newTransaction, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

            // await fetchFinancials(); // Still fetch to ensure consistency
            return data;
        } catch (e) {
            console.error('Supabase insert failed:', e);
            throw e;
        }
    };

    const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
        try {
            const dbUpdates: any = {};
            if (updates.amount) dbUpdates.amount = updates.amount;
            if (updates.category) dbUpdates.category = updates.category;
            if (updates.description) dbUpdates.description = updates.description;
            if (updates.date) dbUpdates.transaction_date = updates.date;
            if (updates.paymentMethod) dbUpdates.payment_method = updates.paymentMethod;

            // Relational updates
            if (updates.patientId !== undefined) dbUpdates.patient_id = updates.patientId || null;
            if (updates.doctorId !== undefined) dbUpdates.doctor_id = updates.doctorId || null;
            if (updates.recordedById !== undefined) dbUpdates.recorded_by = updates.recordedById || null;
            if (updates.treatmentId !== undefined) dbUpdates.treatment_id = updates.treatmentId || null;

            const { error } = await supabase
                .from('financial_transactions')
                .update(dbUpdates)
                .eq('id', id);

            if (error) throw error;

            // Local Update
            setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

            // await fetchFinancials();
        } catch (e) {
            console.error('Update failed:', e);
            throw e;
        }
    };

    const deleteTransaction = async (id: string) => {
        try {
            const { error } = await supabase
                .from('financial_transactions')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Local Update
            setTransactions(prev => prev.filter(t => t.id !== id));

            // await fetchFinancials();
        } catch (e) {
            console.error('Delete failed:', e);
            throw e;
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
