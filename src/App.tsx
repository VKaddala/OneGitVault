import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { TitleBar } from './components/TitleBar';
import { SideNav, ActiveView } from './components/SideNav';
import { ProjectCard } from './components/ProjectCard';
import { TokenModal } from './components/TokenModal';
import { TrendingView } from './components/TrendingView';
import { VaultView } from './components/VaultView';
import { RepoDetailView } from './components/RepoDetailView';
import { UpdateModal } from './components/UpdateModal';
import { OneGitVaultLogo } from './components/OneGitVaultLogo';
import { CATEGORIES } from './data/curatedProjects';
import { Repository, ViewMode } from './types';
import { rateLimitManager, RateLimitInfo } from './services/rateLimit';
import { useRepositories } from './hooks/useRepositories';
import { useBookmarks } from './hooks/useBookmarks';
import { useGitHubStars } from './hooks/useGitHubStars';
import { checkForAppUpdates, UpdateInfo } from './services/updateService';
import { 
  Loader2, 
  RefreshCw, 
  FolderSearch, 
  ArrowUp,
  Zap,
  Globe,
  Clock,
  Sparkles
} from 'lucide-react';

export const App: React.FC = () => {
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
      setIsTokenModalOpen(true);
    }
  }, [handleToggleStar]);

  // Rate limit subscription
  const [rateLimit, setRateLimit] = useState<RateLimitInfo>(rateLimitManager.get());
  useEffect(() => {
    return rateLimitManager.subscribe(setRateLimit);
  }, []);

  // Live Digital Clock & Country / Location in Footer
  const [currentTime, setCurrentTime] = useState<string>('');
  const [countryName, setCountryName] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      const intlLocale = Intl.DateTimeFormat().resolvedOptions().locale || '';
      let country = '';

      if (tz.includes('Kolkata') || tz.includes('Calcutta') || intlLocale.endsWith('-IN')) {
        country = 'India';
      } else if (tz.startsWith('America/')) {
        if (tz.includes('Toronto') || tz.includes('Vancouver') || tz.includes('Montreal')) country = 'Canada';
        else if (tz.includes('Sao_Paulo')) country = 'Brazil';
        else if (tz.includes('Mexico_City')) country = 'Mexico';
        else country = 'United States';
      } else if (tz.startsWith('Europe/')) {
        if (tz.includes('London')) country = 'United Kingdom';
        else if (tz.includes('Paris')) country = 'France';
        else if (tz.includes('Berlin')) country = 'Germany';
        else country = 'Europe';
      } else if (tz.startsWith('Asia/')) {
        if (tz.includes('Tokyo')) country = 'Japan';
        else if (tz.includes('Singapore')) country = 'Singapore';
        else if (tz.includes('Dubai')) country = 'UAE';
        else if (tz.includes('Seoul')) country = 'South Korea';
        else country = tz.split('/')[1]?.replace(/_/g, ' ') || 'Asia';
      } else if (tz.startsWith('Australia/')) {
        country = 'Australia';
      } else if (tz.includes('/')) {
        country = tz.split('/')[1]?.replace(/_/g, ' ') || tz;
      } else {
        country = tz || 'Local';
      }

      const tzShort = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
        .formatToParts(new Date())
        .find((p) => p.type === 'timeZoneName')?.value || '';

      setCountryName(country ? `${country} (${tzShort})` : tzShort);
    } catch {
      setCountryName('Local');
    }
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

      {/* Themed Unified TitleBar (Window Controls, Search Flyout, and Header Utilities) */}
      <TitleBar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (activeView !== 'explore' && q.trim()) {
            setActiveView('explore');
          }
        }}
        bookmarksCount={bookmarksCount}
        onOpenBookmarks={() => handleViewChange('vault')}
        onOpenTokenModal={() => setIsTokenModalOpen(true)}
        onOpenTrending={() => handleViewChange('trending')}
        rateLimit={rateLimit}
        isOfflineFallback={isOfflineFallback}
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
            {/* VIEW 1: REPO DETAIL VIEW (Rendered inline with back option) */}
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
                onOpenTokenModal={() => setIsTokenModalOpen(true)}
              />
            )}

            {/* VIEW 4: EXPLORE REPOSITORIES (Default Main Browser) */}
            {activeView === 'explore' && (
              <main className="flex-1 max-w-[2400px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-4 pb-16">
                
                {/* Live Streaming Info Ribbon */}
                <div className="mb-4 flex items-center justify-between gap-2 bg-surface/90 border border-themeline rounded-2xl px-4 py-2.5 text-xs transition-colors duration-200 shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-action animate-pulse flex-shrink-0" />
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
                    {/* Refreshing indicator */}
                    {isRefreshing && (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-action-soft border border-action-border text-action text-[11px] font-mono animate-fadeIn">
                        <Loader2 className="w-3 h-3 animate-spin text-action" />
                        <span className="hidden md:inline">Fetching repos...</span>
                      </div>
                    )}

                    {/* Auto-stream toggle */}
                    <button
                      onClick={() => setAutoScroll(!autoScroll)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-mono border transition-all ${
                        autoScroll
                          ? 'bg-action text-txt-inverse border-action font-semibold shadow-sm'
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
                      className="flex items-center gap-1.5 text-[11px] font-mono text-txt-secondary hover:text-action bg-surface-active hover:bg-surface px-3 py-1 rounded-lg border border-themeline transition-colors disabled:opacity-50 shadow-sm"
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

          {/* Persistent Small Footer (Edge-to-edge inside content column) */}
          <footer className="w-full flex-shrink-0 border-t border-themeline bg-header py-1 px-2.5 sm:px-3 text-[11px] font-mono text-txt-muted z-20 transition-colors duration-200 select-none">
            <div className="w-full flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <OneGitVaultLogo className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="font-display font-bold text-txt-primary">OneGitVault</span>
                <span className="hidden sm:inline text-txt-muted">• Open-Source Observatory</span>
              </div>

              {/* Country & Live Clock */}
              <div className="flex items-center gap-2 text-txt-muted font-mono text-[11px]">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-active/60 border border-themeline text-txt-primary">
                  <Globe className="w-3 h-3 text-action" />
                  <span>{countryName}</span>
                </div>
                <span className="text-themeline">•</span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-active/60 border border-themeline text-txt-primary font-semibold">
                  <Clock className="w-3 h-3 text-action" />
                  <span>{currentTime}</span>
                </div>
              </div>
            </div>
          </footer>

        </div>
      </div>

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
