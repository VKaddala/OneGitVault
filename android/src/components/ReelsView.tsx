import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  InputAdornment,
  CircularProgress,
  Chip,
  Collapse,
  Button,
  Slide,
  useTheme,
  alpha,
  Fade
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ShareIcon from '@mui/icons-material/Share';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import TodayIcon from '@mui/icons-material/Today';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import PublicIcon from '@mui/icons-material/Public';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import CheckIcon from '@mui/icons-material/Check';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import StyleIcon from '@mui/icons-material/Style';
import { Repository } from '../types';
import { fetchRepositories, fetchReadme } from '../services/githubApi';
import { parseReadmeToSummary, createSyntheticSummary, ReadmeSummary } from '../services/readmeSummaryParser';
import { shareVisualCard } from '../utils/visualCardGenerator';
import { shareProject } from '../services/shareHelper';
import {
  getCachedSpotlightSuggestions,
  refreshSpotlightSuggestionsIfDue,
  SpotlightKeyword
} from '../services/spotlightSuggestions';
import { needsTranslation, translateItemsToEnglish } from '../services/translateService';
import { ReelCard } from './ReelCard';
import { OneGitVaultLogo } from './OneGitVaultLogo';
import { triggerHaptic } from '../utils/haptics';

interface ReelsViewProps {
  onOpenDetail: (repo: Repository, initialTab?: 'info' | 'readme' | 'releases') => void;
  isBookmarked: (repo: Repository) => boolean;
  onToggleBookmark: (repo: Repository) => void;
  isStarred: (repoFullName: string) => boolean;
  onToggleStar: (repo: Repository) => void;
  onShareMessage?: (msg: string) => void;
  isActive?: boolean;
}

type FilterType = 'today' | 'stars' | 'trending' | 'newest' | 'forks' | 'all';

interface FilterOption {
  id: FilterType;
  label: string;
  icon: React.ReactNode;
  sort: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  {
    id: 'stars',
    label: 'More Stars',
    icon: <StarIcon sx={{ fontSize: 18, color: '#f59e0b' }} />,
    sort: 'stars'
  },
  {
    id: 'today',
    label: 'Today',
    icon: <TodayIcon sx={{ fontSize: 18, color: '#06b6d4' }} />,
    sort: 'stars'
  },
  {
    id: 'trending',
    label: 'Trending',
    icon: <WhatshotIcon sx={{ fontSize: 18, color: '#ef4444' }} />,
    sort: 'updated'
  },
  {
    id: 'newest',
    label: 'Newest',
    icon: <AutoAwesomeIcon sx={{ fontSize: 18, color: '#3b82f6' }} />,
    sort: 'newest'
  },
  {
    id: 'forks',
    label: 'More Forks',
    icon: <CallSplitIcon sx={{ fontSize: 18, color: '#10b981' }} />,
    sort: 'forks'
  },
  {
    id: 'all',
    label: 'All Projects',
    icon: <PublicIcon sx={{ fontSize: 18, color: '#8b5cf6' }} />,
    sort: 'stars'
  }
];

const SEEN_SPOTLIGHT_KEY = 'ogv_seen_spotlight_v1';
const MAX_SEEN_SPOTLIGHT = 200;

let cachedSeenIdsList: number[] | null = null;
let cachedSeenIdsSet: Set<number> | null = null;
let seenFlushTimer: ReturnType<typeof setTimeout> | null = null;

function ensureSeenCacheLoaded(): Set<number> {
  if (cachedSeenIdsSet !== null) return cachedSeenIdsSet;
  try {
    const raw = localStorage.getItem(SEEN_SPOTLIGHT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const arr: number[] = Array.isArray(parsed?.ids) ? parsed.ids : [];
    cachedSeenIdsList = arr.slice(0, MAX_SEEN_SPOTLIGHT);
    cachedSeenIdsSet = new Set(cachedSeenIdsList);
  } catch {
    cachedSeenIdsList = [];
    cachedSeenIdsSet = new Set();
  }
  return cachedSeenIdsSet;
}

function getSeenSpotlightIds(): Set<number> {
  return ensureSeenCacheLoaded();
}

function recordSeenSpotlightId(repoId: number): void {
  if (!repoId) return;
  const set = ensureSeenCacheLoaded();
  if (set.has(repoId)) return;
  const next = [repoId, ...(cachedSeenIdsList || []).filter((id) => id !== repoId)].slice(0, MAX_SEEN_SPOTLIGHT);
  cachedSeenIdsList = next;
  cachedSeenIdsSet = new Set(next);
  if (seenFlushTimer) clearTimeout(seenFlushTimer);
  seenFlushTimer = setTimeout(() => {
    seenFlushTimer = null;
    try {
      localStorage.setItem(SEEN_SPOTLIGHT_KEY, JSON.stringify({ ids: next, timestamp: Date.now() }));
    } catch {}
  }, 600);
}

function formatUtcDaysAgo(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
}

function getLocalTodayWindow(): { utcQueryDate: string; localStartMs: number } {
  const now = new Date();
  const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    utcQueryDate: localMidnight.toISOString().split('T')[0],
    localStartMs: localMidnight.getTime()
  };
}

export const ReelsView: React.FC<ReelsViewProps> = React.memo(({
  onOpenDetail,
  isBookmarked,
  onToggleBookmark,
  isStarred,
  onToggleStar,
  onShareMessage,
  isActive = true
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // 1. User Search State & 10-Day Rotating Collapsible Suggestions
  const [searchInput, setSearchInput] = useState<string>('');
  const [activeSearch, setActiveSearch] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [trendingKeywords, setTrendingKeywords] = useState<SpotlightKeyword[]>(() => getCachedSpotlightSuggestions());

  // 2. Filter State
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('stars');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);

  // Repositories Feed State
  const [repos, setRepos] = useState<Repository[]>([]);
  const pageRef = useRef<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [showSwipeHint, setShowSwipeHint] = useState<boolean>(true);

  // Summaries Map: repo.full_name -> ReadmeSummary
  const [summaries, setSummaries] = useState<Record<string, ReadmeSummary>>({});
  const summariesRef = useRef<Record<string, ReadmeSummary>>({});
  summariesRef.current = summaries;

  // 3. Round Quick Actions Button & Expandable Actions Dock
  const [actionsExpanded, setActionsExpanded] = useState<boolean>(false);
  const actionsExpandedRef = useRef<boolean>(false);
  actionsExpandedRef.current = actionsExpanded;

  // Collapse actions menu immediately when switching away to another tab
  useEffect(() => {
    if (!isActive) {
      setActionsExpanded(false);
    }
  }, [isActive]);
  const dockOpenedAtRef = useRef<number>(0);
  const touchScrollStartYRef = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dockAreaRef = useRef<HTMLDivElement>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasActivatedRef = useRef<boolean>(false);
  const fetchedReadmesRef = useRef<Set<string>>(new Set());
  const translatedSummariesRef = useRef<Set<string>>(new Set());
  const preloadedImgsRef = useRef<Set<string>>(new Set());
  const feedReqIdRef = useRef<number>(0);
  const lastScrollTopRef = useRef<number>(0);
  const activeIndexRef = useRef<number>(0);
  activeIndexRef.current = activeIndex;

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, []);

  const currentFilterOption = FILTER_OPTIONS.find((f) => f.id === selectedFilter) || FILTER_OPTIONS[0];

  const constructQuery = useCallback(() => {
    const trimmed = activeSearch.trim();
    const { utcQueryDate } = getLocalTodayWindow();

    if (trimmed) {
      if (selectedFilter === 'today') {
        return `${trimmed} in:name,description,topics created:>=${utcQueryDate}`;
      }
      if (selectedFilter === 'trending') {
        return `${trimmed} in:name,description,topics pushed:>=${formatUtcDaysAgo(7)}`;
      }
      if (selectedFilter === 'newest') {
        return `${trimmed} in:name,description,topics created:>=${formatUtcDaysAgo(30)}`;
      }
      return `${trimmed} in:name,description,topics`;
    }

    switch (selectedFilter) {
      case 'today':
        return `created:>=${utcQueryDate}`;
      case 'trending':
        return `stars:>500 pushed:>=${formatUtcDaysAgo(7)}`;
      case 'newest':
        return `created:>=${formatUtcDaysAgo(30)} stars:>50`;
      case 'forks':
        return 'forks:>500';
      case 'all':
        return 'stars:>100';
      case 'stars':
      default:
        return 'stars:>5000';
    }
  }, [activeSearch, selectedFilter]);

  const loadFeed = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      const reqId = ++feedReqIdRef.current;
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const query = constructQuery();
      const sortParam = currentFilterOption.sort;
      const { localStartMs } = getLocalTodayWindow();

      try {
        const result = await fetchRepositories(
          'all',
          query,
          sortParam,
          0,
          pageNum,
          60,
          false,
          false
        );

        // Discard stale responses if user rapidly switched filter/search
        if (reqId !== feedReqIdRef.current) return;

        let newRepos = result.repositories || [];

        // Strictly enforce "Today" filter so only today-created repositories appear
        if (selectedFilter === 'today') {
          const todayOnly = newRepos.filter(
            (r) => r.created_at && new Date(r.created_at).getTime() >= localStartMs
          );
          if (todayOnly.length > 0 || !result.fromCache) {
            newRepos = todayOnly;
          }
        }

        // Prioritize unseen Spotlight projects ahead of recently viewed ones in default unfiltered feed
        if (!append && !activeSearch.trim() && newRepos.length > 5) {
          const seenIds = getSeenSpotlightIds();
          if (seenIds.size > 0) {
            const unseen = newRepos.filter((r) => !seenIds.has(r.id));
            const seen = newRepos.filter((r) => seenIds.has(r.id));
            if (unseen.length > 0) {
              newRepos = [...unseen, ...seen];
            }
          }
        }

        setRepos((prev) => {
          if (!append) return newRepos;
          const seen = new Set(prev.map((r) => r.id));
          return [...prev, ...newRepos.filter((r) => !seen.has(r.id))];
        });
        setHasMore((result.repositories || []).length >= 50);

        if (result.fromCache && result.isRateLimit && pageNum === 1) {
          onShareMessage?.(
            `Rate limit reached — showing cached repos (resets in ~${result.rateLimitResetInSec || 60}s)`
          );
        }
      } catch (err) {
        console.error('Failed to load feed:', err);
      } finally {
        if (reqId === feedReqIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [constructQuery, currentFilterOption.sort, selectedFilter, onShareMessage]
  );

  const prevFeedDepsRef = useRef({ activeSearch, selectedFilter, loadFeed });

  useEffect(() => {
    const depsChanged =
      prevFeedDepsRef.current.activeSearch !== activeSearch ||
      prevFeedDepsRef.current.selectedFilter !== selectedFilter ||
      prevFeedDepsRef.current.loadFeed !== loadFeed;
    prevFeedDepsRef.current = { activeSearch, selectedFilter, loadFeed };

    if (!hasActivatedRef.current) {
      if (!isActive) return;
      hasActivatedRef.current = true;
      loadFeed(1, false);
      refreshSpotlightSuggestionsIfDue().then(setTrendingKeywords).catch(() => {});
      return;
    }

    if (depsChanged) {
      setActiveIndex(0);
      pageRef.current = 1;
      fetchedReadmesRef.current.clear();
      translatedSummariesRef.current.clear();
      setShowSwipeHint(true);
      setActionsExpanded(false);
      loadFeed(1, false);

      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    }
  }, [isActive, activeSearch, selectedFilter, loadFeed]);

  // Translate non-English display lines only (0 API calls when summary is English)
  const translateSummaryIfNeeded = useCallback(async (repoFullName: string, summary: ReadmeSummary) => {
    if (!summary || summary.isTranslated || translatedSummariesRef.current.has(repoFullName)) return;

    const textBlob = [summary.headline, ...(summary.highlights || [])].join('\n');
    if (!needsTranslation(textBlob)) return;

    translatedSummariesRef.current.add(repoFullName);
    try {
      const inputs = [summary.headline, ...(summary.highlights || [])];
      const { items, didTranslate } = await translateItemsToEnglish(inputs);
      if (didTranslate && items.length > 0) {
        setSummaries((prev) => {
          const latest = prev[repoFullName] || summary;
          return {
            ...prev,
            [repoFullName]: {
              ...latest,
              headline: items[0] || latest.headline,
              highlights: items.slice(1).length > 0 ? items.slice(1) : latest.highlights,
              isTranslated: true
            }
          };
        });
      }
    } catch {}
  }, []);

  const fetchAndParseReadmeForRepo = useCallback(
    async (repo: Repository) => {
      if (!repo || !repo.full_name || fetchedReadmesRef.current.has(repo.full_name)) return;
      if (fetchedReadmesRef.current.size > 120) {
        fetchedReadmesRef.current.clear();
      }
      fetchedReadmesRef.current.add(repo.full_name);

      try {
        const rawMarkdown = await fetchReadme(repo.full_name, repo.default_branch);
        if (rawMarkdown && !rawMarkdown.startsWith('# Failed to load')) {
          const parsed = parseReadmeToSummary(rawMarkdown, repo);
          setSummaries((prev) => ({
            ...prev,
            [repo.full_name]: parsed
          }));
          translateSummaryIfNeeded(repo.full_name, parsed);
        } else {
          const synthetic = createSyntheticSummary(repo);
          translateSummaryIfNeeded(repo.full_name, synthetic);
        }
      } catch {
        const synthetic = createSyntheticSummary(repo);
        translateSummaryIfNeeded(repo.full_name, synthetic);
      }
    },
    [translateSummaryIfNeeded]
  );

  useEffect(() => {
    if (!hasActivatedRef.current || repos.length === 0) return;

    const current = repos[activeIndex];
    if (current) {
      if (isActive) recordSeenSpotlightId(current.id);
      fetchAndParseReadmeForRepo(current);
      const currentSummary = summariesRef.current[current.full_name] || createSyntheticSummary(current);
      translateSummaryIfNeeded(current.full_name, currentSummary);
    }

    const next = repos[activeIndex + 1];
    if (next) {
      fetchAndParseReadmeForRepo(next);
      const nextHero = summariesRef.current[next.full_name]?.heroMediaUrl;
      if (nextHero && !preloadedImgsRef.current.has(nextHero)) {
        if (preloadedImgsRef.current.size > 40) preloadedImgsRef.current.clear();
        preloadedImgsRef.current.add(nextHero);
        try {
          const img = new Image();
          img.src = nextHero;
        } catch {}
      }
    }
  }, [isActive, activeIndex, repos, fetchAndParseReadmeForRepo, translateSummaryIfNeeded]);

  const toggleDock = useCallback(() => {
    triggerHaptic(12);
    setActionsExpanded((prev) => {
      const next = !prev;
      if (next) {
        dockOpenedAtRef.current = Date.now();
        if (containerRef.current) {
          lastScrollTopRef.current = containerRef.current.scrollTop;
        }
      }
      return next;
    });
  }, []);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    const scrollTop = el.scrollTop;
    const clientHeight = el.clientHeight;
    if (clientHeight <= 0) return;

    const recentlyOpened = Date.now() - dockOpenedAtRef.current < 260;

    // Collapse quick actions when user actually scrolls away (guarding post-open settle jitter)
    if (actionsExpandedRef.current && !recentlyOpened && Math.abs(scrollTop - lastScrollTopRef.current) > 14) {
      setActionsExpanded(false);
    }
    lastScrollTopRef.current = scrollTop;

    const newIndex = Math.round(scrollTop / clientHeight);
    if (newIndex !== activeIndexRef.current && newIndex >= 0 && newIndex < repos.length) {
      setActiveIndex(newIndex);
      if (!recentlyOpened) setActionsExpanded(false);
      triggerHaptic(8);
      if (showSwipeHint) setShowSwipeHint(false);

      if (newIndex >= repos.length - 3 && !loadingMore && hasMore) {
        pageRef.current += 1;
        loadFeed(pageRef.current, true);
      }
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveSearch(searchInput);
    setIsSearchFocused(false);
    // Blur the search input so keyboard dismisses
    searchInputRef.current?.blur();
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setActiveSearch('');
  };

  const handleSelectTrendingKeyword = (kwQuery: string) => {
    triggerHaptic(10);
    setSearchInput(kwQuery);
    setActiveSearch(kwQuery);
    setIsSearchFocused(false);
    // Blur the search input so keyboard dismisses
    searchInputRef.current?.blur();
  };

  // Currently Active Repo for the Fixed Bottom-Right Action Arrow & Dock
  const activeRepo = repos[activeIndex] || repos[0];
  const activeIsBookmarked = activeRepo ? isBookmarked(activeRepo) : false;
  const activeIsStarred = activeRepo ? isStarred(activeRepo.full_name) : false;

  const handleShareActive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeRepo) return;
    const shareUrl = activeRepo.html_url;
    const shareTitle = `${activeRepo.name} — ${activeRepo.description || 'Open Source Project'}`;
    const result = await shareProject(
      activeRepo.name,
      `Check out ${activeRepo.name} on OneGitVault: ${activeRepo.description || shareTitle}`,
      shareUrl
    );
    if (result === 'copied') {
      onShareMessage?.('Repository link copied to clipboard!');
    }
  };

  const [isGeneratingCard, setIsGeneratingCard] = useState<boolean>(false);

  const handleGenerateCard = useCallback(async () => {
    if (isGeneratingCard || !activeRepo) return;
    triggerHaptic(15);
    setIsGeneratingCard(true);
    onShareMessage?.('Generating visual card...');

    // Yield 40ms to event loop so browser immediately renders button active state & loading spinner
    await new Promise((resolve) => setTimeout(resolve, 40));

    try {
      const activeSummary = summariesRef.current[activeRepo.full_name] || createSyntheticSummary(activeRepo);
      await shareVisualCard(activeRepo, activeSummary, onShareMessage);
    } catch (err) {
      console.warn('Card share error:', err);
      onShareMessage?.('Could not generate card');
    } finally {
      setIsGeneratingCard(false);
    }
  }, [activeRepo, isGeneratingCard, onShareMessage]);

  return (
    <Box
      onPointerDownCapture={(e) => {
        if (actionsExpandedRef.current && dockAreaRef.current && !dockAreaRef.current.contains(e.target as Node)) {
          setActionsExpanded(false);
        }
      }}
      sx={{
        width: '100%',
        height: '100dvh',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'transparent'
      }}
    >
      {/* ── Top Bar: Upper Safe-Area Padding + Search Input + Icon-Only Filter + Collapsible Suggestions ── */}
      <Box
        component="form"
        onSubmit={handleSearchSubmit}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          pt: 'calc(max(env(safe-area-inset-top, 0px), var(--status-bar-height, 44px)) + 8px)',
          pb: 1.2,
          px: { xs: 2, sm: 2.8 },
          bgcolor: 'var(--bg-header)',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        {/* Row 1: Search Input & Icon-Only Filter Button */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search topic or tech..."
            value={searchInput}
            inputRef={searchInputRef}
            onFocus={() => {
              if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
              setIsSearchFocused(true);
            }}
            onBlur={() => {
              if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
              blurTimerRef.current = setTimeout(() => setIsSearchFocused(false), 280);
            }}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearchSubmit();
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 19, color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: searchInput ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleClearSearch} edge="end" sx={{ p: 0.4 }}>
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : null
            }}
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                height: 40,
                borderRadius: '24px',
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
                fontSize: '0.84rem',
                fontWeight: 600,
                '& fieldset': { border: 'none' },
                '&:hover': {
                  bgcolor: isDark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(0, 0, 0, 0.06)'
                },
                '&.Mui-focused': {
                  bgcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#ffffff',
                  border: `1.5px solid ${theme.palette.primary.main}`,
                  boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`
                }
              }
            }}
          />

          {/* Icon-Only Filter Button */}
          <IconButton
            onClick={(e) => setFilterAnchorEl(e.currentTarget)}
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
              border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
              color: theme.palette.primary.main,
              boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
              flexShrink: 0,
              transition: 'all 0.15s ease',
              '&:active': { transform: 'scale(0.9)' }
            }}
          >
            {currentFilterOption.icon}
          </IconButton>
        </Box>

        {/* Row 2: 10 Trending Search Suggestions (Only visible when search input is focused) */}
        <Collapse in={isSearchFocused}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.8,
              overflowX: 'auto',
              pt: 0.5,
              pb: 0.2,
              WebkitOverflowScrolling: 'touch',
              '&::-webkit-scrollbar': { display: 'none' }
            }}
          >
            {trendingKeywords.map((item) => {
              const isSelected = activeSearch.toLowerCase() === item.query.toLowerCase();
              return (
                <Chip
                  key={item.query}
                  label={item.label}
                  size="small"
                  onClick={() => handleSelectTrendingKeyword(item.query)}
                  sx={{
                    height: 25,
                    fontSize: '0.68rem',
                    fontWeight: isSelected ? 800 : 600,
                    bgcolor: isSelected
                      ? alpha(theme.palette.primary.main, isDark ? 0.25 : 0.18)
                      : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)'),
                    color: isSelected ? theme.palette.primary.main : 'text.secondary',
                    border: `1px solid ${isSelected ? alpha(theme.palette.primary.main, 0.4) : alpha(theme.palette.divider, 0.12)}`,
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                    '&:active': { transform: 'scale(0.94)' }
                  }}
                />
              );
            })}
          </Box>
        </Collapse>

        {/* Filter Popup Menu */}
        <Menu
          anchorEl={filterAnchorEl}
          open={Boolean(filterAnchorEl)}
          onClose={() => setFilterAnchorEl(null)}
          PaperProps={{
            sx: {
              mt: 1,
              borderRadius: '20px',
              minWidth: 190,
              bgcolor: 'var(--bg-menu)',
              backgroundImage: 'none',
              border: `1px solid ${alpha(theme.palette.divider, 0.18)}`,
              boxShadow: isDark ? '0 16px 40px rgba(0,0,0,0.65)' : '0 12px 32px rgba(0,0,0,0.12)',
              p: 0.5
            }
          }}
        >
          {FILTER_OPTIONS.map((option) => {
            const isSelected = selectedFilter === option.id;
            return (
              <MenuItem
                key={option.id}
                onClick={() => {
                  setSelectedFilter(option.id);
                  setFilterAnchorEl(null);
                  triggerHaptic(10);
                }}
                sx={{
                  borderRadius: '12px',
                  my: 0.3,
                  py: 0.8,
                  bgcolor: isSelected
                    ? alpha(theme.palette.primary.main, isDark ? 0.2 : 0.12)
                    : 'transparent',
                  fontWeight: isSelected ? 800 : 600,
                  color: isSelected ? theme.palette.primary.main : 'text.primary'
                }}
              >
                <ListItemIcon sx={{ minWidth: 30 }}>{option.icon}</ListItemIcon>
                <ListItemText
                  primary={option.label}
                  primaryTypographyProps={{
                    fontSize: '0.84rem',
                    fontWeight: isSelected ? 800 : 600
                  }}
                />
                {isSelected && <CheckIcon sx={{ fontSize: 18, color: theme.palette.primary.main, ml: 1 }} />}
              </MenuItem>
            );
          })}
        </Menu>
      </Box>

      {/* ── Main Reel Scroll Container (100dvh Vertical Snap-Scroll) ── */}
      {loading ? (
        <Box
          sx={{
            height: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2
          }}
        >
          <Box
            sx={{
              animation: 'spotlightPulse 1.4s ease-in-out infinite',
              '@keyframes spotlightPulse': {
                '0%, 100%': { transform: 'scale(1)', opacity: 0.95 },
                '50%': { transform: 'scale(1.12)', opacity: 0.7 }
              }
            }}
          >
            <OneGitVaultLogo size={68} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesomeIcon sx={{ fontSize: 20, color: theme.palette.primary.main }} />
            <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.92rem' }}>
              Lighting up Spotlight...
            </Typography>
          </Box>
          <CircularProgress size={24} color="primary" />
        </Box>
      ) : repos.length === 0 ? (
        <Box
          sx={{
            height: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            textAlign: 'center'
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
            No Projects Found
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Try another keyword or change your filter.
          </Typography>
          <Button
            variant="contained"
            onClick={handleClearSearch}
            startIcon={<AutoAwesomeIcon />}
            sx={{ borderRadius: '24px', textTransform: 'none', fontWeight: 700 }}
          >
            Reset Search
          </Button>
        </Box>
      ) : (
        <Box
          ref={containerRef}
          onScroll={handleScroll}
          onTouchStart={(e) => {
            if (e.touches.length === 1) {
              touchScrollStartYRef.current = e.touches[0].clientY;
            }
          }}
          onTouchMove={(e) => {
            if (
              actionsExpandedRef.current &&
              Date.now() - dockOpenedAtRef.current >= 160 &&
              e.touches.length === 1 &&
              touchScrollStartYRef.current !== null &&
              Math.abs(e.touches[0].clientY - touchScrollStartYRef.current) > 12
            ) {
              setActionsExpanded(false);
            }
          }}
          onTouchEnd={() => {
            touchScrollStartYRef.current = null;
          }}
          sx={{
            width: '100%',
            height: '100dvh',
            overflowY: 'scroll',
            scrollSnapType: 'y mandatory',
            overscrollBehaviorY: 'contain',
            WebkitOverflowScrolling: 'touch',
            '&::-webkit-scrollbar': { display: 'none' }
          }}
        >
          {repos.map((repo, idx) => {
            const isNearActive = Math.abs(idx - activeIndex) <= 2;
            const summary = isNearActive ? (summaries[repo.full_name] || createSyntheticSummary(repo)) : null;

            return (
              <Box
                key={repo.id}
                sx={{
                  width: '100%',
                  height: '100dvh',
                  scrollSnapAlign: 'start',
                  scrollSnapStop: 'always'
                }}
              >
                {summary ? (
                  <ReelCard
                    repo={repo}
                    summary={summary}
                    isBookmarked={isBookmarked(repo)}
                    onToggleBookmark={onToggleBookmark}
                    isStarred={isStarred(repo.full_name)}
                    onToggleStar={onToggleStar}
                    onOpenDetail={onOpenDetail}
                    onShareMessage={onShareMessage}
                  />
                ) : (
                  <Box sx={{ width: '100%', height: '100dvh' }} />
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {/* ── FIXED ROUND QUICK-ACTIONS BUTTON AT THE BOTTOM RIGHT EDGE ON SPOTLIGHT PAGE (Non-scrollable!) ── */}
      {activeRepo && !loading && (
        <Box
          ref={dockAreaRef}
          sx={{
            position: 'fixed',
            right: { xs: 16, sm: 24 },
            bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 4px) + 78px)',
            zIndex: 1200,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            pointerEvents: 'auto'
          }}
        >
            {/* Expanded Action Dock (Pops upward aligned to right edge above the round arrow button) */}
            <Slide direction="up" in={actionsExpanded} mountOnEnter unmountOnExit timeout={160}>
              <Box
                onClick={(e) => e.stopPropagation()}
                  sx={{
                    mb: 1.5,
                    maxWidth: 'calc(100vw - 32px)',
                    borderRadius: '28px',
                    bgcolor: 'var(--bg-menu)',
                    backgroundImage: 'none',
                    border: `1.5px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                    boxShadow: isDark
                      ? `0 20px 60px rgba(0,0,0,0.8), 0 0 24px ${alpha(theme.palette.primary.main, 0.3)}`
                      : '0 16px 48px rgba(0,0,0,0.18)',
                    px: { xs: 1.4, sm: 1.8 },
                    py: 1.2,
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: { xs: 1.2, sm: 1.6 }
                  }}
                >
                  {/* Star Action */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStar(activeRepo);
                      }}
                      sx={{
                        width: 44,
                        height: 44,
                        bgcolor: activeIsStarred
                          ? alpha('#f59e0b', 0.22)
                          : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'),
                        border: `1.5px solid ${activeIsStarred ? '#f59e0b' : alpha(theme.palette.divider, 0.15)}`,
                        color: activeIsStarred ? '#f59e0b' : 'text.primary',
                        '&:active': { transform: 'scale(0.88)' }
                      }}
                    >
                      {activeIsStarred ? <StarIcon sx={{ fontSize: 24 }} /> : <StarBorderIcon sx={{ fontSize: 24 }} />}
                    </IconButton>
                    <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 800, mt: 0.3, color: 'text.secondary' }}>
                      {activeRepo.stargazers_count > 999
                        ? `${(activeRepo.stargazers_count / 1000).toFixed(1)}k`
                        : activeRepo.stargazers_count}
                    </Typography>
                  </Box>

                  {/* Vault Bookmark Action */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic(10);
                        onToggleBookmark(activeRepo);
                      }}
                      sx={{
                        width: 44,
                        height: 44,
                        bgcolor: activeIsBookmarked
                          ? alpha(theme.palette.primary.main, 0.25)
                          : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'),
                        border: `1.5px solid ${activeIsBookmarked ? theme.palette.primary.main : alpha(theme.palette.divider, 0.15)}`,
                        color: activeIsBookmarked ? theme.palette.primary.main : 'text.primary',
                        '&:active': { transform: 'scale(0.88)' }
                      }}
                    >
                      {activeIsBookmarked ? <BookmarkIcon sx={{ fontSize: 22 }} /> : <BookmarkBorderIcon sx={{ fontSize: 22 }} />}
                    </IconButton>
                    <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 800, mt: 0.3, color: 'text.secondary' }}>
                      Vault
                    </Typography>
                  </Box>

                  {/* Full README Button */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDetail(activeRepo, 'readme');
                      }}
                      sx={{
                        width: 44,
                        height: 44,
                        bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                        border: `1.5px solid ${alpha(theme.palette.divider, 0.15)}`,
                        color: 'text.primary',
                        '&:active': { transform: 'scale(0.88)' }
                      }}
                    >
                      <MenuBookIcon sx={{ fontSize: 21 }} />
                    </IconButton>
                    <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 800, mt: 0.3, color: 'text.secondary' }}>
                      Readme
                    </Typography>
                  </Box>

                  {/* Share Action */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <IconButton
                      onClick={handleShareActive}
                      sx={{
                        width: 44,
                        height: 44,
                        bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                        border: `1.5px solid ${alpha(theme.palette.divider, 0.15)}`,
                        color: 'text.primary',
                        '&:active': { transform: 'scale(0.88)' }
                      }}
                    >
                      <ShareIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                    <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 800, mt: 0.3, color: 'text.secondary' }}>
                      Share
                    </Typography>
                  </Box>

                  {/* Shareable Visual Card */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <IconButton
                      onClick={handleGenerateCard}
                      disabled={isGeneratingCard}
                      sx={{
                        width: 44,
                        height: 44,
                        bgcolor: isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(37, 99, 235, 0.08)',
                        border: `1.5px solid ${alpha(theme.palette.primary.main, 0.35)}`,
                        color: theme.palette.primary.main,
                        transition: 'all 0.15s ease',
                        '&:active': { transform: 'scale(0.88)' }
                      }}
                    >
                      {isGeneratingCard ? (
                        <CircularProgress size={20} thickness={4.5} sx={{ color: theme.palette.primary.main }} />
                      ) : (
                        <StyleIcon sx={{ fontSize: 20 }} />
                      )}
                    </IconButton>
                    <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 800, mt: 0.3, color: 'primary.main' }}>
                      {isGeneratingCard ? 'Exporting...' : 'Card'}
                    </Typography>
                  </Box>

                  {/* GitHub Action */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(activeRepo.html_url, '_blank');
                      }}
                      sx={{
                        width: 44,
                        height: 44,
                        bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                        border: `1.5px solid ${alpha(theme.palette.divider, 0.15)}`,
                        color: 'text.primary',
                        '&:active': { transform: 'scale(0.88)' }
                      }}
                    >
                      <OpenInNewIcon sx={{ fontSize: 19 }} />
                    </IconButton>
                    <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 800, mt: 0.3, color: 'text.secondary' }}>
                      GitHub
                    </Typography>
                  </Box>
                </Box>
              </Slide>

            {/* FIXED ROUND QUICK-ACTIONS BUTTON — bottom right edge */}
          <IconButton
            aria-label="Open repository quick actions"
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              toggleDock();
            }}
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              bgcolor: 'var(--bg-pill)',
              transform: 'translateZ(0)',
              border: `1.5px solid ${alpha(theme.palette.primary.main, 0.4)}`,
              boxShadow: isDark
                ? `0 12px 36px rgba(0,0,0,0.7), 0 0 16px ${alpha(theme.palette.primary.main, 0.25)}`
                : '0 8px 24px rgba(0,0,0,0.15)',
              color: theme.palette.primary.main,
              transition: 'transform 0.15s ease',
              position: 'relative',
              '&:active': { transform: 'scale(0.9)' }
            }}
          >
            {actionsExpanded ? (
              <CloseIcon sx={{ fontSize: 22 }} />
            ) : (
              <MoreHorizRoundedIcon sx={{ fontSize: 26 }} />
            )}
            {activeIsBookmarked && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 7,
                  right: 7,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: theme.palette.primary.main,
                  boxShadow: `0 0 6px ${theme.palette.primary.main}`
                }}
              />
            )}
          </IconButton>
        </Box>
      )}

      {/* ── Swipe Up Guidance Cue ── */}
      <Fade in={Boolean(isActive) && showSwipeHint && !loading && repos.length > 1} unmountOnExit>
        <Box
          sx={{
            position: 'fixed',
            bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 4px) + 72px)',
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            bgcolor: isDark ? 'rgba(0,0,0,0.88)' : 'rgba(255,255,255,0.95)',
            border: `1px solid ${alpha(theme.palette.divider, 0.18)}`,
            px: 2,
            py: 0.4,
            borderRadius: '24px',
            animation: 'swipeHintBounce 1.8s ease-in-out infinite',
            '@keyframes swipeHintBounce': {
              '0%, 100%': { transform: 'translateX(-50%) translateY(0)' },
              '50%': { transform: 'translateX(-50%) translateY(-6px)' }
            }
          }}
        >
          <KeyboardArrowUpIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
          <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 800, color: 'text.secondary' }}>
            Swipe up for next project
          </Typography>
        </Box>
      </Fade>
    </Box>
  );
});
