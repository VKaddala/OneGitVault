import { useState, useEffect, useCallback } from 'react';
import { Repository } from '../types';
import { storageService } from '../services/storage';

const BOOKMARKS_STORAGE_KEY = 'onegitvault_bookmarks_v1';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Repository[]>(() => {
    return storageService.getItem<Repository[]>(BOOKMARKS_STORAGE_KEY, []);
  });

  useEffect(() => {
    storageService.setItem(BOOKMARKS_STORAGE_KEY, bookmarks);
  }, [bookmarks]);

  const isBookmarked = useCallback(
    (repoId: number | string) => {
      return bookmarks.some((b) => b.id === repoId);
    },
    [bookmarks]
  );

  const toggleBookmark = useCallback((repo: Repository) => {
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.id === repo.id);
      if (exists) {
        return prev.filter((b) => b.id !== repo.id);
      } else {
        return [repo, ...prev];
      }
    });
  }, []);

  const removeBookmark = useCallback((repoId: number | string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== repoId));
  }, []);

  const clearBookmarks = useCallback(() => {
    setBookmarks([]);
  }, []);

  return {
    bookmarks,
    bookmarksCount: bookmarks.length,
    isBookmarked,
    toggleBookmark,
    removeBookmark,
    setBookmarks,
    clearBookmarks,
  };
}
