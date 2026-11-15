import { useState, useCallback, useMemo } from 'react';
import { Repository } from '../types';
import { storageService } from '../services/storage';

export function useBookmarks() {
  const [bookmarks, setBookmarksState] = useState<Repository[]>(() =>
    storageService.getBookmarks()
  );

  const setBookmarks = useCallback((newBookmarks: Repository[]) => {
    setBookmarksState(newBookmarks);
    storageService.saveBookmarks(newBookmarks);
  }, []);

  const isBookmarked = useCallback(
    (repoId: number | string) => bookmarks.some((b) => b.id === repoId),
    [bookmarks]
  );

  const toggleBookmark = useCallback(
    (repo: Repository) => {
      setBookmarksState((prev) => {
        const exists = prev.some((b) => b.id === repo.id);
        const updated = exists ? prev.filter((b) => b.id !== repo.id) : [repo, ...prev];
        storageService.saveBookmarks(updated);
        return updated;
      });
    },
    []
  );

  const removeBookmark = useCallback((repoId: number | string) => {
    setBookmarksState((prev) => {
      const updated = prev.filter((b) => b.id !== repoId);
      storageService.saveBookmarks(updated);
      return updated;
    });
  }, []);

  const clearBookmarks = useCallback(() => {
    setBookmarksState([]);
    storageService.saveBookmarks([]);
  }, []);

  const bookmarksCount = useMemo(() => bookmarks.length, [bookmarks.length]);

  return {
    bookmarks,
    bookmarksCount,
    isBookmarked,
    toggleBookmark,
    removeBookmark,
    clearBookmarks,
    setBookmarks,
  };
}
