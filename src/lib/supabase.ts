import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Fallback to public client credentials when building in CI environments without .env
const DEFAULT_SUPABASE_URL = 'https://nhueyaeyutfmadbgghfe.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odWV5YWV5dXRmbWFkYmdnaGZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MzcwNTYsImV4cCI6MjA4NDQxMzA1Nn0.56MIbpOtVu9b_fwEyo-hvlxGxA_E5c-nU7q1MSfTg-g'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY

// Use globalThis to survive Vite HMR (prevents duplicate clients on hot-reload)
const GLOBAL_KEY = '__supabase_client__' as const

// Short circuit-breaker for dead Wi-Fi connections (where navigator.onLine is still true)
let lastNetworkTimeoutAt = 0
const CIRCUIT_BREAKER_MS = 30000
const activeControllers = new Set<AbortController>()

function tripOfflineCircuitBreaker() {
  lastNetworkTimeoutAt = Date.now()
  for (const ctrl of activeControllers) {
    try {
      ctrl.abort()
    } catch {}
  }
  activeControllers.clear()
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    lastNetworkTimeoutAt = 0
  })
  window.addEventListener('offline', () => {
    tripOfflineCircuitBreaker()
  })
}

function getStoredSupabaseSession(): any | null {
  if (typeof localStorage === 'undefined') return null
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
        const raw = localStorage.getItem(k)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed && parsed.access_token && parsed.user) {
            return parsed
          }
        }
      }
    }
  } catch {
    // ignore storage errors
  }
  return null
}

function buildOfflineAuthResponse(urlStr: string): Response | null {
  const storedSession = getStoredSupabaseSession()
  if (!storedSession) return null

  if (urlStr.includes('/auth/v1/token')) {
    const nowSec = Math.floor(Date.now() / 1000)
    const offlineSession = {
      ...storedSession,
      expires_in: 3600,
      expires_at: nowSec + 3600,
    }
    return new Response(JSON.stringify(offlineSession), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (urlStr.includes('/auth/v1/user')) {
    return new Response(JSON.stringify(storedSession.user), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return null
}

const offlineAwareFetch: typeof fetch = async (input, init) => {
  const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

  // 1. Immediate 0ms fail-fast when browser reports offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const authFallback = buildOfflineAuthResponse(urlStr)
    if (authFallback) return authFallback
    throw new TypeError('Failed to fetch (Offline)')
  }

  // 2. If dead Wi-Fi was just detected within CIRCUIT_BREAKER_MS, fail fast so parallel hooks don't hang
  if (lastNetworkTimeoutAt > 0 && Date.now() - lastNetworkTimeoutAt < CIRCUIT_BREAKER_MS) {
    const authFallback = buildOfflineAuthResponse(urlStr)
    if (authFallback) return authFallback
    throw new TypeError('Failed to fetch (Network Unreachable)')
  }

  // 3. Enforce a fast timeout so Android/Windows/iOS never hang on weak/dead connections
  const isHeavyRequest = urlStr.includes('/storage/v1/') || urlStr.includes('/functions/v1/')
  const timeoutMs = isHeavyRequest ? 8000 : 2200

  const controller = new AbortController()
  activeControllers.add(controller)
  const existingSignal = init?.signal
  let timedOut = false

  const onExistingAbort = () => controller.abort()
  if (existingSignal) {
    if (existingSignal.aborted) {
      controller.abort()
    } else {
      existingSignal.addEventListener('abort', onExistingAbort, { once: true })
    }
  }

  const timer = setTimeout(() => {
    timedOut = true
    tripOfflineCircuitBreaker()
  }, timeoutMs)

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    })
    lastNetworkTimeoutAt = 0
    return response
  } catch (err: any) {
    if (timedOut || (err?.name !== 'AbortError' && !existingSignal?.aborted)) {
      tripOfflineCircuitBreaker()
      const authFallback = buildOfflineAuthResponse(urlStr)
      if (authFallback) return authFallback
      if (timedOut) {
        throw new TypeError('Failed to fetch (Network Timeout)')
      }
    } else if (lastNetworkTimeoutAt > 0 && !existingSignal?.aborted) {
      // Aborted by circuit breaker from another parallel request timing out
      const authFallback = buildOfflineAuthResponse(urlStr)
      if (authFallback) return authFallback
      throw new TypeError('Failed to fetch (Network Unreachable)')
    }
    throw err
  } finally {
    clearTimeout(timer)
    activeControllers.delete(controller)
    if (existingSignal) {
      existingSignal.removeEventListener('abort', onExistingAbort)
    }
  }
}

if (!(globalThis as any)[GLOBAL_KEY]) {
  (globalThis as any)[GLOBAL_KEY] = createClient(
    supabaseUrl || '',
    supabaseAnonKey || '',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // CRITICAL FIX: Bypass navigator.locks which causes AbortError storms
        lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
          return await fn()
        },
      },
      global: {
        fetch: offlineAwareFetch,
      },
    }
  )
}

export const supabase: SupabaseClient = (globalThis as any)[GLOBAL_KEY]

// Export tables type helper if needed
export type Tables = any;
