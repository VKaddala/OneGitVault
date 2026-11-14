// ─── GitHub Gist Bookmark Sync ───────────────────────────────────────────────
// When a PAT token is present, bookmarks are synced to a private GitHub Gist
// named "OneGitVault Bookmarks". This allows bookmarks to persist across
// devices / reinstalls without any external database.

import { Repository } from '../types';

const GIST_FILENAME = 'onegitvault-bookmarks.json';
const GIST_DESCRIPTION = 'OneGitVault Bookmarks — synced automatically';

interface GistFile {
  filename: string;
  content: string;
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
  return gists.find(g => g.description === GIST_DESCRIPTION) ?? null;
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
 * Returns the parsed bookmark array, or null if none found / on error.
 */
export async function pullBookmarksFromGist(
  token: string
): Promise<Repository[] | null> {
  try {
    const gist = await findBookmarkGist(token);
    if (!gist) return null;

    const file = gist.files[GIST_FILENAME];
    if (!file?.content) return null;

    return JSON.parse(file.content) as Repository[];
  } catch (e) {
    console.error('Gist pull failed', e);
    return null;
  }
}
