import React, { useState, useEffect, useCallback, useRef, useTransition } from 'react';
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Button,
  Divider,
  useTheme,
  alpha
} from '@mui/material';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import AndroidIcon from '@mui/icons-material/Android';
import TodayIcon from '@mui/icons-material/Today';
import DateRangeIcon from '@mui/icons-material/DateRange';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Repository, TimeRange } from '../types';
import { RepoCard } from './RepoCard';
import { fetchTrendingRepositories } from '../services/githubApi';
import { isBookmarked as checkIsBookmarkedGlobal } from '../services/bookmarkStore';
import { syncNativeWidgets } from '../services/widgetSync';

interface TrendingViewProps {
  onOpenDetail: (repo: Repository) => void;
  isBookmarked: (repoOrId: any) => boolean;
  onToggleBookmark: (repo: Repository) => void;
  onCopyClone: (cloneUrl: string) => void;
  copiedId: number | null;
  refreshTrigger?: number;
  isCompact?: boolean;
  isActive?: boolean;
}

type TrendingScope = 'all' | 'apk';

const POPULAR_LANGUAGES = ['All', 'TypeScript', 'Python', 'Rust', 'Go', 'Java', 'Kotlin', 'C++'];

export const TrendingView: React.FC<TrendingViewProps> = React.memo(({
  onOpenDetail,
  isBookmarked,
  onToggleBookmark,
  onCopyClone,
  copiedId,
  refreshTrigger = 0,
  isCompact = false,
  isActive = true
}) => {
  const theme = useTheme();
  const [, startTransition] = useTransition();
  const [scope, setScope] = useState<TrendingScope>('all');
  const [uiScope, setUiScope] = useState<TrendingScope>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');
  const [uiTimeRange, setUiTimeRange] = useState<TimeRange>('daily');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
  const [uiLanguage, setUiLanguage] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(false);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [, setBookmarkTick] = useState(0);
  const fetchReqIdRef = useRef<number>(0);

  useEffect(() => {
    const handleBookmarkChange = () => setBookmarkTick((t) => t + 1);
    window.addEventListener('ogv_bookmarks_changed', handleBookmarkChange);
    return () => window.removeEventListener('ogv_bookmarks_changed', handleBookmarkChange);
  }, []);

  const loadTrending = useCallback(async (forceRefresh = false) => {
    const reqId = ++fetchReqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const langParam = selectedLanguage === 'All' ? undefined : selectedLanguage;
      const data = await fetchTrendingRepositories(timeRange, scope, langParam, forceRefresh);
      if (reqId === fetchReqIdRef.current) {
        setRepos(data);
        syncNativeWidgets(data);
      }
    } catch (err: any) {
      console.warn('Failed to load trending:', err);
      if (reqId === fetchReqIdRef.current) {
        setError('Unable to fetch live trending repositories. Tap retry below.');
      }
    } finally {
      if (reqId === fetchReqIdRef.current) {
        setLoading(false);
      }
    }
  }, [timeRange, scope, selectedLanguage]);

  const hasActivatedRef = useRef<boolean>(false);
  const prevLoadDepsRef = useRef({ loadTrending, refreshTrigger });

  useEffect(() => {
    const depsChanged =
      prevLoadDepsRef.current.loadTrending !== loadTrending ||
      prevLoadDepsRef.current.refreshTrigger !== refreshTrigger;
    prevLoadDepsRef.current = { loadTrending, refreshTrigger };

    if (!hasActivatedRef.current) {
      if (!isActive) return;
      hasActivatedRef.current = true;
      loadTrending(refreshTrigger > 0);
      return;
    }

    if (depsChanged) {
      loadTrending(refreshTrigger > 0);
    }
  }, [isActive, loadTrending, refreshTrigger]);

  const getTimeRangeLabel = () => {
    if (timeRange === 'daily') return 'Today (Last 3 days)';
    if (timeRange === 'weekly') return 'This Week';
    return 'This Month';
  };

  return (
    <Box sx={{ px: { xs: 1.5, sm: 2 }, pt: 1, pb: 12, maxWidth: 1280, mx: 'auto', boxSizing: 'border-box' }}>
      {/* Header Row: Title & Refresh Button */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1,
          gap: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WhatshotIcon sx={{ color: '#ef4444', fontSize: 24 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '0.975rem', lineHeight: 1.2 }}>
              {scope === 'all' ? 'All Trending Repositories' : 'Trending Android Apps & APKs'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem' }}>
              {getTimeRangeLabel()} • {repos.length} repositories
            </Typography>
          </Box>
        </Box>

        {/* Refresh Icon Button */}
        <IconButton
          size="small"
          onClick={() => loadTrending(true)}
          disabled={loading}
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.16) },
            p: 0.5
          }}
        >
          <RefreshIcon
            sx={{
              fontSize: 17,
              color: theme.palette.primary.main,
              animation: loading ? 'spin 1s linear infinite' : 'none',
              '@keyframes spin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' }
              }
            }}
          />
        </IconButton>
      </Box>

      {/* Single Sleek Horizontal Scrollbar with Grouped Options */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 1,
          overflowX: 'auto',
          py: 0.6,
          mb: 1.5,
          width: '100%',
          boxSizing: 'border-box',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          '&::-webkit-scrollbar': { display: 'none' }
        }}
      >
        {/* Group 1: Scope (All vs APKs) */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.4,
            bgcolor: alpha(theme.palette.text.primary, 0.04),
            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            p: 0.35,
            borderRadius: '12px',
            flexShrink: 0
          }}
        >
          <Chip
            icon={<WhatshotIcon sx={{ fontSize: '13px !important' }} />}
            label="All"
            size="small"
            onClick={() => {
              setUiScope('all');
              startTransition(() => setScope('all'));
            }}
            color={uiScope === 'all' ? 'primary' : 'default'}
            variant={uiScope === 'all' ? 'filled' : 'outlined'}
            sx={{
              fontWeight: uiScope === 'all' ? 800 : 600,
              fontSize: '0.68rem',
              height: 24,
              borderRadius: '9px',
              border: 'none',
              cursor: 'pointer'
            }}
          />
          <Chip
            icon={<AndroidIcon sx={{ fontSize: '13px !important' }} />}
            label="APKs"
            size="small"
            onClick={() => {
              setUiScope('apk');
              startTransition(() => setScope('apk'));
            }}
            color={uiScope === 'apk' ? 'primary' : 'default'}
            variant={uiScope === 'apk' ? 'filled' : 'outlined'}
            sx={{
              fontWeight: uiScope === 'apk' ? 800 : 600,
              fontSize: '0.68rem',
              height: 24,
              borderRadius: '9px',
              border: 'none',
              cursor: 'pointer'
            }}
          />
        </Box>

        <Divider orientation="vertical" flexItem sx={{ my: 0.5, opacity: 0.35 }} />

        {/* Group 2: Time Range (Today, Week, Month) */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.4,
            bgcolor: alpha(theme.palette.text.primary, 0.04),
            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            p: 0.35,
            borderRadius: '12px',
            flexShrink: 0
          }}
        >
          <Chip
            icon={<TodayIcon sx={{ fontSize: '13px !important' }} />}
            label="Today"
            size="small"
            onClick={() => {
              setUiTimeRange('daily');
              startTransition(() => setTimeRange('daily'));
            }}
            color={uiTimeRange === 'daily' ? 'primary' : 'default'}
            variant={uiTimeRange === 'daily' ? 'filled' : 'outlined'}
            sx={{
              fontWeight: uiTimeRange === 'daily' ? 700 : 500,
              fontSize: '0.68rem',
              height: 24,
              borderRadius: '9px',
              border: 'none',
              cursor: 'pointer'
            }}
          />
          <Chip
            icon={<DateRangeIcon sx={{ fontSize: '13px !important' }} />}
            label="Week"
            size="small"
            onClick={() => {
              setUiTimeRange('weekly');
              startTransition(() => setTimeRange('weekly'));
            }}
            color={uiTimeRange === 'weekly' ? 'primary' : 'default'}
            variant={uiTimeRange === 'weekly' ? 'filled' : 'outlined'}
            sx={{
              fontWeight: uiTimeRange === 'weekly' ? 700 : 500,
              fontSize: '0.68rem',
              height: 24,
              borderRadius: '9px',
              border: 'none',
              cursor: 'pointer'
            }}
          />
          <Chip
            icon={<CalendarMonthIcon sx={{ fontSize: '13px !important' }} />}
            label="Month"
            size="small"
            onClick={() => {
              setUiTimeRange('monthly');
              startTransition(() => setTimeRange('monthly'));
            }}
            color={uiTimeRange === 'monthly' ? 'primary' : 'default'}
            variant={uiTimeRange === 'monthly' ? 'filled' : 'outlined'}
            sx={{
              fontWeight: uiTimeRange === 'monthly' ? 700 : 500,
              fontSize: '0.68rem',
              height: 24,
              borderRadius: '9px',
              border: 'none',
              cursor: 'pointer'
            }}
          />
        </Box>

        {/* Group 3: Languages (when in All scope) */}
        {uiScope === 'all' && (
          <>
            <Divider orientation="vertical" flexItem sx={{ my: 0.5, opacity: 0.35 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
              {POPULAR_LANGUAGES.map((lang) => {
                const isSelected = uiLanguage === lang;
                return (
                  <Chip
                    key={lang}
                    label={lang}
                    size="small"
                    onClick={() => {
                      setUiLanguage(lang);
                      startTransition(() => setSelectedLanguage(lang));
                    }}
                    color={isSelected ? 'secondary' : 'default'}
                    variant={isSelected ? 'filled' : 'outlined'}
                    sx={{
                      fontSize: '0.68rem',
                      fontWeight: isSelected ? 800 : 500,
                      borderRadius: '9px',
                      height: 24,
                      flexShrink: 0,
                      cursor: 'pointer'
                    }}
                  />
                );
              })}
            </Box>
          </>
        )}
      </Box>

      {/* Grid of trending projects */}
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, gap: 1.5 }}>
          <CircularProgress size={32} color="primary" />
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>
            Fetching live trending repositories from GitHub…
          </Typography>
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body2" sx={{ color: 'error.main', mb: 2, fontWeight: 600 }}>
            {error}
          </Typography>
          <Button variant="outlined" size="small" onClick={() => loadTrending(true)} sx={{ borderRadius: '12px' }}>
            Retry
          </Button>
        </Box>
      ) : repos.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>No trending repositories found.</Typography>
          <Typography variant="caption">Try switching time range or language filter.</Typography>
        </Box>
      ) : (
        <Grid container spacing={isCompact ? 1 : 1.5}>
          {repos.map((repo) => (
            <Grid item xs={12} sm={isCompact ? 12 : 6} md={isCompact ? 6 : 4} key={repo.id}>
              <RepoCard
                repo={repo}
                isBookmarked={isBookmarked ? isBookmarked(repo) : checkIsBookmarkedGlobal(repo)}
                onToggleBookmark={onToggleBookmark}
                onOpenDetail={onOpenDetail}
                onCopyClone={onCopyClone}
                copiedId={copiedId}
                isCompact={isCompact}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
});
