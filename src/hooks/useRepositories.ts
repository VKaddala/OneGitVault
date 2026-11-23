import { useState, useEffect, useCallback, useRef } from 'react';
import { Repository, CategoryId, SortOption } from '../types';
import { CURATED_PROJECTS } from '../data/curatedProjects';
import { fetchRepositories, FetchResult } from '../services/githubApi';

export function useRepositories(perPage: number = 40) {
  // Navigation & Filter State
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
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
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isOfflineFallback, setIsOfflineFallback] = useState<boolean>(false);
  const [searchCooldownSec, setSearchCooldownSec] = useState<number>(0);

  // Debounce search query changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Cooldown countdown timer for Search API (30 reqs/min limit)
  useEffect(() => {
    if (searchCooldownSec <= 0) return;
    const timer = setInterval(() => {
      setSearchCooldownSec((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [searchCooldownSec]);

  // Initial fetch on category, debounced query, or filter change
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setCurrentPage(1);
    setSearchCooldownSec(0);

    fetchRepositories(selectedCategory, debouncedQuery, sortBy, 1, selectedLanguage, minStars, perPage)
      .then((data: FetchResult) => {
        if (isCancelled) return;
        setRepositories(data.repositories);
        setTotalCount(data.totalCount);
        setHasMore(data.hasMore);
        setIsOfflineFallback(data.isOfflineFallback);
        if (data.isRateLimited) {
          setSearchCooldownSec(data.rateLimitResetSec || 30);
        }
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

  // Infinite scroll load more with polite pacing to protect from GitHub secondary rate limits
  const isLoadingMoreRef = useRef(false);
  const lastLoadMoreTimeRef = useRef(0);

  const loadMore = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasMore || isLoading || searchCooldownSec > 0) return;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      // Pacing delay: enforce at least 1,200ms between consecutive search page queries
      const now = Date.now();
      const elapsed = now - lastLoadMoreTimeRef.current;
      if (elapsed < 1200) {
        await new Promise((r) => setTimeout(r, 1200 - elapsed));
      }
      lastLoadMoreTimeRef.current = Date.now();

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

      if (data.isRateLimited) {
        // Paused due to GitHub search API rate limit (30 queries/min)
        // Keep hasMore = true so stream resumes after cooldown!
        setSearchCooldownSec(data.rateLimitResetSec || 30);
        return;
      }

      if (data.repositories.length === 0) {
        // Only mark hasMore = false if totalCount reached or legitimately empty
        if (currentPage * perPage >= totalCount || data.isOfflineFallback) {
          setHasMore(false);
        }
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
      // Do not kill hasMore permanently on transient network error
      setSearchCooldownSec(15);
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoading, searchCooldownSec, currentPage, totalCount, selectedCategory, debouncedQuery, sortBy, selectedLanguage, minStars, perPage]);

  const retryLoadMore = useCallback(() => {
    setSearchCooldownSec(0);
    setTimeout(() => {
      loadMore();
    }, 100);
  }, [loadMore]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setCurrentPage(1);
    setSearchCooldownSec(0);
    try {
      const [data] = await Promise.all([
        fetchRepositories(
          selectedCategory,
          debouncedQuery,
          sortBy,
          1,
          selectedLanguage,
          minStars,
          perPage,
          true // forceRefresh: bypass cache and perform live GitHub search
        ),
        new Promise((resolve) => setTimeout(resolve, 350)),
      ]);

      setRepositories(data.repositories);
      setTotalCount(data.totalCount);
      setHasMore(data.hasMore);
      setIsOfflineFallback(data.isOfflineFallback);
    } catch {
      setRepositories(CURATED_PROJECTS.slice(0, perPage));
      setIsOfflineFallback(true);
    } finally {
      setIsRefreshing(false);
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
    isRefreshing,
    isOfflineFallback,
    searchCooldownSec,
    loadMore,
    retryLoadMore,
    refresh,
  };
}
