import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

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
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchTasks();

            // Subscribe to realtime changes
            const subscription = supabase
                .channel('tasks_changes')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'tasks'
                    },
                    (payload) => {
                        console.log('Realtime update:', payload);
                        fetchTasks(); // Simple refresh strategy
                    }
                )
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [user, clinicId]);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('tasks')
                .select('*')
                .order('due_date', { ascending: true });

            if (clinicId && clinicId !== 'all') {
                // Filter by clinic scope (JSONB) or simpler check if we added clinic_id column
                // Since we migrated with clinic_scope, we use the JSON contains operator
                // query = query.contains('clinic_scope', { ids: [clinicId] }); 
                // OR simpler if we rely on the migration adding 'clinic_id' to tasks? 
                // Migration 20260205 added `clinic_scope` JSONB. 
                // Let's assume for now we filter by the JSON field.
                query = query.or(`clinic_scope->>ids.cs.{${clinicId}},clinic_scope->>type.eq.all`);
            }

            const { data, error } = await query;

            if (error) throw error;

            if (data) {
                const mapped: Task[] = data.map(t => ({
                    id: t.id,
                    type: t.type as any,
                    title: t.title,
                    description: t.description || '',
                    status: t.status as any,
                    priority: t.priority as any,
                    category: t.category as any,
                    date: t.due_date,
                    time: t.due_time || '00:00',
                    duration: t.duration || 30,
                    creatorId: t.creator_id,
                    creatorName: 'مستخدم', // Placeholder - in real app would join profiles
                    creatorRole: 'admin',
                    clinicScope: t.clinic_scope || { type: 'all' },
                    assignedScope: t.assigned_scope || { type: 'all' },
                    subtasks: t.subtasks || [],
                    progress: t.status === 'completed' ? 100 : (t.status === 'in_progress' ? 50 : 0),
                    tags: t.tags || [],
                    notes: t.notes,
                    lastUpdated: t.updated_at
                }));
                setTasks(mapped);
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
            toast.error('فشل تحميل المهام');
        } finally {
            setLoading(false);
        }
    };

    const addTask = async (task: Partial<Task>) => {
        try {
            const { error } = await supabase.from('tasks').insert({
                title: task.title,
                description: task.description,
                type: task.type || 'task',
                status: task.status || 'pending',
                priority: task.priority || 'medium',
                category: task.category,
                due_date: task.date,
                due_time: task.time,
                duration: task.duration,
                clinic_scope: task.clinicScope,
                assigned_scope: task.assignedScope,
                subtasks: task.subtasks,
                tags: task.tags,
                notes: task.notes,
                creator_id: user?.id
            });

            if (error) throw error;
            toast.success('تم إضافة المهمة بنجاح');
            fetchTasks(); // Optimistic update would be better but this is safe
        } catch (err) {
            console.error('Error adding task:', err);
            toast.error('فشل إضافة المهمة');
        }
    };

    const updateTask = async (id: string, updates: Partial<Task>) => {
        try {
            // Map frontend keys to DB keys
            const dbUpdates: any = {};
            if (updates.status) dbUpdates.status = updates.status;
            if (updates.title) dbUpdates.title = updates.title;
            if (updates.description) dbUpdates.description = updates.description;
            if (updates.date) dbUpdates.due_date = updates.date;
            if (updates.time) dbUpdates.due_time = updates.time;

            const { error } = await supabase
                .from('tasks')
                .update({
                    ...dbUpdates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;
            // toast.success('تم تحديث المهمة');
            fetchTasks();
        } catch (err) {
            console.error('Error updating task:', err);
            toast.error('فشل تحديث المهمة');
        }
    };

    const deleteTask = async (id: string) => {
        try {
            const { error } = await supabase.from('tasks').delete().eq('id', id);
            if (error) throw error;
            toast.success('تم حذف المهمة');
            fetchTasks();
        } catch (err) {
            console.error('Error deleting task:', err);
            toast.error('فشل حذف المهمة');
        }
    }

    return { tasks, loading, addTask, updateTask, deleteTask, refresh: fetchTasks };
};
