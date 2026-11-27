import { Repository, ReleaseAsset, RateLimitInfo } from '../types';
import { CURATED_ANDROID_APKS } from '../data/curatedAndroidApks';
import { APK_CATEGORIES, EXPLORE_CATEGORIES } from '../data/categories';
import { registerMemoryCacheCleaner, safeSetLocalCache, setBoundedMapEntry } from './cacheManager';

const BASE_URL = 'https://api.github.com';
const TOKEN_KEY = 'onegitvault_github_pat';
const LEGACY_TOKEN_KEY = 'onegitvault_android_token';

const USER_CACHE_KEY = 'onegitvault_cached_user_profile';

export interface GitHubUserProfile {
  login: string;
  name?: string;
  avatar_url?: string;
}

let inMemoryPatToken: string | null = null;
let tokenVaultInitialized = false;

function encryptStoredToken(rawToken: string): string {
  if (!rawToken) return '';
  try {
    const encoded = encodeURIComponent(rawToken);
    let cipher = '';
    const mask = 0x5a;
    for (let i = 0; i < encoded.length; i++) {
      cipher += String.fromCharCode(encoded.charCodeAt(i) ^ mask);
    }
    return 'enc:' + btoa(cipher);
  } catch {
    return 'enc:' + btoa(rawToken);
  }
}

function decryptStoredToken(cipherToken: string): string {
  if (!cipherToken) return '';
  if (!cipherToken.startsWith('enc:')) return cipherToken;
  try {
    const raw = atob(cipherToken.slice(4));
    let plain = '';
    const mask = 0x5a;
    for (let i = 0; i < raw.length; i++) {
      plain += String.fromCharCode(raw.charCodeAt(i) ^ mask);
    }
    return decodeURIComponent(plain);
  } catch {
    try {
      return atob(cipherToken.slice(4));
    } catch {
      return '';
    }
  }
}

function initNativeTokenVault(): void {
  if (tokenVaultInitialized) return;
  tokenVaultInitialized = true;

  try {
    const win = window as any;
    const bridge = win?.AndroidThemeBridge;
    const raw = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY) || '';
    const legacy = decryptStoredToken(raw);

    if (bridge && typeof bridge.getSecureToken === 'function') {
      const nativeTok = (bridge.getSecureToken() || '').trim();
      if (nativeTok) {
        inMemoryPatToken = nativeTok;
        // Wipe any leftover cleartext token from WebView localStorage
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(LEGACY_TOKEN_KEY);
        return;
      }
      // Migrate existing cleartext token seamlessly into Android Keystore
      if (legacy.trim() && typeof bridge.saveSecureToken === 'function' && bridge.saveSecureToken(legacy.trim())) {
        inMemoryPatToken = legacy.trim();
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(LEGACY_TOKEN_KEY);
        return;
      }
      inMemoryPatToken = '';
      return;
    }

    inMemoryPatToken = legacy.trim();
  } catch {
    inMemoryPatToken = '';
  }
}

initNativeTokenVault();

export function getStoredToken(): string {
  initNativeTokenVault();
  if (inMemoryPatToken !== null) return inMemoryPatToken;
  try {
    const raw = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY) || '';
    return decryptStoredToken(raw);
  } catch {
    return '';
  }
}

export function getCachedUser(): GitHubUserProfile | null {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export async function fetchAuthenticatedUser(): Promise<GitHubUserProfile | null> {
  const token = getStoredToken();
  if (!token) {
    try { localStorage.removeItem(USER_CACHE_KEY); } catch {}
    return null;
  }

  const cached = getCachedUser();
  if (cached && cached.login) return cached;

  try {
    const res = await fetch(`${BASE_URL}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (res.status === 401) {
      handleAuthFailure('Token is invalid or expired');
      return null;
    }
    if (res.ok) {
      const data = await res.json();
      const profile: GitHubUserProfile = {
        login: data.login,
        name: data.name,
        avatar_url: data.avatar_url
      };
      try {
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(profile));
      } catch {}
      return profile;
    }
  } catch (e) {
    console.warn('Failed to fetch user profile:', e);
  }
  return null;
}

export async function setStoredToken(token: string): Promise<void> {
  try {
    const trimmed = token ? token.trim() : '';
    const bridge = (window as any)?.AndroidThemeBridge;
    localStorage.removeItem(USER_CACHE_KEY);
    inMemoryPatToken = trimmed;

    if (bridge && typeof bridge.saveSecureToken === 'function') {
      bridge.saveSecureToken(trimmed);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    } else if (trimmed) {
      localStorage.setItem(TOKEN_KEY, encryptStoredToken(trimmed));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    }

    if (trimmed) {
      await fetchAuthenticatedUser();
    }
    await checkLiveRateLimit(true);
  } catch (e) {
    console.error('Failed to store GitHub token', e);
  }
}

export async function checkIsRepoStarred(fullName: string): Promise<boolean> {
  const token = getStoredToken();
  if (!token) return false;

  try {
    const res = await fetch(`${BASE_URL}/user/starred/${fullName}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    return res.status === 204;
  } catch (e) {
    console.warn(`Failed to check starred status for ${fullName}:`, e);
    return false;
  }
}

export async function starRepository(fullName: string): Promise<boolean> {
  const token = getStoredToken();
  if (!token) return false;

  try {
    const res = await fetch(`${BASE_URL}/user/starred/${fullName}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Length': '0',
      },
    });
    return res.status === 204;
  } catch (e) {
    console.error(`Failed to star repository ${fullName}:`, e);
    return false;
  }
}

export async function unstarRepository(fullName: string): Promise<boolean> {
  const token = getStoredToken();
  if (!token) return false;

  try {
    const res = await fetch(`${BASE_URL}/user/starred/${fullName}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    return res.status === 204;
  } catch (e) {
    console.error(`Failed to unstar repository ${fullName}:`, e);
    return false;
  }
}

export function getHeaders(token?: string): HeadersInit {
  const t = token !== undefined ? token : getStoredToken();
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (t && t.trim()) {
    const cleanToken = t.trim().replace(/^(Bearer|token)\s+/i, '');
    headers.Authorization = `Bearer ${cleanToken}`;
  }
  return headers;
}

export const AUTH_INVALID_EVENT = 'ogv:auth_invalid';
export type AuthInvalidListener = (message: string) => void;
let authInvalidListener: AuthInvalidListener | null = null;

export function setAuthInvalidListener(listener: AuthInvalidListener | null): void {
  authInvalidListener = listener;
}

export function handleAuthFailure(reason: string = 'GitHub token expired or invalid'): void {
  const currentToken = getStoredToken();
  if (!currentToken) return;

  console.warn(`[OneGitVault Auth] ${reason}. Clearing expired token and switching to public access.`);
  inMemoryPatToken = '';
  try {
    const bridge = (window as any)?.AndroidThemeBridge;
    if (bridge && typeof bridge.saveSecureToken === 'function') {
      bridge.saveSecureToken('');
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(USER_CACHE_KEY);
    sessionStorage.setItem('ogv_last_auth_error', reason);
  } catch {}

  currentRateLimits = {
    ...currentRateLimits,
    limit: 60,
    searchLimit: 10,
  };
  if (onRateLimitChange) {
    onRateLimitChange(currentRateLimits);
  }

  if (authInvalidListener) {
    try { authInvalidListener(reason); } catch {}
  }
  try {
    window.dispatchEvent(new CustomEvent(AUTH_INVALID_EVENT, { detail: { reason } }));
  } catch {}
}

export async function fetchGitHubWithAuthFallback(
  url: string,
  init?: RequestInit,
  allowPublicRetry: boolean = true
): Promise<Response> {
  const customHeaders = init?.headers ? new Headers(init.headers) : new Headers(getHeaders());
  const hadAuth = customHeaders.has('Authorization');

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: customHeaders });
  } catch (err) {
    throw err;
  }

  // 401 Unauthorized check: Bad credentials, token expired, revoked or invalidated
  if (res.status === 401 && hadAuth) {
    console.warn(`[OneGitVault Auth] 401 Unauthorized received for ${url}. Invalidating token.`);
    handleAuthFailure('GitHub token expired or invalid — switched to guest mode');

    if (allowPublicRetry) {
      const publicHeaders = new Headers(init?.headers || {});
      publicHeaders.delete('Authorization');
      if (!publicHeaders.has('Accept')) {
        publicHeaders.set('Accept', 'application/vnd.github.v3+json');
      }
      console.log(`[OneGitVault Auth] Retrying ${url} with public guest access...`);
      const retryRes = await fetch(url, { ...init, headers: publicHeaders });
      updateRateLimitFromHeaders(retryRes.headers);
      return retryRes;
    }
  }

  updateRateLimitFromHeaders(res.headers);
  return res;
}

export let currentRateLimits: RateLimitInfo = {
  limit: 60,
  remaining: 60,
  resetTime: null,
  searchLimit: 10,
  searchRemaining: 10,
  searchResetTime: null,
};

type RateLimitListener = (info: RateLimitInfo) => void;
let onRateLimitChange: RateLimitListener | null = null;

export function setRateLimitListener(listener: RateLimitListener): void {
  onRateLimitChange = listener;
}

export function getCurrentRateLimit(): RateLimitInfo {
  const now = Date.now();
  if (currentRateLimits.resetTime && now >= currentRateLimits.resetTime.getTime()) {
    currentRateLimits.remaining = currentRateLimits.limit;
  }
  if (currentRateLimits.searchResetTime && now >= currentRateLimits.searchResetTime.getTime()) {
    currentRateLimits.searchRemaining = currentRateLimits.searchLimit || 30;
  }
  return currentRateLimits;
}

function updateRateLimitFromHeaders(headers: Headers): void {
  const resource = headers.get('x-ratelimit-resource');
  const limit = headers.get('x-ratelimit-limit');
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = headers.get('x-ratelimit-reset');

  if (limit && remaining) {
    const parsedLimit = parseInt(limit, 10);
    const parsedRemaining = parseInt(remaining, 10);
    const parsedReset = reset ? new Date(parseInt(reset, 10) * 1000) : null;

    if (resource === 'search' || parsedLimit <= 30) {
      currentRateLimits = {
        ...currentRateLimits,
        searchLimit: parsedLimit,
        searchRemaining: parsedRemaining,
        searchResetTime: parsedReset,
      };
    } else {
      currentRateLimits = {
        ...currentRateLimits,
        limit: parsedLimit,
        remaining: parsedRemaining,
        resetTime: parsedReset,
      };
    }

    if (onRateLimitChange) {
      onRateLimitChange(currentRateLimits);
    }
  }
}

function markSearchRateLimitExhausted(headers: Headers): void {
  updateRateLimitFromHeaders(headers);
  const now = Date.now();
  const existingReset = currentRateLimits.searchResetTime?.getTime() || 0;
  if ((currentRateLimits.searchRemaining ?? 0) > 0 || existingReset <= now) {
    const retryAfterSec = parseInt(headers.get('retry-after') || '60', 10);
    const resetMs = now + (Number.isFinite(retryAfterSec) && retryAfterSec > 0 ? retryAfterSec * 1000 : 60_000);
    currentRateLimits = {
      ...currentRateLimits,
      searchRemaining: 0,
      searchResetTime: new Date(resetMs),
    };
    if (onRateLimitChange) onRateLimitChange(currentRateLimits);
  }
}

function markCoreRateLimitExhausted(headers: Headers): void {
  updateRateLimitFromHeaders(headers);
  const now = Date.now();
  const existingReset = currentRateLimits.resetTime?.getTime() || 0;
  if (currentRateLimits.remaining > 0 || existingReset <= now) {
    const retryAfterSec = parseInt(headers.get('retry-after') || '120', 10);
    const resetMs = now + (Number.isFinite(retryAfterSec) && retryAfterSec > 0 ? retryAfterSec * 1000 : 120_000);
    currentRateLimits = {
      ...currentRateLimits,
      remaining: 0,
      resetTime: new Date(resetMs),
    };
    if (onRateLimitChange) onRateLimitChange(currentRateLimits);
  }
}

function isSearchQuotaExhausted(): boolean {
  const limits = getCurrentRateLimit();
  return (
    (limits.searchRemaining ?? 1) <= 0 &&
    limits.searchResetTime != null &&
    Date.now() < limits.searchResetTime.getTime()
  );
}

export function isCoreQuotaExhausted(): boolean {
  const limits = getCurrentRateLimit();
  return (
    limits.remaining <= 0 &&
    limits.resetTime != null &&
    Date.now() < limits.resetTime.getTime()
  );
}

function getSearchResetSeconds(): number {
  const reset = currentRateLimits.searchResetTime?.getTime();
  if (!reset) return 60;
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}

// In-flight request deduplication map to prevent multiple concurrent identical queries
const inFlightRequests = new Map<string, Promise<any>>();

export function deduplicatedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }
  const promise = fetcher().finally(() => {
    inFlightRequests.delete(key);
  });
  inFlightRequests.set(key, promise);
  return promise;
}

let lastRateLimitCheckTime = 0;

/**
 * Queries GitHub's /rate_limit endpoint with 15s throttle and deduplication.
 * Accessing this endpoint does NOT count against your rate limit.
 */
export async function checkLiveRateLimit(force: boolean = false): Promise<RateLimitInfo> {
  const now = Date.now();
  if (!force && now - lastRateLimitCheckTime < 15000) {
    return currentRateLimits;
  }
  lastRateLimitCheckTime = now;

  return deduplicatedFetch('rate_limit', async () => {
    const token = getStoredToken();
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (token && token.trim()) {
      const cleanToken = token.trim().replace(/^(Bearer|token)\s+/i, '');
      headers.Authorization = `Bearer ${cleanToken}`;
    }

    try {
      let res = await fetch('https://api.github.com/rate_limit', { headers });
      if (res.status === 401 && token) {
        console.warn('[OneGitVault Auth] 401 from /rate_limit. Invalidating token.');
        handleAuthFailure('GitHub token expired or invalid');
        res = await fetch('https://api.github.com/rate_limit', {
          headers: { Accept: 'application/vnd.github.v3+json' },
        });
      }

      if (res.ok) {
        const data = await res.json();
        const core = data?.resources?.core || data?.rate;
        const search = data?.resources?.search;
        const activeToken = getStoredToken();
        if (core) {
          currentRateLimits = {
            limit: core.limit ?? (activeToken ? 5000 : 60),
            remaining: core.remaining ?? 60,
            resetTime: core.reset ? new Date(core.reset * 1000) : null,
            searchLimit: search?.limit ?? (activeToken ? 30 : 10),
            searchRemaining: search?.remaining ?? (activeToken ? 30 : 10),
            searchResetTime: search?.reset ? new Date(search.reset * 1000) : null,
          };
          if (onRateLimitChange) {
            onRateLimitChange(currentRateLimits);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to query live GitHub rate limit', e);
    }

    return currentRateLimits;
  });
}

export interface FetchRepositoriesResult {
  repositories: Repository[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  error?: string;
  isRateLimit?: boolean;
  fromCache?: boolean;
  rateLimitResetInSec?: number;
}

export function buildSearchQuery(
  categoryId: string = 'android-apks',
  searchQuery: string = '',
  minStars: number = 0,
  isApkTab: boolean = false
): string {
  const qParts: string[] = [];

  // GLOBAL OR SCOPED SEARCH: If user searched keywords
  if (searchQuery.trim()) {
    if (isApkTab) {
      qParts.push(`${searchQuery.trim()} topic:android`);
    } else {
      qParts.push(searchQuery.trim());
    }
    if (minStars > 0) {
      qParts.push(`stars:>=${minStars}`);
    }
    return qParts.join(' ');
  }

  if (isApkTab) {
    const apkCat = APK_CATEGORIES.find(c => c.id === categoryId);
    if (apkCat && apkCat.query) {
      qParts.push(apkCat.query);
    } else {
      qParts.push('android (app OR apk OR client OR android-app)');
    }
  } else {
    const exploreCat = EXPLORE_CATEGORIES.find(c => c.id === categoryId);
    if (categoryId === 'all') {
      if (minStars === 0) {
        qParts.push('stars:>=100');
      }
    } else if (exploreCat && exploreCat.query) {
      qParts.push(exploreCat.query);
    }
  }

  if (minStars > 0) {
    qParts.push(`stars:>=${minStars}`);
  }

  if (qParts.length === 0) {
    qParts.push('stars:>=100');
  }

  return qParts.join(' ');
}

const repoSearchMemoryCache = new Map<string, { data: FetchRepositoriesResult; timestamp: number }>();
const REPO_CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours freshness window

function getStaleCachedSearchResult(cacheKey: string): FetchRepositoriesResult | null {
  const mem = repoSearchMemoryCache.get(cacheKey);
  if (mem?.data?.repositories?.length) return mem.data;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.repositories) && parsed.repositories.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return null;
}

/**
 * Collects unique repositories from all cached searches, trending feeds, starred list, and curated APKs,
 * then filters and sorts them locally when GitHub rate limits are temporarily exhausted.
 */
function queryLocalCachedRepositories(
  categoryId: string,
  searchQuery: string,
  sort: string,
  minStars: number,
  isApkTab: boolean
): Repository[] {
  const poolMap = new Map<number, Repository>();
  const addItems = (items: Repository[] | undefined) => {
    if (!Array.isArray(items)) return;
    for (const r of items) {
      if (r && typeof r.id === 'number' && !poolMap.has(r.id)) {
        poolMap.set(r.id, r);
      }
    }
  };

  for (const entry of repoSearchMemoryCache.values()) addItems(entry.data?.repositories);
  for (const entry of trendingMemoryCache.values()) addItems(entry.data);
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith('ogv_repo_cache_') || k.startsWith('ogv_trending_') || k.startsWith('ogv_cached_starred_repos_') || k.startsWith('ogv_user_repos_')) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        addItems(parsed.repositories || parsed.data);
      }
    }
  } catch {}
  if (isApkTab || searchQuery.trim()) addItems(CURATED_ANDROID_APKS);

  let items = Array.from(poolMap.values());

  if (isApkTab) {
    items = items.filter(
      (r) =>
        r.has_apks ||
        (r.topics && r.topics.some((t) => /android|apk/i.test(t))) ||
        /android|apk/i.test(r.description || '')
    );
  }

  if (minStars > 0) {
    items = items.filter((r) => (r.stargazers_count || 0) >= minStars);
  }

  const trimmed = searchQuery.trim().toLowerCase();
  if (trimmed) {
    // Strip GitHub search qualifiers (in:..., stars:..., pushed:..., created:..., forks:...)
    const tokens = trimmed
      .split(/\s+/)
      .filter((t) => t && !/^(in:|stars:|forks:|pushed:|created:|topic:|language:)/.test(t) && t !== 'or' && t !== 'and');
    if (tokens.length > 0) {
      items = items.filter((r) => {
        const hay = `${r.name} ${r.full_name} ${r.description || ''} ${r.language || ''} ${(r.topics || []).join(' ')}`.toLowerCase();
        return tokens.some((tok) => hay.includes(tok));
      });
    }
  } else if (categoryId && categoryId !== 'all' && categoryId !== 'android-apks') {
    const cat = [...APK_CATEGORIES, ...EXPLORE_CATEGORIES].find((c) => c.id === categoryId);
    const catWords = (cat?.label || categoryId)
      .toLowerCase()
      .split(/[\s,&/+-]+/)
      .filter((w) => w.length > 2 && w !== 'and' && w !== 'apps');
    if (catWords.length > 0) {
      const catFiltered = items.filter((r) => {
        const hay = `${r.name} ${r.description || ''} ${r.language || ''} ${(r.topics || []).join(' ')}`.toLowerCase();
        return catWords.some((w) => hay.includes(w));
      });
      if (catFiltered.length > 0) items = catFiltered;
    }
  }

  items.sort((a, b) => {
    if (sort === 'forks') return (b.forks_count || 0) - (a.forks_count || 0);
    if (sort === 'newest') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    if (sort === 'updated') return new Date(b.pushed_at || b.updated_at || 0).getTime() - new Date(a.pushed_at || a.updated_at || 0).getTime();
    return (b.stargazers_count || 0) - (a.stargazers_count || 0);
  });

  return items;
}

function buildRateLimitCachedFallback(
  cacheKey: string,
  categoryId: string,
  searchQuery: string,
  sort: string,
  minStars: number,
  page: number,
  isApkTab: boolean
): FetchRepositoriesResult {
  const resetSec = getSearchResetSeconds();
  const exactCached = getStaleCachedSearchResult(cacheKey);
  if (exactCached && exactCached.repositories.length > 0) {
    return {
      ...exactCached,
      page,
      isRateLimit: true,
      fromCache: true,
      rateLimitResetInSec: resetSec,
    };
  }

  if (page === 1) {
    const localMatches = queryLocalCachedRepositories(categoryId, searchQuery, sort, minStars, isApkTab);
    if (localMatches.length > 0) {
      return {
        repositories: localMatches.slice(0, 60),
        totalCount: localMatches.length,
        hasMore: false,
        page: 1,
        isRateLimit: true,
        fromCache: true,
        rateLimitResetInSec: resetSec,
      };
    }
  }

  return {
    repositories: [],
    totalCount: 0,
    hasMore: true,
    page,
    error: `GitHub search quota exhausted. Resets in ~${resetSec}s — tap Retry or add a GitHub token.`,
    isRateLimit: true,
    rateLimitResetInSec: resetSec,
  };
}

export async function fetchRepositories(
  categoryId: string = 'android-apks',
  searchQuery: string = '',
  sort: string = 'stars',
  minStars: number = 0,
  page: number = 1,
  perPage: number = 60,
  isApkTab: boolean = false,
  forceRefresh: boolean = false
): Promise<FetchRepositoriesResult> {
  const q = buildSearchQuery(categoryId, searchQuery, minStars, isApkTab);
  const sortParam = sort === 'stars' ? 'stars' : sort === 'forks' ? 'forks' : sort === 'newest' ? 'created' : 'updated';
  const cacheKey = `ogv_repo_cache_${q}_${sortParam}_${page}_${perPage}`;

  // 1. Check fresh in-memory and persistent localStorage cache first before burning API quota
  if (!forceRefresh) {
    const memCached = repoSearchMemoryCache.get(cacheKey);
    if (memCached && Date.now() - memCached.timestamp < REPO_CACHE_TTL_MS) {
      return memCached.data;
    }

    try {
      const localStr = localStorage.getItem(cacheKey);
      if (localStr) {
        const parsed = JSON.parse(localStr);
        const ts = parsed.timestamp || 0;
        if (Date.now() - ts < REPO_CACHE_TTL_MS && Array.isArray(parsed.repositories) && parsed.repositories.length > 0) {
          setBoundedMapEntry(repoSearchMemoryCache, cacheKey, { data: parsed, timestamp: ts }, 30);
          return parsed;
        }
      }
    } catch {}
  }

  // 2. If search rate limit is already exhausted, serve cached items directly until reset time
  if (isSearchQuotaExhausted()) {
    return buildRateLimitCachedFallback(cacheKey, categoryId, searchQuery, sortParam, minStars, page, isApkTab);
  }

  return deduplicatedFetch(cacheKey, async () => {
    try {
      const url = `${BASE_URL}/search/repositories?q=${encodeURIComponent(q)}&sort=${sortParam}&order=desc&per_page=${perPage}&page=${page}`;
      const res = await fetchGitHubWithAuthFallback(url);

      if (!res.ok) {
        console.warn(`GitHub API returned ${res.status}, attempting cached fallback`);
        const isQuotaErr = res.status === 403 || res.status === 429;
        if (isQuotaErr) {
          markSearchRateLimitExhausted(res.headers);
          return buildRateLimitCachedFallback(cacheKey, categoryId, searchQuery, sortParam, minStars, page, isApkTab);
        }

        const staleExact = getStaleCachedSearchResult(cacheKey);
        if (staleExact) {
          return { ...staleExact, fromCache: true };
        }

        if (res.status === 422) {
          return { repositories: [], totalCount: 1000, hasMore: false, page };
        }

        if (page === 1) {
          const localMatches = queryLocalCachedRepositories(categoryId, searchQuery, sortParam, minStars, isApkTab);
          if (localMatches.length > 0) {
            return {
              repositories: localMatches.slice(0, 60),
              totalCount: localMatches.length,
              hasMore: false,
              page: 1,
              fromCache: true,
            };
          }
        }

        return {
          repositories: [],
          totalCount: 0,
          hasMore: true,
          page,
          error: 'Failed to load repositories.',
        };
      }

      const data = await res.json();
      const totalCount = data.total_count || 0;
      const items: Repository[] = (data.items || []).map((item: any) => ({
        ...item,
        has_apks: isApkTab || (item.topics && (item.topics.includes('apk') || item.topics.includes('android-app') || item.topics.includes('android')))
      }));

      const maxSearchable = Math.min(totalCount, 1000);
      const hasMore = items.length >= perPage && (page * perPage < maxSearchable);

      const result: FetchRepositoriesResult = {
        repositories: items,
        totalCount,
        hasMore,
        page
      };

      const cachePayload = { ...result, timestamp: Date.now() };
      setBoundedMapEntry(repoSearchMemoryCache, cacheKey, { data: result, timestamp: Date.now() }, 30);
      safeSetLocalCache(cacheKey, JSON.stringify(cachePayload));

      return result;
    } catch (err: any) {
      console.warn('Failed to fetch from GitHub API:', err);
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch {}

      if (searchQuery.trim()) {
        const qLower = searchQuery.toLowerCase().trim();
        const matches = CURATED_ANDROID_APKS.filter(
          (r) =>
            r.name.toLowerCase().includes(qLower) ||
            r.full_name.toLowerCase().includes(qLower) ||
            (r.description && r.description.toLowerCase().includes(qLower)) ||
            (r.topics && r.topics.some((t) => t.toLowerCase().includes(qLower)))
        );
        if (matches.length > 0) {
          return {
            repositories: matches,
            totalCount: matches.length,
            hasMore: false,
            page: 1,
          };
        }
      }
      if (page === 1 && isApkTab) {
        return {
          repositories: CURATED_ANDROID_APKS,
          totalCount: CURATED_ANDROID_APKS.length,
          hasMore: false,
          page: 1
        };
      }
      return {
        repositories: [],
        totalCount: 0,
        hasMore: true,
        page,
        error: 'Network error loading repositories. Tap to retry.'
      };
    }
  });
}

export async function fetchRepositoryByFullName(fullName: string): Promise<Repository | null> {
  const clean = (fullName || '').trim();
  if (!clean || !clean.includes('/')) return null;

  const parts = clean.split('/');
  if (parts.length !== 2) return null;
  const [owner, name] = parts;

  const normKey = clean.toLowerCase();
  const cacheKey = `ogv_repo_item_${normKey}`;

  try {
    const rawLocal = localStorage.getItem(cacheKey);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (parsed && parsed.data) return parsed.data;
    }
  } catch {}

  // Check bookmarks
  try {
    const rawB = localStorage.getItem('ogv_bookmarks_v1');
    if (rawB) {
      const bList: Repository[] = JSON.parse(rawB);
      const match = bList.find((r) => r.full_name?.toLowerCase() === normKey);
      if (match) return match;
    }
  } catch {}

  return deduplicatedFetch(`repo_entity_${normKey}`, async () => {
    try {
      const url = `${BASE_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
      const res = await fetchGitHubWithAuthFallback(url);
      if (!res.ok) {
        return {
          id: Math.abs(clean.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0)),
          name: name,
          full_name: clean,
          owner: {
            login: owner,
            avatar_url: `https://github.com/${owner}.png?size=80`,
            html_url: `https://github.com/${owner}`
          },
          description: null,
          html_url: `https://github.com/${clean}`,
          stargazers_count: 0,
          forks_count: 0,
          open_issues_count: 0,
          watchers_count: 0,
          language: null,
          topics: [],
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          pushed_at: new Date().toISOString(),
          clone_url: `https://github.com/${clean}.git`,
          default_branch: 'main'
        };
      }
      const item = await res.json();
      const mapped: Repository = {
        id: item.id,
        name: item.name,
        full_name: item.full_name,
        owner: {
          login: item.owner?.login || owner,
          avatar_url: item.owner?.avatar_url || `https://github.com/${owner}.png?size=80`,
          html_url: item.owner?.html_url || `https://github.com/${owner}`,
        },
        description: item.description,
        html_url: item.html_url,
        stargazers_count: item.stargazers_count || 0,
        forks_count: item.forks_count || 0,
        open_issues_count: item.open_issues_count || 0,
        watchers_count: item.watchers_count || item.stargazers_count || 0,
        language: item.language,
        topics: item.topics || [],
        updated_at: item.updated_at || new Date().toISOString(),
        created_at: item.created_at || new Date().toISOString(),
        pushed_at: item.pushed_at || new Date().toISOString(),
        clone_url: item.clone_url || `https://github.com/${clean}.git`,
        default_branch: item.default_branch || 'main',
      };
      safeSetLocalCache(cacheKey, JSON.stringify({ data: mapped, timestamp: Date.now() }));
      return mapped;
    } catch {
      return {
        id: Math.abs(clean.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0)),
        name: name,
        full_name: clean,
        owner: {
          login: owner,
          avatar_url: `https://github.com/${owner}.png?size=80`,
          html_url: `https://github.com/${owner}`
        },
        description: null,
        html_url: `https://github.com/${clean}`,
        stargazers_count: 0,
        forks_count: 0,
        open_issues_count: 0,
        watchers_count: 0,
        language: null,
        topics: [],
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        pushed_at: new Date().toISOString(),
        clone_url: `https://github.com/${clean}.git`,
        default_branch: 'main'
      };
    }
  });
}

const releasesCache = new Map<string, { data: ReleaseAsset[]; timestamp: number }>();

export interface CompleteRepoDetails {
  releases: ReleaseAsset[];
  isStarred?: boolean;
  readme?: string;
  specs?: {
    stars: number;
    forks: number;
    watchers: number;
    openIssues: number;
    language: string;
    license: { key: string; name: string; spdx_id: string } | null;
    defaultBranch: string;
    createdAt: string;
    pushedAt: string;
    updatedAt: string;
    description: string;
  };
}

/**
 * GraphQL Query Aggregator: Groups repository specs, latest releases,
 * release assets, README blob, and star status into a SINGLE network request.
 * Costs only 1 point of rate limit instead of 3-4 separate REST requests.
 */
export async function fetchRepoCompleteDetails(fullName: string): Promise<CompleteRepoDetails | null> {
  const token = getStoredToken();
  if (!token) return null; // Graceful fallback to cached REST

  const parts = fullName.split('/');
  if (parts.length !== 2) return null;
  const [owner, name] = parts;

  const normKey = fullName.toLowerCase().trim();
  const cacheKey = `ogv_gql_repo_${normKey}`;

  try {
    const rawLocal = localStorage.getItem(cacheKey);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (isCoreQuotaExhausted() || Date.now() - (parsed.timestamp || 0) < 60 * 60 * 1000) {
        return parsed.data;
      }
    }
  } catch {}

  if (isCoreQuotaExhausted()) {
    return null;
  }

  return deduplicatedFetch(`gql_${normKey}`, async () => {
    try {
      const cleanToken = token.trim().replace(/^(Bearer|token)\s+/i, '');
      const query = `
        query RepoOverview($owner: String!, $name: String!) {
          repository(owner: $owner, name: $name) {
            id
            description
            stargazerCount
            forkCount
            watchers { totalCount }
            issues(states: OPEN) { totalCount }
            primaryLanguage { name }
            licenseInfo { key name spdxId }
            defaultBranchRef { name }
            createdAt
            pushedAt
            updatedAt
            viewerHasStarred
            readme: object(expression: "HEAD:README.md") {
              ... on Blob {
                text
              }
            }
            releases(first: 10, orderBy: {field: CREATED_AT, direction: DESC}) {
              nodes {
                id
                name
                tagName
                releaseAssets(first: 30) {
                  nodes {
                    id
                    name
                    size
                    downloadCount
                    downloadUrl
                    contentType
                  }
                }
              }
            }
          }
        }
      `;

      const res = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ query, variables: { owner, name } }),
      });

      updateRateLimitFromHeaders(res.headers);
      if (res.status === 401) {
        handleAuthFailure('GraphQL token is invalid or expired');
        return null;
      }
      if (!res.ok) {
        if (res.status === 403 || res.status === 429) markCoreRateLimitExhausted(res.headers);
        return null;
      }

      const body = await res.json();
      const r = body?.data?.repository;
      if (!r) return null;

      const assets: ReleaseAsset[] = [];
      const relNodes = r.releases?.nodes || [];
      for (const rel of relNodes) {
        const assetNodes = rel.releaseAssets?.nodes || [];
        for (const a of assetNodes) {
          const lowerName = (a.name || '').toLowerCase();
          const isApk =
            lowerName.endsWith('.apk') ||
            lowerName.endsWith('.xapk') ||
            lowerName.endsWith('.aab') ||
            a.contentType === 'application/vnd.android.package-archive';

          assets.push({
            id: a.id,
            name: a.name,
            size: a.size || 0,
            download_count: a.downloadCount || 0,
            browser_download_url: a.downloadUrl,
            content_type: a.contentType || '',
            is_apk: isApk,
            release_tag: rel.tagName || '',
            release_name: rel.name || rel.tagName || '',
            release_body: '',
            release_url: '',
            published_at: rel.publishedAt || '',
          });
        }
      }

      const readmeText = typeof r.readme?.text === 'string' && r.readme.text.length > 0 ? r.readme.text : undefined;
      if (readmeText) {
        safeSetLocalCache(`ogv_readme_${normKey}`, JSON.stringify({ data: readmeText, timestamp: Date.now() }));
      }

      const result: CompleteRepoDetails = {
        releases: assets,
        isStarred: r.viewerHasStarred,
        readme: readmeText,
        specs: {
          stars: r.stargazerCount || 0,
          forks: r.forkCount || 0,
          watchers: r.watchers?.totalCount || 0,
          openIssues: r.issues?.totalCount || 0,
          language: r.primaryLanguage?.name || '',
          license: r.licenseInfo
            ? {
                key: r.licenseInfo.key || '',
                name: r.licenseInfo.name || '',
                spdx_id: r.licenseInfo.spdxId || '',
              }
            : null,
          defaultBranch: r.defaultBranchRef?.name || 'main',
          createdAt: r.createdAt,
          pushedAt: r.pushedAt,
          updatedAt: r.updatedAt,
          description: r.description || '',
        },
      };

      safeSetLocalCache(cacheKey, JSON.stringify({ data: result, timestamp: Date.now() }));

      return result;
    } catch (e) {
      console.warn('GraphQL batch query fallback to REST:', e);
      return null;
    }
  });
}

export async function fetchReleases(repoFullName: string): Promise<ReleaseAsset[]> {
  const normKey = repoFullName.toLowerCase().trim();
  const cacheKey = `ogv_rel_${normKey}`;

  // 1. Check in-memory cache (fresh within 1 hour)
  const memCached = releasesCache.get(normKey);
  if (memCached && Date.now() - memCached.timestamp < 60 * 60 * 1000) {
    return memCached.data;
  }

  // 2. Check localStorage cache (fresh within 12 hours)
  try {
    const rawLocal = localStorage.getItem(cacheKey);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (Array.isArray(parsed.data) && parsed.data.length > 0) {
        if (Date.now() - parsed.timestamp < 12 * 60 * 60 * 1000) {
          setBoundedMapEntry(releasesCache, normKey, parsed, 40);
          return parsed.data;
        }
      }
    }
  } catch {}

  // Curated fallback assets if available
  const curatedMatch = CURATED_ANDROID_APKS.find(
    (c) => c.full_name.toLowerCase() === normKey || c.name.toLowerCase() === normKey
  );
  const curatedAssets = curatedMatch?.latest_release?.assets || [];

  // If Core quota is exhausted, serve stale cached releases immediately until reset
  if (isCoreQuotaExhausted()) {
    if (memCached?.data?.length) return memCached.data;
    try {
      const rawLocal = localStorage.getItem(cacheKey);
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (Array.isArray(parsed.data) && parsed.data.length > 0) return parsed.data;
      }
    } catch {}
    return curatedAssets;
  }

  return deduplicatedFetch(`releases_${normKey}`, async () => {
    try {
      const url = `${BASE_URL}/repos/${repoFullName}/releases?per_page=10`;
      const res = await fetchGitHubWithAuthFallback(url);

      if (!res.ok) {
        if (res.status === 403 || res.status === 429) markCoreRateLimitExhausted(res.headers);
        console.warn(`fetchReleases failed (${res.status}) for ${repoFullName}, checking cached fallback`);
        try {
          const rawLocal = localStorage.getItem(cacheKey);
          if (rawLocal) {
            const parsed = JSON.parse(rawLocal);
            if (Array.isArray(parsed.data) && parsed.data.length > 0) {
              return parsed.data;
            }
          }
        } catch {}

        if (curatedAssets.length > 0) return curatedAssets;
        return [];
      }

      const releases = await res.json();
      if (!Array.isArray(releases) || releases.length === 0) {
        if (curatedAssets.length > 0) return curatedAssets;
        return [];
      }

      const assets: ReleaseAsset[] = [];
      for (const rel of releases) {
        if (Array.isArray(rel.assets) && rel.assets.length > 0) {
          for (const a of rel.assets) {
            const lowerName = (a.name || '').toLowerCase();
            const isApk =
              lowerName.endsWith('.apk') ||
              lowerName.endsWith('.xapk') ||
              lowerName.endsWith('.aab') ||
              a.content_type === 'application/vnd.android.package-archive';

            assets.push({
              id: a.id,
              name: a.name,
              size: a.size || 0,
              download_count: a.download_count || 0,
              browser_download_url: a.browser_download_url,
              content_type: a.content_type || '',
              is_apk: isApk,
              release_tag: rel.tag_name || '',
              release_name: rel.name || rel.tag_name || '',
              release_body: rel.body || '',
              release_url: rel.html_url || '',
              published_at: rel.published_at || '',
            });
          }
        } else if (rel) {
          // Release with no binary assets: provide release overview entry
          assets.push({
            id: rel.id || Math.floor(Math.random() * 1000000),
            name: `${rel.name || rel.tag_name || 'Release'} (Source)`,
            size: 0,
            download_count: 0,
            browser_download_url: rel.zipball_url || rel.tarball_url || rel.html_url || '',
            content_type: 'application/zip',
            is_apk: false,
            release_tag: rel.tag_name || '',
            release_name: rel.name || rel.tag_name || '',
            release_body: rel.body || '',
            release_url: rel.html_url || '',
            published_at: rel.published_at || '',
          });
        }
      }

      const finalAssets = assets.length > 0 ? assets : curatedAssets;

      if (finalAssets.length > 0) {
        const cacheObj = { data: finalAssets, timestamp: Date.now() };
        setBoundedMapEntry(releasesCache, normKey, cacheObj, 40);
        safeSetLocalCache(cacheKey, JSON.stringify(cacheObj));
      }

      return finalAssets;
    } catch (err) {
      console.warn(`Network error in fetchReleases for ${repoFullName}:`, err);
      try {
        const rawLocal = localStorage.getItem(cacheKey);
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          if (Array.isArray(parsed.data) && parsed.data.length > 0) {
            return parsed.data;
          }
        }
      } catch {}

      if (curatedAssets.length > 0) return curatedAssets;
      return [];
    }
  });
}

export async function fetchReadme(repoFullName: string, preferredBranch?: string): Promise<string> {
  const normKey = repoFullName.toLowerCase().trim();
  const cacheKey = `ogv_readme_${normKey}`;

  // Check cache first
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.data && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        return parsed.data;
      }
    }
  } catch {}

  return deduplicatedFetch(`readme_${normKey}`, async () => {
    // 1. Try public raw GitHub CDN first (FAST and NO API RATE LIMIT!)
    const branches = Array.from(
      new Set(['HEAD', ...(preferredBranch ? [preferredBranch] : []), 'main', 'master'])
    );
    for (const branch of branches) {
      try {
        const rawRes = await fetch(`https://raw.githubusercontent.com/${repoFullName}/${branch}/README.md`);
        if (rawRes.ok) {
          const text = await rawRes.text();
          if (text && text.length > 20) {
            safeSetLocalCache(cacheKey, JSON.stringify({ data: text, timestamp: Date.now() }));
            return text;
          }
        }
      } catch {}
    }

    // 2. Fall back to GitHub API endpoint (skip if Core quota is exhausted and return stale cache)
    if (isCoreQuotaExhausted()) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) return JSON.parse(cached).data;
      } catch {}
      return '# No README cached while GitHub rate limit is resetting.';
    }

    try {
      const url = `${BASE_URL}/repos/${repoFullName}/readme`;
      const res = await fetchGitHubWithAuthFallback(url, {
        headers: {
          ...getHeaders(),
          Accept: 'application/vnd.github.v3.raw'
        }
      });
      if (!res.ok) {
        if (res.status === 403 || res.status === 429) markCoreRateLimitExhausted(res.headers);
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) return JSON.parse(cached).data;
        } catch {}
        return '# No README found for this repository.';
      }
      const text = await res.text();
      safeSetLocalCache(cacheKey, JSON.stringify({ data: text, timestamp: Date.now() }));
      return text;
    } catch {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) return JSON.parse(cached).data;
      } catch {}
      return '# Failed to load README.';
    }
  });
}

const trendingMemoryCache = new Map<string, { data: Repository[]; timestamp: number }>();
const TRENDING_CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

registerMemoryCacheCleaner((clearAll) => {
    if (clearAll) {
      repoSearchMemoryCache.clear();
      releasesCache.clear();
      trendingMemoryCache.clear();
      userReposMemoryCache.clear();
      return;
    }
  const now = Date.now();
  for (const [k, v] of repoSearchMemoryCache.entries()) {
    if (now - v.timestamp >= REPO_CACHE_TTL_MS) repoSearchMemoryCache.delete(k);
  }
  for (const [k, v] of releasesCache.entries()) {
    if (now - v.timestamp >= 60 * 60 * 1000) releasesCache.delete(k);
  }
  for (const [k, v] of trendingMemoryCache.entries()) {
    if (now - v.timestamp >= TRENDING_CACHE_TTL_MS) trendingMemoryCache.delete(k);
  }
});

export async function fetchTrendingRepositories(
  period: 'daily' | 'weekly' | 'monthly' = 'daily',
  scope: 'all' | 'apk' = 'all',
  language?: string,
  forceRefresh: boolean = false
): Promise<Repository[]> {
  const cacheKey = `ogv_trending_${period}_${scope}_${language || 'all'}`;

  // 1. Check in-memory and persistent cache first
  if (!forceRefresh) {
    const mem = trendingMemoryCache.get(cacheKey);
    if (mem && Date.now() - mem.timestamp < TRENDING_CACHE_TTL_MS) {
      return mem.data;
    }
    try {
      const rawLocal = localStorage.getItem(cacheKey);
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (Date.now() - (parsed.timestamp || 0) < TRENDING_CACHE_TTL_MS && Array.isArray(parsed.data)) {
          setBoundedMapEntry(trendingMemoryCache, cacheKey, parsed, 20);
          return parsed.data;
        }
      }
    } catch {}
  }

  const getTrendingCachedFallback = (): Repository[] => {
    const mem = trendingMemoryCache.get(cacheKey);
    if (mem?.data?.length) return mem.data;
    try {
      const rawLocal = localStorage.getItem(cacheKey);
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (Array.isArray(parsed.data) && parsed.data.length > 0) return parsed.data;
      }
    } catch {}
    const localPool = queryLocalCachedRepositories('all', '', 'stars', 0, scope === 'apk');
    if (localPool.length > 0) return localPool.slice(0, 60);
    if (scope === 'apk') return CURATED_ANDROID_APKS;
    return [];
  };

  if (isSearchQuotaExhausted()) {
    return getTrendingCachedFallback();
  }

  return deduplicatedFetch(cacheKey, async () => {
    const now = new Date();
    let daysAgo = 3; // for 'daily', 3 days captures recent trending repos with actual stars
    if (period === 'weekly') daysAgo = 7;
    if (period === 'monthly') daysAgo = 30;

    const targetDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const dateStr = targetDate.toISOString().split('T')[0];

    let query = '';
    if (scope === 'apk') {
      query = `topic:android created:>=${dateStr}`;
    } else {
      query = `created:>=${dateStr}`;
    }

    if (language && language.trim()) {
      query += ` language:${language.trim()}`;
    }

    const url = `${BASE_URL}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=60`;

    try {
      const res = await fetchGitHubWithAuthFallback(url);
      if (!res.ok) {
        if (res.status === 403 || res.status === 429) markSearchRateLimitExhausted(res.headers);
        return getTrendingCachedFallback();
      }

      const data = await res.json();
      const items = data.items || [];
      if (items.length === 0 && scope === 'apk') {
        return CURATED_ANDROID_APKS;
      }

      const mapped: Repository[] = items.map((item: any) => ({
        id: item.id,
        name: item.name,
        full_name: item.full_name,
        owner: {
          login: item.owner?.login || '',
          avatar_url: item.owner?.avatar_url || '',
          html_url: item.owner?.html_url || '',
        },
        html_url: item.html_url,
        description: item.description || '',
        fork: item.fork || false,
        stargazers_count: item.stargazers_count || 0,
        forks_count: item.forks_count || 0,
        open_issues_count: item.open_issues_count || 0,
        language: item.language || '',
        topics: item.topics || [],
        license: item.license ? {
          key: item.license.key || '',
          name: item.license.name || '',
          spdx_id: item.license.spdx_id || ''
        } : null,
        updated_at: item.updated_at,
        pushed_at: item.pushed_at,
        created_at: item.created_at,
        default_branch: item.default_branch || 'main',
        clone_url: item.clone_url || `https://github.com/${item.full_name}.git`,
        has_apks: scope === 'apk' || (item.topics?.some((t: string) => t.toLowerCase().includes('android') || t.toLowerCase().includes('apk')))
      }));

      const cachePayload = { data: mapped, timestamp: Date.now() };
      setBoundedMapEntry(trendingMemoryCache, cacheKey, cachePayload, 20);
      safeSetLocalCache(cacheKey, JSON.stringify(cachePayload));

      return mapped;
    } catch (err) {
      console.warn('Failed to fetch trending repositories:', err);
      return getTrendingCachedFallback();
    }
  });
}

export interface GitHubUserSuggestion {
  login: string;
  name?: string;
  avatar_url: string;
  html_url: string;
  public_repos?: number;
  followers?: number;
  bio?: string;
  type?: string;
}

const userReposMemoryCache = new Map<
  string,
  { user: GitHubUserSuggestion | null; repositories: Repository[]; timestamp: number }
>();

/**
 * Synchronous 0ms local search across cached repositories & repository owners while live fetch runs.
 */
export function getInstantLocalSearchMatches(rawQuery: string): {
  repos: Repository[];
  users: GitHubUserSuggestion[];
} {
  const clean = rawQuery.trim().replace(/^@/, '');
  if (clean.length < 2) return { repos: [], users: [] };

  const repos = queryLocalCachedRepositories('all', clean, 'stars', 0, false).slice(0, 30);
  const lower = clean.toLowerCase();
  const userMap = new Map<string, GitHubUserSuggestion>();

  for (const r of repos) {
    const login = r.owner?.login;
    if (login && login.toLowerCase().includes(lower) && !userMap.has(login.toLowerCase())) {
      userMap.set(login.toLowerCase(), {
        login,
        avatar_url: r.owner.avatar_url || `https://github.com/${login}.png?size=80`,
        html_url: r.owner.html_url || `https://github.com/${login}`,
      });
      if (userMap.size >= 4) break;
    }
  }

  return { repos, users: Array.from(userMap.values()) };
}

/**
 * Fetches a GitHub user's profile and top repositories via Core API (no Search quota used).
 */
export async function fetchUserRepositories(
  rawUsername: string
): Promise<{ user: GitHubUserSuggestion | null; repositories: Repository[] }> {
  const username = rawUsername.trim().replace(/^@/, '');
  if (!username || !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username)) {
    return { user: null, repositories: [] };
  }

  const lower = username.toLowerCase();
  const cacheKey = `ogv_user_repos_${lower}`;

  const mem = userReposMemoryCache.get(lower);
  if (mem && (isCoreQuotaExhausted() || Date.now() - mem.timestamp < REPO_CACHE_TTL_MS)) {
    return { user: mem.user, repositories: mem.repositories };
  }

  try {
    const rawLocal = localStorage.getItem(cacheKey);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (
        isCoreQuotaExhausted() ||
        (Date.now() - (parsed.timestamp || 0) < REPO_CACHE_TTL_MS && Array.isArray(parsed.repositories))
      ) {
        setBoundedMapEntry(userReposMemoryCache, lower, parsed, 15);
        return { user: parsed.user || null, repositories: parsed.repositories || [] };
      }
    }
  } catch {}

  if (isCoreQuotaExhausted()) {
    const cachedRepos = queryLocalCachedRepositories('all', username, 'stars', 0, false).filter(
      (r) => r.owner?.login?.toLowerCase() === lower
    );
    return {
      user: cachedRepos[0]?.owner
        ? {
            login: cachedRepos[0].owner.login,
            avatar_url: cachedRepos[0].owner.avatar_url,
            html_url: cachedRepos[0].owner.html_url,
          }
        : null,
      repositories: cachedRepos,
    };
  }

  return deduplicatedFetch(`user_repos_${lower}`, async () => {
    try {
      const [userRes, reposRes] = await Promise.all([
        fetchGitHubWithAuthFallback(`${BASE_URL}/users/${encodeURIComponent(username)}`),
        fetchGitHubWithAuthFallback(`${BASE_URL}/users/${encodeURIComponent(username)}/repos?per_page=30&sort=updated`),
      ]);

      if (userRes.status === 403 || userRes.status === 429 || reposRes.status === 403 || reposRes.status === 429) {
        markCoreRateLimitExhausted(reposRes.headers);
        return { user: null, repositories: [] };
      }

      const userData = userRes.ok ? await userRes.json() : null;
      const reposData = reposRes.ok ? await reposRes.json() : [];

      const user: GitHubUserSuggestion | null = userData?.login
        ? {
            login: userData.login,
            name: userData.name || undefined,
            avatar_url: userData.avatar_url || `https://github.com/${userData.login}.png?size=80`,
            html_url: userData.html_url || `https://github.com/${userData.login}`,
            public_repos: userData.public_repos,
            followers: userData.followers,
            bio: userData.bio || undefined,
            type: userData.type,
          }
        : null;

      const mappedRepos: Repository[] = Array.isArray(reposData)
        ? reposData
            .map((item: any) => ({
              ...item,
              has_apks:
                item.topics &&
                (item.topics.includes('apk') ||
                  item.topics.includes('android-app') ||
                  item.topics.includes('android')),
            }))
            .sort((a: Repository, b: Repository) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
        : [];

      const payload = { user, repositories: mappedRepos, timestamp: Date.now() };
      if (user || mappedRepos.length > 0) {
        setBoundedMapEntry(userReposMemoryCache, lower, payload, 15);
        safeSetLocalCache(cacheKey, JSON.stringify(payload));
      }

      return { user, repositories: mappedRepos };
    } catch {
      return { user: null, repositories: [] };
    }
  });
}

/**
 * Intelligent Global Search: handles `@username` developer lookups, `owner/repo` direct paths,
 * matching GitHub usernames found inside handles, and global repository search cleanly together.
 */
export async function searchSmartGitHub(rawQuery: string): Promise<{
  users: GitHubUserSuggestion[];
  repositories: Repository[];
  totalCount: number;
  error?: string;
  isRateLimit?: boolean;
  fromCache?: boolean;
}> {
  const trimmed = rawQuery.trim();
  if (trimmed.length < 2) {
    return { users: [], repositories: [], totalCount: 0 };
  }

  // Case 1: Explicit @username lookup (uses Core API — no Search quota consumed)
  if (/^@[a-zA-Z0-9-]{2,39}$/.test(trimmed)) {
    const userResult = await fetchUserRepositories(trimmed.slice(1));
    if (userResult.user || userResult.repositories.length > 0) {
      return {
        users: userResult.user ? [userResult.user] : [],
        repositories: userResult.repositories,
        totalCount: userResult.repositories.length,
      };
    }
  }

  // Case 2: Direct owner/repo lookup (e.g., facebook/react)
  if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    let directRepo: Repository | null = null;
    if (!isCoreQuotaExhausted()) {
      try {
        const res = await fetch(`${BASE_URL}/repos/${trimmed}`, { headers: getHeaders() });
        updateRateLimitFromHeaders(res.headers);
        if (res.ok) {
          directRepo = await res.json();
        } else if (res.status === 403 || res.status === 429) {
          markCoreRateLimitExhausted(res.headers);
        }
      } catch {}
    }
    if (directRepo?.id) {
      const ownerUser: GitHubUserSuggestion | null = directRepo.owner?.login
        ? {
            login: directRepo.owner.login,
            avatar_url: directRepo.owner.avatar_url,
            html_url: directRepo.owner.html_url,
          }
        : null;
      return {
        users: ownerUser ? [ownerUser] : [],
        repositories: [directRepo],
        totalCount: 1,
      };
    }
  }

  // Case 3: Single handle token -> run repo search + opportunistic Core API user check in parallel
  const isSingleHandle = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{1,37}[a-zA-Z0-9])?$/.test(trimmed);
  const repoSearchPromise = fetchRepositories('all', trimmed, 'stars', 0, 1, 30, false);
  const userLookupPromise =
    isSingleHandle && !isCoreQuotaExhausted()
      ? fetchUserRepositories(trimmed)
      : Promise.resolve({ user: null, repositories: [] as Repository[] });

  const [repoRes, userRes] = await Promise.all([repoSearchPromise, userLookupPromise]);

  const userMap = new Map<string, GitHubUserSuggestion>();
  if (userRes.user) {
    userMap.set(userRes.user.login.toLowerCase(), userRes.user);
  }

  const lower = trimmed.toLowerCase();
  const mergedRepos: Repository[] = [];
  const seenIds = new Set<number>();

  // Blend top repos from exact username match first (up to 6 flagship repos), then global repo search matches
  for (const r of userRes.repositories.slice(0, 6)) {
    if (!seenIds.has(r.id)) {
      seenIds.add(r.id);
      mergedRepos.push(r);
    }
  }

  for (const r of repoRes.repositories) {
    if (!seenIds.has(r.id)) {
      seenIds.add(r.id);
      mergedRepos.push(r);
    }
    const ownerLogin = r.owner?.login;
    if (
      ownerLogin &&
      ownerLogin.toLowerCase().includes(lower) &&
      !userMap.has(ownerLogin.toLowerCase()) &&
      userMap.size < 4
    ) {
      userMap.set(ownerLogin.toLowerCase(), {
        login: ownerLogin,
        avatar_url: r.owner.avatar_url || `https://github.com/${ownerLogin}.png?size=80`,
        html_url: r.owner.html_url || `https://github.com/${ownerLogin}`,
      });
    }
  }

  return {
    users: Array.from(userMap.values()),
    repositories: mergedRepos,
    totalCount: Math.max(repoRes.totalCount, mergedRepos.length),
    error: mergedRepos.length === 0 ? repoRes.error : undefined,
    isRateLimit: repoRes.isRateLimit,
    fromCache: repoRes.fromCache,
  };
}
