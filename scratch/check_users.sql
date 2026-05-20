-- Check profiles for the given emails
SELECT id, email, full_name, role, phone, created_at FROM profiles WHERE email IN ('mzhersabah4@gmail.com', 'mzheralhabeeb98@gmail.com');

-- Check clinics where the owner is one of these profiles
SELECT id, name, owner_id, created_at FROM clinics WHERE owner_id IN (
    SELECT id FROM profiles WHERE email IN ('mzhersabah4@gmail.com', 'mzheralhabeeb98@gmail.com')
);
