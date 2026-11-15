import { useState, useEffect, useCallback, useRef } from 'react';
import { Repository, CategoryId, SortOption } from '../types';
import { CURATED_PROJECTS } from '../data/curatedProjects';
import { fetchRepositories } from '../services/githubApi';

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
      setDebouncedQuery(searchQuery.trim());
    }, 450);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load initial page whenever filters change
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setCurrentPage(1);

    fetchRepositories(selectedCategory, debouncedQuery, sortBy, 1, selectedLanguage, minStars, perPage)
      .then((res) => {
        if (isCancelled) return;
        setRepositories(res.repositories);
        setTotalCount(res.totalCount);
        setHasMore(res.hasMore);
        setIsOfflineFallback(res.isOfflineFallback);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error('Failed to load repositories', err);
        setIsOfflineFallback(true);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedCategory, debouncedQuery, sortBy, selectedLanguage, minStars, perPage]);

  // Load next page
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || isLoading) return;

    setIsLoadingMore(true);
    const nextPage = currentPage + 1;

    try {
      const res = await fetchRepositories(
        selectedCategory,
        debouncedQuery,
        sortBy,
        nextPage,
        selectedLanguage,
        minStars,
        perPage
      );

      setRepositories((prev) => {
        // Prevent duplicate repository entries
        const existingIds = new Set(prev.map((r) => r.id));
        const newOnes = res.repositories.filter((r) => !existingIds.has(r.id));
        return [...prev, ...newOnes];
      });

      setCurrentPage(nextPage);
      setHasMore(res.hasMore);
      setIsOfflineFallback(res.isOfflineFallback);
    } catch (err) {
      console.error('Failed to load more repositories', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    isLoadingMore,
    hasMore,
    isLoading,
    currentPage,
    selectedCategory,
    debouncedQuery,
    sortBy,
    selectedLanguage,
    minStars,
    perPage,
  ]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    fetchRepositories(selectedCategory, debouncedQuery, sortBy, 1, selectedLanguage, minStars, perPage)
      .then((res) => {
        setRepositories(res.repositories);
        setTotalCount(res.totalCount);
        setHasMore(res.hasMore);
        setIsOfflineFallback(res.isOfflineFallback);
        setCurrentPage(1);
      })
      .finally(() => setIsLoading(false));
  }, [selectedCategory, debouncedQuery, sortBy, selectedLanguage, minStars, perPage]);

  return {
    // Filter properties
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

    // Data properties
    repositories,
    currentPage,
    totalCount,
    hasMore,
    isLoading,
    isLoadingMore,
    isOfflineFallback,

    // Actions
    loadMore,
    refresh,
  };
}
