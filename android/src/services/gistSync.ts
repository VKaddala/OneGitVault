// ─── GitHub Gist Bookmark & Star Sync for OneGitVault Android ─────────────────────────────────────────────
// When a PAT token is present, bookmarks are automatically synced to/from a private GitHub Gist
// named "OneGitVault Bookmarks — synced automatically".
// This allows bookmarks to persist seamlessly across devices and reinstalls.

import { Repository } from '../types';

const GIST_FILENAME = 'onegitvault-bookmarks.json';
const GIST_DESCRIPTION = 'OneGitVault Bookmarks — synced automatically';

export interface GistSyncResult {
  success: boolean;
  url?: string;
  error?: string;
  status?: number;
}

interface GistFile {
  filename: string;
  content?: string;
  raw_url?: string;
  size?: number;
}

interface GistResponse {
  id: string;
  description: string;
  files: Record<string, GistFile>;
  html_url: string;
}

export function sanitizeToken(token: string): string {
  if (!token) return '';
  return token.trim().replace(/^(Bearer|token)\s+/i, '').replace(/["']/g, '');
}

/**
 * Builds authorization headers supporting both Classic PATs (token prefix)
 * and OAuth / fine-grained tokens (Bearer prefix)
 */
function buildGistHeaders(token: string, useBearerPrefix: boolean = false): HeadersInit {
  const clean = sanitizeToken(token);
  // GitHub classic PATs (ghp_) use 'token ghp_...' natively, OAuth uses 'Bearer ...'
  const prefix = useBearerPrefix ? 'Bearer' : (clean.startsWith('ghp_') ? 'token' : 'Bearer');
  return {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `${prefix} ${clean}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Executes a fetch request with automatic auth scheme fallback (token <-> Bearer)
 */
async function fetchGistWithFallback(
  url: string,
  options: RequestInit,
  token: string
): Promise<Response> {
  const clean = sanitizeToken(token);
  const primaryHeaders = {
    ...options.headers,
    ...buildGistHeaders(clean, false),
  };

  let res = await fetch(url, { ...options, headers: primaryHeaders });

  // If 401 Unauthorized, retry once with the alternative auth prefix
  if (res.status === 401) {
    const secondaryHeaders = {
      ...options.headers,
      ...buildGistHeaders(clean, true),
    };
    const retryRes = await fetch(url, { ...options, headers: secondaryHeaders });
    if (retryRes.ok) return retryRes;
  }

  return res;
}

/** Find the OneGitVault bookmark gist among the user's gists */
export async function findBookmarkGist(token: string): Promise<GistResponse | null> {
  const clean = sanitizeToken(token);
  if (!clean) return null;
  try {
    const res = await fetchGistWithFallback('https://api.github.com/gists?per_page=100', {
      method: 'GET',
    }, clean);

    if (!res.ok) {
      console.warn(`findBookmarkGist failed: HTTP ${res.status}`);
      return null;
    }

    const gists: GistResponse[] = await res.json();
    return (
      gists.find(
        (g) =>
          (g.files && (g.files[GIST_FILENAME] || g.files['onegitvault-android-bookmarks.json'])) ||
          g.description === GIST_DESCRIPTION ||
          (g.description && g.description.includes('OneGitVault'))
      ) ?? null
    );
  } catch (e) {
    console.warn('Failed to find bookmark gist:', e);
    return null;
  }
}

/** Create a new private gist with the bookmarks */
export async function createBookmarkGist(
  token: string,
  bookmarks: Repository[]
): Promise<{ gist: GistResponse | null; error?: string; status?: number }> {
  const clean = sanitizeToken(token);
  if (!clean) return { gist: null, error: 'Token is missing' };
  try {
    const payload = JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false,
      files: {
        [GIST_FILENAME]: { content: JSON.stringify(bookmarks, null, 2) },
      },
    });

    const res = await fetchGistWithFallback('https://api.github.com/gists', {
      method: 'POST',
      body: payload,
    }, clean);

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const message = errJson.message || `HTTP ${res.status}`;
      console.warn(`createBookmarkGist failed: ${message}`);
      return { gist: null, error: message, status: res.status };
    }

    const gist: GistResponse = await res.json();
    return { gist, status: res.status };
  } catch (e: any) {
    console.warn('Failed to create bookmark gist:', e);
    return { gist: null, error: e.message || 'Network error' };
  }
}

/** Update an existing gist with the latest bookmarks */
export async function updateBookmarkGist(
  token: string,
  gistId: string,
  bookmarks: Repository[]
): Promise<{ ok: boolean; error?: string; status?: number }> {
  const clean = sanitizeToken(token);
  if (!clean || !gistId) return { ok: false, error: 'Missing token or gist ID' };
  try {
    const payload = JSON.stringify({
      description: GIST_DESCRIPTION,
      files: {
        [GIST_FILENAME]: { content: JSON.stringify(bookmarks, null, 2) },
      },
    });

    const res = await fetchGistWithFallback(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      body: payload,
    }, clean);

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const message = errJson.message || `HTTP ${res.status}`;
      console.warn(`updateBookmarkGist failed: ${message}`);
      return { ok: false, error: message, status: res.status };
    }
    return { ok: true, status: res.status };
  } catch (e: any) {
    console.warn('Failed to update bookmark gist:', e);
    return { ok: false, error: e.message || 'Network error' };
  }
}

/**
 * Push local bookmarks to GitHub Gist.
 * Validates token compatibility (detects Fine-grained vs Classic PAT).
 * Creates the gist if it doesn't exist yet, otherwise updates it.
 * Returns a GistSyncResult with URL on success, or detailed error description on failure.
 */
export async function pushBookmarksToGist(
  token: string,
  bookmarks: Repository[]
): Promise<GistSyncResult> {
  const clean = sanitizeToken(token);
  if (!clean) {
    return {
      success: false,
      error: 'No GitHub token configured. Please add your Personal Access Token in Settings.',
    };
  }

  // GitHub Fine-grained PATs (starting with github_pat_) DO NOT support the Gists API
  if (clean.startsWith('github_pat_')) {
    return {
      success: false,
      error:
        'Fine-grained tokens (github_pat_) do not support GitHub Gists API. Please create a Classic Token (ghp_) with the "gist" scope selected.',
    };
  }

  try {
    let gist = await findBookmarkGist(clean);

    if (!gist) {
      const createRes = await createBookmarkGist(clean, bookmarks);
      if (createRes.gist) {
        return {
          success: true,
          url: createRes.gist.html_url,
          status: createRes.status,
        };
      }

      let errorMsg = createRes.error || 'Failed to create cloud Gist';
      if (createRes.status === 404) {
        errorMsg = 'GitHub 404: Token lacks "gist" scope. Please ensure "gist" is checked in your GitHub Token settings.';
      } else if (createRes.status === 401) {
        errorMsg = 'GitHub 401: Invalid or expired token. Please verify your token.';
      } else if (createRes.status === 403) {
        errorMsg = 'GitHub 403: API permission denied or rate limited. Ensure token has "gist" scope.';
      }
      return { success: false, error: errorMsg, status: createRes.status };
    }

    const updateRes = await updateBookmarkGist(clean, gist.id, bookmarks);
    if (!updateRes.ok) {
      // Fallback: If PATCH failed (e.g. permission mismatch), attempt to create a fresh Gist
      const createFallback = await createBookmarkGist(clean, bookmarks);
      if (createFallback.gist) {
        return {
          success: true,
          url: createFallback.gist.html_url,
          status: createFallback.status,
        };
      }

      let errorMsg = updateRes.error || 'Failed to update cloud Gist';
      if (updateRes.status === 404) {
        errorMsg = 'GitHub 404: Token lacks "gist" scope. Ensure "gist" is checked in your GitHub Token settings.';
      } else if (updateRes.status === 401) {
        errorMsg = 'GitHub 401: Invalid or expired token. Please verify your token.';
      }
      return { success: false, error: errorMsg, status: updateRes.status };
    }

    return {
      success: true,
      url: gist.html_url,
      status: updateRes.status,
    };
  } catch (e: any) {
    console.warn('Gist push exception:', e);
    return {
      success: false,
      error: e.message || 'Network error occurred during backup',
    };
  }
}

/**
 * Pull bookmarks from GitHub Gist.
 * Fetches the full gist details by ID or raw URL.
 * Returns the parsed bookmark array, or null if none found / on error.
 */
export async function pullBookmarksFromGist(
  token: string
): Promise<Repository[] | null> {
  const clean = sanitizeToken(token);
  if (!clean) return null;
  try {
    const gist = await findBookmarkGist(clean);
    if (!gist) return null;

    // 1. Fetch full gist by ID (GitHub's GET /gists list endpoint omits file contents)
    const fullRes = await fetchGistWithFallback(`https://api.github.com/gists/${gist.id}`, {
      method: 'GET',
    }, clean);

    if (fullRes.ok) {
      const fullGist: GistResponse = await fullRes.json();
      const targetFile =
        fullGist.files?.[GIST_FILENAME] ||
        fullGist.files?.['onegitvault-android-bookmarks.json'] ||
        Object.values(fullGist.files || {})[0];

      if (targetFile?.content) {
        return JSON.parse(targetFile.content) as Repository[];
      }

      // If truncated or content empty, fetch via raw_url
      if (targetFile?.raw_url) {
        const rawRes = await fetchGistWithFallback(targetFile.raw_url, {
          method: 'GET',
        }, clean);
        if (rawRes.ok) {
          const rawText = await rawRes.text();
          return JSON.parse(rawText) as Repository[];
        }
      }
    }

    // 2. Direct raw URL fallback from list item
    const targetFile = gist.files?.[GIST_FILENAME] || gist.files?.['onegitvault-android-bookmarks.json'];
    const rawUrl = targetFile?.raw_url;
    if (rawUrl) {
      const rawRes = await fetchGistWithFallback(rawUrl, {
        method: 'GET',
      }, clean);
      if (rawRes.ok) {
        const rawText = await rawRes.text();
        return JSON.parse(rawText) as Repository[];
      }
    }

    return null;
  } catch (e) {
    console.warn('Gist pull failed:', e);
    return null;
  }
}

/**
 * Fetch all repositories starred by the authenticated user.
 */
export async function fetchUserStarredRepositories(
  token: string,
  page: number = 1,
  perPage: number = 100
): Promise<Repository[]> {
  const clean = sanitizeToken(token);
  if (!clean) return [];
  try {
    const res = await fetchGistWithFallback(
      `https://api.github.com/user/starred?per_page=${perPage}&page=${page}&sort=created&direction=desc`,
      {
        method: 'GET',
      },
      clean
    );
    if (!res.ok) {
      console.warn(`Failed to fetch user starred repositories: HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => ({
      ...item,
      has_apks:
        item.topics &&
        (item.topics.includes('apk') ||
          item.topics.includes('android-app') ||
          item.topics.includes('android')),
    }));
  } catch (e) {
    console.warn('Failed to fetch user starred repos:', e);
    return [];
  }
}
