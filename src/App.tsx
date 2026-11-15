import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { CategoryNav } from './components/CategoryNav';
import { FilterBar } from './components/FilterBar';
import { ProjectCard } from './components/ProjectCard';
import { TokenModal } from './components/TokenModal';
import { BookmarksModal } from './components/BookmarksModal';
import { RepoDetailPanel } from './components/RepoDetailPanel';
import { OneGitVaultLogo } from './components/OneGitVaultLogo';
import { CATEGORIES } from './data/curatedProjects';
import { Repository, ViewMode } from './types';
import { rateLimitManager, RateLimitInfo } from './services/rateLimit';
import { useRepositories } from './hooks/useRepositories';
import { useBookmarks } from './hooks/useBookmarks';
import { 
  Loader2, 
  RefreshCw, 
  FolderSearch, 
  ArrowUp,
  Zap,
  Globe
} from 'lucide-react';

export const App: React.FC = () => {
  // Domain Hooks (Single Responsibility & Modular State)
  const {
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
  } = useRepositories();

  const {
    bookmarks,
    bookmarksCount,
    isBookmarked,
    toggleBookmark,
    removeBookmark,
    clearBookmarks,
    setBookmarks,
  } = useBookmarks();

  // Local View State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [onlyBookmarked, setOnlyBookmarked] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  // Modals & Inspection State
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState<boolean>(false);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

  // Rate limit subscription
  const [rateLimit, setRateLimit] = useState<RateLimitInfo>(rateLimitManager.get());
  useEffect(() => {
    return rateLimitManager.subscribe(setRateLimit);
  }, []);

  const observerTarget = useRef<HTMLDivElement | null>(null);

  // Scroll to Top trigger
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // IntersectionObserver for continuous auto-streaming
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && autoScroll && !isLoading && !isLoadingMore && hasMore && !onlyBookmarked) {
          loadMore();
        }
      },
      { root: null, rootMargin: '300px', threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [autoScroll, isLoading, isLoadingMore, hasMore, onlyBookmarked, loadMore]);

  // Filtered repositories (vault only toggle)
  const displayedRepositories = useMemo(() => {
    if (onlyBookmarked) {
      return repositories.filter((r) => isBookmarked(r.id));
    }
    return repositories;
  }, [repositories, onlyBookmarked, isBookmarked]);

  const activeCategoryObj = useMemo(() => {
    return CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];
  }, [selectedCategory]);

  const isFiltered = Boolean(
    searchQuery.trim() ||
    selectedLanguage ||
    minStars > 0 ||
    sortBy !== 'stars' ||
    onlyBookmarked
  );

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedLanguage('');
    setMinStars(0);
    setSortBy('stars');
    setOnlyBookmarked(false);
  }, [setSearchQuery, setSelectedLanguage, setMinStars, setSortBy]);

  const availableLanguages = useMemo(() => {
    const set = new Set<string>();
    for (const r of repositories) {
      if (r.language) set.add(r.language);
    }
    return Array.from(set).sort();
  }, [repositories]);

  return (
    <div className="min-h-screen bg-canvas text-txt-primary flex flex-col font-sans transition-colors duration-200">

      {/* Top Application Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        bookmarksCount={bookmarksCount}
        onOpenBookmarks={() => setIsBookmarksOpen(true)}
        onOpenTokenModal={() => setIsTokenModalOpen(true)}
        rateLimit={rateLimit}
        isOfflineFallback={isOfflineFallback}
      />

      {/* Hero Welcome Banner */}
      <Hero
        totalReposCount={totalCount}
        activeCategoryName={activeCategoryObj.name}
        onSelectTopic={(topic) => setSearchQuery(topic)}
      />

      {/* Technology Category Navigation Bar */}
      <CategoryNav
        categories={CATEGORIES}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-16">

        {/* Global Filter & Sorting Control Toolbar */}
        <FilterBar
          totalResults={totalCount}
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
          onToggleBookmarked={() => setOnlyBookmarked((prev) => !prev)}
          onResetFilters={handleResetFilters}
          isFiltered={isFiltered}
        />

        {/* Live Streaming Info Banner */}
        <div className="my-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface border border-themeline rounded-2xl p-3.5 shadow-sm transition-colors duration-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-action animate-pulse" />
              <h2 className="text-sm sm:text-base font-display font-bold text-txt-primary flex items-center gap-2">
                <span>{activeCategoryObj.name}</span>
                {searchQuery.trim() && (
                  <span className="text-xs font-mono font-normal text-txt-muted">
                    matching "<span className="text-action">{searchQuery}</span>"
                  </span>
                )}
              </h2>
            </div>
            <p className="text-xs font-mono text-txt-muted mt-0.5">
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
                  ? 'bg-action text-txt-inverse border-action font-semibold shadow-sm'
                  : 'bg-surface-active text-txt-muted border-themeline'
              }`}
              title="Toggle automatic streaming when scrolling down"
            >
              <Zap className={`w-3.5 h-3.5 ${autoScroll ? 'text-txt-inverse' : 'text-action'}`} />
              <span>Auto-Stream: {autoScroll ? 'ON' : 'OFF'}</span>
            </button>

            {/* Refresh */}
            <button
              onClick={refresh}
              disabled={isLoading}
              className="flex items-center gap-1.5 text-xs font-mono text-txt-secondary hover:text-action bg-surface-active hover:bg-surface px-3 py-1.5 rounded-xl border border-themeline transition-colors disabled:opacity-50"
              title="Refresh stream"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-action' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-action animate-spin" />
            <p className="text-xs font-mono text-txt-muted">
              Discovering repositories across GitHub...
            </p>
          </div>
        )}

        {/* Repositories Grid / List */}
        {!isLoading && (
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'flex flex-col gap-3'
          }>
            {displayedRepositories.map((repo) => (
              <ProjectCard
                key={repo.id}
                repo={repo}
                viewMode={viewMode}
                isBookmarked={isBookmarked(repo.id)}
                onToggleBookmark={toggleBookmark}
                onSelectTopic={(topic) => setSearchQuery(topic)}
                onOpenDetail={(r) => setSelectedRepo(r)}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && displayedRepositories.length === 0 && (
          <div className="py-20 text-center bg-surface border border-themeline rounded-2xl p-8 my-6 shadow-sm">
            <FolderSearch className="w-12 h-12 text-txt-muted/50 mx-auto mb-3" />
            <h3 className="text-base font-display font-bold text-txt-primary">No repositories found</h3>
            <p className="text-xs font-sans text-txt-muted max-w-sm mx-auto mt-1 mb-4">
              {onlyBookmarked 
                ? 'You have not saved any repositories matching this category to your vault yet.' 
                : 'No repositories matched your current search filters or keywords.'}
            </p>
            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 text-xs font-mono font-semibold bg-action text-txt-inverse rounded-xl shadow-sm hover:opacity-90 transition-all"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}

        {/* Continuous Streaming Sentinel & Load More */}
        {!isLoading && displayedRepositories.length > 0 && !onlyBookmarked && (
          <div className="py-12 flex flex-col items-center justify-center gap-4">
            
            {/* Loading more spinner */}
            {isLoadingMore && (
              <div className="flex items-center gap-2 text-xs font-mono text-action py-4 animate-fadeIn">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Streaming next batch of repositories from GitHub...</span>
              </div>
            )}

            {/* Manual Load More button */}
            {!isLoadingMore && hasMore && (
              <button
                onClick={loadMore}
                className="group flex items-center gap-2 px-6 py-2.5 rounded-xl bg-surface hover:bg-surface-hover text-txt-primary border border-themeline hover:border-action-border font-mono text-xs shadow-sm transition-all active:scale-95"
              >
                <span>Load Next 40 Repositories</span>
                <span className="text-[11px] text-action font-bold">
                  (Page {currentPage + 1})
                </span>
              </button>
            )}

            {/* End of list reached */}
            {!hasMore && (
              <div className="text-center py-6 text-xs font-mono text-txt-muted">
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
          className="fixed bottom-6 right-6 p-3 rounded-2xl bg-surface hover:bg-surface-hover text-action shadow-xl border border-themeline hover:border-action-border transition-all duration-200 hover:scale-105 z-40"
          title="Scroll to Top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-themeline bg-surface-active py-6 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-txt-muted">
          <div className="flex items-center gap-2">
            <OneGitVaultLogo className="w-5 h-5" />
            <span className="font-display font-bold text-txt-primary">OneGitVault</span>
            <span>• Standalone Open Source Observatory</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsTokenModalOpen(true)}
              className="hover:text-action transition-colors"
            >
              API Token Settings
            </button>
            <a
              href="https://github.com/trending"
              target="_blank"
              rel="noreferrer"
              className="hover:text-action transition-colors flex items-center gap-1"
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
        onTokenUpdated={refresh}
      />

      <BookmarksModal
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        bookmarks={bookmarks}
        onRemoveBookmark={removeBookmark}
        onClearAll={clearBookmarks}
        onImportBookmarks={setBookmarks}
      />

      <RepoDetailPanel
        repo={selectedRepo}
        isBookmarked={selectedRepo ? isBookmarked(selectedRepo.id) : false}
        onClose={() => setSelectedRepo(null)}
        onToggleBookmark={toggleBookmark}
      />

    </div>
  );
};
