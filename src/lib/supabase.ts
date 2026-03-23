import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Force Real DB - Disable Mock Fallback
const isMock = false;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase Environment Variables!')
  // Don't throw here to avoid crashing entire bundle on load, but log heavily
}

let client

// Always try to create client
try {
  if (supabaseUrl && supabaseAnonKey) {
    client = createClient(supabaseUrl, supabaseAnonKey)
  }
} catch (error) {
  console.error('Supabase client creation failed:', error)
}

if (client) {
  // Already created
} else {
  // Final attempt or fallback to null (which will cause errors in app, prompting fix of env vars)
  console.warn('Supabase client not initialized. Check environment variables.');
}

export const supabase = client || createClient(supabaseUrl || '', supabaseAnonKey || '');

// Export tables type helper if needed
export type Tables = any; 
