import { Repository } from '../types';
import { pruneExpiredAndOversizedCache } from './cacheManager';

const VAULT_STORAGE_KEY = 'onegitvault_android_vault';
const LEGACY_STORAGE_KEY = 'onegitvault_bookmarks_v1';

export function getBookmarks(): Repository[] {
  try {
    let raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        try {
          localStorage.setItem(VAULT_STORAGE_KEY, raw);
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch {}
      }
    }
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBookmarks(repos: Repository[]): void {
  try {
    const serialized = JSON.stringify(repos);
    try {
      localStorage.setItem(VAULT_STORAGE_KEY, serialized);
    } catch {
      // Clear stale API caches so bookmarks can never be lost due to full cache quota
      pruneExpiredAndOversizedCache(256 * 1024);
      localStorage.setItem(VAULT_STORAGE_KEY, serialized);
    }
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ogv_bookmarks_changed', { detail: repos }));
    }
  } catch (err) {
    console.error('Failed to save bookmarks:', err);
  }
}

export function toggleBookmark(repo: Repository): boolean {
  if (!repo) return false;
  const current = getBookmarks();
  const repoFullNameLower = repo.full_name?.toLowerCase();
  
  const exists = current.some(
    r => (r.id && repo.id && Number(r.id) === Number(repo.id)) ||
         (repoFullNameLower && r.full_name && r.full_name.toLowerCase() === repoFullNameLower)
  );

  let updated: Repository[];
  if (exists) {
    updated = current.filter(
      r => !(
        (r.id && repo.id && Number(r.id) === Number(repo.id)) ||
        (repoFullNameLower && r.full_name && r.full_name.toLowerCase() === repoFullNameLower)
      )
    );
  } else {
    updated = [repo, ...current];
  }

  saveBookmarks(updated);
  return !exists;
}

export function isBookmarked(repoOrId: number | string | Repository): boolean {
  if (repoOrId === null || repoOrId === undefined) return false;
  const current = getBookmarks();

  if (typeof repoOrId === 'number') {
    return current.some(r => Number(r.id) === Number(repoOrId));
  }

  if (typeof repoOrId === 'string') {
    const searchLower = repoOrId.toLowerCase();
    return current.some(r => r.full_name?.toLowerCase() === searchLower || String(r.id) === repoOrId);
  }

  // Object Repository
  const fullNameLower = repoOrId.full_name?.toLowerCase();
  return current.some(
    r => (r.id && repoOrId.id && Number(r.id) === Number(repoOrId.id)) ||
         (fullNameLower && r.full_name && r.full_name.toLowerCase() === fullNameLower)
  );
}
