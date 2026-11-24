import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { TitleBar } from './components/TitleBar';
import { SideNav, ActiveView } from './components/SideNav';
import { ProjectCard } from './components/ProjectCard';
import { TokenModal } from './components/TokenModal';
import { TrendingView } from './components/TrendingView';
import { VaultView } from './components/VaultView';
import { RepoDetailView } from './components/RepoDetailView';
import { SettingsView } from './components/SettingsView';
import { UpdateModal } from './components/UpdateModal';
import { CATEGORIES } from './data/curatedProjects';
import { Repository, ViewMode } from './types';
import { rateLimitManager, RateLimitInfo } from './services/rateLimit';
import { useRepositories } from './hooks/useRepositories';
import { useBookmarks } from './hooks/useBookmarks';
import { useGitHubStars } from './hooks/useGitHubStars';
import { checkForAppUpdates, UpdateInfo } from './services/updateService';
import { useTheme } from './context/ThemeContext';
import { 
  Loader2, 
  RefreshCw, 
  FolderSearch, 
  ArrowUp,
  Zap,
  Key,
  Clock,
  Sparkles,
  Palette,
  Bookmark
} from 'lucide-react';

export const App: React.FC = () => {
  const { currentTheme } = useTheme();
  // Navigation View State
  const [activeView, setActiveView] = useState<ActiveView>('explore');
  const [previousView, setPreviousView] = useState<ActiveView>('explore');
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

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
    searchCooldownSec,
    loadMore,
    retryLoadMore,
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

  const {
    hasToken,
    isStarred,
    getRepoStarCount,
    toggleStar: handleToggleStar,
  } = useGitHubStars();

  // Local View State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [onlyBookmarked, setOnlyBookmarked] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  // Modals & System Inspection State
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);
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

  const handleViewChange = useCallback((view: ActiveView) => {
    if (view !== 'detail') {
      setSelectedRepo(null);
    }
    setActiveView(view);
  }, []);

  const handleOpenRepoDetail = useCallback((repo: Repository) => {
    setPreviousView(activeView === 'detail' ? 'explore' : activeView);
    setSelectedRepo(repo);
    setActiveView('detail');
  }, [activeView]);

  const handleBackFromDetail = useCallback(() => {
    setActiveView(previousView || 'explore');
    setSelectedRepo(null);
  }, [previousView]);

  const handleRepoStarToggle = useCallback(async (repo: Repository) => {
    const res = await handleToggleStar(repo);
    if (res.needToken) {
      handleViewChange('settings');
    }
  }, [handleToggleStar, handleViewChange]);

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
      setShowScrollTop(mainScrollRef.current.scrollTop > 500);
    }
  }, []);

  const scrollToTop = () => {
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // IntersectionObserver for continuous auto-streaming (active only in Explore view)
  useEffect(() => {
    if (activeView !== 'explore') return;
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
  }, [activeView, autoScroll, isLoading, isLoadingMore, hasMore, onlyBookmarked, loadMore]);

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

      {/* Themed Unified TitleBar (Window Controls & Search Flyout) */}
      <TitleBar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (activeView !== 'explore' && q.trim()) {
            setActiveView('explore');
          }
        }}
        updateInfo={updateInfo}
        onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
        onCheckUpdates={handleManualCheckUpdates}
        isCheckingUpdates={isCheckingUpdates}
      />

      {/* ── Teams-Style Layout: Left Side Panel + Main Dynamic Content ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Side Navigation & Filter Panel */}
        <SideNav
          activeView={activeView}
          onSelectView={handleViewChange}
          categories={CATEGORIES}
          selectedCategory={selectedCategory}
          onSelectCategory={(catId) => {
            setSelectedCategory(catId);
            if (activeView !== 'explore') {
              setActiveView('explore');
            }
          }}
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
          bookmarksCount={bookmarksCount}
        />

        {/* Dynamic Main Page Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Scrollable Container */}
          <div
            ref={mainScrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col"
          >
            {/* VIEW 1: REPO DETAIL VIEW (Rendered inline with back option & collapsible info) */}
            {activeView === 'detail' && selectedRepo && (
              <RepoDetailView
                repo={selectedRepo}
                onBack={handleBackFromDetail}
                backLabel={
                  previousView === 'trending'
                    ? 'Back to Trending'
                    : previousView === 'vault'
                    ? 'Back to Vault'
                    : 'Back to Repositories'
                }
                isBookmarked={isBookmarked(selectedRepo.id)}
                onToggleBookmark={toggleBookmark}
                isStarred={isStarred(selectedRepo.full_name)}
                starCount={getRepoStarCount(selectedRepo)}
                hasToken={hasToken}
                onToggleStar={handleRepoStarToggle}
              />
            )}

            {/* VIEW 2: TRENDING VIEW (Rendered inline on main page) */}
            {activeView === 'trending' && (
              <TrendingView
                onSelectRepo={handleOpenRepoDetail}
                isBookmarked={isBookmarked}
                onToggleBookmark={toggleBookmark}
                isStarred={isStarred}
                getStarCount={getRepoStarCount}
                hasToken={hasToken}
                onToggleStar={handleRepoStarToggle}
              />
            )}

            {/* VIEW 3: VAULT VIEW (Rendered inline on main page) */}
            {activeView === 'vault' && (
              <VaultView
                bookmarks={bookmarks}
                onRemoveBookmark={removeBookmark}
                onClearAll={clearBookmarks}
                onImportBookmarks={setBookmarks}
                onSelectRepo={handleOpenRepoDetail}
                isStarred={isStarred}
                onToggleStar={handleRepoStarToggle}
                onOpenTokenModal={() => handleViewChange('settings')}
              />
            )}

            {/* VIEW 4: SETTINGS VIEW (Dedicated page for Themes & API Token) */}
            {activeView === 'settings' && (
              <SettingsView
                rateLimit={rateLimit}
                onTokenUpdated={refresh}
                onCheckUpdates={handleManualCheckUpdates}
                isCheckingUpdates={isCheckingUpdates}
                updateInfo={updateInfo}
                onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
              />
            )}

            {/* VIEW 5: EXPLORE REPOSITORIES (Default Main Browser) */}
            {activeView === 'explore' && (
              <main className="flex-1 max-w-[2400px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-4 pb-16">
                
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
                      ? 'grid grid-cols-[repeat(auto-fill,minmax(330px,1fr))] gap-4 sm:gap-5'
                      : 'flex flex-col gap-2.5'
                  }>
                    {displayedRepositories.map((repo) => (
                      <ProjectCard
                        key={repo.id}
                        repo={repo}
                        viewMode={viewMode}
                        isBookmarked={isBookmarked(repo.id)}
                        onToggleBookmark={toggleBookmark}
                        onSelectTopic={(topic) => setSearchQuery(topic)}
                        onOpenDetail={handleOpenRepoDetail}
                        isStarred={isStarred(repo.full_name)}
                        starCount={getRepoStarCount(repo)}
                        hasToken={hasToken}
                        onToggleStar={handleRepoStarToggle}
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

                    {/* Search API Rate Limit Cooldown banner */}
                    {searchCooldownSec > 0 && (
                      <div className="flex flex-col items-center justify-center gap-2 text-center bg-surface border border-themeline rounded-2xl p-5 my-2 shadow-sm max-w-lg mx-auto">
                        <div className="flex items-center gap-2 text-amber-500 font-mono text-xs font-semibold">
                          <Clock className="w-4 h-4 animate-spin" />
                          <span>GitHub Search API Pacing Cooldown</span>
                        </div>
                        <p className="text-xs text-txt-muted">
                          GitHub limits Search queries to 30 requests/minute. Core API quota remains high ({rateLimit.remaining} calls).
                          Streaming auto-resumes in <span className="font-bold text-action font-mono">{searchCooldownSec}s</span>.
                        </p>
                        <button
                          onClick={retryLoadMore}
                          className="mt-1 px-4 py-1.5 text-xs font-mono font-semibold bg-action text-txt-inverse rounded-xl shadow-sm hover:opacity-90 transition-all"
                        >
                          Resume Stream Now
                        </button>
                      </div>
                    )}

                    {/* Manual Load More button */}
                    {!isLoadingMore && hasMore && searchCooldownSec === 0 && (
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
                    {!hasMore && searchCooldownSec === 0 && (
                      <div className="text-center py-6 text-xs font-mono text-txt-muted">
                        <span>✦ End of available search stream for this query.</span>
                      </div>
                    )}

                    {/* Hidden observer target element */}
                    <div ref={observerTarget} className="h-10 w-full pointer-events-none" />
                  </div>
                )}

              </main>
            )}

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

        </div>
      </div>

      {/* ── Sleek Full-Width Native IDE Status Bar (Edge-to-Edge) ── */}
      <footer className="w-full h-7 min-h-[28px] flex-shrink-0 border-t border-themeline bg-header px-3 text-[11px] font-mono text-txt-muted z-20 flex items-center justify-between select-none transition-colors duration-200">
        
        {/* Left Segment: Connection State & Active View Context */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Connection Pulse */}
          {isOfflineFallback ? (
            <span className="flex items-center gap-1.5 text-amber-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Offline Mode</span>
            </span>
          ) : isRefreshing || isLoading ? (
            <span className="flex items-center gap-1.5 text-action font-medium">
              <Loader2 className="w-3 h-3 animate-spin text-action" />
              <span>Syncing...</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-emerald-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Connected</span>
            </span>
          )}

          <span className="text-themeline hidden sm:inline">•</span>

          {/* Active Context / Scope */}
          <span className="truncate hidden sm:inline text-txt-secondary">
            {activeView === 'explore' && (
              <>
                <span className="text-txt-primary font-medium">{activeCategoryObj.name}</span>
                {searchQuery.trim() && (
                  <span className="text-txt-muted ml-1 truncate">
                    matching "<span className="text-action">{searchQuery}</span>"
                  </span>
                )}
                {totalCount > 0 && (
                  <span className="text-txt-muted ml-1.5">
                    • {displayedRepositories.length} of {totalCount.toLocaleString()} loaded
                  </span>
                )}
              </>
            )}
            {activeView === 'trending' && (
              <span className="text-txt-primary font-medium">Trending Repositories • Live Feed</span>
            )}
            {activeView === 'vault' && (
              <span className="text-txt-primary font-medium">
                Vault • {bookmarksCount} {bookmarksCount === 1 ? 'repository' : 'repositories'} saved
              </span>
            )}
            {activeView === 'settings' && (
              <span className="text-txt-primary font-medium">Settings & Configuration</span>
            )}
            {activeView === 'detail' && selectedRepo && (
              <span className="text-txt-primary font-medium truncate">
                Viewing: {selectedRepo.full_name}
              </span>
            )}
          </span>
        </div>

        {/* Right Segment: Stream Controls, Vault Shortcut, Active Theme & Live API Quota */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Explore Controls: Live Auto-Stream & Refresh */}
          {activeView === 'explore' && (
            <>
              <div className="flex items-center gap-1 text-[11px] font-mono">
                {/* Auto-Stream Toggle */}
                <button
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`flex items-center gap-1 px-2 h-[20px] leading-none rounded transition-all text-[11px] font-mono border ${
                    autoScroll
                      ? 'text-action font-semibold bg-action-soft border-action-border'
                      : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-active'
                  }`}
                  title="Toggle automatic streaming when scrolling down"
                >
                  <Zap className={`w-3 h-3 ${autoScroll ? 'text-action fill-current' : 'text-txt-muted'}`} />
                  <span>Auto-Stream: {autoScroll ? 'ON' : 'OFF'}</span>
                </button>

                {/* Refresh Button */}
                <button
                  onClick={refresh}
                  disabled={isLoading || isRefreshing}
                  className="flex items-center gap-1 px-2 h-[20px] leading-none rounded text-txt-secondary hover:text-action hover:bg-surface-active transition-colors disabled:opacity-50"
                  title="Fetch fresh repositories and update rate limit"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-action' : ''}`} />
                  <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>

              <span className="text-themeline hidden sm:inline">•</span>
            </>
          )}

          {/* Esc Back Hint (in Detail view) */}
          {activeView === 'detail' && (
            <>
              <div className="hidden sm:flex items-center gap-1 text-[10px] text-txt-muted h-[20px] leading-none">
                <kbd className="px-1 py-0.2 rounded bg-surface border border-themeline">Esc</kbd> Back
              </div>
              <span className="text-themeline hidden sm:inline">•</span>
            </>
          )}

          {/* Vault Counter (if bookmarks exist) */}
          {bookmarksCount > 0 && (
            <>
              <button
                onClick={() => handleViewChange('vault')}
                className={`flex items-center gap-1 px-1.5 h-[20px] leading-none rounded transition-colors ${
                  activeView === 'vault' ? 'text-action font-semibold' : 'hover:text-txt-primary hover:bg-surface-active'
                }`}
                title={`View ${bookmarksCount} bookmarked repositories in Vault`}
              >
                <Bookmark className="w-3 h-3 text-action" />
                <span>{bookmarksCount}</span>
              </button>

              <span className="text-themeline hidden sm:inline">•</span>
            </>
          )}

          {/* Active Theme Indicator */}
          <button
            onClick={() => handleViewChange('settings')}
            className="hidden sm:flex items-center gap-1.5 px-1.5 h-[20px] leading-none rounded hover:text-txt-primary hover:bg-surface-active transition-colors text-txt-secondary"
            title={`Active Theme: ${currentTheme.name}. Click to change theme in Settings.`}
          >
            <Palette className="w-3 h-3 text-action" />
            <span className="truncate max-w-[130px]">{currentTheme.name}</span>
          </button>

          <span className="text-themeline hidden sm:inline">•</span>

          {/* Key Left Remaining Data */}
          <button
            onClick={() => handleViewChange('settings')}
            className="flex items-center gap-1.5 px-1.5 h-[20px] leading-none rounded hover:text-txt-primary hover:bg-surface-active transition-colors cursor-pointer"
            title={`GitHub API Quota: ${rateLimit.remaining.toLocaleString()} / ${rateLimit.limit.toLocaleString()} req/hr (Core API)${
              rateLimit.searchRemaining !== undefined ? ` • Search: ${rateLimit.searchRemaining} / ${rateLimit.searchLimit || 30} req/min` : ''
            }. Click to manage GitHub Token in Settings.`}
          >
            <Key className="w-3 h-3 text-action flex-shrink-0" />
            <span className={`w-1.5 h-1.5 rounded-full ${
              rateLimit.remaining > 500 ? 'bg-emerald-500' : rateLimit.remaining > 100 ? 'bg-amber-500' : 'bg-rose-500'
            }`} />
            <span className="font-semibold text-txt-primary">{rateLimit.remaining.toLocaleString()}</span>
            <span className="text-txt-muted">/{rateLimit.limit.toLocaleString()}</span>
            {rateLimit.searchRemaining !== undefined && (
              <span className="hidden md:inline text-[10px] text-txt-muted bg-surface/80 px-1 py-0.2 rounded border border-themeline">
                s:{rateLimit.searchRemaining}
              </span>
            )}
          </button>
        </div>
      </footer>

      {/* System Modals */}
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

    </div>
  );
};
