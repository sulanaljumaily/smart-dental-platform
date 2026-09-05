import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Fallback to public client credentials when building in CI environments without .env
const DEFAULT_SUPABASE_URL = 'https://nhueyaeyutfmadbgghfe.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odWV5YWV5dXRmbWFkYmdnaGZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MzcwNTYsImV4cCI6MjA4NDQxMzA1Nn0.56MIbpOtVu9b_fwEyo-hvlxGxA_E5c-nU7q1MSfTg-g'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY

// Use globalThis to survive Vite HMR (prevents duplicate clients on hot-reload)
const GLOBAL_KEY = '__supabase_client__' as const

if (!(globalThis as any)[GLOBAL_KEY]) {
  (globalThis as any)[GLOBAL_KEY] = createClient(
    supabaseUrl || '',
    supabaseAnonKey || '',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // CRITICAL FIX: Bypass navigator.locks which causes AbortError storms
        // navigator.locks.request() fails with "signal is aborted without reason"
        // in React Strict Mode, Vite HMR, or when stale browser locks exist.
        // This passthrough lock is safe for single-tab apps.
        lock: async (name: string, acquireTimeout: number, fn: () => Promise<any>) => {
          return await fn()
        },
      }
    }
  )
}

export const supabase: SupabaseClient = (globalThis as any)[GLOBAL_KEY]

// Export tables type helper if needed
export type Tables = any;
