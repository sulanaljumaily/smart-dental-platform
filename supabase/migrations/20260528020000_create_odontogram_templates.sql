-- Migration: Create odontogram_templates table for dental chart management
-- Timestamp: 20260528020000

CREATE TABLE IF NOT EXISTS public.odontogram_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tooth_number INT NOT NULL CHECK (
        (tooth_number BETWEEN 11 AND 18) OR
        (tooth_number BETWEEN 21 AND 28) OR
        (tooth_number BETWEEN 31 AND 38) OR
        (tooth_number BETWEEN 41 AND 48)
    ),
    state VARCHAR(50) NOT NULL CHECK (state IN (
        'healthy', 'decayed', 'broken', 'stained', 'abscess', 'impacted',
        'filled', 'endo', 'crown', 'bridge', 'implant', 'ortho'
    )),
    svg_content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT unique_tooth_state UNIQUE (tooth_number, state)
);

-- Enable RLS
ALTER TABLE public.odontogram_templates ENABLE ROW LEVEL SECURITY;

-- Public read (doctors/clinics can read templates)
DROP POLICY IF EXISTS "public_read_odontogram" ON public.odontogram_templates;
CREATE POLICY "public_read_odontogram"
    ON public.odontogram_templates FOR SELECT
    USING (true);

-- Admin full control
DROP POLICY IF EXISTS "admin_write_odontogram" ON public.odontogram_templates;
CREATE POLICY "admin_write_odontogram"
    ON public.odontogram_templates FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_odontogram_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_odontogram_updated_at ON public.odontogram_templates;
CREATE TRIGGER trg_odontogram_updated_at
    BEFORE UPDATE ON public.odontogram_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_odontogram_updated_at();

-- Notify schema cache reload
NOTIFY pgrst, 'reload schema';
