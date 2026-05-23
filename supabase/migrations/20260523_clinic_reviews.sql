-- =============================================
-- Migration: Create clinic_reviews table
-- Purpose: Store patient ratings and feedback submitted via the feedback widget
-- =============================================

CREATE TABLE IF NOT EXISTS public.clinic_reviews (
  id             BIGSERIAL PRIMARY KEY,
  clinic_id      INTEGER NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_name   TEXT,
  rating         INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment        TEXT,
  message_id     BIGINT,  -- links back to the direct_messages row that triggered this
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by clinic
CREATE INDEX IF NOT EXISTS idx_clinic_reviews_clinic_id ON public.clinic_reviews(clinic_id);

-- Index for fast lookup by patient
CREATE INDEX IF NOT EXISTS idx_clinic_reviews_patient ON public.clinic_reviews(patient_user_id);

-- Enable Row Level Security
ALTER TABLE public.clinic_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Clinic owner can read all reviews for their clinic
CREATE POLICY "clinic_owner_read_reviews"
  ON public.clinic_reviews FOR SELECT
  USING (
    clinic_id IN (
      SELECT id FROM public.clinics WHERE owner_id = auth.uid()
    )
  );

-- Policy: Authenticated patient can insert their own review
CREATE POLICY "patient_insert_review"
  ON public.clinic_reviews FOR INSERT
  WITH CHECK (patient_user_id = auth.uid());

-- Policy: Patient can read their own reviews
CREATE POLICY "patient_read_own_reviews"
  ON public.clinic_reviews FOR SELECT
  USING (patient_user_id = auth.uid());

-- Function to auto-update clinics.rating and clinics.reviews_count
CREATE OR REPLACE FUNCTION public.update_clinic_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating NUMERIC;
  review_count INTEGER;
BEGIN
  -- Recalculate average and count
  SELECT AVG(rating)::NUMERIC(3,2), COUNT(*)
  INTO avg_rating, review_count
  FROM public.clinic_reviews
  WHERE clinic_id = NEW.clinic_id;

  -- Update the clinics table
  UPDATE public.clinics
  SET
    rating        = avg_rating,
    reviews_count = review_count,
    updated_at    = NOW()
  WHERE id = NEW.clinic_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: runs after each new review insert
CREATE TRIGGER trg_update_clinic_rating
  AFTER INSERT ON public.clinic_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_clinic_rating();
