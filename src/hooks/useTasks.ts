import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { getInstantCache, setCache, getCache, addToSyncQueue } from '../lib/offline/db';

export interface Task {
    id: string;
    type: 'task' | 'reminder';
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'urgent';
    priority: 'urgent' | 'high' | 'medium' | 'low';
    category: any;
    date: string;
    time: string;
    duration: number;
    creatorId: string;
    creatorName: string;
    creatorRole: string;
    clinicScope: { type: 'all' | 'specific'; ids?: string[]; names?: string[] };
    assignedScope: { type: 'all' | 'specific'; ids?: string[]; names?: string[] };
    subtasks: string[];
    progress: number;
    tags: string[];
    notes?: string;
    comments?: any[];
    lastUpdated: string;
}

export const useTasks = (clinicId?: string) => {
    const { user } = useAuth();
    const cacheKey = `clinic_tasks_${clinicId || 'all'}_${user?.id || ''}`;
    const initial = getInstantCache<Task[]>(cacheKey) || [];
    const [tasks, setTasks] = useState<Task[]>(initial);
    const [loading, setLoading] = useState(initial.length === 0);
    const mountedRef = useRef(true);

    const saveTasksCache = (list: Task[]) => {
        setCache(cacheKey, list, 86400 * 30).catch(() => {});
        if (mountedRef.current) {
            setTasks(list);
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        if (user && clinicId) {
            const cached = getInstantCache<Task[]>(cacheKey);
            if (cached && cached.length > 0) {
                setTasks(cached);
                setLoading(false);
            }
            fetchTasks();

            if (!navigator.onLine) return;

            const subscription = supabase
                .channel(`clinic_tasks_changes_${clinicId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'clinic_tasks',
                        filter: clinicId !== 'all' ? `clinic_id=eq.${clinicId}` : undefined
                    },
                    () => {
                        if (navigator.onLine) fetchTasks();
                    }
                )
                .subscribe();

            return () => {
                mountedRef.current = false;
                subscription.unsubscribe();
            };
        } else {
            setLoading(false);
        }
        return () => { mountedRef.current = false; };
    }, [user?.id, clinicId]);

    const fetchTasks = async () => {
        if (!navigator.onLine) {
            const cached = await getCache<Task[]>(cacheKey);
            if (cached && mountedRef.current) {
                setTasks(cached);
            }
            if (mountedRef.current) setLoading(false);
            return;
        }

        if (tasks.length === 0) setLoading(true);
        try {
            let query = supabase
                .from('clinic_tasks')
                .select(`
                    *,
                    assigned_staff:assigned_to ( id, full_name )
                `)
                .order('due_date', { ascending: true });

            if (clinicId && clinicId !== 'all') {
                query = query.eq('clinic_id', clinicId);
            }

            const { data, error } = await query;
            if (error) throw error;

            if (data) {
                const mapped: Task[] = data.map((t: any) => ({
                    id: String(t.id),
                    type: 'task',
                    title: t.title,
                    description: t.description || '',
                    status: t.status as any,
                    priority: t.priority as any,
                    category: 'إدارية',
                    date: t.due_date ? t.due_date.split('T')[0] : '',
                    time: t.due_date ? new Date(t.due_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '00:00',
                    duration: 30,
                    creatorId: t.created_by,
                    creatorName: 'مستخدم',
                    creatorRole: 'admin',
                    clinicScope: { type: 'specific', ids: [t.clinic_id?.toString()], names: [] },
                    assignedScope: t.assigned_staff
                        ? { type: 'specific', ids: [t.assigned_staff.id.toString()], names: [t.assigned_staff.full_name] }
                        : { type: 'all' },
                    subtasks: [],
                    progress: t.status === 'completed' ? 100 : 0,
                    tags: [],
                    lastUpdated: t.updated_at
                }));
                const currentCached = getInstantCache<Task[]>(cacheKey) || [];
                const unsyncedOffline = currentCached.filter(item => String(item.id).startsWith('offline_'));
                saveTasksCache([...unsyncedOffline, ...mapped]);
            }
        } catch {
            // في حالة الأوفلاين أو خطأ الشبكة، نستخدم الكاش بدون إظهار رسالة خطأ مزعجة
            const cached = await getCache<Task[]>(cacheKey);
            if (cached && mountedRef.current) {
                setTasks(cached);
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const addTask = async (task: Partial<Task>) => {
        const assignedToId = task.assignedScope?.type === 'specific' && task.assignedScope.ids?.[0]
            ? parseInt(task.assignedScope.ids[0])
            : null;

        let targetClinicId: number | null = null;
        if (clinicId && clinicId !== 'all') {
            targetClinicId = parseInt(clinicId);
        } else if (task.clinicScope?.type === 'specific' && task.clinicScope.ids?.[0]) {
            targetClinicId = parseInt(task.clinicScope.ids[0]);
        }

        const dbPayload = {
            clinic_id: targetClinicId,
            title: task.title,
            description: task.description,
            assigned_to: assignedToId,
            status: task.status || 'pending',
            priority: task.priority || 'medium',
            due_date: task.date ? `${task.date}T${task.time || '00:00'}:00` : null,
            created_by: user?.id
        };

        const addLocally = async () => {
            const localId = `offline_task_${Date.now()}`;
            const localTask: Task = {
                id: localId,
                type: task.type || 'task',
                title: task.title || 'مهمة جديدة',
                description: task.description || '',
                status: (task.status as any) || 'pending',
                priority: (task.priority as any) || 'medium',
                category: task.category || 'إدارية',
                date: task.date || new Date().toISOString().split('T')[0],
                time: task.time || '09:00',
                duration: task.duration || 30,
                creatorId: user?.id || '',
                creatorName: user?.name || 'الطبيب',
                creatorRole: 'doctor',
                clinicScope: task.clinicScope || { type: 'all' },
                assignedScope: task.assignedScope || { type: 'all' },
                subtasks: task.subtasks || [],
                progress: 0,
                tags: task.tags || [],
                lastUpdated: new Date().toISOString()
            };
            saveTasksCache([localTask, ...tasks]);
            await addToSyncQueue('INSERT', 'clinic_tasks', localId, dbPayload);
        };

        if (!navigator.onLine) {
            await addLocally();
            toast.success('تم إضافة المهمة محلياً (ستتم المزامنة تلقائياً عند الاتصال)');
            return;
        }

        try {
            const { error } = await supabase.from('clinic_tasks').insert(dbPayload);
            if (error) throw error;
            toast.success('تم إضافة المهمة بنجاح');
            fetchTasks();
        } catch {
            await addLocally();
            toast.info('تم حفظ المهمة محلياً (ستتم المزامنة عند الاتصال)');
        }
    };

    const updateTask = async (id: string, updates: Partial<Task>) => {
        const targetId = String(id);
        const nextList = tasks.map(t =>
            String(t.id) === targetId
                ? {
                    ...t,
                    ...updates,
                    progress: updates.status === 'completed' ? 100 : (updates.progress ?? t.progress)
                }
                : t
        );
        saveTasksCache(nextList);

        const dbUpdates: any = {
            updated_at: new Date().toISOString()
        };
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.priority !== undefined) dbUpdates.priority = updates.priority;

        if (!navigator.onLine || targetId.startsWith('offline_')) {
            await addToSyncQueue('UPDATE', 'clinic_tasks', targetId, dbUpdates);
            return;
        }

        try {
            const { error } = await supabase
                .from('clinic_tasks')
                .update(dbUpdates)
                .eq('id', targetId);

            if (error) throw error;
            fetchTasks();
        } catch {
            await addToSyncQueue('UPDATE', 'clinic_tasks', targetId, dbUpdates);
        }
    };

    const deleteTask = async (id: string) => {
        const targetId = String(id);
        saveTasksCache(tasks.filter(t => String(t.id) !== targetId));

        if (!navigator.onLine || targetId.startsWith('offline_')) {
            await addToSyncQueue('DELETE', 'clinic_tasks', targetId, {});
            toast.success('تم حذف المهمة محلياً');
            return;
        }

        try {
            const { error } = await supabase.from('clinic_tasks').delete().eq('id', targetId);
            if (error) throw error;
            toast.success('تم حذف المهمة');
        } catch {
            await addToSyncQueue('DELETE', 'clinic_tasks', targetId, {});
            toast.info('تم حذف المهمة محلياً (ستتم المزامنة عند الاتصال)');
        }
    };

    return { tasks, loading, addTask, updateTask, deleteTask, refresh: fetchTasks };
};
