/**
 * Type-safe Storage Service (Single Responsibility Principle)
 * Handles persistence to localStorage with error boundaries, fallback defaults,
 * and JSON serialization/deserialization.
 */

class StorageService {
  public getItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (item === null || item === undefined) {
        return defaultValue;
      }
      return JSON.parse(item) as T;
    } catch (e) {
      console.warn(`[StorageService] Failed to read key: ${key}`, e);
      return defaultValue;
    }
  }

  public setItem<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`[StorageService] Failed to write key: ${key}`, e);
      return false;
    }
  }

  public removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[StorageService] Failed to remove key: ${key}`, e);
    }
  }

  public getString(key: string, defaultValue = ''): string {
    try {
      return localStorage.getItem(key) ?? defaultValue;
    } catch {
      return defaultValue;
    }
  }

  public setString(key: string, value: string): void {
    try {
      if (value) {
        localStorage.setItem(key, value.trim());
      } else {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`[StorageService] Failed to set string key: ${key}`, e);
    }
  }
}

export const storageService = new StorageService();
