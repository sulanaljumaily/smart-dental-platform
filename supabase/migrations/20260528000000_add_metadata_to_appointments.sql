-- Migration to add metadata to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{"calls": [], "reminders": []}'::jsonb;
