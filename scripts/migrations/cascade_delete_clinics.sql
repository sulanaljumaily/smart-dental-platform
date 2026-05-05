-- Migration: Alter all foreign keys referencing clinics to ON DELETE CASCADE
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT 
            tc.table_name,
            tc.constraint_name,
            kcu.column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE ccu.table_name = 'clinics' AND tc.constraint_type = 'FOREIGN KEY'
    ) LOOP
        RAISE NOTICE 'Updating constraint % on %', r.constraint_name, r.table_name;
        EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) || ' DROP CONSTRAINT ' || quote_ident(r.constraint_name);
        EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) || ' ADD CONSTRAINT ' || quote_ident(r.constraint_name) || 
                ' FOREIGN KEY (' || quote_ident(r.column_name) || ') REFERENCES clinics(id) ON DELETE CASCADE';
    END LOOP;
END $$;
