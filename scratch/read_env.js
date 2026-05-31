const { createClient } = require('@supabase/supabase-base'); // wait, let's check how supabase is imported in node.
// Actually, we can just use the public REST API or use standard fetch since supabase client uses fetch!
// Let's read .env file first to get Supabase URL and Key!
