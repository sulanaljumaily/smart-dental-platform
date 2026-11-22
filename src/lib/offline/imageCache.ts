import { db } from './db';

// Built-in SVG Data URLs for offline fallback when an external image hasn't been cached yet
export const DEFAULT_OFFLINE_CLINIC_LOGO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0284c7"/>
          <stop offset="100%" stop-color="#1e3a8a"/>
        </linearGradient>
      </defs>
      <rect width="200" height="200" rx="40" fill="url(#g)"/>
      <path d="M100 44c-24 0-42 16-42 38 0 15 6 28 11 43 4 12 8 27 15 27 6 0 9-14 16-14s10 14 16 14c7 0 11-15 15-27 5-15 11-28 11-43 0-22-18-38-42-38z" fill="#ffffff" opacity="0.95"/>
    </svg>`
  );

export const DEFAULT_OFFLINE_CLINIC_COVER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="1200" height="400">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="50%" stop-color="#0c4a6e"/>
          <stop offset="100%" stop-color="#0284c7"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="400" fill="url(#bg)"/>
      <circle cx="1050" cy="80" r="220" fill="#38bdf8" opacity="0.12"/>
      <circle cx="150" cy="340" r="260" fill="#818cf8" opacity="0.12"/>
    </svg>`
  );

const memoryImageCache = new Map<string, string>();
const pendingDexieLookups = new Set<string>();

function notifyOfflineImageCached(storageKey: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('dental-offline-image-cached', { detail: { key: storageKey } })
    );
  }
}

// Preload cached clinic logos, covers, and user avatars from Dexie into memory on startup
if (typeof window !== 'undefined') {
  setTimeout(async () => {
    try {
      const items = await db.cache
        .filter(
          item =>
            typeof item.key === 'string' &&
            (item.key.startsWith('dental_clinic_logo_b64_') ||
              item.key.startsWith('dental_clinic_cover_b64_') ||
              item.key.startsWith('dental_user_avatar_b64_'))
        )
        .toArray();
      let loadedAny = false;
      for (const item of items) {
        if (typeof item.data === 'string' && item.data.startsWith('data:image/')) {
          if (!memoryImageCache.has(item.key)) {
            memoryImageCache.set(item.key, item.data);
            loadedAny = true;
          }
        }
      }
      if (loadedAny) {
        notifyOfflineImageCached('*');
      }
    } catch {}
  }, 50);
}

/**
 * Reads a cached Base64 image synchronously from memory or localStorage,
 * and falls back to warming memoryImageCache from Dexie if localStorage quota was exceeded.
 */
export function getCachedImageBase64(storageKey: string): string | null {
  if (!storageKey) return null;
  const mem = memoryImageCache.get(storageKey);
  if (mem) return mem;
  if (typeof localStorage !== 'undefined') {
    try {
      const val = localStorage.getItem(storageKey);
      if (val && val.startsWith('data:image/')) {
        memoryImageCache.set(storageKey, val);
        return val;
      }
    } catch {}
  }
  if (!pendingDexieLookups.has(storageKey)) {
    pendingDexieLookups.add(storageKey);
    db.cache
      .get(storageKey)
      .then(entry => {
        if (typeof entry?.data === 'string' && entry.data.startsWith('data:image/')) {
          memoryImageCache.set(storageKey, entry.data);
          notifyOfflineImageCached(storageKey);
        }
      })
      .catch(() => {})
      .finally(() => {
        pendingDexieLookups.delete(storageKey);
      });
  }
  return null;
}

/**
 * Converts a File or Blob directly into a compressed Base64 Data URL.
 */
export function fileOrBlobToBase64(
  blob: Blob,
  maxDim = 600,
  mimeType: 'image/png' | 'image/jpeg' = 'image/jpeg',
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const baseResult = typeof reader.result === 'string' ? reader.result : '';
      if (!baseResult) {
        reject(new Error('Empty reader result'));
        return;
      }
      if (!blob.type.startsWith('image/') || blob.type.includes('svg')) {
        resolve(baseResult);
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          let w = img.width || maxDim;
          let h = img.height || maxDim;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL(mimeType, quality));
            return;
          }
        } catch {}
        resolve(baseResult);
      };
      img.onerror = () => resolve(baseResult);
      img.src = baseResult;
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Downloads an image URL, compresses it to a Base64 Data URL, and persists it in localStorage + Dexie.
 */
export async function cacheRemoteImageAsBase64(
  storageKey: string,
  imageUrl?: string | null,
  options: { maxDim?: number; mimeType?: 'image/png' | 'image/jpeg'; quality?: number } = {}
): Promise<string | null> {
  if (!storageKey || !imageUrl || typeof imageUrl !== 'string') return getCachedImageBase64(storageKey);
  const rawUrl = imageUrl.trim();
  if (!rawUrl) return getCachedImageBase64(storageKey);

  if (rawUrl.startsWith('data:image/')) {
    memoryImageCache.set(storageKey, rawUrl);
    try {
      localStorage.setItem(storageKey, rawUrl);
    } catch {}
    db.cache
      .put({
        key: storageKey,
        data: rawUrl,
        cached_at: Date.now(),
        expires_at: Date.now() + 86400 * 365 * 1000,
      })
      .catch(() => {});
    return rawUrl;
  }

  const srcKey = `${storageKey}_src`;
  const existing = getCachedImageBase64(storageKey);
  if (existing) {
    try {
      if (localStorage.getItem(srcKey) === rawUrl) {
        return existing;
      }
    } catch {}
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (existing) return existing;
    try {
      const fromDexie = await db.cache.get(storageKey);
      if (typeof fromDexie?.data === 'string' && fromDexie.data.startsWith('data:image/')) {
        memoryImageCache.set(storageKey, fromDexie.data);
        return fromDexie.data;
      }
    } catch {}
    return null;
  }

  try {
    const response = await fetch(rawUrl, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) return existing || null;
    const blob = await response.blob();
    const dataUrl = await fileOrBlobToBase64(
      blob,
      options.maxDim || 320,
      options.mimeType || 'image/png',
      options.quality || 0.85
    );
    if (dataUrl && dataUrl.startsWith('data:image/')) {
      memoryImageCache.set(storageKey, dataUrl);
      try {
        localStorage.setItem(storageKey, dataUrl);
        localStorage.setItem(srcKey, rawUrl);
      } catch {}
      db.cache
        .put({
          key: storageKey,
          data: dataUrl,
          cached_at: Date.now(),
          expires_at: Date.now() + 86400 * 365 * 1000,
        })
        .catch(() => {});
      notifyOfflineImageCached(storageKey);
      return dataUrl;
    }
  } catch {
    return existing || null;
  }
  return existing || null;
}

// ── Specialized Helpers for Clinic Logo, Clinic Cover, and User Avatar ─────

export function getCachedClinicLogo(clinicId?: string | number | null): string | null {
  if (!clinicId) return null;
  return getCachedImageBase64(`dental_clinic_logo_b64_${clinicId}`);
}

export async function cacheClinicLogo(
  clinicId?: string | number | null,
  logoUrl?: string | null
): Promise<string | null> {
  if (!clinicId || !logoUrl) return getCachedClinicLogo(clinicId);
  const b64 = await cacheRemoteImageAsBase64(`dental_clinic_logo_b64_${clinicId}`, logoUrl, {
    maxDim: 240,
    mimeType: 'image/png',
    quality: 0.9,
  });
  if (b64) {
    try {
      localStorage.setItem('dental_clinic_logo_b64_last', b64);
    } catch {}
  }
  return b64;
}

export function getCachedClinicCover(clinicId?: string | number | null): string | null {
  if (!clinicId) return null;
  return getCachedImageBase64(`dental_clinic_cover_b64_${clinicId}`);
}

export async function cacheClinicCover(
  clinicId?: string | number | null,
  coverUrl?: string | null
): Promise<string | null> {
  if (!clinicId || !coverUrl) return getCachedClinicCover(clinicId);
  return cacheRemoteImageAsBase64(`dental_clinic_cover_b64_${clinicId}`, coverUrl, {
    maxDim: 720,
    mimeType: 'image/jpeg',
    quality: 0.78,
  });
}

export function getCachedUserAvatar(userId?: string | null): string | null {
  if (!userId) return null;
  return getCachedImageBase64(`dental_user_avatar_b64_${userId}`);
}

export async function cacheUserAvatar(
  userId?: string | null,
  avatarUrl?: string | null
): Promise<string | null> {
  if (!userId || !avatarUrl) return getCachedUserAvatar(userId);
  return cacheRemoteImageAsBase64(`dental_user_avatar_b64_${userId}`, avatarUrl, {
    maxDim: 220,
    mimeType: 'image/jpeg',
    quality: 0.85,
  });
}
