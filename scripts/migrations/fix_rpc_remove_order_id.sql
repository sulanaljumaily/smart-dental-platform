-- Migration: Remove non-existent order_id from get_lab_conversations RPC

CREATE OR REPLACE FUNCTION get_lab_conversations(p_user_id UUID)
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(row_to_json(c.*)), '[]'::jsonb)
        FROM (
            SELECT 
                lc.id AS conversation_id,
                cl.name AS clinic_name,
                s.full_name AS doctor_name, 
                lc.last_message AS last_message_content, -- Aliased back to last_message
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

-- Also fix create_conversation_for_order to remove order_id insert which fails
CREATE OR REPLACE FUNCTION create_conversation_for_order(p_order_id UUID, p_staff_id INTEGER)
RETURNS BIGINT AS $$
DECLARE
    v_lab_id UUID;
    v_lab_user_id UUID;
    v_clinic_id INTEGER;
    v_conv_id BIGINT;
BEGIN
    SELECT laboratory_id, clinic_id INTO v_lab_id, v_clinic_id FROM dental_lab_orders WHERE id = p_order_id;
    SELECT owner_id INTO v_lab_user_id FROM dental_laboratories WHERE id = v_lab_id;
    
    -- Check if general conversation already exists between clinic and lab to avoid duplicates
    SELECT id INTO v_conv_id 
    FROM lab_chat_conversations 
    WHERE clinic_id = v_clinic_id AND lab_id = v_lab_user_id
    LIMIT 1;

    IF v_conv_id IS NULL THEN
        -- Omitted order_id from insert payload
        INSERT INTO lab_chat_conversations (staff_id, lab_id, clinic_id, conversation_type)
        VALUES (p_staff_id, v_lab_user_id, v_clinic_id, 'clinic')
        RETURNING id INTO v_conv_id;
    END IF;

    RETURN v_conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
