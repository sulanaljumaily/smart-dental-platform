const { Client } = require('pg');

const DB_CONFIG = {
    user: 'postgres.nhueyaeyutfmadbgghfe',
    password: '10770$ULTAn0770',
    host: 'aws-1-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
};

const sql = `
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

ALTER TABLE public.odontogram_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_odontogram" ON public.odontogram_templates;
CREATE POLICY "public_read_odontogram"
    ON public.odontogram_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_write_odontogram" ON public.odontogram_templates;
CREATE POLICY "admin_write_odontogram"
    ON public.odontogram_templates FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
`;

const run = async () => {
    const client = new Client(DB_CONFIG);
    try {
        console.log('Connecting to PostgreSQL database...');
        await client.connect();
        console.log('Connected! Executing migration for odontogram_templates...');
        await client.query(sql);
        console.log('✅ Migration applied successfully!');
    } catch (err) {
        console.error('❌ Error applying migration:', err.message);
    } finally {
        await client.end();
        console.log('Connection closed.');
    }
};

run();
