import { getInstantCache, setCache } from '../lib/offline/db';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useClinics } from './useClinics';

export interface Notification {
    id: string;
    userId?: string;
    clinicId?: string;
    laboratoryId?: string;
    actorId?: string;
    type:
        | 'appointment'
        | 'order_update'
        | 'payment'
        | 'message'
        | 'system'
        | 'alert'
        | 'reminder'
        | 'promotional'
        | 'offer'
        | 'discount'
        | 'update'
        | 'course_new'
        | 'webinar_new'
        | 'announcement'
        | string;
    title: string;
    description: string; // Mapped from 'message' in DB
    link?: string;
    imageUrl?: string;
    metadata?: Record<string, any>;
    time: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    isRead: boolean;
    createdAt: string;
    clinicName?: string;
}

const COMMUNITY_ONLY_SOCIAL_TYPES = new Set(['like', 'comment', 'reply', 'follow', 'mention', 'group_request', 'group_approve']);

const mapDbNotification = (dbRecord: any): Notification => ({
    id: String(dbRecord.id),
    userId: dbRecord.user_id,
    clinicId: dbRecord.clinic_id ? String(dbRecord.clinic_id) : undefined,
    laboratoryId: dbRecord.laboratory_id ? String(dbRecord.laboratory_id) : undefined,
    actorId: dbRecord.actor_id || undefined,
    type: dbRecord.type || 'system',
    title: dbRecord.title || 'إشعار',
    description: dbRecord.message || dbRecord.content || '',
    link: dbRecord.link || undefined,
    imageUrl: dbRecord.image_url || undefined,
    metadata: dbRecord.metadata || undefined,
    time: new Date(dbRecord.created_at || Date.now()).toLocaleDateString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        numberingSystem: 'latn'
    }),
    priority: dbRecord.priority || 'normal',
    isRead: Boolean(dbRecord.is_read ?? dbRecord.read ?? false),
    createdAt: dbRecord.created_at || new Date().toISOString(),
    clinicName: dbRecord.clinic?.name || undefined,
});

export const useNotifications = () => {
    const { user } = useAuth();
    const { clinics } = useClinics();
    const notifCacheKey = 'notifications_' + (user?.id || 'guest');
    const [notifications, setNotifications] = useState<Notification[]>(
        () => getInstantCache<Notification[]>(notifCacheKey) || []
    );
    const [loading, setLoading] = useState(() => !getInstantCache<Notification[]>(notifCacheKey));
    const [updates, setUpdates] = useState<any[]>(() => getInstantCache<any[]>('system_updates_list') || []);
    const mountedRef = useRef(true);

    const clinicIdsKey = clinics.map(c => c.id).join(',');

    const fetchUpdates = useCallback(async () => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return;
        try {
            const [settingsRes, legacyRes] = await Promise.allSettled([
                supabase
                    .from('admin_settings')
                    .select('value')
                    .eq('key', 'platform_config')
                    .maybeSingle(),
                supabase
                    .from('system_updates')
                    .select('*')
                    .eq('is_published', true)
                    .order('release_date', { ascending: false }),
            ]);

            if (!mountedRef.current) return;

            const combined: any[] = [];
            const seenVersions = new Set<string>();

            if (settingsRes.status === 'fulfilled' && settingsRes.value.data?.value?.apps_config) {
                const ac = settingsRes.value.data.value.apps_config;
                if (Array.isArray(ac.releaseHistory) && ac.releaseHistory.length > 0) {
                    for (const rel of ac.releaseHistory) {
                        const ver = String(rel.version || '').trim();
                        if (ver) seenVersions.add(ver);
                        combined.push({
                            id: rel.id || `app-rel-${ver}`,
                            title: rel.title || `تحديث المنصة v${ver}`,
                            version: ver,
                            content: rel.notes || rel.releaseNotes || '',
                            release_date: rel.releaseDate || new Date().toISOString(),
                            type: rel.type || 'minor',
                            platforms: rel.platforms || ['windows', 'android', 'web'],
                            is_published: true,
                        });
                    }
                } else if (ac.windows?.latestVersion) {
                    const ver = String(ac.windows.latestVersion).trim();
                    seenVersions.add(ver);
                    combined.push({
                        id: `app-win-${ver}`,
                        title: `تحديث تطبيقات المنصة v${ver}`,
                        version: ver,
                        content: ac.windows.releaseNotes || 'تحسينات في الأداء والمزامنة.',
                        release_date: ac.windows.releaseDate || new Date().toISOString(),
                        type: ac.windows.forceUpdate ? 'major' : 'minor',
                        platforms: ['windows', 'android', 'web'],
                        is_published: true,
                    });
                }
            }

            if (legacyRes.status === 'fulfilled' && Array.isArray(legacyRes.value.data)) {
                for (const u of legacyRes.value.data) {
                    if (u.version && seenVersions.has(String(u.version).trim())) continue;
                    combined.push(u);
                }
            }

            combined.sort(
                (a, b) => new Date(b.release_date || 0).getTime() - new Date(a.release_date || 0).getTime()
            );

            setUpdates(combined);
            setCache('system_updates_list', combined, 86400 * 30).catch(() => {});
        } catch (err: any) {
            if (err?.name === 'AbortError' || err?.message?.includes('AbortError')) return;
        }
    }, []);

    const fetchNotifications = useCallback(async () => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            if (mountedRef.current) setLoading(false);
            return;
        }
        try {
            if (!user?.id) {
                if (mountedRef.current) {
                    setNotifications([]);
                    setLoading(false);
                }
                return;
            }

            const userClinicIds = clinics.map(c => c.id).filter(Boolean);

            let query = supabase
                .from('notifications')
                .select(`
                    *,
                    clinic:clinics(name)
                `)
                .order('created_at', { ascending: false })
                .limit(80);

            if (userClinicIds.length > 0) {
                query = query.or(
                    `user_id.eq.${user.id},and(clinic_id.in.(${userClinicIds.join(',')}),user_id.is.null)`
                );
            } else {
                query = query.eq('user_id', user.id);
            }

            let { data, error } = await query;

            if (!mountedRef.current) return;

            if (error) {
                const fallback = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(80);
                if (fallback.error) throw fallback.error;
                data = fallback.data;
            }

            const mapped = (data || [])
                .filter((r: any) => !COMMUNITY_ONLY_SOCIAL_TYPES.has(r.type))
                .map((record: any) => mapDbNotification(record));

            setNotifications(mapped);
            setCache(notifCacheKey, mapped, 86400 * 14).catch(() => {});
        } catch (error: any) {
            if (error?.name === 'AbortError' || error?.message?.includes('AbortError')) return;
            if (mountedRef.current) console.error('Error fetching notifications:', error);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [user?.id, clinicIdsKey, notifCacheKey]);

    useEffect(() => {
        mountedRef.current = true;
        if (user?.id) {
            fetchNotifications();
        } else {
            setNotifications([]);
            setLoading(false);
        }
        return () => {
            mountedRef.current = false;
        };
    }, [user?.id, clinicIdsKey, fetchNotifications]);

    useEffect(() => {
        if (!user?.id) return;
        fetchUpdates();
    }, [user?.id, fetchUpdates]);

    // Sync across components & GlobalNotificationBridge without duplicate toasts
    useEffect(() => {
        if (!user?.id) return;

        const handleIncoming = (e: Event) => {
            const record = (e as CustomEvent).detail;
            if (!record || COMMUNITY_ONLY_SOCIAL_TYPES.has(record.type)) return;
            const mapped = mapDbNotification(record);
            setNotifications((prev) => {
                if (prev.some((n) => n.id === mapped.id)) return prev;
                const next = [mapped, ...prev];
                setCache(notifCacheKey, next, 86400 * 14).catch(() => {});
                return next;
            });
        };

        const handleReadBroadcast = (e: Event) => {
            const detail = (e as CustomEvent).detail || {};
            if (detail.all) {
                setNotifications((prev) => {
                    const next = prev.map((n) => ({ ...n, isRead: true }));
                    setCache(notifCacheKey, next, 86400 * 14).catch(() => {});
                    return next;
                });
            } else if (detail.id) {
                setNotifications((prev) => {
                    const next = prev.map((n) => (n.id === detail.id ? { ...n, isRead: true } : n));
                    setCache(notifCacheKey, next, 86400 * 14).catch(() => {});
                    return next;
                });
            }
        };

        const handleOnline = () => {
            fetchNotifications();
            fetchUpdates();
        };

        window.addEventListener('dental-notification-received', handleIncoming);
        window.addEventListener('dental-notifications-read', handleReadBroadcast);
        window.addEventListener('dental-online-ready', handleOnline);

        return () => {
            window.removeEventListener('dental-notification-received', handleIncoming);
            window.removeEventListener('dental-notifications-read', handleReadBroadcast);
            window.removeEventListener('dental-online-ready', handleOnline);
        };
    }, [user?.id, notifCacheKey, fetchNotifications, fetchUpdates]);

    const markAllAsRead = useCallback(async () => {
        if (!user?.id) return;

        setNotifications((prev) => {
            const next = prev.map((n) => ({ ...n, isRead: true }));
            setCache(notifCacheKey, next, 86400 * 14).catch(() => {});
            return next;
        });

        window.dispatchEvent(new CustomEvent('dental-notifications-read', { detail: { all: true } }));

        if (typeof navigator !== 'undefined' && !navigator.onLine) return;

        try {
            await supabase
                .from('notifications')
                .update({ is_read: true, read: true })
                .eq('user_id', user.id)
                .eq('is_read', false);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    }, [user?.id, notifCacheKey]);

    const markAsRead = useCallback(async (id: string) => {
        if (!id) return;
        if (id === 'all') {
            await markAllAsRead();
            return;
        }

        setNotifications((prev) => {
            const next = prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
            setCache(notifCacheKey, next, 86400 * 14).catch(() => {});
            return next;
        });

        window.dispatchEvent(new CustomEvent('dental-notifications-read', { detail: { id } }));

        // Only update DB if `id` is a valid UUID (skip synthetic ids like apt-123)
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (!isUuid || (typeof navigator !== 'undefined' && !navigator.onLine)) return;

        try {
            await supabase
                .from('notifications')
                .update({ is_read: true, read: true })
                .eq('id', id);
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }, [markAllAsRead, notifCacheKey]);

    const deleteNotification = useCallback(async (id: string) => {
        setNotifications((prev) => {
            const next = prev.filter((n) => n.id !== id);
            setCache(notifCacheKey, next, 86400 * 14).catch(() => {});
            return next;
        });

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (!isUuid || (typeof navigator !== 'undefined' && !navigator.onLine)) return;

        try {
            await supabase
                .from('notifications')
                .delete()
                .eq('id', id);
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    }, [notifCacheKey]);

    return {
        notifications,
        updates,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refresh: () => {
            fetchNotifications();
            fetchUpdates();
        },
        unreadCount: notifications.filter((n) => !n.isRead).length
    };
};
