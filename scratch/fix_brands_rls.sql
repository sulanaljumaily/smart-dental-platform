-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins update brands" ON public.brands;
DROP POLICY IF EXISTS "Admins delete brands" ON public.brands;

-- Create update policy for admins
CREATE POLICY "Admins update brands" ON public.brands
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Create delete policy for admins
CREATE POLICY "Admins delete brands" ON public.brands
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
