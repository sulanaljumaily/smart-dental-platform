-- Migration: Create clinic departments and inventory movements tables
-- Description: Supports Plan 1 for Inventory Custody, Material Dispensing Logs, and Clinic Department Management

-- 1. Create clinic_departments table
CREATE TABLE IF NOT EXISTS public.clinic_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id BIGINT NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinic_departments_clinic_id ON public.clinic_departments(clinic_id);

-- Enable RLS
ALTER TABLE public.clinic_departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to clinic departments" ON public.clinic_departments;
CREATE POLICY "Allow all access to clinic departments" ON public.clinic_departments
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 2. Create inventory_movements table
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id BIGINT NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    item_id BIGINT NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL DEFAULT 'out', -- 'in' (توريد/شراء), 'out' (صرف استهلاك), 'adjustment' (تسوية)
    quantity NUMERIC NOT NULL,
    unit_cost NUMERIC NOT NULL DEFAULT 0,
    total_cost NUMERIC NOT NULL DEFAULT 0,
    department_id UUID REFERENCES public.clinic_departments(id) ON DELETE SET NULL,
    recipient_id BIGINT REFERENCES public.staff(id) ON DELETE SET NULL,
    recorded_by_id BIGINT REFERENCES public.staff(id) ON DELETE SET NULL,
    recipient_name TEXT,
    recorder_name TEXT,
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_movements_clinic_id ON public.inventory_movements(clinic_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_item_id ON public.inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_created_at ON public.inventory_movements(created_at);

-- Enable RLS
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to inventory movements" ON public.inventory_movements;
CREATE POLICY "Allow all access to inventory movements" ON public.inventory_movements
    FOR ALL
    USING (true)
    WITH CHECK (true);
