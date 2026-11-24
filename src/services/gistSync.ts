// ─── GitHub Gist Bookmark Sync ───────────────────────────────────────────────
// When a PAT token is present, bookmarks are synced to a private GitHub Gist
// named "OneGitVault Bookmarks". This allows bookmarks to persist across
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

function gistHeaders(token: string): HeadersInit {
  return {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/** Find the OneGitVault bookmark gist among the user's gists */
async function findBookmarkGist(token: string): Promise<GistResponse | null> {
  const res = await fetch('https://api.github.com/gists?per_page=100', {
    headers: gistHeaders(token),
  });
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
}

/** Create a new private gist with the bookmarks */
async function createBookmarkGist(
  token: string,
  bookmarks: Repository[]
): Promise<GistResponse | null> {
  const res = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: gistHeaders(token),
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false,
      files: {
        [GIST_FILENAME]: { content: JSON.stringify(bookmarks, null, 2) },
      },
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

/** Update an existing gist with the latest bookmarks */
async function updateBookmarkGist(
  token: string,
  gistId: string,
  bookmarks: Repository[]
): Promise<boolean> {
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: gistHeaders(token),
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      files: {
        [GIST_FILENAME]: { content: JSON.stringify(bookmarks, null, 2) },
      },
    }),
  });
  return res.ok;
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
  try {
    let gist = await findBookmarkGist(token);

    if (!gist) {
      gist = await createBookmarkGist(token, bookmarks);
      return gist?.html_url ?? null;
    }

    const ok = await updateBookmarkGist(token, gist.id, bookmarks);
    return ok ? gist.html_url : null;
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
  try {
    const gist = await findBookmarkGist(token);
    if (!gist) return null;

    // 1. Fetch full gist by ID (GitHub's GET /gists list endpoint omits file contents)
    const fullRes = await fetch(`https://api.github.com/gists/${gist.id}`, {
      headers: gistHeaders(token),
    });
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
      const rawRes = await fetch(rawUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
 * Fetch all repositories starred by the authenticated user on GitHub.
 */
export async function fetchUserStarredRepositories(
  token: string,
  page: number = 1,
  perPage: number = 100
): Promise<Repository[]> {
  if (!token) return [];
  try {
    const res = await fetch(
      `https://api.github.com/user/starred?per_page=${perPage}&page=${page}&sort=created&direction=desc`,
      {
        headers: gistHeaders(token),
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
