import { Repository, CategoryId, SortOption, Release } from '../types';
import { CURATED_PROJECTS } from '../data/curatedProjects';

const CACHE_PREFIX = 'onegitvault_cache_v1_';
const TOKEN_KEY = 'onegitvault_github_pat';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours persistent cache

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date | null;
  searchLimit?: number;
  searchRemaining?: number;
  searchResetTime?: Date | null;
}

let currentRateLimit: RateLimitInfo = {
  limit: 60,
  remaining: 60,
  resetTime: null,
  searchLimit: 10,
  searchRemaining: 10,
  searchResetTime: null,
};

export function getStoredToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredToken(token: string): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token.trim());
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    // Update live rate limit quota with new token
    checkLiveRateLimit().catch(() => {});
  } catch (e) {
    console.error('Failed to store GitHub token', e);
  }
}

export function getCurrentRateLimit(): RateLimitInfo {
  return currentRateLimit;
}

/**
 * Checks if the authenticated user has starred a repository on GitHub.
 * Returns true if starred (204 No Content), false otherwise.
 */
export async function checkIsRepoStarred(fullName: string): Promise<boolean> {
  const token = getStoredToken();
  if (!token) return false;

  try {
    const res = await fetch(`https://api.github.com/user/starred/${fullName}`, {
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

/**
 * Stars a repository on GitHub for the authenticated user.
 * Returns true if successful (204 No Content).
 */
export async function starRepository(fullName: string): Promise<boolean> {
  const token = getStoredToken();
  if (!token) return false;

  try {
    const res = await fetch(`https://api.github.com/user/starred/${fullName}`, {
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

/**
 * Unstars a repository on GitHub for the authenticated user.
 * Returns true if successful (204 No Content).
 */
export async function unstarRepository(fullName: string): Promise<boolean> {
  const token = getStoredToken();
  if (!token) return false;

  try {
    const res = await fetch(`https://api.github.com/user/starred/${fullName}`, {
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

type RateLimitListener = (info: RateLimitInfo) => void;
let onRateLimitChange: RateLimitListener | null = null;

export function setRateLimitListener(listener: RateLimitListener): void {
  onRateLimitChange = listener;
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
      // GitHub Search API rate limit pool (30 req/min authenticated, 10 req/min unauthenticated)
      currentRateLimit = {
        ...currentRateLimit,
        searchLimit: parsedLimit,
        searchRemaining: parsedRemaining,
        searchResetTime: parsedReset,
      };
    } else {
      // GitHub Core API rate limit pool (5,000 req/hr authenticated, 60 req/hr unauthenticated)
      currentRateLimit = {
        ...currentRateLimit,
        limit: parsedLimit,
        remaining: parsedRemaining,
        resetTime: parsedReset,
      };
    }

    if (onRateLimitChange) {
      onRateLimitChange(currentRateLimit);
    }
  }
}

/**
 * Queries GitHub's /rate_limit endpoint.
 * Note: Accessing this endpoint does NOT count against your rate limit.
 */
export async function checkLiveRateLimit(): Promise<RateLimitInfo> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch('https://api.github.com/rate_limit', { headers });
    if (res.ok) {
      const data = await res.json();
      const core = data?.resources?.core || data?.rate;
      const search = data?.resources?.search;
      if (core) {
        currentRateLimit = {
          limit: core.limit ?? (token ? 5000 : 60),
          remaining: core.remaining ?? 60,
          resetTime: core.reset ? new Date(core.reset * 1000) : null,
          searchLimit: search?.limit ?? (token ? 30 : 10),
          searchRemaining: search?.remaining ?? (token ? 30 : 10),
          searchResetTime: search?.reset ? new Date(search.reset * 1000) : null,
        };
        if (onRateLimitChange) {
          onRateLimitChange(currentRateLimit);
        }
      }
    }
  } catch (e) {
    console.warn('Failed to query live GitHub rate limit', e);
  }
  return currentRateLimit;
}

export interface FetchResult {
  repositories: Repository[];
  isOfflineFallback: boolean;
  totalCount: number;
  hasMore: boolean;
  page: number;
  isRateLimited?: boolean;
  rateLimitResetSec?: number;
}

/**
 * Builds valid GitHub Search API queries.
 * Note: GitHub Search syntax does NOT allow nested parentheses like (topic:a OR topic:b).
 * Each category uses a primary topic qualifier verified to return thousands of live repositories.
 */
export function buildSearchQuery(
  category: CategoryId,
  searchQuery: string = '',
  language: string = '',
  minStars: number = 0
): string {
  const qParts: string[] = [];

  // 1. Search Query keyword(s)
  if (searchQuery.trim()) {
    qParts.push(searchQuery.trim());
  }

  // 2. Category Topic Qualifier
  switch (category) {
    case 'ai-ml':
      qParts.push('topic:machine-learning');
      break;
    case 'web-frameworks':
      qParts.push('topic:frontend');
      break;
    case 'devops-cloud':
      qParts.push('topic:devops');
      break;
    case 'developer-tools':
      qParts.push('topic:developer-tools');
      break;
    case 'databases':
      qParts.push('topic:database');
      break;
    case 'mobile-crossplatform':
      qParts.push('topic:mobile');
      break;
    case 'cybersecurity':
      qParts.push('topic:security');
      break;
    case 'android-apks':
      qParts.push('topic:android-app');
      break;
    case 'videography-media':
      qParts.push('topic:video');
      break;
    case 'all':
    default:
      break;
  }

  // 3. Language Filter
  if (language && language.trim()) {
    const lang = language.trim().toLowerCase();
    if (lang === 'c++') {
      qParts.push('language:cpp');
    } else if (lang === 'c#') {
      qParts.push('language:csharp');
    } else if (lang.includes(' ')) {
      qParts.push(`language:"${lang}"`);
    } else {
      qParts.push(`language:${lang}`);
    }
  }

  // 4. Min Stars Qualifier
  if (minStars > 0) {
    qParts.push(`stars:>=${minStars}`);
  }

  // 5. If query has no qualifiers, query open-source repos with stars:>=0 (all repositories with 0 or more stars)
  if (qParts.length === 0) {
    qParts.push('stars:>=0');
  }

  return qParts.join(' ');
}

export async function fetchRepositories(
  category: CategoryId,
  searchQuery: string = '',
  sortBy: SortOption = 'stars',
  page: number = 1,
  language: string = '',
  minStars: number = 0,
  perPage: number = 40,
  forceRefresh: boolean = false
): Promise<FetchResult> {
  const token = getStoredToken();
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const query = buildSearchQuery(category, searchQuery, language, minStars);
  const sortParam = sortBy === 'updated' ? 'updated' : sortBy === 'forks' ? 'forks' : 'stars';
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=${sortParam}&order=desc&per_page=${perPage}&page=${page}`;

  const cacheKey = `${CACHE_PREFIX}${query}_${sortParam}_${page}_${perPage}`;

  // Try reading from persistent localStorage (instant 0ms response on launch) unless forceRefresh is true
  if (!forceRefresh) {
    try {
      const cachedStr = localStorage.getItem(cacheKey);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (Date.now() - (cached.timestamp || 0) < CACHE_TTL_MS && Array.isArray(cached.repositories) && cached.repositories.length > 0) {
          return {
            repositories: cached.repositories,
            isOfflineFallback: false,
            totalCount: cached.totalCount || cached.repositories.length,
            hasMore: cached.hasMore ?? (page * perPage < (cached.totalCount || 0)),
            page,
          };
        }
      }
    } catch (e) {
      // ignore storage errors
    }
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000); // 9s timeout for GitHub Search API

    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeoutId);

    // Track rate limit headers
    updateRateLimitFromHeaders(res.headers);

    if (!res.ok) {
      console.warn(`GitHub API search failed (${res.status} ${res.statusText}) for query "${query}".`);

      const isRateLimited = res.status === 403 || res.status === 429;
      // If page > 1 and rate limited (e.g. 30 search reqs/min reached): NEVER kill stream or fallback to empty array
      if (page > 1 && isRateLimited) {
        const retryAfter = res.headers.get('retry-after');
        const resetHeader = res.headers.get('x-ratelimit-reset');
        let waitSec = 30;
        if (retryAfter) {
          waitSec = parseInt(retryAfter, 10);
        } else if (resetHeader) {
          const resetTime = parseInt(resetHeader, 10) * 1000;
          waitSec = Math.max(5, Math.ceil((resetTime - Date.now()) / 1000));
        }
        return {
          repositories: [],
          isOfflineFallback: false,
          totalCount: 0,
          hasMore: true, // Keep stream open!
          page,
          isRateLimited: true,
          rateLimitResetSec: waitSec,
        };
      }

      return getFallbackResults(category, searchQuery, sortBy, page, perPage, language, minStars);
    }

    const data = await res.json();
    const totalCount = data.total_count || 0;
    const items = data.items || [];

    const mapped: Repository[] = items.map((item: any) => ({
      id: item.id,
      name: item.name,
      full_name: item.full_name,
      owner: {
        login: item.owner?.login || '',
        avatar_url: item.owner?.avatar_url || '',
        html_url: item.owner?.html_url || '',
      },
      description: item.description,
      html_url: item.html_url,
      homepage: item.homepage,
      stargazers_count: item.stargazers_count,
      forks_count: item.forks_count,
      open_issues_count: item.open_issues_count,
      language: item.language,
      topics: item.topics || [],
      updated_at: item.updated_at,
      created_at: item.created_at,
      category: category,
      license: item.license
        ? {
            key: item.license.key,
            name: item.license.name,
            spdx_id: item.license.spdx_id,
          }
        : null,
    }));

    const hasMore = items.length === perPage && page * perPage < Math.min(totalCount, 1000);

    // Save to persistent cache
    try {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          repositories: mapped,
          totalCount,
          hasMore,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      // ignore cache errors
    }

    return {
      repositories: mapped,
      isOfflineFallback: false,
      totalCount,
      hasMore,
      page,
    };
  } catch (error) {
    console.warn('Network or API request failed:', error);
    if (page > 1) {
      return {
        repositories: [],
        isOfflineFallback: false,
        totalCount: 0,
        hasMore: true,
        page,
        isRateLimited: true,
        rateLimitResetSec: 15,
      };
    }
    return getFallbackResults(category, searchQuery, sortBy, page, perPage, language, minStars);
  }
}

function getFallbackResults(
  category: CategoryId,
  searchQuery: string,
  sortBy: SortOption,
  page: number,
  perPage: number,
  language: string = '',
  minStars: number = 0
): FetchResult {
  let list = [...CURATED_PROJECTS];

  if (category !== 'all') {
    list = list.filter((item) => item.category === category);
  }

  if (language) {
    list = list.filter(
      (item) => item.language && item.language.toLowerCase() === language.toLowerCase()
    );
  }

  if (minStars > 0) {
    list = list.filter((item) => (item.stargazers_count || 0) >= minStars);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.full_name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        item.topics.some((t) => t.toLowerCase().includes(q)) ||
        (item.language && item.language.toLowerCase().includes(q))
    );
  }

  if (sortBy === 'stars') {
    list.sort((a, b) => b.stargazers_count - a.stargazers_count);
  } else if (sortBy === 'forks') {
    list.sort((a, b) => b.forks_count - a.forks_count);
  } else if (sortBy === 'updated') {
    list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  const start = (page - 1) * perPage;
  const pagedList = list.slice(start, start + perPage);

  return {
    repositories: pagedList,
    isOfflineFallback: true,
    totalCount: list.length,
    hasMore: start + perPage < list.length,
    page,
  };
}

/**
 * Fetches recent GitHub releases and their downloadable binary assets
 */
export async function fetchRepositoryReleases(fullName: string): Promise<Release[]> {
  const token = getStoredToken();
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'OneGitVault-Desktop',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${fullName}/releases?per_page=10`, {
      headers,
    });
    updateRateLimitFromHeaders(res.headers);
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    if (Array.isArray(data)) {
      return data as Release[];
    }
    return [];
  } catch (e) {
    console.error(`Failed to fetch releases for ${fullName}`, e);
    return [];
  }
}

/**
 * Fetches live trending GitHub repositories for the selected period & language
 */
export async function fetchTrendingRepositories(
  period: 'daily' | 'weekly' | 'monthly' = 'daily',
  language?: string
): Promise<Repository[]> {
  const now = new Date();
  let daysAgo = 3;
  if (period === 'weekly') daysAgo = 7;
  if (period === 'monthly') daysAgo = 30;

  const targetDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const dateStr = targetDate.toISOString().split('T')[0];

  let query = `created:>=${dateStr}`;
  if (language) {
    query += ` language:${language}`;
  }

  const token = getStoredToken();
  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'OneGitVault-Desktop',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=30`;
  try {
    const res = await fetch(url, { headers });
    updateRateLimitFromHeaders(res.headers);
    if (res.ok) {
      const data = await res.json();
      const items = data.items || [];
      return items.map((item: any) => ({
        id: item.id,
        name: item.name,
        full_name: item.full_name,
        owner: {
          login: item.owner?.login || '',
          avatar_url: item.owner?.avatar_url || '',
          html_url: item.owner?.html_url || '',
        },
        description: item.description,
        html_url: item.html_url,
        homepage: item.homepage,
        stargazers_count: item.stargazers_count,
        forks_count: item.forks_count,
        open_issues_count: item.open_issues_count,
        language: item.language,
        topics: item.topics || [],
        updated_at: item.updated_at,
        created_at: item.created_at,
        category: 'all',
        license: item.license
          ? {
              key: item.license.key,
              name: item.license.name,
              spdx_id: item.license.spdx_id,
            }
          : null,
      }));
    }
  } catch (e) {
    console.error('Failed to fetch trending repos from GitHub', e);
  }

  // Graceful fallback to top curated projects
  let fallback = CURATED_PROJECTS;
  if (language) {
    fallback = fallback.filter((r) => r.language?.toLowerCase() === language.toLowerCase());
  }
  return fallback.slice(0, 20);
}
