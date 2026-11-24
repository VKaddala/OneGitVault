import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ThemeProvider,
  CssBaseline,
  Box,
  Container,
  Grid,
  CircularProgress,
  Typography,
  Snackbar,
  Alert,
  Fab,
  Zoom,
  Button,
  alpha
} from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { createMuiThemeFromPlugin } from './theme';
import { themeRegistry } from './themes/themeRegistry';
import { ThemePlugin } from './themes/types';
import { Repository, SortOption, RateLimitInfo } from './types';
import {
  fetchRepositories,
  getCurrentRateLimit,
  checkLiveRateLimit,
  setRateLimitListener,
  getStoredToken,
  starRepository,
  unstarRepository
} from './services/githubApi';
import { getBookmarks, saveBookmarks, toggleBookmark, isBookmarked } from './services/bookmarkStore';
import {
  pullBookmarksFromGist,
  pushBookmarksToGist,
  fetchUserStarredRepositories
} from './services/gistSync';
import { APK_CATEGORIES, EXPLORE_CATEGORIES } from './data/categories';
import { CURATED_ANDROID_APKS } from './data/curatedAndroidApks';
import { TopAppBar } from './components/TopAppBar';
import { CompactFilterBar } from './components/CompactFilterBar';
import { RepoCard } from './components/RepoCard';
import { RepoDetailSheet } from './components/RepoDetailSheet';
import { TrendingView } from './components/TrendingView';
import { VaultView } from './components/VaultView';
import { TokenDialog } from './components/TokenDialog';
import { SearchFlyout } from './components/SearchFlyout';
import { BottomNav } from './components/BottomNav';

export const App: React.FC = () => {
  // Theme Management
  const [themeId, setThemeId] = useState<string>(() => {
    try {
      const explicit = localStorage.getItem('onegitvault_theme_user_explicit') === 'true';
      const saved = localStorage.getItem('onegitvault_active_theme_plugin');
      if (explicit && saved && themeRegistry.has(saved)) {
        return saved;
      }
      return themeRegistry.getSystemThemeId();
    } catch {
      return 'github-dark';
    }
  });

  const activeThemePlugin: ThemePlugin = useMemo(() => {
    return themeRegistry.get(themeId);
  }, [themeId]);

  const muiTheme = useMemo(() => {
    return createMuiThemeFromPlugin(activeThemePlugin);
  }, [activeThemePlugin]);

  // Synchronize active theme with DOM, theme-color meta, and Android system status bar contrast
  useEffect(() => {
    themeRegistry.applyToDom(activeThemePlugin);
  }, [activeThemePlugin]);

  const handleSelectTheme = (newThemeId: string) => {
    setThemeId(newThemeId);
    try {
      localStorage.setItem('onegitvault_active_theme_plugin', newThemeId);
      localStorage.setItem('onegitvault_theme_user_explicit', 'true');
    } catch {}
  };

  // Compact View Density State
  const [isCompactView, setIsCompactView] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ogv_compact_view') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleCompactView = () => {
    setIsCompactView((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ogv_compact_view', String(next));
      } catch {}
      return next;
    });
  };

  // Starred Repositories State (Synced with GitHub when PAT available)
  const [starredRepos, setStarredRepos] = useState<Set<string>>(new Set());

  // Navigation: 'apks' | 'trending' | 'vault' | 'explore'
  const [currentTab, setCurrentTab] = useState<string>('apks');

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(false);

  // Filters State
  const [selectedApkCategory, setSelectedApkCategory] = useState<string>('android-apks');
  const [selectedExploreCategory, setSelectedExploreCategory] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('stars');
  const [minStars, setMinStars] = useState<number>(0);

  // Rate Limiting State
  const [rateLimit, setRateLimit] = useState<RateLimitInfo>(getCurrentRateLimit());

  // Repositories & Infinite Scroll State
  const [repos, setRepos] = useState<Repository[]>(CURATED_ANDROID_APKS);
  const [totalCount, setTotalCount] = useState<number>(CURATED_ANDROID_APKS.length);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const loadingMoreRef = useRef<boolean>(false);

  const [activeRepo, setActiveRepo] = useState<Repository | null>(null);
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [tokenDialogOpen, setTokenDialogOpen] = useState<boolean>(false);

  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [vaultVersion, setVaultVersion] = useState<number>(0);
  const [trendingRefreshKey, setTrendingRefreshKey] = useState<number>(0);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  // Universal Android Back Gesture & Hardware Back Button Handling (Edge Swipe)
  useEffect(() => {
    (window as any).__handleAndroidBack = () => {
      if (detailOpen) {
        setDetailOpen(false);
        return true;
      }
      if (tokenDialogOpen) {
        setTokenDialogOpen(false);
        return true;
      }
      if (isSearchActive) {
        setIsSearchActive(false);
        setSearchQuery('');
        setDebouncedSearchQuery('');
        return true;
      }
      if (currentTab !== 'apks') {
        setCurrentTab('apks');
        return true;
      }
      return false;
    };

    let backListener: any = null;
    const setupCapacitorBack = async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        backListener = await CapApp.addListener('backButton', () => {
          const handled = (window as any).__handleAndroidBack?.();
          if (!handled) {
            CapApp.exitApp();
          }
        });
      } catch {}
    };
    setupCapacitorBack();

    return () => {
      if (backListener && backListener.remove) {
        backListener.remove();
      }
    };
  }, [detailOpen, tokenDialogOpen, isSearchActive, currentTab]);

  // Visual Viewport & Keyboard Detection (Lightweight: only listen to resize, not scroll)
  useEffect(() => {
    if (!window.visualViewport) return;

    const handleResize = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const heightDiff = window.innerHeight - vv.height;
      setIsKeyboardOpen(heightDiff > 120);
    };

    window.visualViewport.addEventListener('resize', handleResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, []);

  // Sync Rate Limits & Auto-pull Gist and Starred repos if PAT present
  useEffect(() => {
    setRateLimitListener((info) => setRateLimit(info));
    checkLiveRateLimit();

    const token = getStoredToken();
    if (token) {
      pullBookmarksFromGist(token)
        .then((gistBookmarks) => {
          if (gistBookmarks && Array.isArray(gistBookmarks) && gistBookmarks.length > 0) {
            const local = getBookmarks();
            const localMap = new Map(local.map((r) => [r.id, r]));
            let hasNew = false;
            for (const gb of gistBookmarks) {
              if (!localMap.has(gb.id)) {
                localMap.set(gb.id, gb);
                hasNew = true;
              }
            }
            if (hasNew) {
              saveBookmarks(Array.from(localMap.values()));
              setVaultVersion((v) => v + 1);
            }
          }
        })
        .catch(() => {});

      fetchUserStarredRepositories(token, 1, 100)
        .then((starred) => {
          if (starred && Array.isArray(starred)) {
            setStarredRepos((prev) => {
              const next = new Set(prev);
              starred.forEach((r) => next.add(r.full_name));
              return next;
            });
          }
        })
        .catch(() => {});
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load repositories data
  const loadData = useCallback(async () => {
    setLoading(true);
    setPage(1);
    setLoadMoreError(null);

    const isApk = currentTab === 'apks';
    const activeCategory = isApk ? selectedApkCategory : selectedExploreCategory;

    try {
      const data = await fetchRepositories(
        activeCategory,
        debouncedSearchQuery,
        sortOption,
        minStars,
        1,
        30,
        isApk
      );
      setRepos(data.repositories);
      setTotalCount(data.totalCount);
      setHasMore(data.hasMore);
      if (data.error && data.repositories.length === 0) {
        setLoadMoreError(data.error);
      }
    } catch (err) {
      console.warn('Failed to load repositories:', err);
      setLoadMoreError('Network error loading repositories.');
    } finally {
      setLoading(false);
    }
  }, [currentTab, selectedApkCategory, selectedExploreCategory, debouncedSearchQuery, sortOption, minStars]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Infinite Scroll: fetch next page when near bottom
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore || loading) return;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const nextPage = page + 1;
      const isApk = currentTab === 'apks';
      const activeCat = isApk ? selectedApkCategory : selectedExploreCategory;
      const data = await fetchRepositories(
        activeCat,
        debouncedSearchQuery,
        sortOption,
        minStars,
        nextPage,
        30,
        isApk
      );
      if (data.error) {
        setLoadMoreError(data.error);
        return;
      }
      setLoadMoreError(null);
      if (data.repositories.length > 0) {
        setRepos((prev) => {
          const ids = new Set(prev.map((r) => r.id));
          const newItems = data.repositories.filter((r) => !ids.has(r.id));
          return [...prev, ...newItems];
        });
        setPage(nextPage);
        setHasMore(data.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.warn('Load more failed:', err);
      setLoadMoreError('Network connection error. Tap to retry.');
    } finally {
      setIsLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [page, hasMore, loading, currentTab, selectedApkCategory, selectedExploreCategory, debouncedSearchQuery, sortOption, minStars]);

  // Throttled scroll listener via requestAnimationFrame for 60/120fps smooth scrolling with 0 CPU waste
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          setShowScrollTop(scrollY > 300);
          const scrollPos = window.innerHeight + scrollY;
          const threshold = document.documentElement.scrollHeight - 600;
          if (scrollPos >= threshold) {
            loadMore();
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  const handleOpenDetail = (repo: Repository) => {
    setActiveRepo(repo);
    setDetailOpen(true);
  };

  const handleCopyClone = (cloneUrl: string) => {
    navigator.clipboard.writeText(`git clone ${cloneUrl}`);
    const found = repos.find((r) => r.clone_url === cloneUrl);
    if (found) setCopiedId(found.id);
    setSnackbarMessage(`Copied: git clone ${cloneUrl}`);
    setSnackbarOpen(true);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleToggleBookmark = (repo: Repository) => {
    const added = toggleBookmark(repo);
    setVaultVersion((v) => v + 1);
    setSnackbarMessage(added ? `Saved ${repo.name} to Vault` : `Removed ${repo.name} from Vault`);
    setSnackbarOpen(true);

    // Auto-push updated bookmarks to private Gist when PAT token is available
    const token = getStoredToken();
    if (token) {
      setTimeout(() => pushBookmarksToGist(token, getBookmarks()), 300);
    }
  };

  // Direct Star / Unstar on GitHub with PAT
  const handleToggleStar = async (repo: Repository) => {
    const token = getStoredToken();
    if (!token) {
      setSnackbarMessage('Add a Personal Access Token to star repositories directly');
      setSnackbarOpen(true);
      setTokenDialogOpen(true);
      return;
    }

    const isCurrentlyStarred = starredRepos.has(repo.full_name);
    if (isCurrentlyStarred) {
      setStarredRepos((prev) => {
        const next = new Set(prev);
        next.delete(repo.full_name);
        return next;
      });
      const success = await unstarRepository(repo.full_name);
      if (success) {
        setSnackbarMessage(`Unstarred ${repo.name} on GitHub`);
      } else {
        setStarredRepos((prev) => new Set(prev).add(repo.full_name));
        setSnackbarMessage(`Failed to unstar ${repo.name}`);
      }
    } else {
      setStarredRepos((prev) => new Set(prev).add(repo.full_name));
      const success = await starRepository(repo.full_name);
      if (success) {
        setSnackbarMessage(`Starred ${repo.name} on GitHub ★`);
      } else {
        setStarredRepos((prev) => {
          const next = new Set(prev);
          next.delete(repo.full_name);
          return next;
        });
        setSnackbarMessage(`Failed to star ${repo.name}`);
      }
    }
    setSnackbarOpen(true);
  };

  const handleShareMessage = (msg: string) => {
    setSnackbarMessage(msg);
    setSnackbarOpen(true);
  };

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseSearch = () => {
    setIsSearchActive(false);
    setSearchQuery('');
    setDebouncedSearchQuery('');
  };

  const handleSelectRepoFromSearch = (repo: Repository) => {
    // 1. Reset and close search flyout (do not hold search object)
    setIsSearchActive(false);
    setSearchQuery('');
    setDebouncedSearchQuery('');

    // 2. Open selected repo in Explore
    setCurrentTab('explore');

    // 3. Prepend selected repo to Explore repository list so it is immediately visible
    setRepos((prev) => {
      const filtered = prev.filter((r) => r.id !== repo.id);
      return [repo, ...filtered];
    });

    // 4. Open its detail sheet in Explore
    setActiveRepo(repo);
    setDetailOpen(true);
  };

  const handleTitleBarRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (currentTab === 'trending') {
        setTrendingRefreshKey((k) => k + 1);
        await checkLiveRateLimit();
      } else if (currentTab === 'vault') {
        setVaultVersion((v) => v + 1);
        await checkLiveRateLimit();
      } else {
        await loadData();
        await checkLiveRateLimit();
      }
      setSnackbarMessage('Refreshed feed & quotas');
      setSnackbarOpen(true);
    } catch {
      setSnackbarMessage('Refresh failed');
      setSnackbarOpen(true);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  };

  const vaultCount = getBookmarks().length;
  const isBottomNavVisible = !isSearchActive && !isKeyboardOpen;

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          pb: 12,
          bgcolor: 'background.default',
          color: 'text.primary',
          overflowX: 'hidden'
        }}
      >
        {/* Permanently Fixed Top App Bar with Integrated Search & View Density Toggle */}
        <TopAppBar
          onRefresh={handleTitleBarRefresh}
          isRefreshing={isRefreshing || loading}
          onOpenTokenDialog={() => setTokenDialogOpen(true)}
          currentThemeId={themeId}
          availableThemes={themeRegistry.getAll()}
          onSelectTheme={handleSelectTheme}
          coreRemaining={rateLimit.remaining}
          isAuthenticated={!!getStoredToken()}
          isSearchActive={isSearchActive}
          onSearchActiveChange={(active) => {
            if (active) setIsSearchActive(true);
            else handleCloseSearch();
          }}
          isCompactView={isCompactView}
          onToggleCompactView={handleToggleCompactView}
        />

        {/* Fixed Top App Bar Spacer to prevent content from scrolling under or into status bar */}
        <Box
          sx={{
            height: 'calc(max(env(safe-area-inset-top, 0px), var(--status-bar-height, 44px)) + 50px)'
          }}
        />

        {/* Tab 1: APKs (Exclusively Android Apps & APK Releases) */}
        {currentTab === 'apks' && (
          <Box>
            {/* Single Compact Filters Row strictly for Android & APKs with clean vertical spacing */}
            <Box sx={{ mb: 1 }}>
              <CompactFilterBar
                selectedCategoryId={selectedApkCategory}
                onSelectCategory={(id) => setSelectedApkCategory(id)}
                sortOption={sortOption}
                onSelectSort={(sort) => setSortOption(sort)}
                minStars={minStars}
                onSelectMinStars={(stars) => setMinStars(stars)}
                totalCount={totalCount}
                categories={APK_CATEGORIES}
              />
            </Box>

            {/* Repositories Cards Grid for APKs */}
            <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2 }, mt: 0.5 }}>
              {loading && repos.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 12, gap: 2 }}>
                  <Box
                    component="img"
                    src="./favicon.png"
                    alt="OneGitVault Logo"
                    sx={{
                      width: 58,
                      height: 58,
                      borderRadius: '14px',
                      animation: 'ogvAppPulse 1.6s ease-in-out infinite',
                      '@keyframes ogvAppPulse': {
                        '0%, 100%': { transform: 'scale(1)', opacity: 0.95 },
                        '50%': { transform: 'scale(1.08)', opacity: 0.7 }
                      }
                    }}
                  />
                  <CircularProgress size={24} color="primary" />
                </Box>
              ) : repos.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 10, color: 'text.secondary' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>No Android APKs found.</Typography>
                  <Typography variant="body2">Try adjusting your search keywords or filter criteria.</Typography>
                </Box>
              ) : (
                <Grid container spacing={isCompactView ? 1 : 1.5}>
                  {repos.map((repo) => (
                    <Grid item xs={12} sm={isCompactView ? 12 : 6} md={isCompactView ? 6 : 4} key={repo.id}>
                      <RepoCard
                        repo={repo}
                        isBookmarked={isBookmarked(repo.id)}
                        onToggleBookmark={handleToggleBookmark}
                        onOpenDetail={handleOpenDetail}
                        onCopyClone={handleCopyClone}
                        copiedId={copiedId}
                        isCompact={isCompactView}
                        isStarred={starredRepos.has(repo.full_name)}
                        onToggleStar={handleToggleStar}
                        onShareMessage={handleShareMessage}
                      />
                    </Grid>
                  ))}
                  {isLoadingMore && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 2.5, gap: 1 }}>
                        <CircularProgress size={18} color="primary" />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                          Streaming more APK releases...
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  {loadMoreError && (
                    <Grid item xs={12}>
                      <Box
                        sx={{
                          p: 1.5,
                          mx: 'auto',
                          maxWidth: 420,
                          borderRadius: 2,
                          bgcolor: alpha(muiTheme.palette.error.main, 0.08),
                          border: `1px solid ${alpha(muiTheme.palette.error.main, 0.2)}`,
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 1
                        }}
                      >
                        <Typography variant="caption" sx={{ color: muiTheme.palette.error.main, fontWeight: 700 }}>
                          {loadMoreError}
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          onClick={() => {
                            setLoadMoreError(null);
                            loadMore();
                          }}
                          sx={{ textTransform: 'none', fontSize: '0.72rem', py: 0.2, px: 1.5, borderRadius: 2 }}
                        >
                          Tap to Retry
                        </Button>
                      </Box>
                    </Grid>
                  )}
                  {hasMore && !isLoadingMore && !loadMoreError && repos.length > 0 && (
                    <Grid item xs={12}>
                      <Box sx={{ textAlign: 'center', py: 1.5 }}>
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => loadMore()}
                          sx={{
                            textTransform: 'none',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: 'text.secondary',
                            bgcolor: alpha(muiTheme.palette.action.hover, 0.06),
                            px: 2,
                            py: 0.5,
                            borderRadius: '20px'
                          }}
                        >
                          Scroll or tap to load more
                        </Button>
                      </Box>
                    </Grid>
                  )}
                  {!hasMore && repos.length > 0 && !loadMoreError && (
                    <Grid item xs={12}>
                      <Box sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                          You have reached the end ({repos.length} apps loaded)
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              )}
            </Container>
          </Box>
        )}

        {/* Tab 2: Trending Explorer */}
        {currentTab === 'trending' && (
          <TrendingView
            refreshTrigger={trendingRefreshKey}
            onOpenDetail={handleOpenDetail}
            isBookmarked={isBookmarked}
            onToggleBookmark={handleToggleBookmark}
            onCopyClone={handleCopyClone}
            copiedId={copiedId}
            isCompact={isCompactView}
          />
        )}

        {/* Tab 3: Vault Bookmarks & GitHub Starred Repositories */}
        {currentTab === 'vault' && (
          <VaultView
            key={vaultVersion}
            onOpenDetail={handleOpenDetail}
            isBookmarked={isBookmarked}
            onToggleBookmark={handleToggleBookmark}
            onCopyClone={handleCopyClone}
            copiedId={copiedId}
            onVaultUpdated={() => setVaultVersion((v) => v + 1)}
            isCompact={isCompactView}
            starredRepos={starredRepos}
            onToggleStar={handleToggleStar}
            onOpenTokenDialog={() => setTokenDialogOpen(true)}
            onShareMessage={handleShareMessage}
          />
        )}

        {/* Tab 4: Explore All Technology Sectors (Global Open Source Observatory) */}
        {currentTab === 'explore' && (
          <Box>
            {/* Filter Bar with All Global Project Sectors with clean vertical spacing */}
            <Box sx={{ mb: 1 }}>
              <CompactFilterBar
                selectedCategoryId={selectedExploreCategory}
                onSelectCategory={(id) => setSelectedExploreCategory(id)}
                sortOption={sortOption}
                onSelectSort={(sort) => setSortOption(sort)}
                minStars={minStars}
                onSelectMinStars={(stars) => setMinStars(stars)}
                totalCount={totalCount}
                categories={EXPLORE_CATEGORIES}
              />
            </Box>

            {/* Global Search Status Banner in Explore */}
            {debouncedSearchQuery.trim() && (
              <Box
                sx={{
                  mx: { xs: 1.5, sm: 2 },
                  mb: 1.5,
                  p: 1,
                  px: 1.5,
                  borderRadius: '14px',
                  bgcolor: alpha(muiTheme.palette.primary.main, 0.1),
                  border: `1px solid ${alpha(muiTheme.palette.primary.main, 0.25)}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.75rem' }}>
                  Global Search: <strong>"{debouncedSearchQuery}"</strong> ({totalCount.toLocaleString()} repos)
                </Typography>
                <Button
                  size="small"
                  onClick={() => setSearchQuery('')}
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    textTransform: 'none',
                    py: 0.2,
                    px: 1,
                    minWidth: 'auto',
                    color: muiTheme.palette.primary.main
                  }}
                >
                  Clear
                </Button>
              </Box>
            )}

            {/* Repositories Cards Grid for Global Explore */}
            <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2 }, mt: 0.5 }}>
              {loading && repos.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 12, gap: 2 }}>
                  <Box
                    component="img"
                    src="./favicon.png"
                    alt="OneGitVault Logo"
                    sx={{
                      width: 58,
                      height: 58,
                      borderRadius: '14px',
                      animation: 'ogvAppPulse 1.6s ease-in-out infinite',
                      '@keyframes ogvAppPulse': {
                        '0%, 100%': { transform: 'scale(1)', opacity: 0.95 },
                        '50%': { transform: 'scale(1.08)', opacity: 0.7 }
                      }
                    }}
                  />
                  <CircularProgress size={24} color="primary" />
                </Box>
              ) : repos.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 10, color: 'text.secondary' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>No repositories found.</Typography>
                  <Typography variant="body2">Try adjusting your search keywords or filter criteria.</Typography>
                </Box>
              ) : (
                <Grid container spacing={isCompactView ? 1 : 1.5}>
                  {repos.map((repo) => (
                    <Grid item xs={12} sm={isCompactView ? 12 : 6} md={isCompactView ? 6 : 4} key={repo.id}>
                      <RepoCard
                        repo={repo}
                        isBookmarked={isBookmarked(repo.id)}
                        onToggleBookmark={handleToggleBookmark}
                        onOpenDetail={handleOpenDetail}
                        onCopyClone={handleCopyClone}
                        copiedId={copiedId}
                        isCompact={isCompactView}
                        isStarred={starredRepos.has(repo.full_name)}
                        onToggleStar={handleToggleStar}
                        onShareMessage={handleShareMessage}
                      />
                    </Grid>
                  ))}
                  {isLoadingMore && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 2.5, gap: 1 }}>
                        <CircularProgress size={18} color="primary" />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                          Streaming more repositories...
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  {loadMoreError && (
                    <Grid item xs={12}>
                      <Box
                        sx={{
                          p: 1.5,
                          mx: 'auto',
                          maxWidth: 420,
                          borderRadius: 2,
                          bgcolor: alpha(muiTheme.palette.error.main, 0.08),
                          border: `1px solid ${alpha(muiTheme.palette.error.main, 0.2)}`,
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 1
                        }}
                      >
                        <Typography variant="caption" sx={{ color: muiTheme.palette.error.main, fontWeight: 700 }}>
                          {loadMoreError}
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          onClick={() => {
                            setLoadMoreError(null);
                            loadMore();
                          }}
                          sx={{ textTransform: 'none', fontSize: '0.72rem', py: 0.2, px: 1.5, borderRadius: 2 }}
                        >
                          Tap to Retry
                        </Button>
                      </Box>
                    </Grid>
                  )}
                  {hasMore && !isLoadingMore && !loadMoreError && repos.length > 0 && (
                    <Grid item xs={12}>
                      <Box sx={{ textAlign: 'center', py: 1.5 }}>
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => loadMore()}
                          sx={{
                            textTransform: 'none',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: 'text.secondary',
                            bgcolor: alpha(muiTheme.palette.action.hover, 0.06),
                            px: 2,
                            py: 0.5,
                            borderRadius: '20px'
                          }}
                        >
                          Scroll or tap to load more
                        </Button>
                      </Box>
                    </Grid>
                  )}
                  {!hasMore && repos.length > 0 && !loadMoreError && (
                    <Grid item xs={12}>
                      <Box sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                          You have reached the end ({repos.length} repositories loaded)
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              )}
            </Container>
          </Box>
        )}

        {/* Floating Action Button (Scroll to Top) — only visible after scrolling down > 300px */}
        {isBottomNavVisible && showScrollTop && (
          <Zoom in={showScrollTop}>
            <Fab
              size="small"
              color="primary"
              onClick={handleScrollTop}
              sx={{
                position: 'fixed',
                bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
                right: 18,
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.45)',
                zIndex: 1150
              }}
            >
              <KeyboardArrowUpIcon fontSize="small" />
            </Fab>
          </Zoom>
        )}

        {/* Repo Detail Bottom Sheet */}
        <RepoDetailSheet
          repo={activeRepo}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          onCopyClone={handleCopyClone}
          copiedId={copiedId}
          isStarred={activeRepo ? starredRepos.has(activeRepo.full_name) : false}
          onToggleStar={handleToggleStar}
          onShareMessage={handleShareMessage}
        />

        {/* WhatsApp / Instagram Style Translucent Search Flyout */}
        <SearchFlyout
          open={isSearchActive}
          onClose={handleCloseSearch}
          onSelectRepo={handleSelectRepoFromSearch}
          isBookmarked={isBookmarked}
          onToggleBookmark={handleToggleBookmark}
          onCopyClone={handleCopyClone}
          copiedId={copiedId}
          isCompact={isCompactView}
          starredRepos={starredRepos}
          onToggleStar={handleToggleStar}
          onShareMessage={handleShareMessage}
        />

        {/* GitHub Token Settings Dialog */}
        <TokenDialog
          open={tokenDialogOpen}
          onClose={() => setTokenDialogOpen(false)}
          onTokenSaved={() => {
            loadData();
            checkLiveRateLimit();
            const token = getStoredToken();
            if (token) {
              pullBookmarksFromGist(token)
                .then((gistBookmarks) => {
                  if (gistBookmarks && Array.isArray(gistBookmarks) && gistBookmarks.length > 0) {
                    const local = getBookmarks();
                    const localMap = new Map(local.map((r) => [r.id, r]));
                    let hasNew = false;
                    for (const gb of gistBookmarks) {
                      if (!localMap.has(gb.id)) {
                        localMap.set(gb.id, gb);
                        hasNew = true;
                      }
                    }
                    if (hasNew) {
                      saveBookmarks(Array.from(localMap.values()));
                      setVaultVersion((v) => v + 1);
                    }
                  }
                })
                .catch(() => {});

              fetchUserStarredRepositories(token, 1, 100)
                .then((starred) => {
                  if (starred && Array.isArray(starred)) {
                    setStarredRepos((prev) => {
                      const next = new Set(prev);
                      starred.forEach((r) => next.add(r.full_name));
                      return next;
                    });
                  }
                })
                .catch(() => {});
            }
          }}
        />

        {/* Apple Style Floating Glass Bottom Navigation Bar (Middle Aligned & Short) */}
        <BottomNav
          currentTab={currentTab}
          onTabChange={(tab) => {
            setCurrentTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          vaultCount={vaultCount}
          visible={isBottomNavVisible}
        />

        {/* Global Feedback Snackbar */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={2500}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ bottom: { xs: 72, sm: 72 }, zIndex: 1300 }}
        >
          <Alert
            severity="success"
            onClose={() => setSnackbarOpen(false)}
            sx={{
              borderRadius: '16px',
              fontWeight: 700,
              fontSize: '0.8rem',
              bgcolor: 'background.paper',
              color: 'text.primary',
              border: `1px solid ${muiTheme.palette.divider}`
            }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};
