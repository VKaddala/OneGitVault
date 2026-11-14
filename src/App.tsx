import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { CategoryNav } from './components/CategoryNav';
import { FilterBar } from './components/FilterBar';
import { ProjectCard } from './components/ProjectCard';
import { TokenModal } from './components/TokenModal';
import { BookmarksModal } from './components/BookmarksModal';
import { OneGitVaultLogo } from './components/OneGitVaultLogo';
import { CATEGORIES, CURATED_PROJECTS } from './data/curatedProjects';
import { 
  Repository, 
  CategoryId, 
  SortOption, 
  ViewMode 
} from './types';
import { 
  fetchRepositories, 
  getCurrentRateLimit, 
  RateLimitInfo 
} from './services/githubApi';
import { 
  Loader2, 
  AlertTriangle, 
  RefreshCw, 
  FolderSearch, 
  ArrowUp,
  Zap,
  Globe
} from 'lucide-react';

const BOOKMARKS_STORAGE_KEY = 'onegitvault_bookmarks_v1';
const THEME_STORAGE_KEY = 'onegitvault_theme_mode';

export const App: React.FC = () => {
  // Theme State (Dark default with full Light toggle)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved) return saved === 'dark';
      return true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? 'dark' : 'light');
    } catch (e) {
      // ignore
    }
  }, [isDarkMode]);

  const handleToggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  // Navigation & Search State
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');

  // Filters & Display State
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('stars');
  const [minStars, setMinStars] = useState<number>(0);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [onlyBookmarked, setOnlyBookmarked] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  // Pagination & Streaming State
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isOfflineFallback, setIsOfflineFallback] = useState<boolean>(false);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo>(getCurrentRateLimit());
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  // Modals & Storage
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<Repository[]>(() => {
    try {
      const saved = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const observerTarget = useRef<HTMLDivElement | null>(null);

  // Scroll to Top trigger
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Persist bookmarks
  useEffect(() => {
    try {
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
    } catch (e) {
      console.error('Failed to save bookmarks', e);
    }
  }, [bookmarks]);

  // Initial Fetch & Filter Reset
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setCurrentPage(1);
    try {
      const result = await fetchRepositories(
        selectedCategory,
        debouncedQuery,
        sortBy,
        1,
        selectedLanguage,
        minStars,
        40
      );
      setRepositories(result.repositories);
      setTotalCount(result.totalCount);
      setHasMore(result.hasMore);
      setIsOfflineFallback(result.isOfflineFallback);
      setRateLimit(getCurrentRateLimit());
    } catch (err) {
      console.error('Error fetching initial repositories', err);
      setIsOfflineFallback(true);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, debouncedQuery, sortBy, selectedLanguage, minStars]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load Next Page (Streaming / Infinite Scroll)
  const loadNextPage = useCallback(async () => {
    if (isLoadingMore || isLoading || !hasMore || onlyBookmarked) return;

    setIsLoadingMore(true);
    const nextPage = currentPage + 1;

    try {
      const result = await fetchRepositories(
        selectedCategory,
        debouncedQuery,
        sortBy,
        nextPage,
        selectedLanguage,
        minStars,
        40
      );

      setRepositories(prev => {
        const existingIds = new Set(prev.map(r => r.id));
        const newUnique = result.repositories.filter(r => !existingIds.has(r.id));
        return [...prev, ...newUnique];
      });

      setCurrentPage(nextPage);
      setHasMore(result.hasMore);
      setTotalCount(result.totalCount);
      setIsOfflineFallback(result.isOfflineFallback);
      setRateLimit(getCurrentRateLimit());
    } catch (err) {
      console.error('Error loading next page', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, isLoading, hasMore, onlyBookmarked, currentPage, selectedCategory, debouncedQuery, sortBy, selectedLanguage, minStars]);

  // Intersection Observer for Infinite Scrolling
  useEffect(() => {
    if (!autoScroll || !hasMore || isLoading || isLoadingMore || onlyBookmarked) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadNextPage();
        }
      },
      { threshold: 0.1, rootMargin: '300px' }
    );

    const currentEl = observerTarget.current;
    if (currentEl) {
      observer.observe(currentEl);
    }

    return () => {
      if (currentEl) observer.unobserve(currentEl);
    };
  }, [autoScroll, hasMore, isLoading, isLoadingMore, onlyBookmarked, loadNextPage]);

  // Bookmark actions
  const handleToggleBookmark = (repo: Repository) => {
    setBookmarks(prev => {
      const exists = prev.some(b => b.id === repo.id);
      return exists ? prev.filter(b => b.id !== repo.id) : [repo, ...prev];
    });
  };

  const handleRemoveBookmark = (id: number | string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
  };

  const handleClearAllBookmarks = () => {
    setBookmarks([]);
  };

  const handleSelectTopic = (topic: string) => {
    setSearchQuery(topic);
    window.scrollTo({ top: 320, behavior: 'smooth' });
  };

  const availableLanguages = useMemo(() => {
    return [
      'TypeScript',
      'JavaScript',
      'Python',
      'Rust',
      'Go',
      'C++',
      'C',
      'Java',
      'Dart',
      'Ruby',
      'PHP',
      'Swift',
      'Kotlin',
      'Shell',
      'Lua'
    ];
  }, []);

  // Filtered view
  const displayedRepositories = useMemo(() => {
    let list = [...repositories];

    if (onlyBookmarked) {
      const bookmarkIds = new Set(bookmarks.map(b => b.id));
      list = list.filter(r => bookmarkIds.has(r.id));
    }

    if (selectedLanguage) {
      list = list.filter(r => r.language && r.language.toLowerCase() === selectedLanguage.toLowerCase());
    }

    if (minStars > 0) {
      list = list.filter(r => (r.stargazers_count || 0) >= minStars);
    }

    if (sortBy === 'stars') {
      list.sort((a, b) => b.stargazers_count - a.stargazers_count);
    } else if (sortBy === 'forks') {
      list.sort((a, b) => b.forks_count - a.forks_count);
    } else if (sortBy === 'updated') {
      list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }

    return list;
  }, [repositories, onlyBookmarked, bookmarks, selectedLanguage, minStars, sortBy]);

  const isFiltered = Boolean(
    selectedLanguage || minStars > 0 || onlyBookmarked || debouncedQuery || selectedCategory !== 'all'
  );

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedLanguage('');
    setMinStars(0);
    setOnlyBookmarked(false);
    setSearchQuery('');
  };

  const activeCategoryObj = CATEGORIES.find(c => c.id === selectedCategory) || CATEGORIES[0];

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#fbfbf9] text-[#1c1c21] dark:bg-[#0c0d10] dark:text-[#ececee] flex flex-col font-sans transition-colors duration-200 selection:bg-amber-500/30 selection:text-amber-800 dark:selection:text-amber-200">
      
      {/* Top Navigation */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        bookmarksCount={bookmarks.length}
        onOpenBookmarks={() => setIsBookmarksOpen(true)}
        onOpenTokenModal={() => setIsTokenModalOpen(true)}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        rateLimit={rateLimit}
        isOfflineFallback={isOfflineFallback}
      />

      {/* Hero Showcase */}
      <Hero
        totalReposCount={totalCount > 0 ? totalCount : 50000}
        activeCategoryName={activeCategoryObj.name}
        onSelectTopic={handleSelectTopic}
      />

      {/* Category Tabs */}
      <CategoryNav
        categories={CATEGORIES}
        selectedCategory={selectedCategory}
        onSelectCategory={(id) => {
          setSelectedCategory(id);
          window.scrollTo({ top: 320, behavior: 'smooth' });
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Offline / Rate Limit Notice */}
        {isOfflineFallback && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 dark:bg-amber-950/20 dark:border-amber-500/25 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-brand flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-display font-bold text-amber-700 dark:text-amber-brand">
                  Curated Vault Active (GitHub IP Quota Limit)
                </h4>
                <p className="text-xs font-sans text-amber-800/80 dark:text-amber-200/80 mt-0.5 leading-relaxed">
                  GitHub allows 60 queries/hour without authorization. Connect your Personal Access Token in the top-right corner to unlock 5,000 live requests/hr.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsTokenModalOpen(true)}
              className="text-xs font-mono font-medium px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-brand border border-amber-500/30 whitespace-nowrap transition-colors"
            >
              Add Token
            </button>
          </div>
        )}

        {/* Filter Bar */}
        <FilterBar
          totalResults={displayedRepositories.length}
          sortBy={sortBy}
          onSortChange={setSortBy}
          selectedLanguage={selectedLanguage}
          onLanguageChange={setSelectedLanguage}
          availableLanguages={availableLanguages}
          minStars={minStars}
          onMinStarsChange={setMinStars}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onlyBookmarked={onlyBookmarked}
          onToggleBookmarked={() => setOnlyBookmarked(!onlyBookmarked)}
          onResetFilters={handleResetFilters}
          isFiltered={isFiltered}
        />

        {/* Live Streaming Info Banner */}
        <div className="my-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111217] border border-neutral-200 dark:border-[#20212b] rounded-2xl p-3.5 shadow-sm transition-colors duration-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-brand animate-pulse" />
              <h2 className="text-sm sm:text-base font-display font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <span>{activeCategoryObj.name}</span>
                {debouncedQuery && (
                  <span className="text-xs font-mono font-normal text-neutral-500 dark:text-charcoal-400">
                    matching "<span className="text-amber-700 dark:text-amber-brand">{debouncedQuery}</span>"
                  </span>
                )}
              </h2>
            </div>
            <p className="text-xs font-mono text-neutral-500 dark:text-charcoal-400 mt-0.5">
              {totalCount > 0 
                ? `Loaded ${displayedRepositories.length} of ${totalCount.toLocaleString()} repositories from GitHub`
                : activeCategoryObj.description}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Auto-scroll toggle */}
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border transition-all ${
                autoScroll
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-brand border-amber-500/35 font-semibold'
                  : 'bg-neutral-100 text-neutral-600 border-neutral-300 dark:bg-[#161720] dark:text-charcoal-400 dark:border-[#242634]'
              }`}
              title="Toggle automatic streaming when scrolling down"
            >
              <Zap className={`w-3.5 h-3.5 ${autoScroll ? 'text-amber-600 dark:text-amber-brand' : ''}`} />
              <span>Auto-Stream: {autoScroll ? 'ON' : 'OFF'}</span>
            </button>

            {/* Refresh */}
            <button
              onClick={loadInitialData}
              disabled={isLoading}
              className="flex items-center gap-1.5 text-xs font-mono text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 dark:text-charcoal-300 dark:hover:text-white dark:bg-[#161720] dark:hover:bg-[#1d1f2b] px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-[#242634] transition-colors disabled:opacity-50"
              title="Refresh stream"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-600 dark:text-amber-brand' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Initial Loading Spinner */}
        {isLoading && (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-amber-600 dark:text-amber-brand animate-spin" />
            <p className="text-xs font-mono text-neutral-500 dark:text-charcoal-400">
              Querying GitHub for live repositories...
            </p>
          </div>
        )}

        {/* Repository Grid / List */}
        {!isLoading && displayedRepositories.length > 0 && (
          <div className={
            viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
              : "flex flex-col gap-2.5"
          }>
            {displayedRepositories.map((repo) => (
              <ProjectCard
                key={repo.id}
                repo={repo}
                viewMode={viewMode}
                isBookmarked={bookmarks.some(b => b.id === repo.id)}
                onToggleBookmark={handleToggleBookmark}
                onSelectTopic={handleSelectTopic}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && displayedRepositories.length === 0 && (
          <div className="py-20 text-center rounded-2xl border border-neutral-200 dark:border-[#20212b] bg-white dark:bg-[#111217] p-8">
            <FolderSearch className="w-12 h-12 text-neutral-400 dark:text-charcoal-500 mx-auto mb-3" />
            <h3 className="text-base font-display font-bold text-neutral-800 dark:text-charcoal-200">No repositories found</h3>
            <p className="text-xs font-sans text-neutral-500 dark:text-charcoal-400 max-w-sm mx-auto mt-1 mb-4">
              We couldn't find any repositories matching your current query.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 text-xs font-mono font-bold text-white dark:text-[#0c0d10] bg-amber-600 dark:bg-amber-brand hover:bg-amber-700 dark:hover:bg-amber-glow rounded-xl shadow-md transition-all"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Sentinel for Infinite Scroll & Load More Controls */}
        {!isLoading && displayedRepositories.length > 0 && !onlyBookmarked && (
          <div className="mt-8 py-4 flex flex-col items-center justify-center">
            
            {/* Loading more spinner */}
            {isLoadingMore && (
              <div className="flex items-center gap-2 text-xs font-mono text-amber-700 dark:text-amber-brand py-4 animate-fadeIn">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Streaming next batch of repositories from GitHub...</span>
              </div>
            )}

            {/* Manual Load More button */}
            {!isLoadingMore && hasMore && (
              <button
                onClick={loadNextPage}
                className="group flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-300 dark:bg-[#161720] dark:hover:bg-[#1d1f2b] dark:text-charcoal-200 dark:hover:text-white border dark:border-[#262836] hover:border-amber-500/40 font-mono text-xs shadow-sm transition-all active:scale-95"
              >
                <span>Load Next 40 Repositories</span>
                <span className="text-[11px] text-amber-600 dark:text-amber-brand font-bold">
                  (Page {currentPage + 1})
                </span>
              </button>
            )}

            {/* End of list reached */}
            {!hasMore && (
              <div className="text-center py-6 text-xs font-mono text-neutral-400 dark:text-charcoal-400">
                <span>✦ End of available search stream for this query.</span>
              </div>
            )}

            {/* Hidden observer target element */}
            <div ref={observerTarget} className="h-10 w-full pointer-events-none" />

          </div>
        )}

      </main>

      {/* Floating Scroll to Top button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 rounded-2xl bg-white hover:bg-neutral-50 text-amber-700 dark:bg-[#181922] dark:hover:bg-[#222432] dark:text-amber-brand shadow-xl border border-neutral-200 dark:border-[#2b2d3d] hover:border-amber-500/50 transition-all duration-200 hover:scale-105 z-40"
          title="Scroll to Top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-neutral-200 dark:border-[#1e2029] bg-neutral-50 dark:bg-[#090a0d] py-6 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-neutral-500 dark:text-charcoal-400">
          <div className="flex items-center gap-2">
            <OneGitVaultLogo className="w-5 h-5" />
            <span className="font-display font-bold text-neutral-700 dark:text-charcoal-300">OneGitVault</span>
            <span>• Standalone Open Source Observatory</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsTokenModalOpen(true)}
              className="hover:text-amber-600 dark:hover:text-amber-brand transition-colors"
            >
              API Token Settings
            </button>
            <a
              href="https://github.com/trending"
              target="_blank"
              rel="noreferrer"
              className="hover:text-amber-600 dark:hover:text-amber-brand transition-colors flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>GitHub Trending</span>
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <TokenModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        rateLimit={rateLimit}
        onTokenUpdated={loadInitialData}
      />

      <BookmarksModal
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        bookmarks={bookmarks}
        onRemoveBookmark={handleRemoveBookmark}
        onClearAll={handleClearAllBookmarks}
      />

    </div>
  );
};
