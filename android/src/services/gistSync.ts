// ─── GitHub Gist Bookmark & Star Sync for OneGitVault Android ─────────────────────────────────────────────
// When a PAT token is present, bookmarks are automatically synced to/from a private GitHub Gist
// named "OneGitVault Bookmarks — synced automatically".
// This allows bookmarks to persist seamlessly across devices and reinstalls.

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
  return token.trim().replace(/^(Bearer|token)\s+/i, '');
}

function gistHeaders(token: string): HeadersInit {
  const clean = sanitizeToken(token);
  return {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `Bearer ${clean}`,
    'Content-Type': 'application/json',
  };
}

/** Find the OneGitVault bookmark gist among the user's gists */
export async function findBookmarkGist(token: string): Promise<GistResponse | null> {
  const clean = sanitizeToken(token);
  if (!clean) return null;
  try {
    const res = await fetch('https://api.github.com/gists?per_page=100', {
      headers: gistHeaders(clean),
    });
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
): Promise<GistResponse | null> {
  const clean = sanitizeToken(token);
  if (!clean) return null;
  try {
    const res = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: gistHeaders(clean),
      body: JSON.stringify({
        description: GIST_DESCRIPTION,
        public: false,
        files: {
          [GIST_FILENAME]: { content: JSON.stringify(bookmarks, null, 2) },
        },
      }),
    });
    if (!res.ok) {
      console.warn(`createBookmarkGist failed: HTTP ${res.status}`);
      return null;
    }
    return res.json();
  } catch (e) {
    console.warn('Failed to create bookmark gist:', e);
    return null;
  }
}

/** Update an existing gist with the latest bookmarks */
export async function updateBookmarkGist(
  token: string,
  gistId: string,
  bookmarks: Repository[]
): Promise<boolean> {
  const clean = sanitizeToken(token);
  if (!clean || !gistId) return false;
  try {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: gistHeaders(clean),
      body: JSON.stringify({
        description: GIST_DESCRIPTION,
        files: {
          [GIST_FILENAME]: { content: JSON.stringify(bookmarks, null, 2) },
        },
      }),
    });
    if (!res.ok) {
      console.warn(`updateBookmarkGist failed: HTTP ${res.status}`);
    }
    return res.ok;
  } catch (e) {
    console.warn('Failed to update bookmark gist:', e);
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
      // Fallback: If PATCH failed (e.g., deleted or permission mismatch), create a new Gist
      gist = await createBookmarkGist(clean, bookmarks);
      return gist?.html_url ?? null;
    }
    return gist.html_url;
  } catch (e) {
    console.warn('Gist push failed:', e);
    return null;
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
    const fullRes = await fetch(`https://api.github.com/gists/${gist.id}`, {
      headers: gistHeaders(clean),
    });
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
        const rawRes = await fetch(targetFile.raw_url, {
          headers: { Authorization: `Bearer ${clean}` },
        });
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
      const rawRes = await fetch(rawUrl, {
        headers: { Authorization: `Bearer ${clean}` },
      });
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
    const res = await fetch(
      `https://api.github.com/user/starred?per_page=${perPage}&page=${page}&sort=created&direction=desc`,
      {
        headers: gistHeaders(clean),
      }
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
