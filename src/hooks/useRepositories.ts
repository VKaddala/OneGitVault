import { useState, useEffect, useCallback, useRef } from 'react';
import { Repository, CategoryId, SortOption } from '../types';
import { CURATED_PROJECTS } from '../data/curatedProjects';
import { fetchRepositories, FetchResult } from '../services/githubApi';

interface UseRepositoriesOptions {
  initialCategory?: CategoryId;
  perPage?: number;
}

export function useRepositories({
  initialCategory = 'all',
  perPage = 40,
}: UseRepositoriesOptions = {}) {
  // Navigation & Filter State
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [minStars, setMinStars] = useState<number>(0);
  const [sortBy, setSortBy] = useState<SortOption>('stars');

  // Query Result State (initialized with curated projects for instant 0ms launch)
  const [repositories, setRepositories] = useState<Repository[]>(() =>
    CURATED_PROJECTS.slice(0, perPage)
  );
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(() => CURATED_PROJECTS.length);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isOfflineFallback, setIsOfflineFallback] = useState<boolean>(false);

  // Debounce search query changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Initial fetch on category, debounced query, or filter change
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setCurrentPage(1);

    fetchRepositories(selectedCategory, debouncedQuery, sortBy, 1, selectedLanguage, minStars, perPage)
      .then((data: FetchResult) => {
        if (isCancelled) return;
        setRepositories(data.repositories);
        setTotalCount(data.totalCount);
        setHasMore(data.hasMore);
        setIsOfflineFallback(data.isOfflineFallback);
      })
      .catch((err) => {
        console.error('Fetch error:', err);
        if (isCancelled) return;
        setRepositories(CURATED_PROJECTS.slice(0, perPage));
        setTotalCount(CURATED_PROJECTS.length);
        setIsOfflineFallback(true);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedCategory, debouncedQuery, sortBy, selectedLanguage, minStars, perPage]);

  // Infinite scroll load more
  const isLoadingMoreRef = useRef(false);
  const loadMore = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasMore || isLoading) return;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const nextPage = currentPage + 1;
      const data = await fetchRepositories(
        selectedCategory,
        debouncedQuery,
        sortBy,
        nextPage,
        selectedLanguage,
        minStars,
        perPage
      );
      if (data.repositories.length === 0) {
        setHasMore(false);
      } else {
        setRepositories((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const newItems = data.repositories.filter((r: Repository) => !existingIds.has(r.id));
          return [...prev, ...newItems];
        });
        setCurrentPage(nextPage);
        setHasMore(data.hasMore);
      }
    } catch (e) {
      console.warn('Failed to load more repositories', e);
      setHasMore(false);
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoading, currentPage, selectedCategory, debouncedQuery, sortBy, selectedLanguage, minStars, perPage]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setCurrentPage(1);
    try {
      const data = await fetchRepositories(
        selectedCategory,
        debouncedQuery,
        sortBy,
        1,
        selectedLanguage,
        minStars,
        perPage
      );
      setRepositories(data.repositories);
      setTotalCount(data.totalCount);
      setHasMore(data.hasMore);
      setIsOfflineFallback(data.isOfflineFallback);
    } catch {
      setRepositories(CURATED_PROJECTS.slice(0, perPage));
      setIsOfflineFallback(true);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, debouncedQuery, sortBy, selectedLanguage, minStars, perPage]);

  return {
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    selectedLanguage,
    setSelectedLanguage,
    minStars,
    setMinStars,
    sortBy,
    setSortBy,
    repositories,
    currentPage,
    totalCount,
    hasMore,
    isLoading,
    isLoadingMore,
    isOfflineFallback,
    loadMore,
    refresh,
  };
}
