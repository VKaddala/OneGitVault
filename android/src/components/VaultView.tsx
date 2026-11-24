import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import BookmarksIcon from '@mui/icons-material/Bookmarks';
import StarIcon from '@mui/icons-material/Star';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import SyncIcon from '@mui/icons-material/Sync';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
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
  onToggleStar,
  onOpenTokenDialog,
  onShareMessage
}) => {
  const theme = useTheme();
  const token = getStoredToken();

  // Sub-section selection: 'gist' (Bookmarks & Gist Sync) | 'starred' (GitHub Starred)
  const [subSection, setSubSection] = useState<VaultSubSection>('gist');

  // Bookmarks (Gist / Local)
  const bookmarks = getBookmarks();
  const [isGistSyncing, setIsGistSyncing] = useState<boolean>(false);
  const [gistSyncStatus, setGistSyncStatus] = useState<string>('');

  // Starred Repositories
  const [starredList, setStarredList] = useState<Repository[]>([]);
  const [loadingStarred, setLoadingStarred] = useState<boolean>(false);
  const [starredLoaded, setStarredLoaded] = useState<boolean>(false);

  // Manual Backup/Restore Dialog
  const [gistDialogOpen, setGistDialogOpen] = useState<boolean>(false);
  const [manualGistId, setManualGistId] = useState<string>('');
  const [dialogLoading, setDialogLoading] = useState<boolean>(false);
  const [dialogStatus, setDialogStatus] = useState<string>('');

  // 1. Auto Pull from Gist when token is available
  const handleAutoPullGist = useCallback(async (showFeedback = false) => {
    if (!token) return;
    setIsGistSyncing(true);
    if (showFeedback) setGistSyncStatus('Syncing with Gist...');

    try {
      const gistBookmarks = await pullBookmarksFromGist(token);
      if (gistBookmarks && Array.isArray(gistBookmarks)) {
        const local = getBookmarks();
        const localMap = new Map(local.map((r) => [r.id, r]));
        let hasNewFromGist = false;

        for (const gb of gistBookmarks) {
          if (!localMap.has(gb.id)) {
            localMap.set(gb.id, gb);
            hasNewFromGist = true;
          }
        }

        const merged = Array.from(localMap.values());
        if (hasNewFromGist) {
          saveBookmarks(merged);
          onVaultUpdated();
        }

        // If local had items not yet in Gist, sync back
        if (merged.length > gistBookmarks.length) {
          await pushBookmarksToGist(token, merged);
        }

        setGistSyncStatus(`Synced with Gist (${merged.length} repos)`);
      } else if (bookmarks.length > 0) {
        // If Gist doesn't exist yet but user has local bookmarks, push them
        await pushBookmarksToGist(token, bookmarks);
        setGistSyncStatus('Backed up to Gist');
      } else {
        setGistSyncStatus('Gist is up to date');
      }
    } catch (err: any) {
      console.warn('Auto Gist pull error:', err);
      if (showFeedback) setGistSyncStatus('Gist sync failed');
    } finally {
      setIsGistSyncing(false);
    }
  }, [token, bookmarks.length, onVaultUpdated]);

  // Initial Gist auto-pull on mount
  useEffect(() => {
    if (token) {
      handleAutoPullGist(false);
    }
  }, [token]);

  // 2. Load User Starred Repositories
  const loadStarredRepos = useCallback(async () => {
    if (!token) return;
    setLoadingStarred(true);
    try {
      const items = await fetchUserStarredRepositories(token, 1, 100);
      setStarredList(items);
      setStarredLoaded(true);
    } catch (err) {
      console.warn('Failed to load starred repos:', err);
    } finally {
      setLoadingStarred(false);
    }
  }, [token]);

  // Load starred repos when switching to 'starred' tab
  useEffect(() => {
    if (subSection === 'starred' && !starredLoaded && token) {
      loadStarredRepos();
    }
  }, [subSection, starredLoaded, token, loadStarredRepos]);

  // Manual Backup to Gist
  const handleManualBackup = async () => {
    if (!token) return;
    setDialogLoading(true);
    setDialogStatus('Uploading bookmarks to Gist...');
    try {
      const url = await pushBookmarksToGist(token, bookmarks);
      if (url) {
        setDialogStatus('Backup successful!');
        setGistSyncStatus('Backed up to Gist');
      } else {
        setDialogStatus('Failed to create or update Gist.');
      }
    } catch (err: any) {
      setDialogStatus(`Error: ${err.message}`);
    } finally {
      setDialogLoading(false);
    }
  };

  // Manual Restore from Gist ID
  const handleManualRestore = async () => {
    if (!manualGistId.trim()) {
      setDialogStatus('Please enter a valid Gist ID.');
      return;
    }
    setDialogLoading(true);
    setDialogStatus('Fetching Gist...');
    try {
      const headers: HeadersInit = { Accept: 'application/vnd.github.v3+json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`https://api.github.com/gists/${manualGistId.trim()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        const file =
          data.files?.['onegitvault-bookmarks.json'] ||
          data.files?.['onegitvault-android-bookmarks.json'] ||
          Object.values(data.files || {})[0] as any;

        if (file && file.content) {
          const parsed = JSON.parse(file.content);
          if (Array.isArray(parsed)) {
            saveBookmarks(parsed);
            onVaultUpdated();
            setDialogStatus(`Restored ${parsed.length} bookmarks successfully!`);
            setGistSyncStatus(`Restored ${parsed.length} repos`);
          } else {
            setDialogStatus('Invalid Gist JSON payload.');
          }
        } else {
          setDialogStatus('No bookmark JSON found in specified Gist.');
        }
      } else {
        setDialogStatus(`Restore failed: HTTP ${res.status}`);
      }
    } catch (err: any) {
      setDialogStatus(`Error: ${err.message}`);
    } finally {
      setDialogLoading(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
      {/* Vault Top Selector: Segmented Pill Control for Gist vs Starred */}
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
            startIcon={<StarIcon sx={{ fontSize: 16 }} />}
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
            GitHub Starred {starredLoaded ? `(${starredList.length})` : ''}
          </Button>
        </Box>

        {/* Action Controls for Active SubSection */}
        {subSection === 'gist' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {token ? (
              <Chip
                icon={isGistSyncing ? <CircularProgress size={12} color="inherit" /> : <CloudDoneIcon sx={{ fontSize: 14 }} />}
                label={gistSyncStatus || 'Gist Auto-Synced'}
                size="small"
                onClick={() => handleAutoPullGist(true)}
                sx={{
                  height: 26,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  color: theme.palette.primary.main,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                  cursor: 'pointer'
                }}
              />
            ) : (
              <Chip
                icon={<VpnKeyIcon sx={{ fontSize: 12 }} />}
                label="Local Only (Connect Token for Gist Sync)"
                size="small"
                onClick={onOpenTokenDialog}
                sx={{
                  height: 26,
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  bgcolor: alpha(theme.palette.text.primary, 0.05)
                }}
              />
            )}

            <Tooltip title="Gist Options">
              <Button
                size="small"
                variant="outlined"
                onClick={() => setGistDialogOpen(true)}
                sx={{
                  height: 28,
                  borderRadius: '10px',
                  fontSize: '0.72rem',
                  textTransform: 'none',
                  px: 1.2
                }}
              >
                Gist Options
              </Button>
            </Tooltip>
          </Box>
        )}

        {subSection === 'starred' && token && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<SyncIcon sx={{ fontSize: 14, animation: loadingStarred ? 'spin 1s linear infinite' : 'none' }} />}
              onClick={loadStarredRepos}
              disabled={loadingStarred}
              sx={{
                height: 28,
                borderRadius: '10px',
                fontSize: '0.72rem',
                textTransform: 'none',
                px: 1.2
              }}
            >
              Refresh Starred
            </Button>
          </Box>
        )}
      </Box>

      {/* ────────────────── SELECTION 1: GIST & VAULT BOOKMARKS ────────────────── */}
      {subSection === 'gist' && (
        <>
          {bookmarks.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 10,
                px: 2,
                border: `2px dashed ${alpha(theme.palette.divider, 0.8)}`,
                borderRadius: '24px',
                bgcolor: alpha(theme.palette.text.primary, 0.02)
              }}
            >
              <BookmarksIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                Your Vault Bookmarks are Empty
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 380, mx: 'auto', mb: 2 }}>
                Tap the bookmark ribbon icon on any APK or repository to save it here. With a GitHub token, bookmarks automatically sync via private GitHub Gist across all your devices.
              </Typography>
              {token && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<SyncIcon />}
                  onClick={() => handleAutoPullGist(true)}
                  disabled={isGistSyncing}
                  sx={{ borderRadius: '12px', textTransform: 'none', fontSize: '0.75rem' }}
                >
                  Pull from Existing Gist
                </Button>
              )}
            </Box>
          ) : (
            <Grid container spacing={isCompact ? 1 : 1.5}>
              {bookmarks.map((repo) => (
                <Grid item xs={12} sm={isCompact ? 12 : 6} md={isCompact ? 6 : 4} key={repo.id}>
                  <RepoCard
                    repo={repo}
                    isBookmarked={true}
                    onToggleBookmark={(r) => {
                      onToggleBookmark(r);
                      onVaultUpdated();
                      // Auto push updated list to Gist
                      if (token) {
                        setTimeout(() => pushBookmarksToGist(token, getBookmarks()), 300);
                      }
                    }}
                    onOpenDetail={onOpenDetail}
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
          )}
        </>
      )}

      {/* ────────────────── SELECTION 2: GITHUB STARRED REPOSITORIES ────────────────── */}
      {subSection === 'starred' && (
        <>
          {!token ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 10,
                px: 2,
                border: `2px dashed ${alpha(theme.palette.divider, 0.8)}`,
                borderRadius: '24px',
                bgcolor: alpha(theme.palette.text.primary, 0.02)
              }}
            >
              <StarIcon sx={{ fontSize: 50, color: '#e3b341', mb: 1, opacity: 0.8 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                GitHub Personal Access Token Required
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 400, mx: 'auto', mb: 2.5 }}>
                Connect your GitHub PAT token to browse, search, and manage your starred repositories and APKs directly inside OneGitVault.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<VpnKeyIcon />}
                onClick={onOpenTokenDialog}
                sx={{ borderRadius: '14px', textTransform: 'none', fontWeight: 700 }}
              >
                Connect GitHub Token
              </Button>
            </Box>
          ) : loadingStarred ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 12, gap: 1.5 }}>
              <CircularProgress size={30} color="primary" />
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                Fetching your GitHub Starred repositories...
              </Typography>
            </Box>
          ) : starredList.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 10,
                px: 2,
                border: `2px dashed ${alpha(theme.palette.divider, 0.8)}`,
                borderRadius: '24px',
                bgcolor: alpha(theme.palette.text.primary, 0.02)
              }}
            >
              <StarIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                No Starred Repositories Found
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 360, mx: 'auto' }}>
                Repositories you star on GitHub will appear here automatically.
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={isCompact ? 1 : 1.5}>
              {starredList.map((repo) => (
                <Grid item xs={12} sm={isCompact ? 12 : 6} md={isCompact ? 6 : 4} key={repo.id}>
                  <RepoCard
                    repo={repo}
                    isBookmarked={isBookmarked(repo.id)}
                    onToggleBookmark={(r) => {
                      onToggleBookmark(r);
                      onVaultUpdated();
                    }}
                    onOpenDetail={onOpenDetail}
                    onCopyClone={onCopyClone}
                    copiedId={copiedId}
                    isCompact={isCompact}
                    isStarred={true}
                    onToggleStar={async (r) => {
                      if (onToggleStar) {
                        onToggleStar(r);
                      }
                      // Remove from local starred list if unstarred
                      setStarredList((prev) => prev.filter((item) => item.id !== r.id));
                    }}
                    onShareMessage={onShareMessage}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* Manual Gist Backup & Restore Dialog */}
      <Dialog open={gistDialogOpen} onClose={() => setGistDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>
          GitHub Gist Synchronization
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            OneGitVault automatically synchronizes your bookmarks with your private GitHub Gist when a PAT token is present. You can also manually backup or restore using a custom Gist ID below.
          </Typography>

          <TextField
            fullWidth
            size="small"
            label="Specific Gist ID (Optional)"
            placeholder="e.g. 7f4a29b..."
            value={manualGistId}
            onChange={(e) => setManualGistId(e.target.value)}
            sx={{ mb: 2 }}
          />

          {dialogStatus && (
            <Typography variant="caption" sx={{ display: 'block', mb: 2, color: theme.palette.primary.main, fontWeight: 700 }}>
              {dialogStatus}
            </Typography>
          )}

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={dialogLoading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
              onClick={handleManualBackup}
              disabled={dialogLoading || !token}
              sx={{ borderRadius: '14px', textTransform: 'none' }}
            >
              Push to Gist
            </Button>
            <Button
              fullWidth
              variant="outlined"
              startIcon={dialogLoading ? <CircularProgress size={16} /> : <CloudDownloadIcon />}
              onClick={handleManualRestore}
              disabled={dialogLoading}
              sx={{ borderRadius: '14px', textTransform: 'none' }}
            >
              Restore ID
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setGistDialogOpen(false)} sx={{ borderRadius: '14px', textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
