import { Repository, ReleaseAsset, RateLimitInfo } from '../types';
import { CURATED_ANDROID_APKS } from '../data/curatedAndroidApks';
import { APK_CATEGORIES, EXPLORE_CATEGORIES } from '../data/categories';

const BASE_URL = 'https://api.github.com';
const TOKEN_KEY = 'onegitvault_github_pat';
const LEGACY_TOKEN_KEY = 'onegitvault_android_token';

export function getStoredToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export async function setStoredToken(token: string): Promise<void> {
  try {
    if (token && token.trim()) {
      localStorage.setItem(TOKEN_KEY, token.trim());
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
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'OneGitVault-Android/1.0'
  };
  if (t) {
    headers.Authorization = `Bearer ${t.trim()}`;
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
    'User-Agent': 'OneGitVault-Android/1.0',
  };
  if (token) {
    headers.Authorization = `Bearer ${token.trim()}`;
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

export async function fetchReleases(repoFullName: string): Promise<ReleaseAsset[]> {
  try {
    const url = `${BASE_URL}/repos/${repoFullName}/releases?per_page=5`;
    const res = await fetch(url, { headers: getHeaders() });
    updateRateLimitFromHeaders(res.headers);
    if (!res.ok) return [];

    const releases = await res.json();
    if (!Array.isArray(releases) || releases.length === 0) return [];

    const assets: ReleaseAsset[] = [];
    for (const rel of releases) {
      if (Array.isArray(rel.assets)) {
        for (const a of rel.assets) {
          const isApk = a.name.toLowerCase().endsWith('.apk');
          assets.push({
            id: a.id,
            name: a.name,
            size: a.size,
            download_count: a.download_count,
            browser_download_url: a.browser_download_url,
            content_type: a.content_type,
            is_apk: isApk
          });
        }
      }
    }
    return assets;
  } catch {
    return [];
  }
}

export async function fetchReadme(repoFullName: string): Promise<string> {
  try {
    const url = `${BASE_URL}/repos/${repoFullName}/readme`;
    const res = await fetch(url, {
      headers: {
        ...getHeaders(),
        Accept: 'application/vnd.github.v3.raw'
      }
    });
    updateRateLimitFromHeaders(res.headers);
    if (!res.ok) return '# No README found for this repository.';
    return await res.text();
  } catch {
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
