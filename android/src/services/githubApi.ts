import { Repository, ReleaseAsset, RateLimitInfo } from '../types';
import { CURATED_ANDROID_APKS } from '../data/curatedAndroidApks';
import { APK_CATEGORIES, EXPLORE_CATEGORIES } from '../data/categories';

const BASE_URL = 'https://api.github.com';
const TOKEN_KEY = 'onegitvault_github_pat';
const LEGACY_TOKEN_KEY = 'onegitvault_android_token';

const USER_CACHE_KEY = 'onegitvault_cached_user_profile';

export interface GitHubUserProfile {
  login: string;
  name?: string;
  avatar_url?: string;
}

export function getStoredToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY) || '';
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
    localStorage.removeItem(USER_CACHE_KEY);
    if (token && token.trim()) {
      localStorage.setItem(TOKEN_KEY, token.trim());
      await fetchAuthenticatedUser();
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    }
    await checkLiveRateLimit();
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

/**
 * Queries GitHub's /rate_limit endpoint.
 * Accessing this endpoint does NOT count against your rate limit.
 */
export async function checkLiveRateLimit(): Promise<RateLimitInfo> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token && token.trim()) {
    const cleanToken = token.trim().replace(/^(Bearer|token)\s+/i, '');
    headers.Authorization = `Bearer ${cleanToken}`;
  }

  try {
    const res = await fetch('https://api.github.com/rate_limit', { headers });
    if (res.ok) {
      const data = await res.json();
      const core = data?.resources?.core || data?.rate;
      const search = data?.resources?.search;
      if (core) {
        currentRateLimits = {
          limit: core.limit ?? (token ? 5000 : 60),
          remaining: core.remaining ?? 60,
          resetTime: core.reset ? new Date(core.reset * 1000) : null,
          searchLimit: search?.limit ?? (token ? 30 : 10),
          searchRemaining: search?.remaining ?? (token ? 30 : 10),
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
}

export interface FetchRepositoriesResult {
  repositories: Repository[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  error?: string;
  isRateLimit?: boolean;
}

export function buildSearchQuery(
  categoryId: string = 'android-apks',
  searchQuery: string = '',
  minStars: number = 0,
  isApkTab: boolean = false
): string {
  const qParts: string[] = [];

  // GLOBAL SEARCH: If user searched keywords, search globally across GitHub irrespective of filter
  if (searchQuery.trim()) {
    qParts.push(searchQuery.trim());
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
      qParts.push('topic:android-app');
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

export async function fetchRepositories(
  categoryId: string = 'android-apks',
  searchQuery: string = '',
  sort: string = 'stars',
  minStars: number = 0,
  page: number = 1,
  perPage: number = 30,
  isApkTab: boolean = false
): Promise<FetchRepositoriesResult> {
  try {
    const q = buildSearchQuery(categoryId, searchQuery, minStars, isApkTab);
    const sortParam = sort === 'stars' ? 'stars' : sort === 'forks' ? 'forks' : sort === 'newest' ? 'created' : 'updated';
    const url = `${BASE_URL}/search/repositories?q=${encodeURIComponent(q)}&sort=${sortParam}&order=desc&per_page=${perPage}&page=${page}`;

    const cacheKey = `ogv_repo_cache_${q}_${sortParam}_${page}`;

    const res = await fetch(url, { headers: getHeaders() });
    updateRateLimitFromHeaders(res.headers);

    if (!res.ok) {
      console.warn(`GitHub API returned ${res.status}, attempting cached fallback`);
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          return parsed;
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
            error: res.status === 403 ? 'Search rate limit active. Showing matching curated repositories.' : undefined,
            isRateLimit: res.status === 403,
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

      const isRateLimit = res.status === 403;
      let errorMsg = 'Failed to load repositories.';
      if (isRateLimit) {
        errorMsg = 'GitHub search rate limit reached (10 req/min unauthenticated). Tap Retry or add a GitHub token in the key icon.';
      } else if (res.status === 422) {
        // GitHub search API limit: only first 1,000 results are reachable
        return { repositories: [], totalCount: 1000, hasMore: false, page };
      }

      return {
        repositories: [],
        totalCount: 0,
        hasMore: true,
        page,
        error: errorMsg,
        isRateLimit
      };
    }

    const data = await res.json();
    const totalCount = data.total_count || 0;
    const items: Repository[] = (data.items || []).map((item: any) => ({
      ...item,
      has_apks: isApkTab || (item.topics && (item.topics.includes('apk') || item.topics.includes('android-app') || item.topics.includes('android')))
    }));

    // GitHub search API only allows viewing up to the first 1,000 search results
    const maxSearchable = Math.min(totalCount, 1000);
    const hasMore = items.length >= perPage && (page * perPage < maxSearchable);

    const result: FetchRepositoriesResult = {
      repositories: items,
      totalCount,
      hasMore,
      page
    };

    try {
      localStorage.setItem(cacheKey, JSON.stringify(result));
    } catch {}

    return result;
  } catch (err: any) {
    console.warn('Failed to fetch from GitHub API:', err);
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
}

const releasesCache = new Map<string, { data: ReleaseAsset[]; timestamp: number }>();

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
          releasesCache.set(normKey, parsed);
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

  try {
    const url = `${BASE_URL}/repos/${repoFullName}/releases?per_page=10`;
    const res = await fetch(url, { headers: getHeaders() });
    updateRateLimitFromHeaders(res.headers);

    if (!res.ok) {
      console.warn(`fetchReleases failed (${res.status}) for ${repoFullName}, checking cached fallback`);
      // Fall back to localStorage even if older than 12h
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
      if (Array.isArray(rel.assets)) {
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
            is_apk: isApk
          });
        }
      }
    }

    const finalAssets = assets.length > 0 ? assets : curatedAssets;

    if (finalAssets.length > 0) {
      const cacheObj = { data: finalAssets, timestamp: Date.now() };
      releasesCache.set(normKey, cacheObj);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cacheObj));
      } catch {}
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
}

export async function fetchReadme(repoFullName: string): Promise<string> {
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

  // 1. Try public raw GitHub CDN first (FAST and NO API RATE LIMIT!)
  const branches = ['HEAD', 'main', 'master'];
  for (const branch of branches) {
    try {
      const rawRes = await fetch(`https://raw.githubusercontent.com/${repoFullName}/${branch}/README.md`);
      if (rawRes.ok) {
        const text = await rawRes.text();
        if (text && text.length > 20) {
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ data: text, timestamp: Date.now() }));
          } catch {}
          return text;
        }
      }
    } catch {}
  }

  // 2. Fall back to GitHub API endpoint
  try {
    const url = `${BASE_URL}/repos/${repoFullName}/readme`;
    const res = await fetch(url, {
      headers: {
        ...getHeaders(),
        Accept: 'application/vnd.github.v3.raw'
      }
    });
    updateRateLimitFromHeaders(res.headers);
    if (!res.ok) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) return JSON.parse(cached).data;
      } catch {}
      return '# No README found for this repository.';
    }
    const text = await res.text();
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ data: text, timestamp: Date.now() }));
    } catch {}
    return text;
  } catch {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached).data;
    } catch {}
    return '# Failed to load README.';
  }
}

export async function fetchTrendingRepositories(
  period: 'daily' | 'weekly' | 'monthly' = 'daily',
  scope: 'all' | 'apk' = 'all',
  language?: string
): Promise<Repository[]> {
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

  const url = `${BASE_URL}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=30`;

  try {
    const res = await fetch(url, { headers: getHeaders() });
    updateRateLimitFromHeaders(res.headers);
    if (!res.ok) {
      if (scope === 'apk') return CURATED_ANDROID_APKS;
      return [];
    }

    const data = await res.json();
    const items = data.items || [];
    if (items.length === 0 && scope === 'apk') {
      return CURATED_ANDROID_APKS;
    }

    return items.map((item: any) => ({
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
  } catch (err) {
    console.warn('Failed to fetch trending repositories:', err);
    if (scope === 'apk') return CURATED_ANDROID_APKS;
    return [];
  }
}
