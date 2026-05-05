-- Migration: Replace doctor_id with staff_id in lab_chat_conversations

DO $$
BEGIN
    -- 1. Add staff_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lab_chat_conversations' AND column_name = 'staff_id'
    ) THEN
        ALTER TABLE lab_chat_conversations ADD COLUMN staff_id INTEGER REFERENCES staff(id);
    END IF;

    -- 2. Drop dependent RPCs to redefine them
    DROP FUNCTION IF EXISTS create_conversation_for_order(UUID, UUID);
    DROP FUNCTION IF EXISTS get_lab_conversations(UUID);

END $$;

-- 3. Redefine create_conversation_for_order to use p_staff_id
CREATE OR REPLACE FUNCTION create_conversation_for_order(p_order_id UUID, p_staff_id INTEGER)
RETURNS BIGINT AS $$
DECLARE
    v_lab_id UUID;
    v_lab_user_id UUID;
    v_clinic_id INTEGER;
    v_conv_id BIGINT;
BEGIN
    SELECT laboratory_id, clinic_id INTO v_lab_id, v_clinic_id
    FROM dental_lab_orders
    WHERE id = p_order_id;
    
    SELECT owner_id INTO v_lab_user_id
    FROM dental_laboratories
    WHERE id = v_lab_id;
    
    SELECT id INTO v_conv_id
    FROM lab_chat_conversations
    WHERE order_id = p_order_id
    LIMIT 1;

    IF v_conv_id IS NULL THEN
        INSERT INTO lab_chat_conversations (staff_id, lab_id, order_id, clinic_id, conversation_type)
        VALUES (p_staff_id, v_lab_user_id, p_order_id, v_clinic_id, 'order')
        RETURNING id INTO v_conv_id;
    END IF;

    RETURN v_conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Redefine get_lab_conversations RPC to join staff instead of profiles
CREATE OR REPLACE FUNCTION get_lab_conversations(p_user_id UUID)
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(row_to_json(c.*)), '[]'::jsonb)
        FROM (
            SELECT 
                lc.id AS conversation_id,
                cl.name AS clinic_name,
                s.full_name AS doctor_name, -- Joins staff now
                d.order_number,
                lc.last_message_content,
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
            LEFT JOIN staff s ON lc.staff_id = s.id -- Left join staff
            LEFT JOIN clinics cl ON lc.clinic_id = cl.id
            LEFT JOIN dental_lab_orders d ON lc.order_id = d.id
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

-- 5. Update RLS policies for lab_chat_conversations
DROP POLICY IF EXISTS "Chat participants access" ON "public"."lab_chat_conversations";
CREATE POLICY "Chat participants access" ON "public"."lab_chat_conversations"
FOR ALL USING (
    lab_id = auth.uid() 
    OR staff_id IN (SELECT id FROM staff WHERE auth_user_id = auth.uid())
    OR clinic_id IN (
        SELECT clinic_id FROM staff WHERE auth_user_id = auth.uid()
        UNION
        SELECT id FROM clinics WHERE owner_id = auth.uid()
    )
);
