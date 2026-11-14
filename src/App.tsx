import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { CategoryNav } from './components/CategoryNav';
import { FilterBar } from './components/FilterBar';
import { ProjectCard } from './components/ProjectCard';
import { TokenModal } from './components/TokenModal';
import { BookmarksModal } from './components/BookmarksModal';
import { RepoDetailPanel } from './components/RepoDetailPanel';
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

  // Pagination & Streaming State (pre-populated with curated projects for instant 0ms startup)
  const [repositories, setRepositories] = useState<Repository[]>(() => CURATED_PROJECTS.slice(0, 40));
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(() => CURATED_PROJECTS.length);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isOfflineFallback, setIsOfflineFallback] = useState<boolean>(false);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo>(getCurrentRateLimit());
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  // Modals & Storage
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState<boolean>(false);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
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

  const handleImportBookmarks = (repos: Repository[]) => {
    setBookmarks(prev => {
      const existingIds = new Set(prev.map(b => b.id));
      const merged = [...prev, ...repos.filter(r => !existingIds.has(r.id))];
      return merged;
    });
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
    <div className="min-h-screen bg-[#FBE9D0] text-[#244855] dark:bg-[#101b20] dark:text-[#FBE9D0] flex flex-col font-sans transition-colors duration-200 selection:bg-flame-brand/30 selection:text-flame-brand">
      
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
          <div className="mb-6 p-4 rounded-2xl bg-[#E64833]/10 border border-[#E64833]/30 dark:bg-[#16272f] dark:border-[#244855] flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#E64833] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-display font-bold text-[#244855] dark:text-[#FBE9D0]">
                  Curated Vault Active (GitHub IP Quota Limit)
                </h4>
                <p className="text-xs font-sans text-[#874F41] dark:text-[#90AEAD] mt-0.5 leading-relaxed">
                  GitHub allows 60 queries/hour without authorization. Connect your Personal Access Token in the top-right corner to unlock 5,000 live requests/hr.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsTokenModalOpen(true)}
              className="text-xs font-mono font-medium px-3 py-1.5 rounded-xl bg-[#E64833] hover:bg-[#c73a27] text-white border border-[#E64833] whitespace-nowrap transition-colors shadow-sm"
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
        <div className="my-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFF9F0] dark:bg-[#16272f] border border-[#e3d1ba] dark:border-[#244855] rounded-2xl p-3.5 shadow-sm transition-colors duration-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E64833] animate-pulse" />
              <h2 className="text-sm sm:text-base font-display font-bold text-[#244855] dark:text-[#FBE9D0] flex items-center gap-2">
                <span>{activeCategoryObj.name}</span>
                {debouncedQuery && (
                  <span className="text-xs font-mono font-normal text-[#874F41] dark:text-[#90AEAD]">
                    matching "<span className="text-[#E64833]">{debouncedQuery}</span>"
                  </span>
                )}
              </h2>
            </div>
            <p className="text-xs font-mono text-[#874F41] dark:text-[#90AEAD] mt-0.5">
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
                  ? 'bg-[#E64833] text-white border-[#E64833] font-semibold shadow-sm'
                  : 'bg-[#FAF0E4] text-[#244855] border-[#e3d1ba] dark:bg-[#101b20] dark:text-[#90AEAD] dark:border-[#244855]'
              }`}
              title="Toggle automatic streaming when scrolling down"
            >
              <Zap className={`w-3.5 h-3.5 ${autoScroll ? 'text-white' : 'text-[#874F41] dark:text-[#90AEAD]'}`} />
              <span>Auto-Stream: {autoScroll ? 'ON' : 'OFF'}</span>
            </button>

            {/* Refresh */}
            <button
              onClick={loadInitialData}
              disabled={isLoading}
              className="flex items-center gap-1.5 text-xs font-mono text-[#244855] hover:text-[#E64833] bg-[#FAF0E4] hover:bg-[#F2DFCA] dark:text-[#90AEAD] dark:hover:text-[#FBE9D0] dark:bg-[#101b20] dark:hover:bg-[#132229] px-3 py-1.5 rounded-xl border border-[#e3d1ba] dark:border-[#244855] transition-colors disabled:opacity-50"
              title="Refresh stream"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#E64833]' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Initial Loading Spinner */}
        {isLoading && (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[#E64833] animate-spin" />
            <p className="text-xs font-mono text-[#874F41] dark:text-[#90AEAD]">
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
                onOpenDetail={(r) => setSelectedRepo(r)}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && displayedRepositories.length === 0 && (
          <div className="py-20 text-center rounded-2xl border border-[#e3d1ba] dark:border-[#244855] bg-[#FFF9F0] dark:bg-[#16272f] p-8">
            <FolderSearch className="w-12 h-12 text-[#874F41]/50 dark:text-[#90AEAD]/50 mx-auto mb-3" />
            <h3 className="text-base font-display font-bold text-[#244855] dark:text-[#FBE9D0]">No repositories found</h3>
            <p className="text-xs font-sans text-[#874F41] dark:text-[#90AEAD] max-w-sm mx-auto mt-1 mb-4">
              We couldn't find any repositories matching your current query.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 text-xs font-mono font-bold text-white bg-[#E64833] hover:bg-[#c73a27] rounded-xl shadow-md transition-all"
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
              <div className="flex items-center gap-2 text-xs font-mono text-[#E64833] py-4 animate-fadeIn">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Streaming next batch of repositories from GitHub...</span>
              </div>
            )}

            {/* Manual Load More button */}
            {!isLoadingMore && hasMore && (
              <button
                onClick={loadNextPage}
                className="group flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#FFF9F0] hover:bg-white text-[#244855] border-[#e3d1ba] dark:bg-[#16272f] dark:hover:bg-[#1c323c] dark:text-[#FBE9D0] dark:hover:text-white border dark:border-[#244855] hover:border-[#E64833]/40 font-mono text-xs shadow-sm transition-all active:scale-95"
              >
                <span>Load Next 40 Repositories</span>
                <span className="text-[11px] text-[#E64833] font-bold">
                  (Page {currentPage + 1})
                </span>
              </button>
            )}

            {/* End of list reached */}
            {!hasMore && (
              <div className="text-center py-6 text-xs font-mono text-[#874F41] dark:text-[#90AEAD]">
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
          className="fixed bottom-6 right-6 p-3 rounded-2xl bg-[#FFF9F0] hover:bg-white text-[#E64833] dark:bg-[#16272f] dark:hover:bg-[#1c323c] dark:text-[#ff5c47] shadow-xl border border-[#e3d1ba] dark:border-[#244855] hover:border-[#E64833]/50 transition-all duration-200 hover:scale-105 z-40"
          title="Scroll to Top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-[#e3d1ba] dark:border-[#1e343e] bg-[#FAF0E4] dark:bg-[#0c1519] py-6 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#874F41] dark:text-[#90AEAD]">
          <div className="flex items-center gap-2">
            <OneGitVaultLogo className="w-5 h-5" />
            <span className="font-display font-bold text-[#244855] dark:text-[#FBE9D0]">OneGitVault</span>
            <span>• Standalone Open Source Observatory</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsTokenModalOpen(true)}
              className="hover:text-[#E64833] transition-colors"
            >
              API Token Settings
            </button>
            <a
              href="https://github.com/trending"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#E64833] transition-colors flex items-center gap-1"
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
        onImportBookmarks={handleImportBookmarks}
      />

      <RepoDetailPanel
        repo={selectedRepo}
        isBookmarked={selectedRepo ? bookmarks.some(b => b.id === selectedRepo.id) : false}
        onClose={() => setSelectedRepo(null)}
        onToggleBookmark={handleToggleBookmark}
      />

    </div>
  );
};
