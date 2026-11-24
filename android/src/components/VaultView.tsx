import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  Chip,
  TextField,
  CircularProgress,
  IconButton,
  useTheme,
  alpha,
  Alert
} from '@mui/material';
import BookmarksIcon from '@mui/icons-material/Bookmarks';
import StarIcon from '@mui/icons-material/Star';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import ChecklistIcon from '@mui/icons-material/Checklist';
import CloseIcon from '@mui/icons-material/Close';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import { Repository } from '../types';
import { RepoCard } from './RepoCard';
import { getBookmarks, saveBookmarks } from '../services/bookmarkStore';
import { getStoredToken } from '../services/githubApi';
import {
  pullBookmarksFromGist,
  pushBookmarksToGist,
  fetchUserStarredRepositories
} from '../services/gistSync';

export type VaultSubSection = 'gist' | 'starred';

interface VaultViewProps {
  onOpenDetail: (repo: Repository) => void;
  isBookmarked: (id: number) => boolean;
  onToggleBookmark: (repo: Repository) => void;
  onCopyClone: (cloneUrl: string) => void;
  copiedId: number | null;
  onVaultUpdated: () => void;
  isCompact?: boolean;
  starredRepos?: Set<string>;
  starredList?: Repository[];
  starredLoaded?: boolean;
  onRefreshStarred?: () => void;
  onToggleStar?: (repo: Repository) => void;
  onOpenTokenDialog?: () => void;
  onShareMessage?: (msg: string) => void;
}

export const VaultView: React.FC<VaultViewProps> = ({
  onOpenDetail,
  isBookmarked,
  onToggleBookmark,
  onCopyClone,
  copiedId,
  onVaultUpdated,
  isCompact = false,
  starredRepos = new Set(),
  starredList = [],
  starredLoaded = false,
  onRefreshStarred,
  onToggleStar,
  onOpenTokenDialog,
  onShareMessage
}) => {
  const theme = useTheme();
  const token = getStoredToken();

  // Sub-section selection: 'gist' (Bookmarks & Gist Sync) | 'starred' (GitHub Starred)
  const [subSection, setSubSection] = useState<VaultSubSection>('gist');

  // Bookmarks (Gist / Local)
  const [bookmarks, setBookmarks] = useState<Repository[]>(getBookmarks);
  const [isGistSyncing, setIsGistSyncing] = useState<boolean>(false);
  const [gistSyncStatus, setGistSyncStatus] = useState<string>('');

  // Batch Select & Unbookmark State
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [selectedRepoIds, setSelectedRepoIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setBookmarks(getBookmarks());
  }, [subSection]);

  const handleToggleSelect = (repoId: number) => {
    setSelectedRepoIds((prev) => {
      const next = new Set(prev);
      if (next.has(repoId)) next.delete(repoId);
      else next.add(repoId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedRepoIds.size === bookmarks.length) {
      setSelectedRepoIds(new Set());
    } else {
      setSelectedRepoIds(new Set(bookmarks.map((r) => r.id)));
    }
  };

  const handleBatchUnbookmark = () => {
    if (selectedRepoIds.size === 0) return;
    const count = selectedRepoIds.size;
    const remaining = bookmarks.filter((r) => !selectedRepoIds.has(r.id));
    saveBookmarks(remaining);
    setBookmarks(remaining);
    setSelectedRepoIds(new Set());
    setIsSelectMode(false);
    onVaultUpdated();

    const activeToken = getStoredToken();
    if (activeToken) {
      pushBookmarksToGist(activeToken, remaining)
        .then(() => setGistSyncStatus(`Removed ${count} bookmarks & synced with Gist`))
        .catch(() => {});
    }

    if (onShareMessage) {
      onShareMessage(`Removed ${count} bookmarks from Vault`);
    }
  };

  // Local fallback state for starred repos if not passed from parent
  const [localStarredList, setLocalStarredList] = useState<Repository[]>([]);
  const [loadingStarred, setLoadingStarred] = useState<boolean>(false);
  const [starredSearch, setStarredSearch] = useState<string>('');

  // 1. Manual Gist Pull (Restore from Cloud)
  const handleManualPull = async () => {
    const activeToken = getStoredToken();
    if (!activeToken) {
      if (onOpenTokenDialog) onOpenTokenDialog();
      return;
    }
    setIsGistSyncing(true);
    setGistSyncStatus('Pulling from Gist...');
    try {
      const gistBookmarks = await pullBookmarksFromGist(activeToken);
      if (gistBookmarks && Array.isArray(gistBookmarks)) {
        saveBookmarks(gistBookmarks);
        onVaultUpdated();
        const msg = `Restored ${gistBookmarks.length} bookmarks from cloud Gist!`;
        setGistSyncStatus(msg);
        if (onShareMessage) onShareMessage(msg);
      } else {
        const msg = 'No backup found or pull failed (ensure token has "gist" scope)';
        setGistSyncStatus(msg);
        if (onShareMessage) onShareMessage(msg);
      }
    } catch (err: any) {
      setGistSyncStatus('Gist pull failed');
      if (onShareMessage) onShareMessage('Gist pull network error');
    } finally {
      setIsGistSyncing(false);
    }
  };

  // 2. Manual Gist Push (Backup to Cloud)
  const handleManualPush = async () => {
    const activeToken = getStoredToken();
    if (!activeToken) {
      if (onOpenTokenDialog) onOpenTokenDialog();
      return;
    }
    const currentBookmarks = getBookmarks();
    if (currentBookmarks.length === 0) {
      setGistSyncStatus('Vault is empty, nothing to push');
      if (onShareMessage) onShareMessage('Vault is empty, nothing to push');
      return;
    }
    setIsGistSyncing(true);
    setGistSyncStatus('Backing up to Gist...');
    try {
      const result = await pushBookmarksToGist(activeToken, currentBookmarks);
      if (result.success && result.url) {
        const msg = `Backed up ${currentBookmarks.length} bookmarks to cloud Gist!`;
        setGistSyncStatus(msg);
        if (onShareMessage) onShareMessage(msg);
      } else {
        const msg = result.error || 'Failed to push to Gist';
        setGistSyncStatus(msg);
        if (onShareMessage) onShareMessage(msg);
      }
    } catch (err: any) {
      const msg = err.message ? `Gist push error: ${err.message}` : 'Gist push failed';
      setGistSyncStatus(msg);
      if (onShareMessage) onShareMessage(msg);
    } finally {
      setIsGistSyncing(false);
    }
  };

  // 3. Fallback load starred repos if parent didn't load them
  useEffect(() => {
    if (subSection === 'starred' && starredList.length === 0 && !starredLoaded && token) {
      setLoadingStarred(true);
      fetchUserStarredRepositories(token, 1, 100)
        .then((items) => {
          setLocalStarredList(items);
        })
        .catch(() => {})
        .finally(() => setLoadingStarred(false));
    }
  }, [subSection, starredList.length, starredLoaded, token]);

  const activeStarredItems = starredList.length > 0 ? starredList : localStarredList;

  // Filtered Starred list by query
  const filteredStarred = useMemo(() => {
    if (!starredSearch.trim()) return activeStarredItems;
    const q = starredSearch.toLowerCase().trim();
    return activeStarredItems.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.full_name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  }, [activeStarredItems, starredSearch]);

  return (
    <Box sx={{ pb: 6 }}>
      {/* ── Top Bar with Dual Selections & Actions ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          flexWrap: 'wrap',
          gap: 1.2
        }}
      >
        {/* Two Selections: Gist Bookmarks vs GitHub Starred */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            p: 0.4,
            borderRadius: '16px',
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
            border: `1px solid ${theme.palette.divider}`,
            gap: 0.5
          }}
        >
          {/* Option 1: Gist Bookmarks */}
          <Button
            size="small"
            onClick={() => setSubSection('gist')}
            startIcon={<BookmarksIcon sx={{ fontSize: 16 }} />}
            sx={{
              height: 32,
              px: 1.5,
              borderRadius: '12px',
              fontSize: '0.78rem',
              fontWeight: subSection === 'gist' ? 800 : 600,
              textTransform: 'none',
              bgcolor: subSection === 'gist' ? theme.palette.primary.main : 'transparent',
              color: subSection === 'gist' ? theme.palette.primary.contrastText : 'text.secondary',
              boxShadow: subSection === 'gist' ? '0 2px 8px rgba(0,0,0,0.18)' : 'none',
              '&:hover': {
                bgcolor: subSection === 'gist' ? theme.palette.primary.dark : alpha(theme.palette.text.primary, 0.05)
              }
            }}
          >
            Vault Bookmarks ({bookmarks.length})
          </Button>

          {/* Option 2: GitHub Starred */}
          <Button
            size="small"
            onClick={() => setSubSection('starred')}
            startIcon={<StarIcon sx={{ fontSize: 16, color: subSection === 'starred' ? '#fbbf24' : 'inherit' }} />}
            sx={{
              height: 32,
              px: 1.5,
              borderRadius: '12px',
              fontSize: '0.78rem',
              fontWeight: subSection === 'starred' ? 800 : 600,
              textTransform: 'none',
              bgcolor: subSection === 'starred' ? theme.palette.primary.main : 'transparent',
              color: subSection === 'starred' ? theme.palette.primary.contrastText : 'text.secondary',
              boxShadow: subSection === 'starred' ? '0 2px 8px rgba(0,0,0,0.18)' : 'none',
              '&:hover': {
                bgcolor: subSection === 'starred' ? theme.palette.primary.dark : alpha(theme.palette.text.primary, 0.05)
              }
            }}
          >
            GitHub Starred ({activeStarredItems.length})
          </Button>
        </Box>

        {/* Action Controls for Active SubSection */}
        {subSection === 'gist' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', width: { xs: '100%', sm: 'auto' }, gap: 1 }}>
            {token ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={isGistSyncing}
                    onClick={handleManualPull}
                    startIcon={isGistSyncing ? <CircularProgress size={12} /> : <CloudDownloadIcon sx={{ fontSize: 15 }} />}
                    sx={{
                      height: 30,
                      borderRadius: '10px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      textTransform: 'none',
                      px: 1.3
                    }}
                  >
                    Pull from Gist
                  </Button>

                  <Button
                    size="small"
                    variant="contained"
                    disabled={isGistSyncing || bookmarks.length === 0}
                    onClick={handleManualPush}
                    startIcon={isGistSyncing ? <CircularProgress size={12} color="inherit" /> : <CloudUploadIcon sx={{ fontSize: 15 }} />}
                    sx={{
                      height: 30,
                      borderRadius: '10px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      textTransform: 'none',
                      px: 1.3
                    }}
                  >
                    Push to Gist
                  </Button>

                  {bookmarks.length > 0 && (
                    <Button
                      size="small"
                      variant={isSelectMode ? 'contained' : 'outlined'}
                      color={isSelectMode ? 'primary' : 'inherit'}
                      onClick={() => {
                        setIsSelectMode(!isSelectMode);
                        setSelectedRepoIds(new Set());
                      }}
                      startIcon={<ChecklistIcon sx={{ fontSize: 15 }} />}
                      sx={{
                        height: 30,
                        borderRadius: '10px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        textTransform: 'none',
                        px: 1.3
                      }}
                    >
                      {isSelectMode ? 'Cancel' : 'Select'}
                    </Button>
                  )}
                </Box>

                {gistSyncStatus && (
                  <Alert
                    severity={
                      gistSyncStatus.startsWith('Backed up') || gistSyncStatus.startsWith('Restored')
                        ? 'success'
                        : gistSyncStatus.includes('Backing') || gistSyncStatus.includes('Pulling')
                        ? 'info'
                        : 'error'
                    }
                    onClose={() => setGistSyncStatus('')}
                    sx={{
                      width: '100%',
                      py: 0.4,
                      px: 1.25,
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      borderRadius: '10px',
                      alignItems: 'center',
                      '& .MuiAlert-message': {
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                        lineHeight: 1.35,
                        py: 0.2
                      },
                      '& .MuiAlert-icon': {
                        fontSize: 18,
                        mr: 1,
                        py: 0
                      },
                      '& .MuiAlert-action': {
                        p: 0,
                        mr: -0.5
                      }
                    }}
                  >
                    {gistSyncStatus}
                  </Alert>
                )}
              </>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  icon={<VpnKeyIcon sx={{ fontSize: 12 }} />}
                  label="Connect Token for Gist Sync"
                  size="small"
                  onClick={onOpenTokenDialog}
                  sx={{
                    height: 28,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                    color: theme.palette.primary.main,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`
                  }}
                />
                {bookmarks.length > 0 && (
                  <Button
                    size="small"
                    variant={isSelectMode ? 'contained' : 'outlined'}
                    color={isSelectMode ? 'primary' : 'inherit'}
                    onClick={() => {
                      setIsSelectMode(!isSelectMode);
                      setSelectedRepoIds(new Set());
                    }}
                    startIcon={<ChecklistIcon sx={{ fontSize: 15 }} />}
                    sx={{
                      height: 28,
                      borderRadius: '10px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      textTransform: 'none',
                      px: 1.3
                    }}
                  >
                    {isSelectMode ? 'Cancel' : 'Select'}
                  </Button>
                )}
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {token && onRefreshStarred && (
              <IconButton
                size="small"
                onClick={onRefreshStarred}
                disabled={loadingStarred}
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: '10px',
                  p: 0.6
                }}
                title="Refresh Starred List"
              >
                <RefreshIcon sx={{ fontSize: 16 }} />
              </IconButton>
            )}

            {!token && (
              <Chip
                icon={<VpnKeyIcon sx={{ fontSize: 12 }} />}
                label="Connect Token to View Stars"
                size="small"
                onClick={onOpenTokenDialog}
                sx={{
                  height: 28,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  color: theme.palette.primary.main
                }}
              />
            )}
          </Box>
        )}
      </Box>

      {/* Starred Repos Search Bar (when in Starred tab) */}
      {subSection === 'starred' && activeStarredItems.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search your starred repositories..."
            value={starredSearch}
            onChange={(e) => setStarredSearch(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 1 }} />
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '14px',
                fontSize: '0.82rem',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
              }
            }}
          />
        </Box>
      )}

      {/* ── SubSection 1: Gist Bookmarks Content ── */}
      {subSection === 'gist' && (
        <>
          {bookmarks.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
                px: 2,
                borderRadius: '24px',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
                border: `1px dashed ${theme.palette.divider}`,
                mt: 1
              }}
            >
              <BookmarksIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1.5 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                Your Vault is Empty
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 360, mx: 'auto', mb: 2 }}>
                Bookmark repositories in the Explore or APKs feeds by tapping the bookmark icon to store them here and back up to your private Gist.
              </Typography>
              {token && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleManualPull}
                  startIcon={<CloudDownloadIcon />}
                  sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700 }}
                >
                  Pull from Cloud Gist
                </Button>
              )}
            </Box>
          ) : (
            <>
              {isSelectMode && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.25,
                    px: 2,
                    mb: 2,
                    borderRadius: '16px',
                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.08),
                    border: `1.5px solid ${alpha(theme.palette.primary.main, 0.35)}`,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    flexWrap: 'wrap',
                    gap: 1
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.82rem' }}>
                      {selectedRepoIds.size} of {bookmarks.length} selected
                    </Typography>
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<SelectAllIcon sx={{ fontSize: 14 }} />}
                      onClick={handleSelectAll}
                      sx={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'none', py: 0.2, px: 1 }}
                    >
                      {selectedRepoIds.size === bookmarks.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      size="small"
                      variant="contained"
                      color="error"
                      disabled={selectedRepoIds.size === 0}
                      startIcon={<DeleteSweepIcon sx={{ fontSize: 16 }} />}
                      onClick={handleBatchUnbookmark}
                      sx={{
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontWeight: 800,
                        fontSize: '0.74rem',
                        px: 1.5,
                        py: 0.4
                      }}
                    >
                      Unbookmark ({selectedRepoIds.size})
                    </Button>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setIsSelectMode(false);
                        setSelectedRepoIds(new Set());
                      }}
                      sx={{ p: 0.4 }}
                    >
                      <CloseIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                </Box>
              )}

              <Grid container spacing={isCompact ? 1.5 : 2}>
                {bookmarks.map((repo) => (
                  <Grid item xs={12} sm={6} md={4} key={repo.id}>
                    <RepoCard
                      repo={repo}
                      onOpenDetail={onOpenDetail}
                      isBookmarked={true}
                      onToggleBookmark={onToggleBookmark}
                      onCopyClone={onCopyClone}
                      copiedId={copiedId}
                      isCompact={isCompact}
                      isStarred={starredRepos.has(repo.full_name)}
                      onToggleStar={onToggleStar}
                      onShareMessage={onShareMessage}
                      isSelectMode={isSelectMode}
                      isSelected={selectedRepoIds.has(repo.id)}
                      onToggleSelect={handleToggleSelect}
                    />
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </>
      )}

      {/* ── SubSection 2: GitHub Starred Content ── */}
      {subSection === 'starred' && (
        <>
          {!token ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
                px: 2,
                borderRadius: '24px',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
                border: `1px dashed ${theme.palette.divider}`,
                mt: 1
              }}
            >
              <StarIcon sx={{ fontSize: 44, color: '#fbbf24', mb: 1.5 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                Connect GitHub Token
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 360, mx: 'auto', mb: 2 }}>
                Connect a GitHub Personal Access Token (classic) with public_repo scope to browse, star, and sync your starred repositories directly in OneGitVault.
              </Typography>
              <Button
                variant="contained"
                size="small"
                onClick={onOpenTokenDialog}
                startIcon={<VpnKeyIcon />}
                sx={{ borderRadius: '14px', textTransform: 'none', fontWeight: 700 }}
              >
                Connect Token
              </Button>
            </Box>
          ) : loadingStarred ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <CircularProgress size={32} sx={{ mb: 2 }} />
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Loading your starred repositories...
              </Typography>
            </Box>
          ) : filteredStarred.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
                px: 2,
                borderRadius: '24px',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
                border: `1px dashed ${theme.palette.divider}`,
                mt: 1
              }}
            >
              <StarIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1.5 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                {starredSearch ? 'No Matching Starred Repositories' : 'No Starred Repositories Found'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 360, mx: 'auto' }}>
                {starredSearch
                  ? 'Try searching with a different keyword or repo name.'
                  : 'Star repositories in the app or on GitHub, and they will appear here.'}
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={isCompact ? 1.5 : 2}>
              {filteredStarred.map((repo) => (
                <Grid item xs={12} sm={6} md={4} key={repo.id}>
                  <RepoCard
                    repo={repo}
                    onOpenDetail={onOpenDetail}
                    isBookmarked={isBookmarked(repo.id)}
                    onToggleBookmark={onToggleBookmark}
                    onCopyClone={onCopyClone}
                    copiedId={copiedId}
                    isCompact={isCompact}
                    isStarred={true}
                    onToggleStar={onToggleStar}
                    onShareMessage={onShareMessage}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}
    </Box>
  );
};
