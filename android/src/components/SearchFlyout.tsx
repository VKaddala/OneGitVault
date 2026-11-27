import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  InputBase,
  IconButton,
  Typography,
  Chip,
  CircularProgress,
  LinearProgress,
  Grid,
  Button,
  useTheme,
  alpha
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import HistoryIcon from '@mui/icons-material/History';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AndroidIcon from '@mui/icons-material/Android';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { Repository } from '../types';
import { RepoCard } from './RepoCard';
import { OwnerAvatar } from './OwnerAvatar';
import {
  searchSmartGitHub,
  fetchUserRepositories,
  getInstantLocalSearchMatches,
  GitHubUserSuggestion
} from '../services/githubApi';

interface SearchFlyoutProps {
  open: boolean;
  onClose: () => void;
  onSelectRepo: (repo: Repository) => void;
  isBookmarked: (id: number) => boolean;
  onToggleBookmark: (repo: Repository) => void;
  onCopyClone: (cloneUrl: string) => void;
  copiedId: number | null;
  isCompact?: boolean;
  starredRepos?: Set<string>;
  onToggleStar?: (repo: Repository) => void;
  onShareMessage?: (msg: string) => void;
}

const QUICK_TAGS = ['APK', 'Media', 'Tools', 'AI', 'Security', 'Termux', 'NewPipe', '@sindresorhus', 'Lawnchair', 'Rust'];
const HISTORY_KEY = 'onegitvault_search_history';

function getSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSearchHistory(items: string[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 10)));
  } catch {}
}

export const SearchFlyout: React.FC<SearchFlyoutProps> = ({
  open,
  onClose,
  onSelectRepo,
  isBookmarked,
  onToggleBookmark,
  onCopyClone,
  copiedId,
  isCompact = false,
  starredRepos = new Set(),
  onToggleStar,
  onShareMessage
}) => {
  const theme = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [results, setResults] = useState<Repository[]>([]);
  const [userSuggestions, setUserSuggestions] = useState<GitHubUserSuggestion[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>(() => getSearchHistory());

  useEffect(() => {
    if (open) {
      setHistory(getSearchHistory());
      const focusTimer = setTimeout(() => {
        inputRef.current?.focus();
      }, 90);
      return () => clearTimeout(focusTimer);
    } else {
      setQuery('');
      setDebouncedQuery('');
      setResults([]);
      setUserSuggestions([]);
      setTotalCount(0);
      setLoading(false);
    }
  }, [open]);

  // Show instant 0ms local cached matches immediately while debouncing live GitHub API calls (280ms)
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length >= 2) {
      const instant = getInstantLocalSearchMatches(trimmed);
      if (instant.repos.length > 0 || instant.users.length > 0) {
        setResults((prev) => (prev.length === 0 ? instant.repos : prev));
        setUserSuggestions((prev) => (prev.length === 0 ? instant.users : prev));
      }
    } else {
      setResults([]);
      setUserSuggestions([]);
      setTotalCount(0);
      setSearchError(null);
    }

    const timer = setTimeout(() => {
      setDebouncedQuery(trimmed);
    }, 280);
    return () => clearTimeout(timer);
  }, [query, open]);

  // Execute intelligent GitHub search (users + owner/repo + global repos)
  useEffect(() => {
    if (!open || !debouncedQuery || debouncedQuery.length < 2) {
      setLoading(false);
      setSearchError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setSearchError(null);

    searchSmartGitHub(debouncedQuery)
      .then((data) => {
        if (!active) return;
        setResults(data.repositories);
        setUserSuggestions(data.users);
        setTotalCount(data.totalCount);
        if (data.error && data.repositories.length === 0) {
          setSearchError(data.error);
        } else {
          setSearchError(null);
        }
      })
      .catch((err) => {
        console.warn('Flyout smart search failed:', err);
        if (active) {
          setSearchError('Search network error. Check connection or try another query.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery, open]);

  const addToHistory = useCallback((term: string) => {
    if (!term || !term.trim()) return;
    const clean = term.trim();
    setHistory((prev) => {
      const next = [clean, ...prev.filter((i) => i.toLowerCase() !== clean.toLowerCase())].slice(0, 10);
      saveSearchHistory(next);
      return next;
    });
  }, []);

  const handleRemoveHistoryItem = useCallback((term: string) => {
    setHistory((prev) => {
      const next = prev.filter((i) => i !== term);
      saveSearchHistory(next);
      return next;
    });
  }, []);

  const handleClearAllHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {}
  }, []);

  const handleClose = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setResults([]);
    setUserSuggestions([]);
    onClose();
  }, [onClose]);

  const handleSelectRepo = useCallback(
    (repo: Repository) => {
      const termToSave = query.trim() || repo.name;
      addToHistory(termToSave);
      onSelectRepo(repo);
    },
    [query, addToHistory, onSelectRepo]
  );

  const handleSelectUserSuggestion = useCallback(
    async (user: GitHubUserSuggestion) => {
      const handleTag = `@${user.login}`;
      setQuery(handleTag);
      setDebouncedQuery(handleTag);
      addToHistory(handleTag);
      inputRef.current?.blur();
      setLoading(true);
      try {
        const res = await fetchUserRepositories(user.login);
        setResults(res.repositories);
        setUserSuggestions(res.user ? [res.user] : [user]);
        setTotalCount(res.repositories.length);
      } finally {
        setLoading(false);
      }
    },
    [addToHistory]
  );

  if (!open) return null;

  const hasActiveQuery = query.trim().length >= 2;

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1400,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: theme.palette.background.default,
        backgroundImage: 'var(--bg-mesh-gradient, none)',
        animation: 'flyoutFadeIn 0.18s cubic-bezier(0.2, 0, 0, 1)',
        '@keyframes flyoutFadeIn': {
          from: { opacity: 0, transform: 'translateY(-8px)' },
          to: { opacity: 1, transform: 'translateY(0)' }
        }
      }}
    >
      {/* Top Translucent Search Bar */}
      <Box
        sx={{
          pt: 'max(env(safe-area-inset-top, 0px), var(--status-bar-height, 44px))',
          px: { xs: 1.5, sm: 2.5 },
          pb: 1.25,
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: 'var(--bg-header)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            height: 44,
            borderRadius: '22px',
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            border: `1.5px solid ${alpha(theme.palette.primary.main, 0.35)}`,
            boxShadow: `0 4px 18px ${alpha(theme.palette.primary.main, 0.12)}`,
            px: 1,
            gap: 1
          }}
        >
          <IconButton
            size="small"
            aria-label="Back / Close Search"
            onClick={handleClose}
            sx={{
              p: 0.5,
              color: 'text.primary',
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) }
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 20 }} />
          </IconButton>

          <InputBase
            inputRef={inputRef}
            placeholder="Search repos, APKs, or @users..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                addToHistory(query.trim());
                setDebouncedQuery(query.trim());
                inputRef.current?.blur();
              } else if (e.key === 'Escape') {
                handleClose();
              }
            }}
            sx={{
              flex: 1,
              fontSize: '0.9rem',
              fontWeight: 600,
              fontFamily: '"Nunito", "Google Sans", sans-serif',
              color: 'text.primary'
            }}
          />

          {query && (
            <IconButton
              size="small"
              aria-label="Clear Search Input"
              onClick={() => {
                setQuery('');
                setDebouncedQuery('');
                setResults([]);
                setUserSuggestions([]);
                inputRef.current?.focus();
              }}
              sx={{ p: 0.4, color: 'text.secondary' }}
            >
              <ClearIcon sx={{ fontSize: 18 }} />
            </IconButton>
          )}

          <Button
            size="small"
            onClick={handleClose}
            sx={{
              fontSize: '0.78rem',
              fontWeight: 800,
              minWidth: 'auto',
              px: 1,
              py: 0.3,
              borderRadius: '12px',
              color: theme.palette.primary.main,
              textTransform: 'none'
            }}
          >
            Done
          </Button>
        </Box>

        {/* Quick Search Tag Chips */}
        <Box
          sx={{
            display: 'flex',
            gap: 0.75,
            overflowX: 'auto',
            '&::-webkit-scrollbar': { display: 'none' },
            mt: 1.2,
            pb: 0.2
          }}
        >
          {QUICK_TAGS.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              onClick={() => {
                setQuery(tag);
                setDebouncedQuery(tag);
                addToHistory(tag);
              }}
              sx={{
                fontSize: '0.72rem',
                fontWeight: 700,
                height: 24,
                cursor: 'pointer',
                bgcolor:
                  query.toLowerCase() === tag.toLowerCase()
                    ? theme.palette.primary.main
                    : theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.05)',
                color:
                  query.toLowerCase() === tag.toLowerCase()
                    ? theme.palette.primary.contrastText
                    : 'text.primary',
                border: `1px solid ${theme.palette.divider}`,
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.2)
                }
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Non-blocking live fetch indicator */}
      {loading && <LinearProgress sx={{ height: 2, flexShrink: 0 }} />}

      {/* Results & History Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: { xs: 1.5, sm: 2.5 },
          py: 2,
          pb: 'calc(24px + env(safe-area-inset-bottom, 0px))'
        }}
      >
        {!hasActiveQuery ? (
          <Box sx={{ maxWidth: 640, mx: 'auto', width: '100%' }}>
            {history.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, px: 0.5 }}>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}
                  >
                    Recent Searches
                  </Typography>
                  <Button
                    size="small"
                    onClick={handleClearAllHistory}
                    sx={{ fontSize: '0.68rem', textTransform: 'none', color: 'text.secondary', py: 0.2 }}
                  >
                    Clear All
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {history.map((item) => (
                    <Box
                      key={item}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 1.5,
                        py: 0.85,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                        transition: 'background-color 0.15s ease',
                        '&:hover': {
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'
                        }
                      }}
                      onClick={() => {
                        setQuery(item);
                        setDebouncedQuery(item);
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <HistoryIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          {item}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        aria-label={`Remove ${item} from search history`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveHistoryItem(item);
                        }}
                        sx={{ p: 0.3, color: 'text.secondary' }}
                      >
                        <ClearIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: history.length > 0 ? 3 : 8,
                textAlign: 'center',
                gap: 1.5
              }}
            >
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <SearchIcon sx={{ fontSize: 30, color: theme.palette.primary.main }} />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Smart GitHub Repository &amp; Developer Search
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 360 }}>
                Search repositories, <code style={{ fontWeight: 700 }}>owner/repo</code>, or type a username like{' '}
                <code style={{ fontWeight: 700 }}>@sindresorhus</code> to explore developer projects directly.
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box>
            {/* Intelligent Matching GitHub Users & Organizations Strip */}
            {userSuggestions.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.8, px: 0.5 }}>
                  <PersonOutlineIcon sx={{ fontSize: 15, color: 'primary.main' }} />
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}
                  >
                    Developers &amp; Orgs
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    overflowX: 'auto',
                    pb: 0.5,
                    '&::-webkit-scrollbar': { display: 'none' }
                  }}
                >
                  {userSuggestions.map((u) => (
                    <Box
                      key={u.login}
                      onClick={() => handleSelectUserSuggestion(u)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 1.25,
                        py: 0.75,
                        borderRadius: '16px',
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'transform 0.12s ease',
                        '&:active': { transform: 'scale(0.96)' }
                      }}
                    >
                      <OwnerAvatar owner={u} size={28} borderRadius="50%" />
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', display: 'block', lineHeight: 1.15 }}>
                          @{u.login}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.64rem', color: 'text.secondary', display: 'block' }}>
                          {u.public_repos ? `${u.public_repos} repos` : 'Tap for repos'}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {loading && results.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 10,
                  gap: 2
                }}
              >
                <CircularProgress size={32} color="primary" />
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  Searching GitHub for "{debouncedQuery || query}"...
                </Typography>
              </Box>
            ) : results.length === 0 ? (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 8,
                  border: `2px dashed ${alpha(theme.palette.divider, 0.8)}`,
                  borderRadius: '24px',
                  p: 3,
                  maxWidth: 500,
                  mx: 'auto'
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 42, color: searchError ? 'error.main' : 'text.secondary', mb: 1, opacity: 0.8 }} />
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5, color: searchError ? 'error.main' : 'text.primary' }}>
                  {searchError ? 'Search Limit or Network Notice' : 'No repositories found'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 380, mx: 'auto' }}>
                  {searchError || `No matches found for "${debouncedQuery || query}". Try an app name, technology, or @username.`}
                </Typography>
              </Box>
            ) : (
              <Box>
                {searchError && (
                  <Box
                    sx={{
                      mb: 2,
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.warning.main, 0.12),
                      border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 700 }}>
                      {searchError}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, px: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase' }}>
                    Found {totalCount > 0 ? totalCount.toLocaleString() : results.length} repositories
                  </Typography>
                  <Chip
                    icon={<AndroidIcon sx={{ fontSize: 13 }} />}
                    label="APK & Repo Suggestions"
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                  />
                </Box>

                <Grid container spacing={isCompact ? 1 : 1.5}>
                  {results.map((repo) => (
                    <Grid item xs={12} sm={isCompact ? 12 : 6} md={isCompact ? 6 : 4} key={repo.id}>
                      <RepoCard
                        repo={repo}
                        isBookmarked={isBookmarked(repo.id)}
                        onToggleBookmark={onToggleBookmark}
                        onOpenDetail={(r) => handleSelectRepo(r)}
                        onCopyClone={onCopyClone}
                        copiedId={copiedId}
                        isCompact={isCompact}
                        isStarred={starredRepos.has(repo.full_name)}
                        onToggleStar={onToggleStar}
                        onShareMessage={onShareMessage}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};
