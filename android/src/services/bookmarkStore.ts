import { Repository } from '../types';

const VAULT_STORAGE_KEY = 'onegitvault_android_vault';

export function getBookmarks(): Repository[] {
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBookmarks(repos: Repository[]): void {
  try {
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(repos));
  } catch (err) {
    console.error('Failed to save bookmarks:', err);
  }
}

export function toggleBookmark(repo: Repository): boolean {
  const current = getBookmarks();
  const exists = current.some(r => r.id === repo.id);
  let updated: Repository[];
  if (exists) {
    updated = current.filter(r => r.id !== repo.id);
  } else {
    updated = [repo, ...current];
  }
  saveBookmarks(updated);
  return !exists;
}

export function isBookmarked(repoId: number): boolean {
  return getBookmarks().some(r => r.id === repoId);
}
