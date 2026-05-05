-- Migration: Add clinic_logo to get_lab_conversations RPC

CREATE OR REPLACE FUNCTION get_lab_conversations(p_user_id UUID)
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(row_to_json(c.*)), '[]'::jsonb)
        FROM (
            SELECT 
                lc.id AS conversation_id,
                cl.name AS clinic_name,
                cl.image_url AS clinic_logo, -- Add clinic image_url aliased as clinic_logo
                s.full_name AS doctor_name, 
                lc.last_message AS last_message_content, 
                lc.last_message_date,
                (
                    SELECT COUNT(*)
                    FROM lab_chat_messages msg
                    WHERE msg.conversation_id = lc.id
                      AND msg.sender_id != p_user_id
                      AND msg.is_read = FALSE
                ) AS unread_count,
                'clinic' AS type
            FROM lab_chat_conversations lc
            LEFT JOIN staff s ON lc.staff_id = s.id
            LEFT JOIN clinics cl ON lc.clinic_id = cl.id
            WHERE 
                lc.lab_id = p_user_id 
                OR lc.staff_id IN (SELECT id FROM staff WHERE auth_user_id = p_user_id)
                OR lc.clinic_id IN (
                    SELECT clinic_id FROM staff WHERE auth_user_id = p_user_id
                    UNION 
                    SELECT id FROM clinics WHERE owner_id = p_user_id
                )
            ORDER BY lc.last_message_date DESC NULLS LAST
        ) c
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
