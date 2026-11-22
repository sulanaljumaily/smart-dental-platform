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
let usedOfflineAuthFallback = false
const CIRCUIT_BREAKER_MS = 5000
const activeControllers = new Set<AbortController>()

// In-process single-flight mutex for Supabase Auth (avoids navigator.locks AbortError storms
// while STILL preventing concurrent refresh_token rotation races on app reopen!)
let authLockChain: Promise<unknown> = Promise.resolve()
function inMemoryAuthLock<T>(_name: string, _acquireTimeout: number, fn: () => Promise<T>): Promise<T> {
  const next = authLockChain.then(
    () => fn(),
    () => fn()
  )
  authLockChain = next.then(
    () => undefined,
    () => undefined
  )
  return next
}

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

function isJwtExpired(token?: string | null, bufferSeconds = 45): boolean {
  if (!token || typeof token !== 'string') return true
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return true
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const payload = JSON.parse(atob(padded))
    if (typeof payload?.exp !== 'number') return false
    return payload.exp <= Math.floor(Date.now() / 1000) + bufferSeconds
  } catch {
    return false
  }
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
    usedOfflineAuthFallback = true
    const nowSec = Math.floor(Date.now() / 1000)
    // Short synthetic expiry (15s) so session survives while offline WITHOUT tricking
    // Supabase into reusing an expired JWT once internet returns!
    const offlineSession = {
      ...storedSession,
      expires_in: 15,
      expires_at: nowSec + 15,
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
    if (isAuthRequest && response.ok) {
      usedOfflineAuthFallback = false
    }
    return response
  } catch (err: any) {
    if (timedOut || (err?.name !== 'AbortError' && !existingSignal?.aborted)) {
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
        // Single-flight in-memory mutex: prevents both navigator.locks AbortErrors AND concurrent refresh-token races
        lock: inMemoryAuthLock,
      },
      global: {
        fetch: offlineAwareFetch,
      },
    }
  )
}

export const supabase: SupabaseClient = (globalThis as any)[GLOBAL_KEY]

// Single-flight session freshness verifier called before online DB fetches & upon reconnect
let inflightSessionCheck: Promise<boolean> | null = null

export async function ensureFreshOnlineSession(forceRefresh = false): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false
  if (inflightSessionCheck && !forceRefresh) return inflightSessionCheck

  const run = async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        return false
      }

      const needsRefresh =
        forceRefresh ||
        usedOfflineAuthFallback ||
        isJwtExpired(session.access_token, 60)

      if (needsRefresh && session.refresh_token) {
        const { data: refreshed, error } = await supabase.auth.refreshSession({
          refresh_token: session.refresh_token,
        })
        if (!error && refreshed?.session?.access_token) {
          usedOfflineAuthFallback = false
          return true
        }
        // Fallback: if refresh failed transiently, only proceed if current JWT is still cryptographically valid
        return !isJwtExpired(session.access_token, 5)
      }

      return !isJwtExpired(session.access_token, 5)
    } catch {
      return false
    } finally {
      inflightSessionCheck = null
    }
  }

  inflightSessionCheck = run()
  return inflightSessionCheck
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    resetSupabaseNetworkState()
    // Wait briefly for OS network interface to settle, refresh expired JWT cleanly, THEN notify all hooks!
    await new Promise(resolve => setTimeout(resolve, 350))
    if (!navigator.onLine) return
    await ensureFreshOnlineSession(usedOfflineAuthFallback)
    window.dispatchEvent(new CustomEvent('dental-online-ready'))
  })
  window.addEventListener('offline', () => {
    abortAllActiveRequestsOnOffline()
  })
}

// Export tables type helper if needed
export type Tables = any;
