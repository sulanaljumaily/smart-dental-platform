import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { triggerPushEdgeFunction } from '../lib/pushNotifications';

export type AudienceKey = 'all' | 'doctor_staff' | 'laboratory' | 'supplier' | 'patient';

export type CampaignCategory =
    | 'promotional'
    | 'offer'
    | 'discount'
    | 'update'
    | 'announcement'
    | 'reminder'
    | 'course'
    | 'webinar'
    | 'system';

export interface NotificationCampaign {
    id: string;
    title: string;
    type: CampaignCategory;
    targetAudience: string;
    targetAudiences: AudienceKey[];
    scheduledDate?: string | null;
    sentAt?: string | null;
    status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
    content: string;
    link?: string | null;
    imageUrl?: string | null;
    channels: string[];
    priority: 'low' | 'normal' | 'high' | 'urgent';
    sentCount: number;
    metadata?: Record<string, any>;
    createdAt: string;
}

export interface NotificationTemplate {
    id: string;
    name: string;
    title: string;
    content: string;
    type: CampaignCategory;
    targetAudiences: AudienceKey[];
    link?: string | null;
    imageUrl?: string | null;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    usageCount: number;
    createdAt: string;
}

export interface StoreProductLite {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    discount?: number;
    imageUrl?: string;
    category?: string;
}

export interface AudienceCounts {
    doctor_staff: number;
    laboratory: number;
    supplier: number;
    patient: number;
    all: number;
    pushTokensCount: number;
}

export interface SendCampaignInput {
    title: string;
    content: string;
    type: CampaignCategory;
    targetAudiences: AudienceKey[];
    scheduledDate?: string | null;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    link?: string | null;
    imageUrl?: string | null;
    metadata?: Record<string, any>;
    channels?: string[];
}

export function useAdminNotifications() {
    const [campaigns, setCampaigns] = useState<NotificationCampaign[]>([]);
    const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
    const [products, setProducts] = useState<StoreProductLite[]>([]);
    const [audienceCounts, setAudienceCounts] = useState<AudienceCounts>({
        doctor_staff: 0,
        laboratory: 0,
        supplier: 0,
        patient: 0,
        all: 0,
        pushTokensCount: 0,
    });
    const [loading, setLoading] = useState(true);

    const fetchNotificationData = useCallback(async () => {
        try {
            setLoading(true);

            // Auto-dispatch any due scheduled notifications first
            Promise.resolve(supabase.rpc('process_due_notifications_and_reminders'))
                .then(({ data }) => {
                    const schedIds: string[] = data?.scheduled?.notification_ids || [];
                    const remIds: string[] = data?.reminders?.notification_ids || [];
                    const ids = [...schedIds, ...remIds].filter(Boolean);
                    if (ids.length > 0) {
                        triggerPushEdgeFunction({ notification_ids: ids });
                    }
                })
                .catch(() => {});

            const [campRes, tempRes, prodRes, profRes, staffRes, tokensRes] = await Promise.allSettled([
                supabase
                    .from('notification_campaigns')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(100),
                supabase
                    .from('notification_templates')
                    .select('*')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('products')
                    .select('id, name, price, original_price, discount, cover_image, image_url, category')
                    .eq('is_active', true)
                    .order('created_at', { ascending: false })
                    .limit(60),
                supabase
                    .from('profiles')
                    .select('id, role'),
                supabase
                    .from('staff')
                    .select('user_id, auth_user_id, status'),
                supabase
                    .from('user_push_tokens')
                    .select('id', { count: 'exact', head: true })
                    .eq('is_active', true),
            ]);

            if (campRes.status === 'fulfilled' && !campRes.value.error && Array.isArray(campRes.value.data)) {
                setCampaigns(
                    campRes.value.data.map((c: any) => ({
                        id: c.id,
                        title: c.title,
                        type: c.type || 'system',
                        targetAudience: c.target_audience || 'all',
                        targetAudiences: Array.isArray(c.target_audiences) && c.target_audiences.length > 0
                            ? c.target_audiences
                            : (c.target_audience ? String(c.target_audience).split(',') : ['all']) as AudienceKey[],
                        scheduledDate: c.scheduled_date || null,
                        sentAt: c.sent_at || null,
                        status: c.status || 'sent',
                        content: c.content || '',
                        link: c.link || null,
                        imageUrl: c.image_url || null,
                        channels: Array.isArray(c.channels) ? c.channels : ['app', 'push'],
                        priority: c.priority || 'normal',
                        sentCount: Number(c.sent_count) || 0,
                        metadata: c.metadata || {},
                        createdAt: c.created_at,
                    }))
                );
            }

            if (tempRes.status === 'fulfilled' && !tempRes.value.error && Array.isArray(tempRes.value.data)) {
                setTemplates(
                    tempRes.value.data.map((t: any) => ({
                        id: t.id,
                        name: t.name,
                        title: t.title || t.subject || t.name,
                        content: t.content || '',
                        type: (t.type || 'promotional') as CampaignCategory,
                        targetAudiences: Array.isArray(t.target_audiences) && t.target_audiences.length > 0
                            ? t.target_audiences
                            : ['all'],
                        link: t.link || null,
                        imageUrl: t.image_url || null,
                        priority: t.priority || 'normal',
                        usageCount: Number(t.usage_count) || 0,
                        createdAt: t.created_at,
                    }))
                );
            }

            if (prodRes.status === 'fulfilled' && !prodRes.value.error && Array.isArray(prodRes.value.data)) {
                setProducts(
                    prodRes.value.data.map((p: any) => ({
                        id: String(p.id),
                        name: p.name,
                        price: Number(p.price) || 0,
                        originalPrice: p.original_price ? Number(p.original_price) : undefined,
                        discount: p.discount ? Number(p.discount) : undefined,
                        imageUrl: p.cover_image || p.image_url || undefined,
                        category: p.category || undefined,
                    }))
                );
            }

            // Compute real live counts for the 4 audiences
            const docStaffSet = new Set<string>();
            const labSet = new Set<string>();
            const supplierSet = new Set<string>();
            const patientSet = new Set<string>();

            if (profRes.status === 'fulfilled' && Array.isArray(profRes.value.data)) {
                for (const p of profRes.value.data as any[]) {
                    if (!p?.id) continue;
                    if (p.role === 'doctor' || p.role === 'staff') docStaffSet.add(p.id);
                    else if (p.role === 'laboratory' || p.role === 'lab') labSet.add(p.id);
                    else if (p.role === 'supplier') supplierSet.add(p.id);
                    else if (p.role === 'patient') patientSet.add(p.id);
                }
            }
            if (staffRes.status === 'fulfilled' && Array.isArray(staffRes.value.data)) {
                for (const s of staffRes.value.data as any[]) {
                    if (s.status && !['active', 'on_leave'].includes(s.status)) continue;
                    if (s.user_id) docStaffSet.add(s.user_id);
                    if (s.auth_user_id) docStaffSet.add(s.auth_user_id);
                }
            }

            const allSet = new Set<string>([...docStaffSet, ...labSet, ...supplierSet, ...patientSet]);
            const pushTokensCount =
                tokensRes.status === 'fulfilled' && typeof tokensRes.value.count === 'number'
                    ? tokensRes.value.count
                    : 0;

            setAudienceCounts({
                doctor_staff: docStaffSet.size,
                laboratory: labSet.size,
                supplier: supplierSet.size,
                patient: patientSet.size,
                all: allSet.size,
                pushTokensCount,
            });
        } catch (err) {
            console.error('Error fetching notification data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const sendOrScheduleCampaign = async (input: SendCampaignInput) => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            const senderId = userData.user?.id || null;
            const audiences = input.targetAudiences.length > 0 ? input.targetAudiences : ['all' as AudienceKey];
            const scheduledIso = input.scheduledDate ? new Date(input.scheduledDate).toISOString() : null;

            const { data: result, error } = await supabase.rpc('send_campaign_notifications', {
                p_title: input.title,
                p_message: input.content,
                p_target_role: audiences.includes('all') ? 'all' : audiences[0],
                p_type: input.type || 'promotional',
                p_link: input.link || null,
                p_sender_id: senderId,
                p_target_audiences: audiences,
                p_scheduled_date: scheduledIso,
                p_priority: input.priority || 'normal',
                p_image_url: input.imageUrl || null,
                p_metadata: input.metadata || {},
                p_channels: input.channels || ['app', 'push'],
            });

            if (error) throw error;
            if (result && result.success === false) {
                throw new Error(result.error || 'فشل إرسال الإشعار');
            }

            if (Array.isArray(result?.notification_ids) && result.notification_ids.length > 0) {
                triggerPushEdgeFunction({ notification_ids: result.notification_ids });
            }

            await fetchNotificationData();
            return {
                success: true,
                scheduled: Boolean(result?.scheduled),
                sentCount: Number(result?.sent_count || 0),
            };
        } catch (err: any) {
            console.error('Error sending/scheduling campaign:', err);
            return {
                success: false,
                scheduled: false,
                sentCount: 0,
                error: err?.message || 'حدث خطأ أثناء إرسال الإشعار',
            };
        }
    };

    const dispatchCampaignNow = async (campaignId: string) => {
        try {
            const { data, error } = await supabase.rpc('dispatch_campaign_now', {
                p_campaign_id: campaignId,
            });
            if (error) throw error;
            if (data && data.success === false) throw new Error(data.error);

            if (Array.isArray(data?.notification_ids) && data.notification_ids.length > 0) {
                triggerPushEdgeFunction({ notification_ids: data.notification_ids });
            }

            await fetchNotificationData();
            return { success: true, sentCount: Number(data?.sent_count || 0) };
        } catch (err: any) {
            console.error('Error dispatching campaign now:', err);
            return { success: false, sentCount: 0, error: err?.message };
        }
    };

    const runScheduledAndRemindersNow = async () => {
        try {
            const { data, error } = await supabase.rpc('process_due_notifications_and_reminders');
            if (error) throw error;
            const schedIds: string[] = data?.scheduled?.notification_ids || [];
            const remIds: string[] = data?.reminders?.notification_ids || [];
            const allIds = [...schedIds, ...remIds].filter(Boolean);
            if (allIds.length > 0) {
                triggerPushEdgeFunction({ notification_ids: allIds });
            }
            await fetchNotificationData();
            return {
                success: true,
                dispatchedCampaigns: Number(data?.scheduled?.dispatched_campaigns || 0),
                sentReminders: Number(data?.reminders?.sent_reminders || 0),
            };
        } catch (err: any) {
            console.error('Error processing scheduled notifications:', err);
            return { success: false, dispatchedCampaigns: 0, sentReminders: 0 };
        }
    };

    const deleteCampaign = async (id: string) => {
        try {
            const { error } = await supabase.from('notification_campaigns').delete().eq('id', id);
            if (error) throw error;
            setCampaigns((prev) => prev.filter((c) => c.id !== id));
            return true;
        } catch (err) {
            console.error('Error deleting campaign:', err);
            return false;
        }
    };

    const saveTemplate = async (data: {
        name: string;
        title: string;
        content: string;
        type: CampaignCategory;
        targetAudiences: AudienceKey[];
        link?: string | null;
        imageUrl?: string | null;
        priority?: 'low' | 'normal' | 'high' | 'urgent';
    }) => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            const { error } = await supabase.from('notification_templates').insert([
                {
                    name: data.name,
                    title: data.title,
                    content: data.content,
                    type: data.type,
                    target_audiences: data.targetAudiences.length > 0 ? data.targetAudiences : ['all'],
                    link: data.link || null,
                    image_url: data.imageUrl || null,
                    priority: data.priority || 'normal',
                    is_active: true,
                    created_by: userData.user?.id || null,
                },
            ]);
            if (error) throw error;
            await fetchNotificationData();
            return true;
        } catch (err) {
            console.error('Error saving template:', err);
            return false;
        }
    };

    const incrementTemplateUsage = async (id: string) => {
        try {
            const target = templates.find((t) => t.id === id);
            if (!target) return;
            await supabase
                .from('notification_templates')
                .update({ usage_count: (target.usageCount || 0) + 1 })
                .eq('id', id);
        } catch {}
    };

    const deleteTemplate = async (id: string) => {
        try {
            const { error } = await supabase.from('notification_templates').delete().eq('id', id);
            if (error) throw error;
            setTemplates((prev) => prev.filter((t) => t.id !== id));
            return true;
        } catch (err) {
            console.error('Error deleting template:', err);
            return false;
        }
    };

    useEffect(() => {
        fetchNotificationData();
    }, [fetchNotificationData]);

    return {
        campaigns,
        templates,
        products,
        audienceCounts,
        loading,
        sendOrScheduleCampaign,
        dispatchCampaignNow,
        runScheduledAndRemindersNow,
        deleteCampaign,
        saveTemplate,
        incrementTemplateUsage,
        deleteTemplate,
        refresh: fetchNotificationData,
    };
}
