/**
 * Centralized Cache & Memory Management for OneGitVault Android.
 * - Retention / auto-clear policy: clears cache after 30 days OR 250 MB total cache, whichever comes first
 * - Tracks both Web Storage caches (API/README/releases/translations) and native Android WebView disk cache
 * - Enforces bounded LRU caps on in-memory Maps and handles QuotaExceededError without touching user data
 */

const TEMPORARY_CACHE_PREFIXES = [
  'ogv_repo_cache_',
  'ogv_trending_',
  'ogv_gql_repo_',
  'ogv_rel_',
  'ogv_readme_',
  'ogv_cached_starred_repos_',
  'ogv_cached_watched_repos_',
  'ogv_user_repos_',
  'ogv_release_notes_',
  'ogv_seen_spotlight_',
  'ogv_vault_release_radar_',
];

const SESSION_TRANSLATION_PREFIX = 'ogv_tr_';
const CACHE_CYCLE_KEY = 'ogv_cache_cycle_started_at';

export const MAX_CACHE_AGE_DAYS = 30;
export const MAX_CACHE_AGE_MS = MAX_CACHE_AGE_DAYS * 24 * 60 * 60 * 1000; // 30 days
export const MAX_CACHE_BYTES = 250 * 1024 * 1024; // 250 MB
const MAX_SESSION_TRANSLATION_ENTRIES = 30;

type MemoryCleaner = (clearAll: boolean) => void;
const memoryCleaners = new Set<MemoryCleaner>();

export function registerMemoryCacheCleaner(cleaner: MemoryCleaner): void {
  memoryCleaners.add(cleaner);
}

/**
 * Bounded LRU-style Map insertion: refreshes key order and evicts oldest entries above maxEntries.
 */
export function setBoundedMapEntry<T>(
  map: Map<string, T>,
  key: string,
  value: T,
  maxEntries: number = 40
): void {
  if (map.has(key)) {
    map.delete(key);
  }
  map.set(key, value);
  while (map.size > maxEntries) {
    const oldestKey = map.keys().next().value;
    if (oldestKey === undefined) break;
    map.delete(oldestKey);
  }
}

function isTemporaryCacheKey(key: string): boolean {
  return TEMPORARY_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function estimateStorageBytes(key: string, value: string): number {
  return (key.length + value.length) * 2; // UTF-16 code units in WebView storage
}

function getNativeCacheBytes(): number {
  try {
    const bridge = (window as any).AndroidThemeBridge;
    if (bridge && typeof bridge.getNativeCacheBytes === 'function') {
      const val = Number(bridge.getNativeCacheBytes());
      return Number.isFinite(val) && val > 0 ? val : 0;
    }
  } catch {}
  return 0;
}

function clearNativeWebViewCache(): void {
  try {
    const bridge = (window as any).AndroidThemeBridge;
    if (bridge && typeof bridge.clearNativeCache === 'function') {
      bridge.clearNativeCache();
    }
  } catch {}
}

function getCacheCycleStart(): number {
  const now = Date.now();
  try {
    const raw = localStorage.getItem(CACHE_CYCLE_KEY);
    if (raw) {
      const ts = Number(raw);
      if (Number.isFinite(ts) && ts > 0) return ts;
    }
    localStorage.setItem(CACHE_CYCLE_KEY, String(now));
  } catch {}
  return now;
}

function pruneSessionTranslationCache(clearAll: boolean = false): void {
  try {
    const trKeys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(SESSION_TRANSLATION_PREFIX)) {
        trKeys.push(k);
      }
    }
    if (clearAll) {
      for (const k of trKeys) sessionStorage.removeItem(k);
      return;
    }
    if (trKeys.length > MAX_SESSION_TRANSLATION_ENTRIES) {
      const excess = trKeys.length - MAX_SESSION_TRANSLATION_ENTRIES;
      for (let i = 0; i < excess; i++) {
        sessionStorage.removeItem(trKeys[i]);
      }
    }
  } catch {}
}

/**
 * Enforces the 30-day or 250 MB cache retention rule (whichever comes first).
 * Also supports an explicit maxWebBytes budget when WebView localStorage hits QuotaExceededError.
 * User data (vault bookmarks, tokens, themes, search history) is never touched.
 */
export function pruneExpiredAndOversizedCache(maxWebBytesBudget?: number): number {
  const now = Date.now();
  const cycleStart = getCacheCycleStart();
  const webStats = getWebStorageCacheStats();
  const totalBytes = webStats.totalBytes + getNativeCacheBytes();

  // Auto-clear full cache when 30 days elapsed OR total cache reaches 250 MB (whichever comes first)
  if (now - cycleStart >= MAX_CACHE_AGE_MS || totalBytes >= MAX_CACHE_BYTES) {
    return clearAllAppCache();
  }

  let removedCount = 0;

  try {
    const surviving: Array<{ key: string; timestamp: number; bytes: number }> = [];
    const keysSnapshot: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && isTemporaryCacheKey(k)) {
        keysSnapshot.push(k);
      }
    }

    let currentWebBytes = 0;

    for (const key of keysSnapshot) {
      const raw = localStorage.getItem(key);
      if (!raw) {
        localStorage.removeItem(key);
        removedCount++;
        continue;
      }

      let ts = 0;
      let valid = false;
      try {
        const parsed = JSON.parse(raw);
        ts = typeof parsed?.timestamp === 'number' ? parsed.timestamp : 0;
        valid = ts > 0 && now - ts < MAX_CACHE_AGE_MS;
      } catch {
        valid = false;
      }

      if (!valid) {
        localStorage.removeItem(key);
        removedCount++;
      } else {
        const bytes = estimateStorageBytes(key, raw);
        currentWebBytes += bytes;
        surviving.push({ key, timestamp: ts, bytes });
      }
    }

    if (typeof maxWebBytesBudget === 'number' && currentWebBytes > maxWebBytesBudget && surviving.length > 0) {
      surviving.sort((a, b) => a.timestamp - b.timestamp);
      for (const item of surviving) {
        if (currentWebBytes <= maxWebBytesBudget) break;
        localStorage.removeItem(item.key);
        currentWebBytes -= item.bytes;
        removedCount++;
      }
    }
  } catch {}

  pruneSessionTranslationCache(false);
  memoryCleaners.forEach((cleaner) => {
    try {
      cleaner(false);
    } catch {}
  });

  return removedCount;
}

/**
 * Safely persists a temporary cache item in localStorage, freeing oldest cache items only if WebView quota is hit.
 */
export function safeSetLocalCache(key: string, serializedValue: string): void {
  try {
    localStorage.setItem(key, serializedValue);
  } catch {
    // Evict oldest temporary Web Storage caches on WebView origin quota overflow
    pruneExpiredAndOversizedCache(512 * 1024);
    try {
      localStorage.setItem(key, serializedValue);
    } catch {}
  }
}

function getWebStorageCacheStats(): { entryCount: number; totalBytes: number } {
  let entryCount = 0;
  let totalBytes = 0;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && isTemporaryCacheKey(key)) {
        const raw = localStorage.getItem(key) || '';
        entryCount++;
        totalBytes += estimateStorageBytes(key, raw);
      }
    }
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(SESSION_TRANSLATION_PREFIX)) {
        const raw = sessionStorage.getItem(key) || '';
        entryCount++;
        totalBytes += estimateStorageBytes(key, raw);
      }
    }
  } catch {}

  return { entryCount, totalBytes };
}

export interface CacheStats {
  entryCount: number;
  totalBytes: number;
  formattedSize: string;
  nextClearTimestamp: number;
  nextClearDateLabel: string;
}

function formatClearDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}

export function getCacheStats(): CacheStats {
  const web = getWebStorageCacheStats();
  const totalBytes = web.totalBytes + getNativeCacheBytes();
  const cycleStart = getCacheCycleStart();
  const nextClearTimestamp = cycleStart + MAX_CACHE_AGE_MS;

  const formattedSize =
    totalBytes >= 1024 * 1024
      ? `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(0, Math.round(totalBytes / 1024))} KB`;

  return {
    entryCount: web.entryCount,
    totalBytes,
    formattedSize,
    nextClearTimestamp,
    nextClearDateLabel: formatClearDate(nextClearTimestamp),
  };
}

/**
 * Clears all temporary API/README/Release/Trending/Translation caches + native Android WebView disk cache.
 * Preserves all user bookmarks, GitHub PAT token, themes, and search history.
 */
export function clearAllAppCache(): number {
  let clearedCount = 0;

  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && isTemporaryCacheKey(key)) {
        toRemove.push(key);
      }
    }
    for (const key of toRemove) {
      localStorage.removeItem(key);
      clearedCount++;
    }
    localStorage.setItem(CACHE_CYCLE_KEY, String(Date.now()));
  } catch {}

  pruneSessionTranslationCache(true);
  clearNativeWebViewCache();
  memoryCleaners.forEach((cleaner) => {
    try {
      cleaner(true);
    } catch {}
  });

  return clearedCount;
}

/**
 * Starts periodic cache policy checks: runs after cold launch
 * and repeats every 10 minutes to enforce 30-day or 250 MB auto-clear.
 */
export function startPeriodicCacheMaintenance(intervalMs: number = 10 * 60 * 1000): () => void {
  const initialTimer = setTimeout(() => {
    pruneExpiredAndOversizedCache();
  }, 1500);

  const periodicTimer = setInterval(() => {
    pruneExpiredAndOversizedCache();
  }, intervalMs);

  return () => {
    clearTimeout(initialTimer);
    clearInterval(periodicTimer);
  };
}
