BEGIN;
INSERT INTO clinics (name, owner_id, phone, address, governorate) 
VALUES ('عيادة تجريبية', 'cd079a40-ebf2-46a7-bc19-def2b6fac70b', '07700000000', 'شارع فلسطين', 'بغداد');
ROLLBACK;
