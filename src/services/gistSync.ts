// ─── GitHub Gist Bookmark Sync for OneGitVault Desktop ─────────────────────────────────────────────
// When a PAT token is present, bookmarks are synced to a private GitHub Gist
// named "OneGitVault Bookmarks — synced automatically". This allows bookmarks to persist across
// devices / reinstalls without any external database.

import { Repository } from '../types';

const GIST_FILENAME = 'onegitvault-bookmarks.json';
const GIST_DESCRIPTION = 'OneGitVault Bookmarks — synced automatically';

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

function sanitizeToken(token: string): string {
  if (!token) return '';
  return token.trim().replace(/^(Bearer|token)\s+/i, '').replace(/["']/g, '');
}

function buildGistHeaders(token: string, useBearerPrefix: boolean = false): HeadersInit {
  const clean = sanitizeToken(token);
  const prefix = useBearerPrefix ? 'Bearer' : (clean.startsWith('ghp_') ? 'token' : 'Bearer');
  return {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `${prefix} ${clean}`,
    'Content-Type': 'application/json',
  };
}

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
async function findBookmarkGist(token: string): Promise<GistResponse | null> {
  const clean = sanitizeToken(token);
  if (!clean) return null;
  try {
    const res = await fetchGistWithFallback('https://api.github.com/gists?per_page=100', {
      method: 'GET',
    }, clean);
    if (!res.ok) return null;

    const gists: GistResponse[] = await res.json();
    return (
      gists.find(
        (g) =>
          (g.files && g.files[GIST_FILENAME]) ||
          g.description === GIST_DESCRIPTION ||
          (g.description && g.description.includes('OneGitVault'))
      ) ?? null
    );
  } catch {
    return null;
  }
}

/** Create a new private gist with the bookmarks */
async function createBookmarkGist(
  token: string,
  bookmarks: Repository[]
): Promise<GistResponse | null> {
  const clean = sanitizeToken(token);
  if (!clean) return null;
  try {
    const res = await fetchGistWithFallback('https://api.github.com/gists', {
      method: 'POST',
      body: JSON.stringify({
        description: GIST_DESCRIPTION,
        public: false,
        files: {
          [GIST_FILENAME]: { content: JSON.stringify(bookmarks, null, 2) },
        },
      }),
    }, clean);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Update an existing gist with the latest bookmarks */
async function updateBookmarkGist(
  token: string,
  gistId: string,
  bookmarks: Repository[]
): Promise<boolean> {
  const clean = sanitizeToken(token);
  if (!clean || !gistId) return false;
  try {
    const res = await fetchGistWithFallback(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        description: GIST_DESCRIPTION,
        files: {
          [GIST_FILENAME]: { content: JSON.stringify(bookmarks, null, 2) },
        },
      }),
    }, clean);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Push local bookmarks to GitHub Gist.
 * Creates the gist if it doesn't exist yet, otherwise updates it.
 * Returns the gist URL on success, null on failure.
 */
export async function pushBookmarksToGist(
  token: string,
  bookmarks: Repository[]
): Promise<string | null> {
  const clean = sanitizeToken(token);
  if (!clean) return null;
  try {
    let gist = await findBookmarkGist(clean);

    if (!gist) {
      gist = await createBookmarkGist(clean, bookmarks);
      return gist?.html_url ?? null;
    }

    const ok = await updateBookmarkGist(clean, gist.id, bookmarks);
    if (!ok) {
      gist = await createBookmarkGist(clean, bookmarks);
      return gist?.html_url ?? null;
    }
    return gist.html_url;
  } catch (e) {
    console.error('Gist push failed', e);
    return null;
  }
}

/**
 * Pull bookmarks from GitHub Gist.
 * Fetches the full gist details by ID or raw URL, handles pagination / truncation properly.
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
      const file = fullGist.files?.[GIST_FILENAME];
      if (file?.content) {
        return JSON.parse(file.content) as Repository[];
      }
    }

    // 2. Direct raw URL fallback
    const rawUrl = gist.files?.[GIST_FILENAME]?.raw_url;
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
    console.error('Gist pull failed', e);
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
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn('Failed to fetch user starred repos:', e);
    return [];
  }
}
