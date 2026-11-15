import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { TitleBar } from './components/TitleBar';
import { CategoryNav } from './components/CategoryNav';
import { FilterBar } from './components/FilterBar';
import { ProjectCard } from './components/ProjectCard';
import { TokenModal } from './components/TokenModal';
import { BookmarksModal } from './components/BookmarksModal';
import { RepoDetailPanel } from './components/RepoDetailPanel';
import { UpdateModal } from './components/UpdateModal';
import { OneGitVaultLogo } from './components/OneGitVaultLogo';
import { CATEGORIES } from './data/curatedProjects';
import { Repository, ViewMode } from './types';
import { rateLimitManager, RateLimitInfo } from './services/rateLimit';
import { useRepositories } from './hooks/useRepositories';
import { useBookmarks } from './hooks/useBookmarks';
import { checkForAppUpdates, UpdateInfo } from './services/updateService';
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
    isRefreshing,
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
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState<boolean>(false);

  // Background check for GitHub release updates on startup
  useEffect(() => {
    let mounted = true;
    checkForAppUpdates()
      .then((info) => {
        if (mounted) setUpdateInfo(info);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const handleManualCheckUpdates = useCallback(async () => {
    setIsCheckingUpdates(true);
    setIsUpdateModalOpen(true);
    try {
      const info = await checkForAppUpdates();
      setUpdateInfo(info);
    } finally {
      setIsCheckingUpdates(false);
    }
  }, []);

  // Rate limit subscription
  const [rateLimit, setRateLimit] = useState<RateLimitInfo>(rateLimitManager.get());
  useEffect(() => {
    return rateLimitManager.subscribe(setRateLimit);
  }, []);

  const observerTarget = useRef<HTMLDivElement | null>(null);
  const mainScrollRef = useRef<HTMLDivElement | null>(null);

  // Scroll to Top trigger
  const handleScroll = useCallback(() => {
    if (mainScrollRef.current) {
      setShowScrollTop(mainScrollRef.current.scrollTop > 600);
    }
  }, []);

  const scrollToTop = () => {
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
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
      { root: mainScrollRef.current, rootMargin: '300px', threshold: 0.1 }
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
    <div className="h-full w-full overflow-hidden bg-canvas text-txt-primary flex flex-col font-sans transition-colors duration-200">

      {/* Themed Custom Frameless Titlebar (No scrollbar at title level) */}
      <TitleBar
        updateInfo={updateInfo}
        onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
        onCheckUpdates={handleManualCheckUpdates}
        isCheckingUpdates={isCheckingUpdates}
      />

      {/* Section 1: Top Application Header (Fixed, no scrollbar) */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        bookmarksCount={bookmarksCount}
        onOpenBookmarks={() => setIsBookmarksOpen(true)}
        onOpenTokenModal={() => setIsTokenModalOpen(true)}
        rateLimit={rateLimit}
        isOfflineFallback={isOfflineFallback}
        updateInfo={updateInfo}
        onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
      />

      {/* Section 2: Technology Category Navigation Bar (Fixed, no scrollbar) */}
      <CategoryNav
        categories={CATEGORIES}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Scrollable Content Container: Scrollbar starts AFTER the two sections above */}
      <div
        ref={mainScrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col"
      >
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

        {/* Live Streaming Info Banner (Compact Ribbon) */}
        <div className="mb-3 flex items-center justify-between gap-2 bg-surface/80 border border-themeline rounded-xl px-3 py-1.5 text-xs transition-colors duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-action animate-pulse flex-shrink-0" />
            <h2 className="text-xs sm:text-sm font-display font-bold text-txt-primary flex items-center gap-1.5 truncate">
              <span>{activeCategoryObj.name}</span>
              {searchQuery.trim() && (
                <span className="text-[11px] font-mono font-normal text-txt-muted truncate">
                  matching "<span className="text-action">{searchQuery}</span>"
                </span>
              )}
            </h2>
            <span className="text-[11px] font-mono text-txt-muted hidden sm:inline flex-shrink-0">
              • {totalCount > 0 
                ? `${displayedRepositories.length} of ${totalCount.toLocaleString()} loaded`
                : activeCategoryObj.description}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Visual representation when user clicks on refresh: loading pill beside it */}
            {isRefreshing && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-action-soft border border-action-border text-action text-[11px] font-mono animate-fadeIn">
                <Loader2 className="w-3 h-3 animate-spin text-action" />
                <span className="hidden md:inline">Fetching repos...</span>
              </div>
            )}

            {/* Auto-stream toggle */}
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all ${
                autoScroll
                  ? 'bg-action text-txt-inverse border-action font-semibold'
                  : 'bg-surface-active text-txt-muted border-themeline'
              }`}
              title="Toggle automatic streaming when scrolling down"
            >
              <Zap className={`w-3 h-3 ${autoScroll ? 'text-txt-inverse' : 'text-action'}`} />
              <span>Auto-Stream: {autoScroll ? 'ON' : 'OFF'}</span>
            </button>

            {/* Refresh */}
            <button
              onClick={refresh}
              disabled={isLoading || isRefreshing}
              className="flex items-center gap-1 text-[11px] font-mono text-txt-secondary hover:text-action bg-surface-active hover:bg-surface px-2.5 py-1 rounded-lg border border-themeline transition-colors disabled:opacity-50"
              title="Fetch fresh repositories and update rate limit"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-action' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
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
          className="fixed bottom-10 right-6 p-2.5 rounded-xl bg-surface hover:bg-surface-hover text-action shadow-xl border border-themeline hover:border-action-border transition-all duration-200 hover:scale-105 z-40"
          title="Scroll to Top"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}

      </div>

      {/* Persistent Small Footer (Always visible at the bottom of the window) */}
      <footer className="w-full flex-shrink-0 border-t border-themeline bg-header py-1.5 px-4 text-[11px] font-mono text-txt-muted z-30 transition-colors duration-200 select-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <OneGitVaultLogo className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-display font-bold text-txt-primary">OneGitVault</span>
            <span className="hidden sm:inline text-txt-muted">• Open-Source Observatory</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleManualCheckUpdates}
              className="hover:text-action transition-colors flex items-center gap-1"
            >
              <span>Check Updates</span>
              {updateInfo?.hasUpdate && (
                <span className="w-1.5 h-1.5 rounded-full bg-action animate-pulse" />
              )}
            </button>
            <span className="text-themeline">•</span>
            <button
              onClick={() => setIsTokenModalOpen(true)}
              className="hover:text-action transition-colors"
            >
              API Token
            </button>
            <span className="text-themeline hidden sm:inline">•</span>
            <a
              href="https://github.com/trending"
              target="_blank"
              rel="noreferrer"
              className="hover:text-action transition-colors hidden sm:flex items-center gap-1"
            >
              <Globe className="w-3 h-3" />
              <span>Trending</span>
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        updateInfo={updateInfo}
        isChecking={isCheckingUpdates}
        onCheckAgain={handleManualCheckUpdates}
      />

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
