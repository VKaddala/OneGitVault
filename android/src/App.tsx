import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
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
import { getBookmarks, saveBookmarks, toggleBookmark, hasCompletedOnboarding, sanitizeRepositoryList } from './services/bookmarkStore';
import {
  pullBookmarksFromGist,
  pushBookmarksToGist,
  fetchUserStarredRepositories,
  fetchUserWatchedRepositories
} from './services/gistSync';
import { APK_CATEGORIES, EXPLORE_CATEGORIES } from './data/categories';
import { CURATED_ANDROID_APKS } from './data/curatedAndroidApks';
import { TopAppBar } from './components/TopAppBar';
import { CompactFilterBar } from './components/CompactFilterBar';
import { RepoCard } from './components/RepoCard';
import { TrendingView } from './components/TrendingView';
import { VaultView } from './components/VaultView';
import { BottomNav } from './components/BottomNav';
import { ApkDownloadDialog } from './components/ApkDownloadDialog';
import { ReelsView } from './components/ReelsView';
import { checkForAndroidUpdates, AndroidUpdateInfo } from './services/updateService';
import { OneGitVaultLogo } from './components/OneGitVaultLogo';
import { startPeriodicCacheMaintenance } from './services/cacheManager';
import { triggerHaptic } from './utils/haptics';
import { syncNativeWidgets } from './services/widgetSync';

const RepoDetailSheet = React.lazy(() =>
  import('./components/RepoDetailSheet').then((m) => ({ default: m.RepoDetailSheet }))
);
const SettingsPage = React.lazy(() =>
  import('./components/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const SearchFlyout = React.lazy(() =>
  import('./components/SearchFlyout').then((m) => ({ default: m.SearchFlyout }))
);
const TokenDialog = React.lazy(() =>
  import('./components/TokenDialog').then((m) => ({ default: m.TokenDialog }))
);
const UpdateDialog = React.lazy(() =>
  import('./components/UpdateDialog').then((m) => ({ default: m.UpdateDialog }))
);
const OnboardingInterestsModal = React.lazy(() =>
  import('./components/OnboardingInterestsModal').then((m) => ({ default: m.OnboardingInterestsModal }))
);

export const App: React.FC = () => {
  // Theme Management
  const [themeId, setThemeId] = useState<string>(() => {
    try {
      const explicit = localStorage.getItem('onegitvault_theme_user_explicit') === 'true';
      const saved = localStorage.getItem('onegitvault_active_theme_plugin');
      if (explicit && saved && themeRegistry.has(saved)) {
        return themeRegistry.normalizeThemeId(saved);
      }
      return 'system';
    } catch {
      return 'system';
    }
  });

  const [systemThemeTick, setSystemThemeTick] = useState<number>(0);

  useEffect(() => {
    const refreshSysTheme = () => {
      themeRegistry.invalidateSystemAppearance();
      setSystemThemeTick((t) => t + 1);
      try {
        const explicit = localStorage.getItem('onegitvault_theme_user_explicit') === 'true';
        if (!explicit) {
          setThemeId('system');
        }
      } catch {}
    };
    window.addEventListener('ogv_system_theme_changed', refreshSysTheme);
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    mq?.addEventListener?.('change', refreshSysTheme);
    return () => {
      window.removeEventListener('ogv_system_theme_changed', refreshSysTheme);
      mq?.removeEventListener?.('change', refreshSysTheme);
    };
  }, []);

  const availableThemes: ThemePlugin[] = useMemo(() => {
    return themeRegistry.getAll();
  }, [systemThemeTick]);

  const activeThemePlugin: ThemePlugin = useMemo(() => {
    return themeRegistry.get(themeId);
  }, [themeId, systemThemeTick]);

  const muiTheme = useMemo(() => {
    return createMuiThemeFromPlugin(activeThemePlugin);
  }, [activeThemePlugin]);

  // Synchronize active theme with DOM, theme-color meta, and Android system status bar contrast
  useEffect(() => {
    themeRegistry.applyToDom(activeThemePlugin);
  }, [activeThemePlugin]);

  const handleSelectTheme = useCallback((newThemeId: string) => {
    const normalized = themeRegistry.normalizeThemeId(newThemeId);
    setThemeId(normalized);
    try {
      localStorage.setItem('onegitvault_active_theme_plugin', normalized);
      localStorage.setItem('onegitvault_theme_user_explicit', 'true');
    } catch {}
  }, []);

  // Compact View Density State
  const [isCompactView, setIsCompactView] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ogv_compact_view') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleCompactView = useCallback(() => {
    setIsCompactView((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ogv_compact_view', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Starred & Watched Repositories State (Synced with GitHub when PAT/OAuth available)
  const [starredRepos, setStarredRepos] = useState<Set<string>>(new Set());
  const [starredReposList, setStarredReposList] = useState<Repository[]>([]);
  const [starredListLoaded, setStarredListLoaded] = useState<boolean>(false);
  const [watchedReposList, setWatchedReposList] = useState<Repository[]>([]);
  const [watchedListLoaded, setWatchedListLoaded] = useState<boolean>(false);

  // Function to refresh starred repositories from GitHub
  const refreshStarredList = useCallback(async () => {
    const token = getStoredToken();
    if (!token) return;
    try {
      const starred = sanitizeRepositoryList(await fetchUserStarredRepositories(token, 1, 100, true));
      setStarredReposList(starred);
      setStarredRepos(new Set(starred.map((r) => r.full_name)));
      setStarredListLoaded(true);
    } catch (e) {
      console.warn('Failed to refresh starred repos:', e);
    }
  }, []);

  const refreshWatchedList = useCallback(async () => {
    const token = getStoredToken();
    if (!token) return;
    try {
      const watched = sanitizeRepositoryList(await fetchUserWatchedRepositories(token, 1, 100, true));
      setWatchedReposList(watched);
      setWatchedListLoaded(true);
    } catch (e) {
      console.warn('Failed to refresh watched repos:', e);
    }
  }, []);

  // In-App Background Update State
  const [updateInfo, setUpdateInfo] = useState<AndroidUpdateInfo | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState<boolean>(false);

  // Check for updates on startup
  useEffect(() => {
    checkForAndroidUpdates()
      .then((info) => {
        setUpdateInfo(info);
      })
      .catch(() => {});
  }, []);

  // Navigation: 'apks' | 'trending' | 'spotlight' | 'vault' | 'explore'
  const [currentTab, setCurrentTab] = useState<string>('apks');
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({ apks: true });
  const visitedTabsRef = useRef<Record<string, boolean>>({ apks: true });
  visitedTabsRef.current = visitedTabs;
  const [hasVisitedVault, setHasVisitedVault] = useState<boolean>(() => {
    try {
      return localStorage.getItem('onegitvault_vault_visited') === 'true';
    } catch {
      return false;
    }
  });

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

  // Repositories & Infinite Scroll State for APKs
  const [apkRepos, setApkRepos] = useState<Repository[]>(CURATED_ANDROID_APKS);
  const [apkTotalCount, setApkTotalCount] = useState<number>(CURATED_ANDROID_APKS.length);
  const [apkLoading, setApkLoading] = useState<boolean>(false);
  const [apkPage, setApkPage] = useState<number>(1);
  const [apkHasMore, setApkHasMore] = useState<boolean>(true);
  const [apkIsLoadingMore, setApkIsLoadingMore] = useState<boolean>(false);
  const [apkLoadMoreError, setApkLoadMoreError] = useState<string | null>(null);
  const apkLoadingMoreRef = useRef<boolean>(false);

  // Repositories & Infinite Scroll State for Explore
  const [exploreRepos, setExploreRepos] = useState<Repository[]>([]);
  const [exploreTotalCount, setExploreTotalCount] = useState<number>(0);
  const [exploreLoading, setExploreLoading] = useState<boolean>(false);
  const [explorePage, setExplorePage] = useState<number>(1);
  const [exploreHasMore, setExploreHasMore] = useState<boolean>(true);
  const [exploreIsLoadingMore, setExploreIsLoadingMore] = useState<boolean>(false);
  const [exploreLoadMoreError, setExploreLoadMoreError] = useState<string | null>(null);
  const exploreLoadingMoreRef = useRef<boolean>(false);
  const exploreLoadedOnceRef = useRef<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [activeRepo, setActiveRepo] = useState<Repository | null>(null);
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [tokenDialogOpen, setTokenDialogOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [undoBookmarkRepo, setUndoBookmarkRepo] = useState<Repository | null>(null);
  const [trendingRefreshKey, setTrendingRefreshKey] = useState<number>(0);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  // Reactive Bookmark State across all tabs
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(() => new Set(getBookmarks().map((r) => r.id)));
  const [bookmarkedNames, setBookmarkedNames] = useState<Set<string>>(
    () => new Set(getBookmarks().map((r) => r.full_name?.toLowerCase()).filter(Boolean) as string[])
  );

  useEffect(() => {
    const handleBookmarkChange = (e: any) => {
      const list: Repository[] = e.detail || getBookmarks();
      setBookmarkedIds(new Set(list.map((r) => r.id)));
      setBookmarkedNames(new Set(list.map((r) => r.full_name?.toLowerCase()).filter(Boolean) as string[]));
    };
    window.addEventListener('ogv_bookmarks_changed', handleBookmarkChange);
    return () => window.removeEventListener('ogv_bookmarks_changed', handleBookmarkChange);
  }, []);

  const checkIsBookmarked = useCallback(
    (repoOrId: number | string | Repository): boolean => {
      if (repoOrId === null || repoOrId === undefined) return false;
      if (typeof repoOrId === 'number') {
        return bookmarkedIds.has(repoOrId) || bookmarkedIds.has(Number(repoOrId));
      }
      if (typeof repoOrId === 'string') {
        const num = Number(repoOrId);
        return (!isNaN(num) && bookmarkedIds.has(num)) || bookmarkedNames.has(repoOrId.toLowerCase());
      }
      const numId = Number(repoOrId.id);
      const nameLower = repoOrId.full_name?.toLowerCase();
      return Boolean(
        (!isNaN(numId) && bookmarkedIds.has(numId)) ||
        (nameLower && bookmarkedNames.has(nameLower))
      );
    },
    [bookmarkedIds, bookmarkedNames]
  );

  // Start periodic cache maintenance (startup sweep + every 10 minutes) & initial widget sync
  useEffect(() => {
    syncNativeWidgets();
    const handleSync = () => syncNativeWidgets();
    window.addEventListener('ogv_bookmarks_changed', handleSync);
    window.addEventListener('ogv_annotations_updated', handleSync);
    const cancelMaint = startPeriodicCacheMaintenance(10 * 60 * 1000);
    return () => {
      cancelMaint();
      window.removeEventListener('ogv_bookmarks_changed', handleSync);
      window.removeEventListener('ogv_annotations_updated', handleSync);
    };
  }, []);

  // Optional First-Launch Topic Interests Onboarding
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(false);
  useEffect(() => {
    if (hasCompletedOnboarding()) return;
    const t = setTimeout(() => setOnboardingOpen(true), 750);
    return () => clearTimeout(t);
  }, []);

  // Universal Android Back Gesture & Hardware Back Button Handling (Edge Swipe)
  useEffect(() => {
    (window as any).__handleAndroidBack = () => {
      if ((window as any).__onActiveChangelogClose) {
        const handled = (window as any).__onActiveChangelogClose();
        if (handled) return true;
      }
      if ((window as any).__onActiveDownloadDialogClose) {
        const handled = (window as any).__onActiveDownloadDialogClose();
        if (handled) return true;
      }
      if ((window as any).__onActiveZoomClose) {
        const handled = (window as any).__onActiveZoomClose();
        if (handled) return true;
      }
      if (tokenDialogOpen) {
        setTokenDialogOpen(false);
        return true;
      }
      if (detailOpen) {
        setDetailOpen(false);
        return true;
      }
      if (isSearchActive) {
        setIsSearchActive(false);
        setSearchQuery('');
        setDebouncedSearchQuery('');
        return true;
      }
      if (settingsOpen) {
        setSettingsOpen(false);
        return true;
      }
      if (currentTab !== 'apks') {
        setCurrentTab('apks');
        return true;
      }
      return false;
    };
  }, [settingsOpen, detailOpen, tokenDialogOpen, isSearchActive, currentTab]);

  // Register Capacitor native back listener once with unmount cancellation guard
  useEffect(() => {
    let cancelled = false;
    let backListener: any = null;
    const setupCapacitorBack = async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        const listener = await CapApp.addListener('backButton', () => {
          const handled = (window as any).__handleAndroidBack?.();
          if (!handled) {
            CapApp.exitApp();
          }
        });
        if (cancelled) {
          listener?.remove?.();
        } else {
          backListener = listener;
        }
      } catch {}
    };
    setupCapacitorBack();

    return () => {
      cancelled = true;
      if (backListener && backListener.remove) {
        backListener.remove();
      }
    };
  }, []);

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

  const syncAuthenticatedAccountData = useCallback((token: string) => {
    if (!token) return;
    pullBookmarksFromGist(token)
      .then((gistBookmarks) => {
        const safeGist = sanitizeRepositoryList(gistBookmarks);
        if (safeGist.length > 0) {
          const local = getBookmarks();
          const localMap = new Map(local.map((r) => [r.id, r]));
          let hasNew = false;
          for (const gb of safeGist) {
            if (!localMap.has(gb.id)) {
              localMap.set(gb.id, gb);
              hasNew = true;
            }
          }
          if (hasNew) {
            saveBookmarks(Array.from(localMap.values()));
          }
        }
      })
      .catch(() => {});

    fetchUserStarredRepositories(token, 1, 100)
      .then((rawStarred) => {
        const starred = sanitizeRepositoryList(rawStarred);
        if (rawStarred && Array.isArray(rawStarred)) {
          setStarredReposList(starred);
          setStarredRepos(new Set(starred.map((r) => r.full_name)));
          setStarredListLoaded(true);
        }
      })
      .catch(() => {});

    fetchUserWatchedRepositories(token, 1, 100)
      .then((rawWatched) => {
        const watched = sanitizeRepositoryList(rawWatched);
        if (rawWatched && Array.isArray(rawWatched)) {
          setWatchedReposList(watched);
          setWatchedListLoaded(true);
        }
      })
      .catch(() => {});
  }, []);

  // Sync Rate Limits & Auto-pull Gist, Starred, and Watched repos if PAT/OAuth present
  useEffect(() => {
    setRateLimitListener((info) => setRateLimit(info));
    checkLiveRateLimit();
    syncAuthenticatedAccountData(getStoredToken());

    const handleAuthInvalid = (e: any) => {
      const msg = e?.detail?.reason || 'GitHub token expired or invalid — switched to guest mode';
      setSnackbarMessage(msg);
      setSnackbarOpen(true);
      setStarredRepos(new Set());
      setStarredReposList([]);
    };
    window.addEventListener('ogv:auth_invalid', handleAuthInvalid);

    return () => {
      window.removeEventListener('ogv:auth_invalid', handleAuthInvalid);
    };
  }, [syncAuthenticatedAccountData]);

  // Debounce search input with 280ms throttle for snappy response
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 280);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load APK repositories data
  const loadApkData = useCallback(async (forceRefresh: boolean = false) => {
    setApkLoading(true);
    setApkPage(1);
    setApkLoadMoreError(null);

    try {
      const data = await fetchRepositories(
        selectedApkCategory,
        debouncedSearchQuery,
        sortOption,
        minStars,
        1,
        60,
        true,
        forceRefresh
      );
      setApkRepos(data.repositories);
      setApkTotalCount(data.totalCount);
      setApkHasMore(data.hasMore);
      if (data.error && data.repositories.length === 0) {
        setApkLoadMoreError(data.error);
      } else if (data.isRateLimit && data.fromCache && data.repositories.length > 0) {
        setSnackbarMessage(`Search quota exhausted — showing cached items (resets in ~${data.rateLimitResetInSec || 60}s)`);
        setSnackbarOpen(true);
      }
    } catch (err) {
      console.warn('Failed to load APK repositories:', err);
      setApkLoadMoreError('Network error loading APKs.');
    } finally {
      setApkLoading(false);
    }
  }, [selectedApkCategory, debouncedSearchQuery, sortOption, minStars]);

  // Load Explore repositories data
  const loadExploreData = useCallback(async (forceRefresh: boolean = false) => {
    setExploreLoading(true);
    setExplorePage(1);
    setExploreLoadMoreError(null);
    exploreLoadedOnceRef.current = true;

    try {
      const data = await fetchRepositories(
        selectedExploreCategory,
        debouncedSearchQuery,
        sortOption,
        minStars,
        1,
        60,
        false,
        forceRefresh
      );
      setExploreRepos(data.repositories);
      setExploreTotalCount(data.totalCount);
      setExploreHasMore(data.hasMore);
      if (data.error && data.repositories.length === 0) {
        setExploreLoadMoreError(data.error);
      } else if (data.isRateLimit && data.fromCache && data.repositories.length > 0) {
        setSnackbarMessage(`Search quota exhausted — showing cached items (resets in ~${data.rateLimitResetInSec || 60}s)`);
        setSnackbarOpen(true);
      }
    } catch (err) {
      console.warn('Failed to load explore repositories:', err);
      setExploreLoadMoreError('Network error loading repositories.');
    } finally {
      setExploreLoading(false);
    }
  }, [selectedExploreCategory, debouncedSearchQuery, sortOption, minStars]);

  // Fetch APKs whenever APK filters change
  useEffect(() => {
    loadApkData();
  }, [loadApkData]);

  // Fetch Explore whenever Explore filters change (only if explore was visited)
  useEffect(() => {
    if (exploreLoadedOnceRef.current) {
      loadExploreData();
    }
  }, [loadExploreData]);

  // Infinite Scroll for APKs
  const loadMoreApk = useCallback(async () => {
    if (apkLoadingMoreRef.current || !apkHasMore || apkLoading) return;
    apkLoadingMoreRef.current = true;
    setApkIsLoadingMore(true);

    try {
      const nextPage = apkPage + 1;
      const data = await fetchRepositories(
        selectedApkCategory,
        debouncedSearchQuery,
        sortOption,
        minStars,
        nextPage,
        60,
        true
      );
      if (data.error) {
        setApkLoadMoreError(data.error);
        return;
      }
      setApkLoadMoreError(null);
      if (data.repositories.length > 0) {
        setApkRepos((prev) => {
          const ids = new Set(prev.map((r) => r.id));
          const newItems = data.repositories.filter((r) => !ids.has(r.id));
          return [...prev, ...newItems];
        });
        setApkPage(nextPage);
        setApkHasMore(data.hasMore);
      } else {
        setApkHasMore(false);
      }
    } catch (err) {
      console.warn('Load more APKs failed:', err);
      setApkLoadMoreError('Network connection error. Tap to retry.');
    } finally {
      setApkIsLoadingMore(false);
      apkLoadingMoreRef.current = false;
    }
  }, [apkPage, apkHasMore, apkLoading, selectedApkCategory, debouncedSearchQuery, sortOption, minStars]);

  // Infinite Scroll for Explore
  const loadMoreExplore = useCallback(async () => {
    if (exploreLoadingMoreRef.current || !exploreHasMore || exploreLoading) return;
    exploreLoadingMoreRef.current = true;
    setExploreIsLoadingMore(true);

    try {
      const nextPage = explorePage + 1;
      const data = await fetchRepositories(
        selectedExploreCategory,
        debouncedSearchQuery,
        sortOption,
        minStars,
        nextPage,
        60,
        false
      );
      if (data.error) {
        setExploreLoadMoreError(data.error);
        return;
      }
      setExploreLoadMoreError(null);
      if (data.repositories.length > 0) {
        setExploreRepos((prev) => {
          const ids = new Set(prev.map((r) => r.id));
          const newItems = data.repositories.filter((r) => !ids.has(r.id));
          return [...prev, ...newItems];
        });
        setExplorePage(nextPage);
        setExploreHasMore(data.hasMore);
      } else {
        setExploreHasMore(false);
      }
    } catch (err) {
      console.warn('Load more explore failed:', err);
      setExploreLoadMoreError('Network connection error. Tap to retry.');
    } finally {
      setExploreIsLoadingMore(false);
      exploreLoadingMoreRef.current = false;
    }
  }, [explorePage, exploreHasMore, exploreLoading, selectedExploreCategory, debouncedSearchQuery, sortOption, minStars]);

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
            if (currentTab === 'apks') {
              loadMoreApk();
            } else if (currentTab === 'explore') {
              loadMoreExplore();
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentTab, loadMoreApk, loadMoreExplore]);

  const [detailInitialTab, setDetailInitialTab] = useState<'info' | 'readme' | 'releases'>('info');

  const loadedReposRef = useRef<Repository[]>([]);
  loadedReposRef.current = [...apkRepos, ...exploreRepos];

  const handleOpenDetail = useCallback((repo: Repository, initialTab: 'info' | 'readme' | 'releases' = 'info') => {
    setActiveRepo(repo);
    setDetailInitialTab(initialTab);
    setDetailOpen(true);
  }, []);

  const handleCopyClone = useCallback((cloneUrl: string) => {
    navigator.clipboard.writeText(`git clone ${cloneUrl}`);
    const found = loadedReposRef.current.find((r) => r.clone_url === cloneUrl);
    if (found) setCopiedId(found.id);
    setSnackbarMessage(`Copied: git clone ${cloneUrl}`);
    setSnackbarOpen(true);
    setTimeout(() => setCopiedId(null), 2500);
  }, []);

  const handleToggleBookmark = useCallback((repo: Repository) => {
    const added = toggleBookmark(repo);
    const updated = getBookmarks();
    setBookmarkedIds(new Set(updated.map((r) => r.id)));
    setBookmarkedNames(new Set(updated.map((r) => r.full_name?.toLowerCase()).filter(Boolean) as string[]));
    setUndoBookmarkRepo(added ? null : repo);
    setSnackbarMessage(added ? `Saved ${repo.name} to Vault` : `Removed ${repo.name} from Vault`);
    setSnackbarOpen(true);
    if (added && currentTab !== 'vault') {
      setHasVisitedVault(false);
      try {
        localStorage.removeItem('onegitvault_vault_visited');
      } catch {}
    }

    // Auto-push updated bookmarks to private Gist when PAT token is available
    const token = getStoredToken();
    if (token) {
      setTimeout(() => pushBookmarksToGist(token, getBookmarks()), 300);
    }
  }, [currentTab]);

  const handleUndoRemoveBookmark = useCallback(() => {
    if (!undoBookmarkRepo) return;
    const repoToRestore = undoBookmarkRepo;
    setUndoBookmarkRepo(null);
    toggleBookmark(repoToRestore);
    const updated = getBookmarks();
    setBookmarkedIds(new Set(updated.map((r) => r.id)));
    setBookmarkedNames(new Set(updated.map((r) => r.full_name?.toLowerCase()).filter(Boolean) as string[]));
    setSnackbarMessage(`Restored ${repoToRestore.name} to Vault`);
    setSnackbarOpen(true);
    const token = getStoredToken();
    if (token) {
      setTimeout(() => pushBookmarksToGist(token, getBookmarks()), 300);
    }
  }, [undoBookmarkRepo]);

  // Direct Star / Unstar on GitHub with PAT
  const handleToggleStar = useCallback(async (repo: Repository) => {
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
      setStarredReposList((prev) => prev.filter((r) => r.full_name !== repo.full_name));

      const success = await unstarRepository(repo.full_name);
      if (success) {
        setSnackbarMessage(`Unstarred ${repo.name} on GitHub`);
      } else {
        setStarredRepos((prev) => new Set(prev).add(repo.full_name));
        setStarredReposList((prev) => [repo, ...prev]);
        setSnackbarMessage(`Failed to unstar ${repo.name}`);
      }
    } else {
      setStarredRepos((prev) => new Set(prev).add(repo.full_name));
      setStarredReposList((prev) => [repo, ...prev.filter((r) => r.full_name !== repo.full_name)]);

      const success = await starRepository(repo.full_name);
      if (success) {
        setSnackbarMessage(`Starred ${repo.name} on GitHub ★`);
      } else {
        setStarredRepos((prev) => {
          const next = new Set(prev);
          next.delete(repo.full_name);
          return next;
        });
        setStarredReposList((prev) => prev.filter((r) => r.full_name !== repo.full_name));
        setSnackbarMessage(`Failed to star ${repo.name}`);
      }
    }
    setSnackbarOpen(true);
  }, [starredRepos]);

  const checkIsStarred = useCallback(
    (fullName: string) => starredRepos.has(fullName),
    [starredRepos]
  );

  const handleShareMessage = useCallback((msg: string) => {
    setSnackbarMessage(msg);
    setSnackbarOpen(true);
  }, []);

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
    setExploreRepos((prev) => {
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
        await checkLiveRateLimit(true);
      } else if (currentTab === 'vault') {
        window.dispatchEvent(new CustomEvent('ogv_bookmarks_changed', { detail: getBookmarks() }));
        await Promise.all([refreshStarredList(), refreshWatchedList()]);
        await checkLiveRateLimit(true);
      } else if (currentTab === 'apks') {
        await loadApkData(true);
        await checkLiveRateLimit(true);
      } else {
        await loadExploreData(true);
        await checkLiveRateLimit(true);
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

  const vaultCount = (hasVisitedVault || currentTab === 'vault') ? 0 : bookmarkedIds.size;
  const isBottomNavVisible = !isSearchActive && !isKeyboardOpen;

  const TAB_ORDER = useMemo(() => ['apks', 'trending', 'spotlight', 'vault', 'explore'] as const, []);
  const swipeStartRef = useRef<{ x: number; y: number; time: number; target: EventTarget | null } | null>(null);
  const tabScrollPosRef = useRef<Record<string, number>>({});
  const currentTabRef = useRef<string>(currentTab);
  currentTabRef.current = currentTab;

  const handleTabChange = useCallback(
    (tab: string) => {
      const prevTab = currentTabRef.current;
      if (tab === prevTab) {
        if (tab !== 'spotlight') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }
      if (prevTab !== 'spotlight') {
        tabScrollPosRef.current[prevTab] = window.scrollY;
      }

      // Shift to the target page immediately on this frame; mount/load heavy tab content right after paint
      if (tab === 'vault') {
        setHasVisitedVault(true);
        try {
          localStorage.setItem('onegitvault_vault_visited', 'true');
        } catch {}
      }
      setCurrentTab(tab);

      if (!visitedTabsRef.current[tab]) {
        window.requestAnimationFrame(() => {
          setTimeout(() => {
            setVisitedTabs((prev) => (prev[tab] ? prev : { ...prev, [tab]: true }));
            if (tab === 'explore' && !exploreLoadedOnceRef.current) {
              loadExploreData();
            }
          }, 0);
        });
      } else if (tab === 'explore' && !exploreLoadedOnceRef.current) {
        window.requestAnimationFrame(() => {
          setTimeout(() => {
            if (!exploreLoadedOnceRef.current) {
              loadExploreData();
            }
          }, 0);
        });
      }

      if (tab !== 'spotlight') {
        const savedY = tabScrollPosRef.current[tab] ?? 0;
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: savedY, behavior: 'auto' });
        });
      }
    },
    [loadExploreData]
  );

  const handleOpenSettings = useCallback(() => setSettingsOpen(true), []);
  const handleCloseSettings = useCallback(() => setSettingsOpen(false), []);
  const handleOpenTokenDialog = useCallback(() => setTokenDialogOpen(true), []);
  const handleCloseTokenDialog = useCallback(() => setTokenDialogOpen(false), []);
  const handleOpenUpdateDialog = useCallback(() => setUpdateDialogOpen(true), []);
  const handleCloseUpdateDialog = useCallback(() => setUpdateDialogOpen(false), []);
  const handleCloseDetail = useCallback(() => setDetailOpen(false), []);

  const handleSearchActiveChange = useCallback((active: boolean) => {
    if (active) {
      setIsSearchActive(true);
    } else {
      setIsSearchActive(false);
      setSearchQuery('');
      setDebouncedSearchQuery('');
    }
  }, []);

  const handleVaultUpdated = useCallback(() => {
    const latest = getBookmarks();
    setBookmarkedIds(new Set(latest.map((r) => r.id)));
    setBookmarkedNames(new Set(latest.map((r) => r.full_name?.toLowerCase()).filter(Boolean) as string[]));
  }, []);

  const handleSelectApkCategory = useCallback((id: string) => setSelectedApkCategory(id), []);
  const handleSelectExploreCategory = useCallback((id: string) => setSelectedExploreCategory(id), []);
  const handleSelectSort = useCallback((sort: SortOption) => setSortOption(sort), []);
  const handleSelectMinStars = useCallback((stars: number) => setMinStars(stars), []);
  const handleCacheCleared = useCallback((msg: string) => {
    setSnackbarMessage(msg);
    setSnackbarOpen(true);
  }, []);

  const isOverlayBlockingSwipe = useCallback(
    (): boolean =>
      Boolean(
        settingsOpen ||
        detailOpen ||
        tokenDialogOpen ||
        isSearchActive ||
        updateDialogOpen ||
        (window as any).__onActiveZoomClose ||
        (window as any).__onActiveDownloadDialogClose
      ),
    [settingsOpen, detailOpen, tokenDialogOpen, isSearchActive, updateDialogOpen]
  );

  const shouldIgnoreTabSwipeTarget = useCallback(
    (target: EventTarget | null, boundaryEl: HTMLElement | null): boolean => {
      if (isOverlayBlockingSwipe()) return true;
      let node = target as HTMLElement | null;
      while (node && node !== boundaryEl) {
        const tag = node.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
        const role = node.getAttribute?.('role');
        if (role === 'dialog' || role === 'slider' || node.classList?.contains('MuiModal-root')) {
          return true;
        }
        if (node.scrollWidth > node.clientWidth + 6) {
          const style = window.getComputedStyle(node);
          if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
            return true;
          }
        }
        node = node.parentElement;
      }
      return false;
    },
    [isOverlayBlockingSwipe]
  );

  const handleTabSwipeTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      // Zero DOM layout or getComputedStyle queries on touchstart so button clicks never stall
      if (e.touches.length !== 1 || isOverlayBlockingSwipe()) {
        swipeStartRef.current = null;
        return;
      }
      swipeStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
        target: e.target,
      };
    },
    [isOverlayBlockingSwipe]
  );

  const handleTabSwipeTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const start = swipeStartRef.current;
      swipeStartRef.current = null;
      if (!start || e.changedTouches.length === 0) {
        return;
      }

      const dx = e.changedTouches[0].clientX - start.x;
      const dy = e.changedTouches[0].clientY - start.y;
      const dt = Date.now() - start.time;

      // Short-circuit normal taps & vertical scrolls before inspecting any DOM geometry
      if (dt > 550 || Math.abs(dx) < 68 || Math.abs(dx) <= Math.abs(dy) * 1.55) {
        return;
      }
      if (shouldIgnoreTabSwipeTarget(start.target, e.currentTarget)) {
        return;
      }

      const idx = TAB_ORDER.indexOf(currentTabRef.current as (typeof TAB_ORDER)[number]);
      if (idx === -1) return;

      const nextIdx = dx < 0 ? idx + 1 : idx - 1;
      if (nextIdx >= 0 && nextIdx < TAB_ORDER.length) {
        triggerHaptic(8);
        handleTabChange(TAB_ORDER[nextIdx]);
      }
    },
    [TAB_ORDER, shouldIgnoreTabSwipeTarget, handleTabChange]
  );

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Box
        onTouchStart={handleTabSwipeTouchStart}
        onTouchEnd={handleTabSwipeTouchEnd}
        sx={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          pb: currentTab === 'spotlight' ? 0 : 14,
          bgcolor: 'background.default',
          color: 'text.primary',
          overflowX: 'hidden'
        }}
      >
        {/* Permanently Fixed Top App Bar with Integrated Search & View Density Toggle (hidden in Spotlight) */}
        {currentTab !== 'spotlight' && (
          <TopAppBar
            onRefresh={handleTitleBarRefresh}
            isRefreshing={isRefreshing || apkLoading || exploreLoading}
            onOpenSettings={handleOpenSettings}
            onOpenTokenDialog={handleOpenTokenDialog}
            currentThemeId={themeId}
            availableThemes={availableThemes}
            onSelectTheme={handleSelectTheme}
            coreRemaining={rateLimit.remaining}
            isAuthenticated={!!getStoredToken()}
            isSearchActive={isSearchActive}
            onSearchActiveChange={handleSearchActiveChange}
            isCompactView={isCompactView}
            onToggleCompactView={handleToggleCompactView}
            updateInfo={updateInfo}
            onOpenUpdateDialog={handleOpenUpdateDialog}
          />
        )}

        {/* Fixed Top App Bar Spacer to prevent content from scrolling under or into status bar */}
        {currentTab !== 'spotlight' && (
          <Box
            sx={{
              height: 'calc(max(env(safe-area-inset-top, 0px), var(--status-bar-height, 44px)) + 64px)'
            }}
          />
        )}

        {/* Tab 1: APKs (Exclusively Android Apps & APK Releases) */}
        <Box sx={{ display: currentTab === 'apks' ? 'block' : 'none' }}>
          {/* Single Compact Filters Row strictly for Android & APKs with clean vertical spacing */}
          <Box sx={{ mb: 1 }}>
            <CompactFilterBar
              selectedCategoryId={selectedApkCategory}
              onSelectCategory={handleSelectApkCategory}
              sortOption={sortOption}
              onSelectSort={handleSelectSort}
              minStars={minStars}
              onSelectMinStars={handleSelectMinStars}
              totalCount={apkTotalCount}
              categories={APK_CATEGORIES}
            />
          </Box>

          {/* Repositories Cards Grid for APKs */}
          <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2 }, mt: 0.5 }}>
            {apkLoading && apkRepos.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 12, gap: 2 }}>
                <Box
                  sx={{
                    animation: 'ogvAppPulse 1.6s ease-in-out infinite',
                    '@keyframes ogvAppPulse': {
                      '0%, 100%': { transform: 'scale(1)', opacity: 0.95 },
                      '50%': { transform: 'scale(1.08)', opacity: 0.7 }
                    }
                  }}
                >
                  <OneGitVaultLogo size={58} />
                </Box>
                <CircularProgress size={24} color="primary" />
              </Box>
            ) : apkRepos.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 10, color: 'text.secondary' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>No Android APKs found.</Typography>
                <Typography variant="body2">Try adjusting your search keywords or filter criteria.</Typography>
              </Box>
            ) : (
              <Grid container spacing={isCompactView ? 1 : 1.5}>
                {apkRepos.map((repo) => (
                  <Grid
                    item
                    xs={12}
                    sm={isCompactView ? 12 : 6}
                    md={isCompactView ? 6 : 4}
                    key={repo.id}
                    sx={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 150px' }}
                  >
                    <RepoCard
                      repo={repo}
                      isBookmarked={checkIsBookmarked(repo)}
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
                {apkIsLoadingMore && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 2.5, gap: 1 }}>
                      <CircularProgress size={18} color="primary" />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                        Streaming more APK releases...
                      </Typography>
                    </Box>
                  </Grid>
                )}
                {apkLoadMoreError && (
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
                        {apkLoadMoreError}
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={() => {
                          setApkLoadMoreError(null);
                          loadMoreApk();
                        }}
                        sx={{ textTransform: 'none', fontSize: '0.72rem', py: 0.2, px: 1.5, borderRadius: 2 }}
                      >
                        Tap to Retry
                      </Button>
                    </Box>
                  </Grid>
                )}
                {apkHasMore && !apkIsLoadingMore && !apkLoadMoreError && apkRepos.length > 0 && (
                  <Grid item xs={12}>
                    <Box sx={{ textAlign: 'center', py: 1.5 }}>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => loadMoreApk()}
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
                {!apkHasMore && apkRepos.length > 0 && !apkLoadMoreError && (
                  <Grid item xs={12}>
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                        You have reached the end ({apkRepos.length} apps loaded)
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            )}
          </Container>
        </Box>

        {/* Tab 2: Trending Explorer (lazy mounted on first visit) */}
        <Box sx={{ display: currentTab === 'trending' ? 'block' : 'none' }}>
          {visitedTabs.trending && (
            <TrendingView
              isActive={currentTab === 'trending'}
              refreshTrigger={trendingRefreshKey}
              onOpenDetail={handleOpenDetail}
              isBookmarked={checkIsBookmarked}
              onToggleBookmark={handleToggleBookmark}
              onCopyClone={handleCopyClone}
              copiedId={copiedId}
              isCompact={isCompactView}
            />
          )}
        </Box>

        {/* Tab 3: Vault Bookmarks & GitHub Starred Repositories (lazy mounted on first visit) */}
        <Box sx={{ display: currentTab === 'vault' ? 'block' : 'none' }}>
          {visitedTabs.vault && (
            <VaultView
              onOpenDetail={handleOpenDetail}
              isBookmarked={checkIsBookmarked}
              onToggleBookmark={handleToggleBookmark}
              onCopyClone={handleCopyClone}
              copiedId={copiedId}
              onVaultUpdated={handleVaultUpdated}
              isCompact={isCompactView}
              starredRepos={starredRepos}
              starredList={starredReposList}
              starredLoaded={starredListLoaded}
              onRefreshStarred={refreshStarredList}
              watchedList={watchedReposList}
              watchedLoaded={watchedListLoaded}
              onRefreshWatched={refreshWatchedList}
              onToggleStar={handleToggleStar}
              onOpenTokenDialog={handleOpenTokenDialog}
              onShareMessage={handleShareMessage}
            />
          )}
        </Box>

        {/* Tab 4: Explore All Technology Sectors (lazy mounted on first visit) */}
        <Box sx={{ display: currentTab === 'explore' ? 'block' : 'none' }}>
          {visitedTabs.explore && (
            <>
              {/* Filter Bar with All Global Project Sectors with clean vertical spacing */}
              <Box sx={{ mb: 1 }}>
                <CompactFilterBar
                  selectedCategoryId={selectedExploreCategory}
                  onSelectCategory={handleSelectExploreCategory}
                  sortOption={sortOption}
                  onSelectSort={handleSelectSort}
                  minStars={minStars}
                  onSelectMinStars={handleSelectMinStars}
                  totalCount={exploreTotalCount}
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
                Global Search: <strong>"{debouncedSearchQuery}"</strong> ({exploreTotalCount.toLocaleString()} repos)
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
            {exploreLoading && exploreRepos.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 12, gap: 2 }}>
                <Box
                  sx={{
                    animation: 'ogvAppPulse 1.6s ease-in-out infinite',
                    '@keyframes ogvAppPulse': {
                      '0%, 100%': { transform: 'scale(1)', opacity: 0.95 },
                      '50%': { transform: 'scale(1.08)', opacity: 0.7 }
                    }
                  }}
                >
                  <OneGitVaultLogo size={58} />
                </Box>
                <CircularProgress size={24} color="primary" />
              </Box>
            ) : exploreRepos.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 10, color: 'text.secondary' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>No repositories found.</Typography>
                <Typography variant="body2">Try adjusting your search keywords or filter criteria.</Typography>
              </Box>
            ) : (
              <Grid container spacing={isCompactView ? 1 : 1.5}>
                {exploreRepos.map((repo) => (
                  <Grid
                    item
                    xs={12}
                    sm={isCompactView ? 12 : 6}
                    md={isCompactView ? 6 : 4}
                    key={repo.id}
                    sx={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 150px' }}
                  >
                    <RepoCard
                      repo={repo}
                      isBookmarked={checkIsBookmarked(repo)}
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
                {exploreIsLoadingMore && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 2.5, gap: 1 }}>
                      <CircularProgress size={18} color="primary" />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                        Streaming more repositories...
                      </Typography>
                    </Box>
                  </Grid>
                )}
                {exploreLoadMoreError && (
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
                        {exploreLoadMoreError}
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={() => {
                          setExploreLoadMoreError(null);
                          loadMoreExplore();
                        }}
                        sx={{ textTransform: 'none', fontSize: '0.72rem', py: 0.2, px: 1.5, borderRadius: 2 }}
                      >
                        Tap to Retry
                      </Button>
                    </Box>
                  </Grid>
                )}
                {exploreHasMore && !exploreIsLoadingMore && !exploreLoadMoreError && exploreRepos.length > 0 && (
                  <Grid item xs={12}>
                    <Box sx={{ textAlign: 'center', py: 1.5 }}>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => loadMoreExplore()}
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
                {!exploreHasMore && exploreRepos.length > 0 && !exploreLoadMoreError && (
                  <Grid item xs={12}>
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                        You have reached the end ({exploreRepos.length} repositories loaded)
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            )}
          </Container>
            </>
          )}
        </Box>

        {/* Tab 5: Spotlight Fullscreen Discovery Observatory (lazy mounted on first visit) */}
        <Box sx={{ display: currentTab === 'spotlight' ? 'block' : 'none' }}>
          {visitedTabs.spotlight && (
            <ReelsView
              isActive={currentTab === 'spotlight'}
              onOpenDetail={handleOpenDetail}
              isBookmarked={checkIsBookmarked}
              onToggleBookmark={handleToggleBookmark}
              isStarred={checkIsStarred}
              onToggleStar={handleToggleStar}
              onShareMessage={handleShareMessage}
            />
          )}
        </Box>

        {/* Floating Action Button (Scroll to Top) — only visible after scrolling down > 300px */}
        {isBottomNavVisible && showScrollTop && currentTab !== 'spotlight' && (
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

        {/* Lazy-Loaded Overlays & Modal Sheets (Code-Split Chunks) */}
        <Suspense fallback={null}>
          {detailOpen && (
            <RepoDetailSheet
              repo={activeRepo}
              open={detailOpen}
              onClose={handleCloseDetail}
              onCopyClone={handleCopyClone}
              copiedId={copiedId}
              isBookmarked={activeRepo ? checkIsBookmarked(activeRepo) : false}
              onToggleBookmark={handleToggleBookmark}
              isStarred={activeRepo ? starredRepos.has(activeRepo.full_name) : false}
              onToggleStar={handleToggleStar}
              onShareMessage={handleShareMessage}
              initialTab={detailInitialTab}
            />
          )}

          {settingsOpen && (
            <SettingsPage
              open={settingsOpen}
              onClose={handleCloseSettings}
              coreRemaining={rateLimit.remaining}
              isAuthenticated={!!getStoredToken()}
              onOpenTokenDialog={handleOpenTokenDialog}
              isCompactView={isCompactView}
              onToggleCompactView={handleToggleCompactView}
              onRefresh={handleTitleBarRefresh}
              currentThemeId={themeId}
              availableThemes={availableThemes}
              onSelectTheme={handleSelectTheme}
              updateInfo={updateInfo}
              onOpenUpdateDialog={handleOpenUpdateDialog}
              onCacheCleared={handleCacheCleared}
            />
          )}

          {isSearchActive && (
            <SearchFlyout
              open={isSearchActive}
              onClose={handleCloseSearch}
              onSelectRepo={handleSelectRepoFromSearch}
              isBookmarked={checkIsBookmarked}
              onToggleBookmark={handleToggleBookmark}
              onCopyClone={handleCopyClone}
              copiedId={copiedId}
              isCompact={isCompactView}
              starredRepos={starredRepos}
              onToggleStar={handleToggleStar}
              onShareMessage={handleShareMessage}
            />
          )}

          {tokenDialogOpen && (
            <TokenDialog
              open={tokenDialogOpen}
              onClose={handleCloseTokenDialog}
              onTokenSaved={() => {
                if (currentTab === 'apks') loadApkData();
                else if (currentTab === 'explore') loadExploreData();
                checkLiveRateLimit();
                syncAuthenticatedAccountData(getStoredToken());
              }}
            />
          )}

          {updateDialogOpen && (
            <UpdateDialog
              open={updateDialogOpen}
              onClose={handleCloseUpdateDialog}
              updateInfo={updateInfo}
            />
          )}

          {onboardingOpen && (
            <OnboardingInterestsModal
              open={onboardingOpen}
              onClose={() => setOnboardingOpen(false)}
              onInterestsSaved={() => {
                setSnackbarMessage('Spotlight topic preferences saved');
                setSnackbarOpen(true);
              }}
            />
          )}
        </Suspense>

        {/* Apple Style Floating Glass Bottom Navigation Bar (Middle Aligned & Short) */}
        <BottomNav
          currentTab={currentTab}
          onTabChange={handleTabChange}
          vaultCount={vaultCount}
          visible={isBottomNavVisible}
        />

        {/* APK Download Confirmation Prompt */}
        <ApkDownloadDialog />

        {/* Global Feedback Snackbar */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={undoBookmarkRepo ? 3600 : 2500}
          onClose={() => {
            setSnackbarOpen(false);
            setUndoBookmarkRepo(null);
          }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ bottom: { xs: 72, sm: 72 }, zIndex: 1900 }}
        >
          <Alert
            severity="success"
            onClose={() => {
              setSnackbarOpen(false);
              setUndoBookmarkRepo(null);
            }}
            action={
              undoBookmarkRepo ? (
                <Button
                  size="small"
                  color="primary"
                  onClick={handleUndoRemoveBookmark}
                  sx={{ fontWeight: 800, fontSize: '0.74rem', minWidth: 0, px: 1 }}
                >
                  UNDO
                </Button>
              ) : undefined
            }
            sx={{
              borderRadius: '18px',
              fontWeight: 700,
              fontSize: '0.8rem',
              bgcolor: 'var(--bg-menu)',
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
