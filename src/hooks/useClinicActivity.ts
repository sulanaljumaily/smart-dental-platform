import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatActivityDetails } from '../lib/utils';

export interface ActivityLog {
    id: string;
    action: string; // e.g., 'CREATE_PATIENT', 'DELETE_APPOINTMENT'
    entityType: 'patient' | 'appointment' | 'inventory' | 'financial' | 'settings' | 'staff';
    entityId?: string;
    description: string;
    performedBy: string; // Staff Name
    performedAt: string;
    metadata?: any; // To store restore data
    loading?: boolean;
}

export const useClinicActivity = (clinicId: string) => {
    const { user } = useAuth();
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        type: 'all',
        staffId: 'all',
        dateRange: '7d' // 7d, 30d, all
    });

    useEffect(() => {
        if (user) {
            fetchActivities();
        }
    }, [user, clinicId, filters]);

    const fetchActivities = async () => {
        setLoading(true);
        const allLogs: ActivityLog[] = [];

        try {
            // 1. Fetch from 'activity_logs' (System Logs)
            let logQuery = supabase.from('activity_logs').select('*, profiles:user_id(full_name, email)');
            if (clinicId && clinicId !== 'all') logQuery = logQuery.eq('clinic_id', clinicId);
            const { data: logs } = await logQuery;

            if (logs) {
                logs.forEach((item: any) => {
                    allLogs.push({
                        id: item.id,
                        action: item.action_type || item.action,
                        entityType: item.entity_type as any,
                        entityId: item.entity_id,
                        description: formatActivityDetails(item.action_type || item.action, item.details),
                        performedBy: item.profiles?.full_name || item.profiles?.email || 'النظام',
                        performedAt: item.created_at,
                        metadata: item.details
                    });
                });
            }

            // 2. Fetch Patients (Mapped to 'patient' activity)
            if (user) {
                let patQuery = supabase
                    .from('patients')
                    .select('id, full_name, created_at, clinic_id')
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (clinicId && clinicId !== 'all') patQuery = patQuery.eq('clinic_id', clinicId);
                const { data: patients } = await patQuery;

                if (patients) {
                    patients.forEach((p: any) => {
                        allLogs.push({
                            id: `pat-${p.id}`,
                            action: 'تسجيل مريض',
                            entityType: 'patient',
                            entityId: p.id,
                            description: `تم تسجيل ملف مريض جديد: ${p.full_name}`,
                            performedBy: 'موظف الاستقبال',
                            performedAt: p.created_at
                        });
                    });
                }
            }

            // 3. Fetch Appointments (Mapped to 'appointment' activity)
            if (user) {
                let aptQuery = supabase
                    .from('appointments')
                    .select('id, patient_name, status, type, created_at, clinic_id, doctor_name')
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (clinicId && clinicId !== 'all') aptQuery = aptQuery.eq('clinic_id', clinicId);
                const { data: appointments } = await aptQuery;

                if (appointments) {
                    appointments.forEach((a: any) => {
                        allLogs.push({
                            id: `apt-${a.id}`,
                            action: a.status === 'pending' ? 'حجز جديد' : 'تحديث موعد',
                            entityType: 'appointment',
                            entityId: a.id,
                            description: `موعد جديد للمريض ${a.patient_name} (${a.type})`,
                            performedBy: a.doctor_name || 'سلطان الجميلي',
                            performedAt: a.created_at
                        });
                    });
                }
            }

            // 4. Fetch Inventory Items (Mapped to 'inventory' activity)
            if (user) {
                let invQuery = supabase
                    .from('inventory')
                    .select('id, item_name, quantity, unit, created_at, clinic_id')
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (clinicId && clinicId !== 'all') invQuery = invQuery.eq('clinic_id', clinicId);
                const { data: inventory } = await invQuery;

                if (inventory) {
                    inventory.forEach((i: any) => {
                        allLogs.push({
                            id: `inv-${i.id}`,
                            action: 'إضافة مادة',
                            entityType: 'inventory',
                            entityId: i.id,
                            description: `إضافة ${i.item_name} بـالكمية ${i.quantity} ${i.unit}`,
                            performedBy: 'المخزن',
                            performedAt: i.created_at
                        });
                    });
                }
            }

            // 5. Fetch Financial Transactions
            if (user) {
                let finQuery = supabase
                    .from('financial_transactions')
                    .select('id, type, amount, category, description, created_at, clinic_id')
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (clinicId && clinicId !== 'all') finQuery = finQuery.eq('clinic_id', clinicId);
                const { data: finance } = await finQuery;

                if (finance) {
                    finance.forEach((f: any) => {
                        allLogs.push({
                            id: `fin-${f.id}`,
                            action: f.type === 'income' ? 'قبض إيراد' : 'صرف مصروف',
                            entityType: 'financial',
                            entityId: f.id,
                            description: `${f.type === 'income' ? 'إيراد' : 'مصروف'}: ${f.amount} د.ع - ${f.category || 'عام'} (${f.description || ''})`,
                            performedBy: 'الحسابات',
                            performedAt: f.created_at
                        });
                    });
                }
            }

            // Filter by Local State Type Filter
            let filtered = allLogs;
            if (filters.type && filters.type !== 'all') {
                filtered = allLogs.filter(l => l.entityType === filters.type);
            }

            // Sort Combined Logs by Date Descending
            filtered.sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());

            setActivities(filtered);
        } catch (err) {
            console.error('Error fetching activities:', err);
        } finally {
            setLoading(false);
        }
    };

    const undoAction = async (activityId: string) => {
        const activity = activities.find(a => a.id === activityId);
        if (!activity) return false;

        // Ensure we only restore soft-deletes of staff/patients
        const isRestorable = activity.action === 'delete_staff' || activity.action === 'delete_patient';
        if (!isRestorable || !activity.entityId) return false;

        setActivities(prev => prev.map(a => a.id === activityId ? { ...a, loading: true } : a));

        try {
            let tableName = '';
            if (activity.action === 'delete_staff') tableName = 'staff';
            else if (activity.action === 'delete_patient') tableName = 'patients';

            const { error } = await supabase
                .from(tableName)
                .update({ deleted_at: null })
                .eq('id', activity.entityId);

            if (error) throw error;

            // Log the restore action
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('activity_logs').insert({
                clinic_id: clinicId,
                user_id: user?.id,
                action_type: `restore_${activity.entityType}`,
                entity_type: activity.entityType,
                entity_id: activity.entityId,
                details: { restored_from_log_id: activityId }
            });

            await fetchActivities();
            return true;
        } catch (err) {
            console.error('Undo failed:', err);
            setActivities(prev => prev.map(a => a.id === activityId ? { ...a, loading: false } : a));
            return false;
        }
    };

    return {
        activities,
        loading,
        filters,
        setFilters,
        undoAction,
        refresh: fetchActivities
    };
};
