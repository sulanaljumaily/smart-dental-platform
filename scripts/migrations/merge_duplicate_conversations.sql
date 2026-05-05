-- Migration: Merge duplicate clinic-to-lab conversations and migrate messages

DO $$
DECLARE
    v_record RECORD;
    v_keep_id BIGINT;
BEGIN
    RAISE NOTICE 'Starting merge of duplicate conversations...';

    FOR v_record IN (
        SELECT clinic_id, lab_id, COUNT(*) 
        FROM lab_chat_conversations 
        WHERE clinic_id IS NOT NULL AND lab_id IS NOT NULL
        GROUP BY clinic_id, lab_id 
        HAVING COUNT(*) > 1
    ) LOOP
        -- Get the ID to keep (the one with the latest last_message_date or highest id)
        SELECT id INTO v_keep_id
        FROM lab_chat_conversations
        WHERE clinic_id = v_record.clinic_id AND lab_id = v_record.lab_id
        ORDER BY last_message_date DESC NULLS LAST, id DESC
        LIMIT 1;

        RAISE NOTICE 'Merging for clinic_id % and lab_id %, keeping conversation_id %', v_record.clinic_id, v_record.lab_id, v_keep_id;

        -- 1. Update messages to point to the KEPT conversation
        UPDATE lab_chat_messages
        SET conversation_id = v_keep_id
        WHERE conversation_id IN (
            SELECT id FROM lab_chat_conversations
            WHERE clinic_id = v_record.clinic_id AND lab_id = v_record.lab_id AND id != v_keep_id
        );

        -- 2. Delete duplicate conversations
        DELETE FROM lab_chat_conversations
        WHERE clinic_id = v_record.clinic_id AND lab_id = v_record.lab_id AND id != v_keep_id;

    END LOOP;

    RAISE NOTICE 'Merge complete!';
END $$;
