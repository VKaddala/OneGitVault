import React, { useState, useEffect, useCallback } from 'react';
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

interface TrendingViewProps {
  onOpenDetail: (repo: Repository) => void;
  isBookmarked: (id: number) => boolean;
  onToggleBookmark: (repo: Repository) => void;
  onCopyClone: (cloneUrl: string) => void;
  copiedId: number | null;
  refreshTrigger?: number;
  isCompact?: boolean;
}

type TrendingScope = 'all' | 'apk';

const POPULAR_LANGUAGES = ['All', 'TypeScript', 'Python', 'Rust', 'Go', 'Java', 'Kotlin', 'C++'];

export const TrendingView: React.FC<TrendingViewProps> = ({
  onOpenDetail,
  isBookmarked,
  onToggleBookmark,
  onCopyClone,
  copiedId,
  refreshTrigger = 0,
  isCompact = false
}) => {
  const theme = useTheme();
  const [scope, setScope] = useState<TrendingScope>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(false);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadTrending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const langParam = selectedLanguage === 'All' ? undefined : selectedLanguage;
      const data = await fetchTrendingRepositories(timeRange, scope, langParam);
      setRepos(data);
    } catch (err: any) {
      console.warn('Failed to load trending:', err);
      setError('Unable to fetch live trending repositories. Tap retry below.');
    } finally {
      setLoading(false);
    }
  }, [timeRange, scope, selectedLanguage]);

  useEffect(() => {
    loadTrending();
  }, [loadTrending, refreshTrigger]);

  const getTimeRangeLabel = () => {
    if (timeRange === 'daily') return 'Today (Last 3 days)';
    if (timeRange === 'weekly') return 'This Week';
    return 'This Month';
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
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
          onClick={loadTrending}
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
          gap: 1,
          overflowX: 'auto',
          py: 0.6,
          mb: 1.5,
          scrollbarWidth: 'none',
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
            onClick={() => setScope('all')}
            color={scope === 'all' ? 'primary' : 'default'}
            variant={scope === 'all' ? 'filled' : 'outlined'}
            sx={{
              fontWeight: scope === 'all' ? 800 : 600,
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
            onClick={() => setScope('apk')}
            color={scope === 'apk' ? 'primary' : 'default'}
            variant={scope === 'apk' ? 'filled' : 'outlined'}
            sx={{
              fontWeight: scope === 'apk' ? 800 : 600,
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
            onClick={() => setTimeRange('daily')}
            color={timeRange === 'daily' ? 'primary' : 'default'}
            variant={timeRange === 'daily' ? 'filled' : 'outlined'}
            sx={{
              fontWeight: timeRange === 'daily' ? 700 : 500,
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
            onClick={() => setTimeRange('weekly')}
            color={timeRange === 'weekly' ? 'primary' : 'default'}
            variant={timeRange === 'weekly' ? 'filled' : 'outlined'}
            sx={{
              fontWeight: timeRange === 'weekly' ? 700 : 500,
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
            onClick={() => setTimeRange('monthly')}
            color={timeRange === 'monthly' ? 'primary' : 'default'}
            variant={timeRange === 'monthly' ? 'filled' : 'outlined'}
            sx={{
              fontWeight: timeRange === 'monthly' ? 700 : 500,
              fontSize: '0.68rem',
              height: 24,
              borderRadius: '9px',
              border: 'none',
              cursor: 'pointer'
            }}
          />
        </Box>

        {/* Group 3: Languages (when in All scope) */}
        {scope === 'all' && (
          <>
            <Divider orientation="vertical" flexItem sx={{ my: 0.5, opacity: 0.35 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
              {POPULAR_LANGUAGES.map((lang) => {
                const isSelected = selectedLanguage === lang;
                return (
                  <Chip
                    key={lang}
                    label={lang}
                    size="small"
                    onClick={() => setSelectedLanguage(lang)}
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
          <Button variant="outlined" size="small" onClick={loadTrending} sx={{ borderRadius: '12px' }}>
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
                isBookmarked={isBookmarked(repo.id)}
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
};
