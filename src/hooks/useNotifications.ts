import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useClinics } from './useClinics';
import { toast } from 'sonner';

export interface Notification {
    id: string;
    userId?: string;
    clinicId?: string;
    laboratoryId?: string;
    type: 'appointment' | 'order_update' | 'payment' | 'message' | 'system' | 'alert' | 'reminder';
    title: string;
    description: string; // Mapped from 'message' in DB
    link?: string;
    time: string;
    priority: 'low' | 'normal' | 'high';
    isRead: boolean;
    createdAt: string;
    clinicName?: string;
}

export const useNotifications = () => {
    const { user } = useAuth();
    const { clinics } = useClinics();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [updates, setUpdates] = useState<any[]>([]);
    const mountedRef = useRef(true);

    // Fetch data whenever user or clinics change
    useEffect(() => {
        if (!user) return;
        fetchNotifications();
        fetchUpdates();
    }, [user, clinics]);

    // Realtime subscription — separate effect, only re-runs when user.id changes
    // Uses a unique channel name to avoid React StrictMode double-invoke issues
    useEffect(() => {
        if (!user?.id) return;

        // Unique suffix prevents Supabase from reusing a cached channel
        // that was already subscribed in the previous (StrictMode) run
        const channelName = `notifications_${user.id}_${Math.random().toString(36).slice(2)}`;

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    if (!mountedRef.current) return;
                    handleRealtimeUpdate(payload);
                }
            )
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    console.warn('Realtime channel error for notifications');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    const handleRealtimeUpdate = (payload: any) => {
        if (payload.eventType === 'INSERT') {
            const newNotif = mapDbNotification(payload.new);
            setNotifications(prev => [newNotif, ...prev]);
            toast(newNotif.title, {
                description: newNotif.description,
            });
        } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev => prev.map(n =>
                n.id === payload.new.id ? mapDbNotification(payload.new) : n
            ));
        } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
        }
    };

    const fetchUpdates = async () => {
        try {
            const { data, error } = await supabase
                .from('system_updates')
                .select('*')
                .eq('is_published', true)
                .order('release_date', { ascending: false });

            if (!mountedRef.current) return;
            if (error) {
                console.warn('Could not fetch system updates');
                return;
            }
            setUpdates(data || []);
        } catch (err: any) {
            if (err?.name === 'AbortError' || err?.message?.includes('AbortError')) return;
            console.warn('Error fetching updates:', err);
        }
    };

    const fetchNotifications = async () => {
        try {
            setLoading(true);

            if (!user?.id) {
                setNotifications([]);
                setLoading(false);
                return;
            }

            // Get the IDs of clinics owned by this user
            const userClinicIds = clinics.map(c => c.id).filter(Boolean);

            // Build the filter: user_id = current user OR (clinic_id IN user's clinics AND user_id IS NULL)
            // This handles both user-level and clinic-level notifications, but ONLY for this user's clinics
            let query = supabase
                .from('notifications')
                .select(`
                    *,
                    clinic:clinics(name)
                `)
                .order('created_at', { ascending: false })
                .limit(50);

            if (userClinicIds.length > 0) {
                // Filter: notifications for THIS user, OR notifications for THIS user's clinics (no specific user)
                query = query.or(
                    `user_id.eq.${user.id},and(clinic_id.in.(${userClinicIds.join(',')}),user_id.is.null)`
                );
            } else {
                // No clinics: only show notifications directly for this user
                query = query.eq('user_id', user.id);
            }

            const { data, error } = await query;

            if (!mountedRef.current) return;
            if (error) {
                // Fallback: just filter by user_id if the complex query fails
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('notifications')
                    .select(`*, clinic:clinics(name)`)
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(50);
                if (fallbackError) throw fallbackError;
                const mapped = (fallbackData || []).map((record: any) => ({
                    ...mapDbNotification(record),
                    clinicName: record.clinic?.name
                }));
                setNotifications(mapped);
                return;
            }

            const mapped = (data || []).map((record: any) => ({
                ...mapDbNotification(record),
                clinicName: record.clinic?.name
            }));

            setNotifications(mapped);
        } catch (error: any) {
            if (error?.name === 'AbortError' || error?.message?.includes('AbortError')) return;
            if (mountedRef.current) console.error('Error fetching notifications:', error);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));

        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const deleteNotification = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.filter(n => n.id !== id));

        try {
            await supabase
                .from('notifications')
                .delete()
                .eq('id', id);
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const mapDbNotification = (dbRecord: any): Notification => ({
        id: dbRecord.id,
        userId: dbRecord.user_id,
        clinicId: dbRecord.clinic_id,
        laboratoryId: dbRecord.laboratory_id,
        type: dbRecord.type,
        title: dbRecord.title,
        description: dbRecord.message,
        link: dbRecord.link,
        time: new Date(dbRecord.created_at).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        priority: dbRecord.priority || 'normal',
        isRead: dbRecord.is_read,
        createdAt: dbRecord.created_at,
        // clinicName will be added in fetch
    });

    return {
        notifications,
        updates,
        loading,
        markAsRead,
        deleteNotification,
        refresh: () => { fetchNotifications(); fetchUpdates(); },
        unreadCount: notifications.filter(n => !n.isRead).length
    };
};

