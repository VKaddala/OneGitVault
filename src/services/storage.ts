import { Repository } from '../types';

const BOOKMARKS_STORAGE_KEY = 'onegitvault_bookmarks_v1';
const GITHUB_TOKEN_KEY = 'onegitvault_github_token';

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
    try {
      return localStorage.getItem(GITHUB_TOKEN_KEY) || '';
    } catch {
      return '';
    }
  }

  public saveGithubToken(token: string): void {
    try {
      if (token) {
        localStorage.setItem(GITHUB_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(GITHUB_TOKEN_KEY);
      }
    } catch (e) {
      console.warn('Failed to save token to storage', e);
    }
  }
}

export const storageService = new StorageService();
