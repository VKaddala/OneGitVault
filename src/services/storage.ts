import { Repository } from '../types';
import { getStoredToken, setStoredToken } from './githubApi';

const BOOKMARKS_STORAGE_KEY = 'onegitvault_bookmarks_v1';
const LEGACY_GITHUB_TOKEN_KEY = 'onegitvault_github_token';

class StorageService {
  public getBookmarks(): Repository[] {
    try {
      const data = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Failed to read bookmarks from storage', e);
      return [];
    }
  }

  public saveBookmarks(bookmarks: Repository[]): void {
    try {
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
    } catch (e) {
      console.warn('Failed to save bookmarks to storage', e);
    }
  }

  public getGithubToken(): string {
    // Unify with getStoredToken and support legacy token key
    const token = getStoredToken();
    if (token) return token;
    try {
      return localStorage.getItem(LEGACY_GITHUB_TOKEN_KEY) || '';
    } catch {
      return '';
    }
  }

  public saveGithubToken(token: string): void {
    setStoredToken(token);
    try {
      if (token) {
        localStorage.setItem(LEGACY_GITHUB_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(LEGACY_GITHUB_TOKEN_KEY);
      }
    } catch {
      // ignore
    }
  }
}

export const storageService = new StorageService();
