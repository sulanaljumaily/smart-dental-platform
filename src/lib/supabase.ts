import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Fallback to public client credentials when building in CI environments without .env
const DEFAULT_SUPABASE_URL = 'https://nhueyaeyutfmadbgghfe.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odWV5YWV5dXRmbWFkYmdnaGZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MzcwNTYsImV4cCI6MjA4NDQxMzA1Nn0.56MIbpOtVu9b_fwEyo-hvlxGxA_E5c-nU7q1MSfTg-g'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY

// Use globalThis to survive Vite HMR (prevents duplicate clients on hot-reload)
const GLOBAL_KEY = '__supabase_client__' as const

// Smart short circuit-breaker ONLY for truly dead Wi-Fi (multiple consecutive network failures)
let lastNetworkFailureAt = 0
let consecutiveNetworkFailures = 0
const CIRCUIT_BREAKER_MS = 5000
const activeControllers = new Set<AbortController>()

export function resetSupabaseNetworkState() {
  lastNetworkFailureAt = 0
  consecutiveNetworkFailures = 0
}

function abortAllActiveRequestsOnOffline() {
  lastNetworkFailureAt = Date.now()
  consecutiveNetworkFailures = 3
  for (const ctrl of activeControllers) {
    try {
      ctrl.abort()
    } catch {}
  }
  activeControllers.clear()
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    resetSupabaseNetworkState()
  })
  window.addEventListener('offline', () => {
    abortAllActiveRequestsOnOffline()
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
  const isStorageRequest = urlStr.includes('/storage/v1/')
  const isFunctionRequest = urlStr.includes('/functions/v1/')
  const isAuthRequest = urlStr.includes('/auth/v1/')

  // 1. Immediate 0ms fail-fast when browser reports offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const authFallback = buildOfflineAuthResponse(urlStr)
    if (authFallback) return authFallback
    throw new TypeError('Failed to fetch (Offline)')
  }

  // 2. Short circuit-breaker ONLY for REST queries after 3 consecutive network failures (never blocks auth or storage uploads)
  if (
    !isStorageRequest &&
    !isAuthRequest &&
    consecutiveNetworkFailures >= 3 &&
    lastNetworkFailureAt > 0 &&
    Date.now() - lastNetworkFailureAt < CIRCUIT_BREAKER_MS
  ) {
    throw new TypeError('Failed to fetch (Network Unreachable)')
  }

  // 3. Healthy timeouts per request type so uploads (.exe/.msi/.apk) and DB queries never time out prematurely
  const timeoutMs = isStorageRequest
    ? 300000 // 5 minutes for large file uploads (.exe, .msi, .apk, X-rays)
    : isFunctionRequest
      ? 60000 // 60s for Edge Functions / AI
      : isAuthRequest
        ? 15000 // 15s for auth/session
        : 12000 // 12s for normal DB queries (patients, appointments, finance)

  const controller = new AbortController()
  if (!isStorageRequest) {
    activeControllers.add(controller)
  }
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
    controller.abort()
  }, timeoutMs)

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    })
    resetSupabaseNetworkState()
    return response
  } catch (err: any) {
    if (timedOut || (err?.name !== 'AbortError' && !existingSignal?.aborted)) {
      // Only count pure REST/auth connectivity errors toward the short circuit-breaker (never storage uploads or edge functions)
      if (!isStorageRequest && !isFunctionRequest) {
        consecutiveNetworkFailures += 1
        lastNetworkFailureAt = Date.now()
      }
      const authFallback = buildOfflineAuthResponse(urlStr)
      if (authFallback) return authFallback
      if (timedOut) {
        throw new TypeError('Failed to fetch (Network Timeout)')
      }
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
