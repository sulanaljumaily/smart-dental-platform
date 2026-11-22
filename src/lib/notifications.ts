import { supabase } from './supabase';
import { triggerPushEdgeFunction } from './pushNotifications';

export type NotificationType =
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
    | 'like'
    | 'comment'
    | 'follow'
    | 'reply'
    | 'group_approve'
    | 'group_request';

export interface NotificationPayload {
    target_user_id?: string; // If targeting specific user
    clinic_id?: string;      // If targeting a clinic
    laboratory_id?: string;  // If targeting a lab
    actor_id?: string;       // Who triggered it
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    image_url?: string;
    priority?: 'low' | 'normal' | 'high';
    metadata?: any;
}

/**
 * Sends a notification to a user, clinic, lab, or specific role and dispatches Push.
 */
export const sendNotification = async (payload: NotificationPayload) => {
    try {
        const dbPayload: any = {
            type: payload.type,
            title: payload.title,
            message: payload.message,
            is_read: false,
            read: false,
            created_at: new Date().toISOString()
        };

        if (payload.target_user_id) dbPayload.user_id = payload.target_user_id;
        if (payload.clinic_id) dbPayload.clinic_id = payload.clinic_id;
        if (payload.laboratory_id) dbPayload.laboratory_id = payload.laboratory_id;
        if (payload.actor_id) dbPayload.actor_id = payload.actor_id;
        if (payload.link) dbPayload.link = payload.link;
        if (payload.image_url) dbPayload.image_url = payload.image_url;
        if (payload.priority) dbPayload.priority = payload.priority;
        if (payload.metadata) dbPayload.metadata = payload.metadata;

        const { data, error } = await supabase
            .from('notifications')
            .insert(dbPayload)
            .select('id')
            .maybeSingle();

        if (error) {
            console.error('Supabase error sending notification:', error);
            throw error;
        }

        if (data?.id) {
            triggerPushEdgeFunction({ notification_ids: [data.id] });
        }

        return true;
    } catch (error) {
        console.error('Failed to send notification:', error);
        return false;
    }
};

/**
 * Sends a notification to all users of a specific role or audience list.
 * Uses the upgraded `send_campaign_notifications` RPC + triggers FCM Push.
 */
export const sendRoleNotification = async (
    role: 'all' | 'doctor' | 'doctor_staff' | 'supplier' | 'laboratory' | 'patient' | 'admin',
    title: string,
    message: string,
    link?: string,
    type: NotificationType = 'system'
) => {
    try {
        const senderId = (await supabase.auth.getUser()).data.user?.id || null;
        const { data, error } = await supabase.rpc('send_campaign_notifications', {
            p_title: title,
            p_message: message,
            p_target_role: role,
            p_type: type,
            p_link: link || null,
            p_sender_id: senderId
        });

        if (error) throw error;

        if (Array.isArray(data?.notification_ids) && data.notification_ids.length > 0) {
            triggerPushEdgeFunction({ notification_ids: data.notification_ids });
        }

        return data;
    } catch (error) {
        console.error('Failed to send role notification:', error);
        return false;
    }
};
