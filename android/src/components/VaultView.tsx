import React, { useState, useEffect, useMemo, useRef, useTransition } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  Chip,
  TextField,
  CircularProgress,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha,
  Alert
} from '@mui/material';
import BookmarksIcon from '@mui/icons-material/Bookmarks';
import StarIcon from '@mui/icons-material/Star';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import ChecklistIcon from '@mui/icons-material/Checklist';
import CloseIcon from '@mui/icons-material/Close';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import FolderIcon from '@mui/icons-material/Folder';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import TuneIcon from '@mui/icons-material/Tune';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Repository } from '../types';
import { RepoCard } from './RepoCard';
import {
  getBookmarks,
  saveBookmarks,
  getVaultFolders,
  createVaultFolder,
  deleteVaultFolder,
  assignReposToFolder,
  VaultFoldersMap,
  getVaultRadarResults,
  checkVaultReleaseRadar,
  VaultRadarEntry,
} from '../services/bookmarkStore';
import { getStoredToken } from '../services/githubApi';
import {
  pullBookmarksFromGist,
  pushBookmarksToGist,
  fetchUserStarredRepositories,
  fetchUserWatchedRepositories,
} from '../services/gistSync';
import { isSafeHttpUrl } from '../utils/sanitizeMarkdown';
import { triggerHaptic } from '../utils/haptics';

export type VaultSubSection = 'gist' | 'starred' | 'watching';

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
  watchedList?: Repository[];
  watchedLoaded?: boolean;
  onRefreshWatched?: () => void;
  onToggleStar?: (repo: Repository) => void;
  onOpenTokenDialog?: () => void;
  onShareMessage?: (msg: string) => void;
}

export const VaultView: React.FC<VaultViewProps> = React.memo(({
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
  watchedList = [],
  watchedLoaded = false,
  onRefreshWatched,
  onToggleStar,
  onOpenTokenDialog,
  onShareMessage
}) => {
  const theme = useTheme();
  const token = getStoredToken();
  const [, startTransition] = useTransition();

  // Sub-section selection: 'gist' (Bookmarks & Gist Sync) | 'starred' | 'watching'
  const [subSection, setSubSection] = useState<VaultSubSection>('gist');
  const [uiSubSection, setUiSubSection] = useState<VaultSubSection>('gist');

  // Bookmarks (Gist / Local), Custom Folders, and APK Release Radar
  const [bookmarks, setBookmarks] = useState<Repository[]>(getBookmarks);
  const [folders, setFolders] = useState<VaultFoldersMap>(getVaultFolders);
  const [activeFolder, setActiveFolder] = useState<string>('ALL');
  const [uiActiveFolder, setUiActiveFolder] = useState<string>('ALL');
  const [showUpdatesOnly, setShowUpdatesOnly] = useState<boolean>(false);
  const [uiShowUpdatesOnly, setUiShowUpdatesOnly] = useState<boolean>(false);
  const [radarMap, setRadarMap] = useState<Record<string, VaultRadarEntry>>(getVaultRadarResults);
  const [checkingRadar, setCheckingRadar] = useState<boolean>(false);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [moveFolderDialogOpen, setMoveFolderDialogOpen] = useState<boolean>(false);
  const [backupMenuAnchor, setBackupMenuAnchor] = useState<null | HTMLElement>(null);
  const [isGistSyncing, setIsGistSyncing] = useState<boolean>(false);
  const [gistSyncStatus, setGistSyncStatus] = useState<string>('');

  // Batch Select & Unbookmark State
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [selectedRepoIds, setSelectedRepoIds] = useState<Set<number>>(new Set());
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleExportBookmarksJson = () => {
    const items = getBookmarks();
    if (items.length === 0) {
      onShareMessage?.('Vault is empty — nothing to export');
      return;
    }
    try {
      const jsonText = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), bookmarks: items }, null, 2);
      const blob = new Blob([jsonText], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `onegitvault-vault-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      onShareMessage?.(`Exported ${items.length} repositories`);
    } catch {
      onShareMessage?.('Failed to export Vault backup');
    }
  };

  const handleImportBookmarksFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.bookmarks) ? parsed.bookmarks : null;
        if (!list) {
          onShareMessage?.('Invalid Vault backup file');
          return;
        }
        const existing = getBookmarks();
        const mergedMap = new Map<number, Repository>(existing.map((r) => [r.id, r]));
        let importedCount = 0;
        for (const item of list) {
          if (
            item &&
            typeof item.id === 'number' &&
            typeof item.name === 'string' &&
            typeof item.full_name === 'string' &&
            isSafeHttpUrl(item.html_url, true) &&
            !mergedMap.has(item.id)
          ) {
            mergedMap.set(item.id, item as Repository);
            importedCount++;
          }
        }
        const nextList = Array.from(mergedMap.values());
        saveBookmarks(nextList);
        setBookmarks(nextList);
        onVaultUpdated();
        onShareMessage?.(importedCount > 0 ? `Imported ${importedCount} repositories into Vault` : 'All backed-up repos already exist in Vault');
      } catch {
        onShareMessage?.('Could not read JSON backup file');
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    const handleSync = () => setBookmarks(getBookmarks());
    const handleFolders = () => setFolders(getVaultFolders());
    handleSync();
    handleFolders();
    window.addEventListener('ogv_bookmarks_changed', handleSync);
    window.addEventListener('ogv_vault_folders_changed', handleFolders);
    return () => {
      window.removeEventListener('ogv_bookmarks_changed', handleSync);
      window.removeEventListener('ogv_vault_folders_changed', handleFolders);
    };
  }, []);

  // Run Vault APK Release Radar diffing quietly after initial tab paint
  useEffect(() => {
    if (subSection !== 'gist' || bookmarks.length === 0) return;
    let active = true;
    const timer = setTimeout(() => {
      checkVaultReleaseRadar(bookmarks, false)
        .then((res) => {
          if (active) setRadarMap(res);
        })
        .catch(() => {});
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [subSection, bookmarks]);

  const handleManualRadarCheck = async () => {
    if (bookmarks.length === 0 || checkingRadar) return;
    setCheckingRadar(true);
    try {
      const res = await checkVaultReleaseRadar(bookmarks, true);
      setRadarMap(res);
      const count = bookmarks.filter((r) => res[(r.full_name || '').toLowerCase()]?.hasUpdate).length;
      onShareMessage?.(count > 0 ? `${count} APK release update(s) detected in Vault!` : 'All tracked Vault APKs are up to date.');
    } finally {
      setCheckingRadar(false);
    }
  };

  const syncVaultWithGistIfAuthed = (nextBookmarks: Repository[], nextFolders: VaultFoldersMap) => {
    const activeToken = getStoredToken();
    if (activeToken) {
      setTimeout(() => pushBookmarksToGist(activeToken, nextBookmarks, nextFolders), 250);
    }
  };

  const handleManualPush = async () => {
    const activeToken = getStoredToken();
    if (!activeToken) {
      onOpenTokenDialog?.();
      return;
    }
    setIsGistSyncing(true);
    setGistSyncStatus('Backing up bookmarks to GitHub Gist...');
    try {
      const res = await pushBookmarksToGist(activeToken, bookmarks, folders);
      if (res.success) {
        setGistSyncStatus(`Backed up ${bookmarks.length} repositories to Gist`);
        onShareMessage?.('Backed up Vault to GitHub Gist');
      } else {
        setGistSyncStatus(res.error || 'Failed to back up to GitHub Gist');
      }
    } catch (e: any) {
      setGistSyncStatus(e?.message || 'Failed to back up to GitHub Gist');
    } finally {
      setIsGistSyncing(false);
    }
  };

  const handleManualPull = async () => {
    const activeToken = getStoredToken();
    if (!activeToken) {
      onOpenTokenDialog?.();
      return;
    }
    setIsGistSyncing(true);
    setGistSyncStatus('Pulling bookmarks from GitHub Gist...');
    try {
      const pulled = await pullBookmarksFromGist(activeToken);
      if (!pulled) {
        setGistSyncStatus('No OneGitVault backup Gist found on this GitHub account');
        return;
      }
      const existing = getBookmarks();
      const mergedMap = new Map<number, Repository>(existing.map((r) => [r.id, r]));
      pulled.forEach((r) => {
        if (r && typeof r.id === 'number') {
          mergedMap.set(r.id, r);
        }
      });
      const merged = Array.from(mergedMap.values());
      saveBookmarks(merged);
      setBookmarks(merged);
      setFolders(getVaultFolders());
      onVaultUpdated();
      setGistSyncStatus(`Restored ${pulled.length} repositories from GitHub Gist`);
      onShareMessage?.(`Restored ${pulled.length} repositories from Gist`);
    } catch (e: any) {
      setGistSyncStatus(e?.message || 'Failed to pull from GitHub Gist');
    } finally {
      setIsGistSyncing(false);
    }
  };

  const handleCreateFolderSubmit = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    const next = createVaultFolder(trimmed);
    setFolders(next);
    setActiveFolder(trimmed);
    setNewFolderName('');
    setNewFolderDialogOpen(false);
    syncVaultWithGistIfAuthed(bookmarks, next);
    onShareMessage?.(`Created folder "${trimmed}"`);
  };

  const handleDeleteFolder = (folderName: string) => {
    const next = deleteVaultFolder(folderName);
    setFolders(next);
    if (activeFolder === folderName) setActiveFolder('ALL');
    syncVaultWithGistIfAuthed(bookmarks, next);
    onShareMessage?.(`Deleted folder "${folderName}"`);
  };

  const handleAssignSelectedToFolder = (folderName: string) => {
    if (selectedRepoIds.size === 0) return;
    const ids = Array.from(selectedRepoIds);
    const next = assignReposToFolder(ids, folderName);
    setFolders(next);
    setMoveFolderDialogOpen(false);
    setIsSelectMode(false);
    setSelectedRepoIds(new Set());
    syncVaultWithGistIfAuthed(bookmarks, next);
    onShareMessage?.(`Added ${ids.length} repo(s) to "${folderName}"`);
  };

  const radarUpdatesCount = useMemo(() => {
    return bookmarks.filter((r) => radarMap[(r.full_name || '').toLowerCase()]?.hasUpdate).length;
  }, [bookmarks, radarMap]);

  const folderNames = useMemo(() => Object.keys(folders), [folders]);

  const displayedBookmarks = useMemo(() => {
    let list = bookmarks;
    if (activeFolder !== 'ALL') {
      const idSet = new Set(Array.isArray(folders[activeFolder]) ? folders[activeFolder] : []);
      list = list.filter((r) => idSet.has(r.id));
    }
    if (showUpdatesOnly) {
      list = list.filter((r) => radarMap[(r.full_name || '').toLowerCase()]?.hasUpdate);
    }
    return list;
  }, [bookmarks, activeFolder, folders, showUpdatesOnly, radarMap]);

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

  // Local fallback state for starred & watched repos if not passed from parent
  const [localStarredList, setLocalStarredList] = useState<Repository[]>([]);
  const [loadingStarred, setLoadingStarred] = useState<boolean>(false);
  const [localWatchedList, setLocalWatchedList] = useState<Repository[]>([]);
  const [loadingWatched, setLoadingWatched] = useState<boolean>(false);
  const [remoteSearch, setRemoteSearch] = useState<string>('');

  useEffect(() => {
    if (subSection === 'starred' && starredList.length === 0 && !starredLoaded && token) {
      setLoadingStarred(true);
      fetchUserStarredRepositories(token, 1, 100)
        .then(setLocalStarredList)
        .catch(() => {})
        .finally(() => setLoadingStarred(false));
    } else if (subSection === 'watching' && watchedList.length === 0 && !watchedLoaded && token) {
      setLoadingWatched(true);
      fetchUserWatchedRepositories(token, 1, 100)
        .then(setLocalWatchedList)
        .catch(() => {})
        .finally(() => setLoadingWatched(false));
    }
  }, [subSection, starredList.length, starredLoaded, watchedList.length, watchedLoaded, token]);

  const activeStarredItems = starredList.length > 0 ? starredList : localStarredList;
  const activeWatchedItems = watchedList.length > 0 ? watchedList : localWatchedList;

  const currentRemoteItems = subSection === 'watching' ? activeWatchedItems : activeStarredItems;
  const currentRemoteLoading = subSection === 'watching' ? loadingWatched : loadingStarred;
  const currentRemoteRefresh = subSection === 'watching' ? onRefreshWatched : onRefreshStarred;

  const filteredRemoteItems = useMemo(() => {
    if (!remoteSearch.trim()) return currentRemoteItems;
    const q = remoteSearch.toLowerCase().trim();
    return currentRemoteItems.filter(
      (r) =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.full_name || '').toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  }, [currentRemoteItems, remoteSearch]);

  return (
    <Box sx={{ pb: 12, pt: { xs: 0.5, sm: 1 }, px: { xs: 1.5, sm: 2 }, maxWidth: 1280, mx: 'auto' }}>
      {/* ── Row 1: Clean Native Underline Tabs (Saved | Starred | Watch) ── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          borderBottom: `1px solid ${theme.palette.divider}`,
          width: '100%',
          mb: 1.25
        }}
      >
        {[
          {
            id: 'gist' as VaultSubSection,
            label: `Saved (${bookmarks.length})`,
            icon: <BookmarksIcon sx={{ fontSize: 15 }} />,
          },
          {
            id: 'starred' as VaultSubSection,
            label: `Starred (${activeStarredItems.length})`,
            icon: <StarIcon sx={{ fontSize: 15, color: subSection === 'starred' ? '#fbbf24' : 'inherit' }} />,
          },
          {
            id: 'watching' as VaultSubSection,
            label: `Watch (${activeWatchedItems.length})`,
            icon: <VisibilityIcon sx={{ fontSize: 15 }} />,
          },
        ].map((seg) => {
            const active = uiSubSection === seg.id;
            return (
              <Box
                key={seg.id}
                role="tab"
                aria-selected={active}
                tabIndex={0}
                onClick={() => {
                  setUiSubSection(seg.id);
                  triggerHaptic(8);
                  startTransition(() => {
                    setSubSection(seg.id);
                    setRemoteSearch('');
                    setIsSelectMode(false);
                    setSelectedRepoIds(new Set());
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setUiSubSection(seg.id);
                    startTransition(() => {
                      setSubSection(seg.id);
                      setRemoteSearch('');
                    });
                  }
                }}
              sx={{
                position: 'relative',
                height: 38,
                px: 0.75,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.6,
                cursor: 'pointer',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
                color: active ? theme.palette.primary.main : 'text.secondary',
                fontSize: { xs: '0.75rem', sm: '0.8rem' },
                fontWeight: active ? 800 : 600,
                transition: 'color 0.15s ease',
                minWidth: 0,
              }}
            >
              {seg.icon}
              <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {seg.label}
              </Box>
              {active && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: '14%',
                    right: '14%',
                    height: 2.5,
                    borderRadius: '2px 2px 0 0',
                    bgcolor: theme.palette.primary.main,
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>

      {/* ── Row 2 (Saved): Single Compact Filter Row + One All-Settings Icon ── */}
      {subSection === 'gist' && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            width: '100%',
            mb: 1.35
          }}
        >
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleImportBookmarksFile}
          />

          {/* Horizontally Scrollable Filter & Folder Chips */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            <Chip
              size="small"
              icon={<GridViewRoundedIcon sx={{ fontSize: '14px !important' }} />}
              label={`All (${bookmarks.length})`}
              onClick={() => {
                setUiShowUpdatesOnly(false);
                setUiActiveFolder('ALL');
                startTransition(() => {
                  setShowUpdatesOnly(false);
                  setActiveFolder('ALL');
                });
              }}
              sx={{
                height: 30,
                borderRadius: '15px',
                fontSize: '0.73rem',
                fontWeight: uiActiveFolder === 'ALL' && !uiShowUpdatesOnly ? 800 : 600,
                flexShrink: 0,
                cursor: 'pointer',
                bgcolor: uiActiveFolder === 'ALL' && !uiShowUpdatesOnly
                  ? theme.palette.primary.main
                  : alpha(theme.palette.text.primary, 0.05),
                color: uiActiveFolder === 'ALL' && !uiShowUpdatesOnly
                  ? theme.palette.primary.contrastText
                  : 'text.secondary',
                border: `1px solid ${
                  uiActiveFolder === 'ALL' && !uiShowUpdatesOnly
                    ? theme.palette.primary.main
                    : theme.palette.divider
                }`,
                '& .MuiChip-icon': {
                  color: 'inherit',
                },
              }}
            />

            {bookmarks.length > 0 && (
              <Chip
                size="small"
                icon={
                  checkingRadar ? (
                    <CircularProgress size={12} color="inherit" />
                  ) : (
                    <SystemUpdateAltIcon sx={{ fontSize: '14px !important' }} />
                  )
                }
                label={radarUpdatesCount > 0 ? `Updates (${radarUpdatesCount})` : 'Updates'}
                onClick={() => {
                  if (radarUpdatesCount > 0) {
                    const nextVal = !uiShowUpdatesOnly;
                    setUiShowUpdatesOnly(nextVal);
                    startTransition(() => setShowUpdatesOnly(nextVal));
                  } else {
                    handleManualRadarCheck();
                  }
                }}
                sx={{
                  height: 30,
                  borderRadius: '15px',
                  fontSize: '0.73rem',
                  fontWeight: uiShowUpdatesOnly || radarUpdatesCount > 0 ? 800 : 600,
                  flexShrink: 0,
                  cursor: 'pointer',
                  bgcolor: uiShowUpdatesOnly
                    ? theme.palette.success.main
                    : radarUpdatesCount > 0
                    ? alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.2 : 0.14)
                    : alpha(theme.palette.text.primary, 0.05),
                  color: uiShowUpdatesOnly
                    ? '#ffffff'
                    : radarUpdatesCount > 0
                    ? theme.palette.success.main
                    : 'text.secondary',
                  border: `1px solid ${
                    uiShowUpdatesOnly || radarUpdatesCount > 0
                      ? theme.palette.success.main
                      : theme.palette.divider
                  }`,
                  '& .MuiChip-icon': {
                    color: 'inherit',
                  },
                }}
              />
            )}

            {folderNames.map((fname) => {
              const count = (folders[fname] || []).filter((id) => bookmarks.some((b) => b.id === id)).length;
              const selected = uiActiveFolder === fname;
              return (
                <Chip
                  key={fname}
                  size="small"
                  icon={<FolderIcon sx={{ fontSize: '14px !important' }} />}
                  label={`${fname} (${count})`}
                  onClick={() => {
                    const nextFolder = selected ? 'ALL' : fname;
                    setUiShowUpdatesOnly(false);
                    setUiActiveFolder(nextFolder);
                    startTransition(() => {
                      setShowUpdatesOnly(false);
                      setActiveFolder(nextFolder);
                    });
                  }}
                  onDelete={selected ? () => handleDeleteFolder(fname) : undefined}
                  sx={{
                    height: 30,
                    borderRadius: '15px',
                    fontSize: '0.73rem',
                    fontWeight: selected ? 800 : 600,
                    flexShrink: 0,
                    cursor: 'pointer',
                    bgcolor: selected
                      ? theme.palette.primary.main
                      : alpha(theme.palette.text.primary, 0.05),
                    color: selected ? theme.palette.primary.contrastText : 'text.secondary',
                    border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
                    '& .MuiChip-icon': {
                      color: 'inherit',
                    },
                  }}
                />
              );
            })}

            <Chip
              size="small"
              icon={<CreateNewFolderIcon sx={{ fontSize: '14px !important' }} />}
              label="New Folder"
              onClick={() => setNewFolderDialogOpen(true)}
              sx={{
                height: 30,
                borderRadius: '15px',
                fontSize: '0.73rem',
                fontWeight: 700,
                flexShrink: 0,
                cursor: 'pointer',
                color: 'text.secondary',
                bgcolor: alpha(theme.palette.text.primary, 0.04),
                border: `1px solid ${theme.palette.divider}`,
                '& .MuiChip-icon': {
                  color: 'text.secondary',
                },
              }}
            />
          </Box>

          {/* Single Unified Vault Settings / Save / Manage Button */}
          <Tooltip title="Vault backup, sync & organize">
            <IconButton
              size="small"
              aria-label="Vault options"
              onClick={(e) => setBackupMenuAnchor(e.currentTarget)}
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                flexShrink: 0,
                bgcolor: isSelectMode
                  ? theme.palette.primary.main
                  : alpha(theme.palette.text.primary, 0.05),
                color: isSelectMode ? theme.palette.primary.contrastText : 'text.primary',
                border: `1px solid ${isSelectMode ? theme.palette.primary.main : theme.palette.divider}`,
              }}
            >
              {isGistSyncing || checkingRadar ? (
                <CircularProgress size={15} color="inherit" />
              ) : (
                <TuneIcon sx={{ fontSize: 17 }} />
              )}
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={backupMenuAnchor}
            open={Boolean(backupMenuAnchor)}
            onClose={() => setBackupMenuAnchor(null)}
            PaperProps={{
              sx: {
                mt: 0.75,
                borderRadius: '18px',
                minWidth: 235,
                bgcolor: 'var(--bg-menu)',
                backgroundImage: 'none',
                border: `1px solid ${theme.palette.divider}`,
                p: 0.5,
              },
            }}
          >
            <Typography
              variant="caption"
              sx={{ px: 1.5, py: 0.5, display: 'block', fontSize: '0.66rem', fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}
            >
              Manage & Updates
            </Typography>

            {bookmarks.length > 0 && (
              <MenuItem
                onClick={() => {
                  setBackupMenuAnchor(null);
                  setIsSelectMode((prev) => !prev);
                  setSelectedRepoIds(new Set());
                }}
                sx={{ borderRadius: '9px', py: 0.85 }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <ChecklistIcon fontSize="small" color={isSelectMode ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText
                  primary={isSelectMode ? 'Exit Selection Mode' : 'Select & Organize'}
                  secondary="Move to folder or remove multiple"
                  primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 700 }}
                  secondaryTypographyProps={{ fontSize: '0.68rem' }}
                />
              </MenuItem>
            )}

            <MenuItem
              disabled={checkingRadar || bookmarks.length === 0}
              onClick={() => {
                setBackupMenuAnchor(null);
                handleManualRadarCheck();
              }}
              sx={{ borderRadius: '9px', py: 0.85 }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <RefreshIcon fontSize="small" color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={checkingRadar ? 'Scanning APK Releases...' : 'Scan APK Updates'}
                secondary={radarUpdatesCount > 0 ? `${radarUpdatesCount} update(s) available` : 'Check latest release tags'}
                primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 700 }}
                secondaryTypographyProps={{ fontSize: '0.68rem' }}
              />
            </MenuItem>

            <MenuItem
              onClick={() => {
                setBackupMenuAnchor(null);
                setNewFolderDialogOpen(true);
              }}
              sx={{ borderRadius: '9px', py: 0.85 }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <CreateNewFolderIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Create Folder"
                secondary="Group saved repositories"
                primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 700 }}
                secondaryTypographyProps={{ fontSize: '0.68rem' }}
              />
            </MenuItem>

            <Divider sx={{ my: 0.5 }} />

            <Typography
              variant="caption"
              sx={{ px: 1.5, py: 0.5, display: 'block', fontSize: '0.66rem', fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}
            >
              Cloud Sync (GitHub Gist)
            </Typography>

            {!token ? (
              <MenuItem
                onClick={() => {
                  setBackupMenuAnchor(null);
                  onOpenTokenDialog?.();
                }}
                sx={{ borderRadius: '9px', py: 0.85 }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <VpnKeyIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Connect GitHub Account"
                  secondary="Enable cloud Gist sync & Star/Watch"
                  primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 700 }}
                  secondaryTypographyProps={{ fontSize: '0.68rem' }}
                />
              </MenuItem>
            ) : (
              <>
                <MenuItem
                  disabled={isGistSyncing || bookmarks.length === 0}
                  onClick={() => {
                    setBackupMenuAnchor(null);
                    handleManualPush();
                  }}
                  sx={{ borderRadius: '9px', py: 0.85 }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CloudUploadIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Backup to Gist"
                    secondary="Save bookmarks & folders online"
                    primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 700 }}
                    secondaryTypographyProps={{ fontSize: '0.68rem' }}
                  />
                </MenuItem>

                <MenuItem
                  disabled={isGistSyncing}
                  onClick={() => {
                    setBackupMenuAnchor(null);
                    handleManualPull();
                  }}
                  sx={{ borderRadius: '9px', py: 0.85 }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CloudDownloadIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Restore from Gist"
                    secondary="Pull saved bookmarks & folders"
                    primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 700 }}
                    secondaryTypographyProps={{ fontSize: '0.68rem' }}
                  />
                </MenuItem>
              </>
            )}

            <Divider sx={{ my: 0.5 }} />

            <Typography
              variant="caption"
              sx={{ px: 1.5, py: 0.5, display: 'block', fontSize: '0.66rem', fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}
            >
              Local Save (Device JSON)
            </Typography>

            <MenuItem
              disabled={bookmarks.length === 0}
              onClick={() => {
                setBackupMenuAnchor(null);
                handleExportBookmarksJson();
              }}
              sx={{ borderRadius: '9px', py: 0.85 }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <FileDownloadIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Export Local JSON"
                secondary="Download offline backup file"
                primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 700 }}
                secondaryTypographyProps={{ fontSize: '0.68rem' }}
              />
            </MenuItem>

            <MenuItem
              onClick={() => {
                setBackupMenuAnchor(null);
                importInputRef.current?.click();
              }}
              sx={{ borderRadius: '9px', py: 0.85 }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <FileUploadIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Import Local JSON"
                secondary="Restore repos from a JSON file"
                primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 700 }}
                secondaryTypographyProps={{ fontSize: '0.68rem' }}
              />
            </MenuItem>
          </Menu>
        </Box>
      )}

      {/* Sync Status / Error Banner below toolbar */}
      {gistSyncStatus && subSection === 'gist' && (
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
            py: 0.5,
            px: 1.5,
            fontSize: '0.74rem',
            fontWeight: 600,
            borderRadius: '12px',
            mb: 1.35,
            alignItems: 'center',
            '& .MuiAlert-message': {
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              lineHeight: 1.4,
              py: 0.2
            }
          }}
        >
          {gistSyncStatus}
        </Alert>
      )}

      {/* Shared Compact Search & Refresh Bar for Starred / Watching tabs */}
      {subSection !== 'gist' && token && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.35 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={
              subSection === 'watching'
                ? 'Search your watched repositories...'
                : 'Search your starred repositories...'
            }
            value={remoteSearch}
            onChange={(e) => setRemoteSearch(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ fontSize: 17, color: 'text.secondary', mr: 0.75 }} />
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                height: 34,
                borderRadius: '17px',
                fontSize: '0.8rem',
                bgcolor: alpha(theme.palette.text.primary, 0.04)
              }
            }}
          />
          {currentRemoteRefresh && (
            <Tooltip title={subSection === 'watching' ? 'Refresh Watching List' : 'Refresh Starred List'}>
              <IconButton
                size="small"
                onClick={currentRemoteRefresh}
                disabled={currentRemoteLoading}
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  border: `1px solid ${theme.palette.divider}`,
                  color: 'text.secondary',
                  flexShrink: 0
                }}
              >
                {currentRemoteLoading ? <CircularProgress size={14} /> : <RefreshIcon sx={{ fontSize: 17 }} />}
              </IconButton>
            </Tooltip>
          )}
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
                mt: 0.5
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
                      {selectedRepoIds.size} of {displayedBookmarks.length} selected
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

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={selectedRepoIds.size === 0}
                      startIcon={<DriveFileMoveIcon sx={{ fontSize: 15 }} />}
                      onClick={() => setMoveFolderDialogOpen(true)}
                      sx={{
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontWeight: 800,
                        fontSize: '0.74rem',
                        px: 1.25,
                        py: 0.4
                      }}
                    >
                      Folder
                    </Button>
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

              {displayedBookmarks.length === 0 ? (
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 6,
                    px: 2,
                    borderRadius: '18px',
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
                    border: `1px dashed ${theme.palette.divider}`,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {showUpdatesOnly
                      ? 'No APK Updates Available Right Now'
                      : `No Repositories in "${activeFolder}"`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    {showUpdatesOnly
                      ? 'All tracked APK repositories in your Vault match the latest fetched release tag.'
                      : 'Select bookmarks using checklist mode and tap Folder to add repositories here.'}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setShowUpdatesOnly(false);
                      setActiveFolder('ALL');
                    }}
                    sx={{ borderRadius: '9px', textTransform: 'none', fontWeight: 700 }}
                  >
                    Show All ({bookmarks.length})
                  </Button>
                </Box>
              ) : (
                <Grid container spacing={isCompact ? 1.5 : 2}>
                  {displayedBookmarks.map((repo) => {
                    const radar = radarMap[(repo.full_name || '').toLowerCase()];
                    return (
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
                          updateBadge={radar?.hasUpdate ? radar.latestTag : undefined}
                        />
                      </Grid>
                    );
                  })}
                </Grid>
              )}

              {/* New Folder Dialog */}
              <Dialog open={newFolderDialogOpen} onClose={() => setNewFolderDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 800, fontSize: '1rem' }}>New Vault Folder</DialogTitle>
                <DialogContent>
                  <TextField
                    autoFocus
                    fullWidth
                    size="small"
                    label="Folder name"
                    placeholder="e.g. Daily Apps, Self-Host"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateFolderSubmit();
                    }}
                    sx={{ mt: 0.5 }}
                  />
                </DialogContent>
                <DialogActions sx={{ px: 2.5, pb: 2 }}>
                  <Button onClick={() => setNewFolderDialogOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
                    Cancel
                  </Button>
                  <Button variant="contained" disabled={!newFolderName.trim()} onClick={handleCreateFolderSubmit} sx={{ textTransform: 'none', borderRadius: '9px' }}>
                    Create
                  </Button>
                </DialogActions>
              </Dialog>

              {/* Assign Selected Repos to Folder Dialog */}
              <Dialog open={moveFolderDialogOpen} onClose={() => setMoveFolderDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 800, fontSize: '1rem' }}>Add to Vault Folder</DialogTitle>
                <DialogContent>
                  {folderNames.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Create a folder first using the New Folder button.
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, pt: 0.5 }}>
                      {folderNames.map((fname) => (
                        <Chip
                          key={fname}
                          icon={<FolderIcon />}
                          label={fname}
                          onClick={() => handleAssignSelectedToFolder(fname)}
                          sx={{ borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                        />
                      ))}
                    </Box>
                  )}
                </DialogContent>
                <DialogActions sx={{ px: 2.5, pb: 2 }}>
                  <Button onClick={() => setMoveFolderDialogOpen(false)} sx={{ textTransform: 'none' }}>
                    Close
                  </Button>
                </DialogActions>
              </Dialog>
            </>
          )}
        </>
      )}

      {/* ── SubSection 2 & 3: Shared Remote Collection (GitHub Starred / Watching) ── */}
      {(subSection === 'starred' || subSection === 'watching') && (
        <>
          {!token ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
                px: 2,
                borderRadius: '18px',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
                border: `1px dashed ${theme.palette.divider}`,
                mt: 1
              }}
            >
              {subSection === 'watching' ? (
                <VisibilityIcon sx={{ fontSize: 44, color: 'primary.main', mb: 1.5 }} />
              ) : (
                <StarIcon sx={{ fontSize: 44, color: '#fbbf24', mb: 1.5 }} />
              )}
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                Sign in to GitHub
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 360, mx: 'auto', mb: 2 }}>
                {subSection === 'watching'
                  ? 'Connect your GitHub account to view and track repositories you are watching on GitHub.'
                  : 'Connect your GitHub account to browse, star, and sync your starred repositories directly in OneGitVault.'}
              </Typography>
              <Button
                variant="contained"
                size="small"
                onClick={onOpenTokenDialog}
                startIcon={<VpnKeyIcon />}
                sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
              >
                Sign In to GitHub
              </Button>
            </Box>
          ) : currentRemoteLoading ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <CircularProgress size={32} sx={{ mb: 2 }} />
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {subSection === 'watching'
                  ? 'Loading watched repositories...'
                  : 'Loading starred repositories...'}
              </Typography>
            </Box>
          ) : filteredRemoteItems.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
                px: 2,
                borderRadius: '18px',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
                border: `1px dashed ${theme.palette.divider}`,
                mt: 1
              }}
            >
              {subSection === 'watching' ? (
                <VisibilityIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1.5 }} />
              ) : (
                <StarIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1.5 }} />
              )}
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                {remoteSearch
                  ? 'No Matching Repositories'
                  : subSection === 'watching'
                  ? 'No Watched Repositories Found'
                  : 'No Starred Repositories Found'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 360, mx: 'auto' }}>
                {remoteSearch
                  ? 'Try searching with a different keyword or repo name.'
                  : subSection === 'watching'
                  ? 'Repositories you subscribe/watch on GitHub appear here automatically.'
                  : 'Star repositories in the app or on GitHub, and they will appear here.'}
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={isCompact ? 1.5 : 2}>
              {filteredRemoteItems.map((repo) => (
                <Grid item xs={12} sm={6} md={4} key={repo.id}>
                  <RepoCard
                    repo={repo}
                    onOpenDetail={onOpenDetail}
                    isBookmarked={isBookmarked(repo.id)}
                    onToggleBookmark={onToggleBookmark}
                    onCopyClone={onCopyClone}
                    copiedId={copiedId}
                    isCompact={isCompact}
                    isStarred={subSection === 'starred' ? true : starredRepos.has(repo.full_name)}
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
});
