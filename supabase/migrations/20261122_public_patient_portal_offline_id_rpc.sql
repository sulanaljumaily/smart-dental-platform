-- Migration: Create get_public_patient_portal RPC supporting both numeric patient ID and permanent offline_id token
CREATE OR REPLACE FUNCTION public.get_public_patient_portal(
    p_clinic_id integer,
    p_patient_identifier text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_patient record;
    v_clinic jsonb;
    v_plans jsonb;
    v_transactions jsonb;
    v_appointments jsonb;
BEGIN
    IF p_patient_identifier ~ '^\d+$' THEN
        SELECT id, clinic_id, full_name, phone, age, gender, status, created_at, medical_history_data
        INTO v_patient
        FROM public.patients
        WHERE clinic_id = p_clinic_id
          AND deleted_at IS NULL
          AND (
              id = p_patient_identifier::integer
              OR medical_history_data->>'offline_id' = p_patient_identifier
          )
        LIMIT 1;
    ELSE
        SELECT id, clinic_id, full_name, phone, age, gender, status, created_at, medical_history_data
        INTO v_patient
        FROM public.patients
        WHERE clinic_id = p_clinic_id
          AND deleted_at IS NULL
          AND medical_history_data->>'offline_id' = p_patient_identifier
        LIMIT 1;
    END IF;

    IF v_patient.id IS NULL THEN
        RETURN jsonb_build_object('patient', null);
    END IF;

    SELECT to_jsonb(c)
    INTO v_clinic
    FROM (
        SELECT id, name, phone, address, image_url
        FROM public.clinics
        WHERE id = p_clinic_id
        LIMIT 1
    ) c;

    SELECT COALESCE(jsonb_agg(to_jsonb(tp) ORDER BY tp.created_at DESC), '[]'::jsonb)
    INTO v_plans
    FROM public.tooth_treatment_plans tp
    WHERE tp.patient_id = v_patient.id;

    SELECT COALESCE(jsonb_agg(to_jsonb(ft) ORDER BY ft.transaction_date DESC), '[]'::jsonb)
    INTO v_transactions
    FROM public.financial_transactions ft
    WHERE ft.patient_id = v_patient.id
      AND ft.type = 'income';

    SELECT COALESCE(jsonb_agg(to_jsonb(ap) ORDER BY ap.appointment_date DESC), '[]'::jsonb)
    INTO v_appointments
    FROM public.appointments ap
    WHERE ap.patient_id = v_patient.id;

    RETURN jsonb_build_object(
        'patient', to_jsonb(v_patient),
        'clinic', v_clinic,
        'treatmentPlans', v_plans,
        'transactions', v_transactions,
        'appointments', v_appointments
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_patient_portal(integer, text) TO anon, authenticated;
