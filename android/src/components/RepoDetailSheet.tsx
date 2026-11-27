import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Chip,
  Button,
  IconButton,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  useTheme,
  alpha,
  useMediaQuery
} from '@mui/material';
import AndroidIcon from '@mui/icons-material/Android';
import StarIcon from '@mui/icons-material/Star';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ArticleIcon from '@mui/icons-material/Article';
import AppsIcon from '@mui/icons-material/Apps';
import ShareIcon from '@mui/icons-material/Share';
import TranslateIcon from '@mui/icons-material/Translate';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CodeIcon from '@mui/icons-material/Code';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import GavelIcon from '@mui/icons-material/Gavel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BugReportIcon from '@mui/icons-material/BugReport';
import TerminalIcon from '@mui/icons-material/Terminal';
import StorageIcon from '@mui/icons-material/Storage';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import EditNoteIcon from '@mui/icons-material/EditNote';
import AlarmIcon from '@mui/icons-material/Alarm';
import AlarmOnIcon from '@mui/icons-material/AlarmOn';
import StyleIcon from '@mui/icons-material/Style';
import LabelIcon from '@mui/icons-material/Label';
import AddIcon from '@mui/icons-material/Add';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { Repository, ReleaseAsset } from '../types';
import { fetchReadme, fetchReleases, fetchRepoCompleteDetails, getStoredToken } from '../services/githubApi';
import { shareProject } from '../services/shareHelper';
import { translateMarkdownToEnglish } from '../services/translateService';
import { downloadApkFile } from '../services/downloadHelper';
import { registerMemoryCacheCleaner, setBoundedMapEntry } from '../services/cacheManager';
import { OwnerAvatar } from './OwnerAvatar';
import { renderMarkdownToSafeHtml, isSafeHttpUrl } from '../utils/sanitizeMarkdown';
import { triggerHaptic } from '../utils/haptics';
import { ImageViewerModal } from './ImageViewerModal';
import { shareVisualCard } from '../utils/visualCardGenerator';
import { createSyntheticSummary } from '../services/readmeSummaryParser';
import {
  getRepoAnnotation,
  saveRepoNote,
  addRepoTag,
  removeRepoTag,
  setRepoReminder,
  clearRepoReminder,
  RepoAnnotation,
} from '../services/vaultAnnotationStore';

const MAX_PARSED_README_CACHE = 25;
const parsedReadmeHtmlCache = new Map<string, string>();
registerMemoryCacheCleaner(() => {
  parsedReadmeHtmlCache.clear();
});

function detectApkAbiBadge(filename: string): string | null {
  const lower = filename.toLowerCase();
  if (lower.includes('arm64-v8a') || lower.includes('aarch64') || lower.includes('arm64')) return 'arm64-v8a';
  if (lower.includes('armeabi-v7a') || lower.includes('armv7') || lower.includes('arm-v7a')) return 'armeabi-v7a';
  if (lower.includes('x86_64') || lower.includes('amd64')) return 'x86_64';
  if (lower.includes('universal') || lower.includes('-all')) return 'universal';
  return null;
}

function getOrParseMarkdownHtml(
  cacheKey: string,
  markdown: string,
  repoFullName: string,
  defaultBranch: string = 'HEAD'
): string {
  const cached = parsedReadmeHtmlCache.get(cacheKey);
  if (cached) return cached;
  const finalHtml = renderMarkdownToSafeHtml(markdown, { repoFullName, defaultBranch });
  setBoundedMapEntry(parsedReadmeHtmlCache, cacheKey, finalHtml, MAX_PARSED_README_CACHE);
  return finalHtml;
}

interface RepoDetailSheetProps {
  repo: Repository | null;
  open: boolean;
  onClose: () => void;
  onCopyClone: (cloneUrl: string) => void;
  copiedId: number | null;
  isStarred?: boolean;
  onToggleStar?: (repo: Repository) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (repo: Repository) => void;
  onShareMessage?: (msg: string) => void;
  initialTab?: 'info' | 'readme' | 'releases';
}

export const RepoDetailSheet: React.FC<RepoDetailSheetProps> = ({
  repo,
  open,
  onClose,
  onCopyClone,
  copiedId,
  isStarred = false,
  onToggleStar,
  isBookmarked = false,
  onToggleBookmark,
  onShareMessage,
  initialTab = 'info'
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [tabIndex, setTabIndex] = useState<number>(() => (initialTab === 'readme' ? 1 : initialTab === 'releases' ? 2 : 0));
  const [rawReadme, setRawReadme] = useState<string>('');
  const [originalHtml, setOriginalHtml] = useState<string>('');
  const [translatedHtml, setTranslatedHtml] = useState<string>('');
  const [isTranslated, setIsTranslated] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [releases, setReleases] = useState<ReleaseAsset[]>([]);
  const [selectedReleaseAsset, setSelectedReleaseAsset] = useState<ReleaseAsset | null>(null);
  const [loadingReadme, setLoadingReadme] = useState<boolean>(false);
  const [loadingReleases, setLoadingReleases] = useState<boolean>(false);
  const [viewerImage, setViewerImage] = useState<{ url: string; title: string } | null>(null);
  const [annotation, setAnnotation] = useState<RepoAnnotation | null>(null);
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);
  const [noteDraft, setNoteDraft] = useState<string>('');
  const [tagDraft, setTagDraft] = useState<string>('');
  const [isAddingTag, setIsAddingTag] = useState<boolean>(false);
  const [reminderAnchor, setReminderAnchor] = useState<null | HTMLElement>(null);
  const [shareMenuAnchor, setShareMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    let isMounted = true;
    if (repo && open) {
      setAnnotation(getRepoAnnotation(repo.id));
      setIsEditingNote(false);
      setIsAddingTag(false);
      setTabIndex(initialTab === 'readme' ? 1 : initialTab === 'releases' ? 2 : 0);
      setLoadingReadme(true);
      setRawReadme('');
      setOriginalHtml('');
      setTranslatedHtml('');
      setIsTranslated(false);
      setIsTranslating(false);

      // Pre-seed with existing assets if available
      if (repo.latest_release?.assets && repo.latest_release.assets.length > 0) {
        setReleases(repo.latest_release.assets);
        setLoadingReleases(false);
      } else {
        setReleases([]);
        setLoadingReleases(true);
      }

      const renderReadmeMarkdown = (raw: string) => {
        if (!isMounted) return;
        setRawReadme(raw);
        try {
          const branch = repo.default_branch || 'HEAD';
          const sanitized = getOrParseMarkdownHtml(
            `orig:${repo.full_name}:${branch}:${raw.length}`,
            raw,
            repo.full_name,
            branch
          );
          setOriginalHtml(sanitized);
        } catch {
          setOriginalHtml('<p>Error rendering README.</p>');
        }
        setLoadingReadme(false);
      };

      const loadReadmeViaRest = () => {
        fetchReadme(repo.full_name, repo.default_branch)
          .then(renderReadmeMarkdown)
          .catch(() => {
            if (!isMounted) return;
            setOriginalHtml('<p>Error rendering README.</p>');
            setLoadingReadme(false);
          });
      };

      const loadReleasesViaRest = () => {
        fetchReleases(repo.full_name)
          .then((assets) => {
            if (!isMounted) return;
            if (assets && assets.length > 0) {
              setReleases(assets);
            } else if (repo.latest_release?.assets && repo.latest_release.assets.length > 0) {
              setReleases(repo.latest_release.assets);
            }
            setLoadingReleases(false);
          })
          .catch(() => {
            if (!isMounted) return;
            if (repo.latest_release?.assets && repo.latest_release.assets.length > 0) {
              setReleases(repo.latest_release.assets);
            }
            setLoadingReleases(false);
          });
      };

      if (getStoredToken()) {
        // Grouped GraphQL Query: fetches specs, releases, assets, star status, AND README.md in ONE request!
        fetchRepoCompleteDetails(repo.full_name)
          .then((complete) => {
            if (!isMounted) return;
            if (complete) {
              if (complete.releases && complete.releases.length > 0) {
                setReleases(complete.releases);
              } else if (repo.latest_release?.assets && repo.latest_release.assets.length > 0) {
                setReleases(repo.latest_release.assets);
              }
              setLoadingReleases(false);

              if (complete.readme) {
                renderReadmeMarkdown(complete.readme);
              } else {
                loadReadmeViaRest();
              }
            } else {
              loadReadmeViaRest();
              loadReleasesViaRest();
            }
          })
          .catch(() => {
            if (!isMounted) return;
            loadReadmeViaRest();
            loadReleasesViaRest();
          });
      } else {
        loadReadmeViaRest();
        loadReleasesViaRest();
      }
    }

    return () => {
      isMounted = false;
    };
  }, [repo, open]);

  const handleToggleTranslate = async () => {
    if (isTranslated) {
      setIsTranslated(false);
      return;
    }

    if (translatedHtml) {
      setIsTranslated(true);
      return;
    }

    if (!rawReadme || !repo) return;
    setIsTranslating(true);
    try {
      const branch = repo.default_branch || 'HEAD';
      const trCacheKey = `tr:${repo.full_name}:${branch}:${rawReadme.length}`;
      let sanitized = parsedReadmeHtmlCache.get(trCacheKey);
      if (!sanitized) {
        const translatedMd = await translateMarkdownToEnglish(rawReadme);
        sanitized = getOrParseMarkdownHtml(trCacheKey, translatedMd, repo.full_name, branch);
      }
      setTranslatedHtml(sanitized);
      setIsTranslated(true);
    } catch (e) {
      console.warn('Translation failed:', e);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleReadmeLinkClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    // 1. Internal hash navigation links (e.g. #installation, #features, #table-of-contents)
    if (href.startsWith('#')) {
      e.preventDefault();
      let rawId = '';
      try {
        rawId = decodeURIComponent(href.slice(1)).toLowerCase().trim();
      } catch {
        rawId = href.slice(1).toLowerCase().trim();
      }
      if (!rawId) return;

      const escId = (window as any).CSS?.escape ? CSS.escape(rawId) : rawId.replace(/[^a-zA-Z0-9_-]/g, '');
      let el: Element | null = document.getElementById(rawId) ||
                               document.getElementById(`user-content-${rawId}`) ||
                               (escId ? document.querySelector(`[name="${escId}"]`) : null) ||
                               (escId ? document.querySelector(`[name="user-content-${escId}"]`) : null);

      if (!el) {
        // Fallback: search headings (h1, h2, h3, h4, h5, h6) inside the dialog
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        for (let i = 0; i < headings.length; i++) {
          const h = headings[i];
          const text = h.textContent?.trim().toLowerCase() || '';
          const slug = text.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
          if (slug === rawId || text === rawId || slug.includes(rawId) || rawId.includes(slug)) {
            el = h;
            break;
          }
        }
      }

      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    // 2. Relative file/doc links inside the repository (e.g. docs/install.md, ./LICENSE)
    if (repo && !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('mailto:')) {
      e.preventDefault();
      if (/^(javascript|vbscript|data):/i.test(href.trim())) return;
      const cleanPath = href.replace(/^\.?\//, '');
      const fullUrl = `https://github.com/${repo.full_name}/blob/${repo.default_branch || 'main'}/${cleanPath}`;
      if (isSafeHttpUrl(fullUrl, true)) {
        window.open(fullUrl, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    // 3. Absolute HTTP / HTTPS URLs
    if (isSafeHttpUrl(href, false)) {
      e.preventDefault();
      window.open(href.trim(), '_blank', 'noopener,noreferrer');
    }
  };

  if (!repo) return null;

  const formatCount = (count: number) => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
    return count.toString();
  };

  const hasApk = repo.has_apks || (repo.topics && (repo.topics.includes('apk') || repo.topics.includes('android-app') || repo.topics.includes('android')));
  const isCopied = copiedId === repo.id;
  const apkAssets = releases.filter((a) => {
    const n = a.name.toLowerCase();
    return a.is_apk || n.endsWith('.apk') || n.endsWith('.xapk') || n.endsWith('.aab');
  });

  const totalDownloads = releases.reduce((sum, r) => sum + (r.download_count || 0), 0);
  const latestApk = apkAssets.length > 0 ? apkAssets[0] : null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 30) return `${diffDays}d ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
      return `${Math.floor(diffDays / 365)}y ago`;
    } catch {
      return '';
    }
  };

  const handleShareRepo = async () => {
    const shareTitle = `${repo.name} — OneGitVault`;
    const shareText = `Shared from OneGitVault ⚡\nYou can visit the following GitHub link:\n${repo.html_url}`;
    const result = await shareProject(
      shareTitle,
      shareText,
      repo.html_url
    );
    if (result === 'copied' && onShareMessage) {
      onShareMessage(`Copied GitHub link for ${repo.name}`);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          m: { xs: 0, sm: 2 },
          height: { xs: '100%', sm: '90vh' },
          maxHeight: '100%',
          bgcolor: `${theme.palette.background.paper} !important`,
          backgroundColor: `${theme.palette.background.paper} !important`,
          backgroundImage: 'none !important',
          borderRadius: { xs: 0, sm: '24px' }
        }
      }}
    >
      {/* ── 1. Clean Top App Bar (Back navigation, avatar, title & author) ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          pt: 'calc(max(env(safe-area-inset-top, 0px), var(--status-bar-height, 46px)) + 12px)',
          px: 2,
          pb: 1.25,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
          bgcolor: 'var(--bg-header)',
          zIndex: 10
        }}
      >
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            color: 'text.primary',
            p: 0.75,
            borderRadius: '12px',
            bgcolor: alpha(theme.palette.text.primary, 0.05),
            '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.1) }
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 22 }} />
        </IconButton>

        <OwnerAvatar
          owner={repo.owner}
          size={38}
          borderRadius="10px"
          border={`1px solid ${alpha(theme.palette.divider, 0.8)}`}
          boxShadow={`0 2px 8px ${alpha(theme.palette.common.black, 0.12)}`}
        />

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            noWrap
            sx={{
              fontSize: '1.05rem',
              fontWeight: 800,
              color: 'text.primary',
              lineHeight: 1.2,
              letterSpacing: '-0.01em'
            }}
          >
            {repo.name}
          </Typography>
          <Typography
            noWrap
            sx={{
              fontSize: '0.74rem',
              fontWeight: 600,
              color: theme.palette.primary.main,
              lineHeight: 1.2
            }}
          >
            by {repo.owner?.login || repo.full_name?.split('/')[0] || 'unknown'}
          </Typography>
        </Box>
      </Box>

      {/* ── 2. Material 3 Segmented Capsule Navigation ── */}
      <Box sx={{ px: { xs: 1.5, sm: 2 }, pt: 1.25, pb: 0.75 }}>
        <Box
          sx={{
            display: 'flex',
            p: 0.35,
            borderRadius: '16px',
            bgcolor: alpha(theme.palette.text.primary, 0.05),
            border: `1px solid ${theme.palette.divider}`,
            gap: 0.35
          }}
        >
          {[
            { id: 0, label: 'Info', icon: <InfoOutlinedIcon sx={{ fontSize: 15 }} /> },
            { id: 1, label: 'README', icon: <ArticleIcon sx={{ fontSize: 15 }} /> },
            { id: 2, label: `Releases (${releases.length})`, icon: <AppsIcon sx={{ fontSize: 15 }} /> }
          ].map((tab) => {
            const isActive = tabIndex === tab.id;
            return (
              <Button
                key={tab.id}
                onClick={() => setTabIndex(tab.id)}
                startIcon={tab.icon}
                sx={{
                  flex: 1,
                  height: 32,
                  borderRadius: '12px',
                  fontSize: '0.74rem',
                  fontWeight: isActive ? 800 : 600,
                  textTransform: 'none',
                  bgcolor: isActive ? theme.palette.primary.main : 'transparent',
                  color: isActive ? theme.palette.primary.contrastText : 'text.secondary',
                  boxShadow: isActive ? `0 2px 8px ${alpha(theme.palette.primary.main, 0.35)}` : 'none',
                  transition: 'all 0.18s ease',
                  minWidth: 0,
                  whiteSpace: 'nowrap',
                  '&:hover': {
                    bgcolor: isActive ? theme.palette.primary.dark : alpha(theme.palette.text.primary, 0.05)
                  }
                }}
              >
                {tab.label}
              </Button>
            );
          })}
        </Box>
      </Box>

      {/* Tab Contents */}
      <DialogContent sx={{ p: { xs: 1.5, sm: 2 }, pb: 'calc(110px + max(env(safe-area-inset-bottom, 0px), 16px))', overflowY: 'auto', flex: 1 }}>
        {/* Tab 0: Comprehensive Repository Info & Developer Insights */}
        {tabIndex === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 4, width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
            {/* 1. Header Overview & Highlights Card */}
            {repo.description && (
              <Box
                sx={{
                  p: 1.75,
                  borderRadius: '16px',
                  bgcolor: alpha(theme.palette.text.primary, 0.03),
                  border: `1px solid ${theme.palette.divider}`
                }}
              >
                <Typography sx={{ color: 'text.primary', fontSize: '0.875rem', lineHeight: 1.55, fontWeight: 500, mb: 1.25 }}>
                  {repo.description}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                  <Chip
                    size="small"
                    clickable
                    onClick={() => {
                      try { navigator.vibrate?.(10); } catch {}
                      onToggleStar && onToggleStar(repo);
                    }}
                    icon={<StarIcon sx={{ fontSize: '13px !important', color: '#e3b341' }} />}
                    label={`${formatCount(repo.stargazers_count + (isStarred ? 1 : 0))} stars`}
                    sx={{
                      height: 23,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      bgcolor: isStarred ? alpha('#e3b341', 0.18) : alpha(theme.palette.text.primary, 0.05),
                      border: `1px solid ${isStarred ? '#e3b341' : theme.palette.divider}`
                    }}
                  />
                  <Chip
                    size="small"
                    clickable
                    onClick={() => {
                      try { navigator.vibrate?.(10); } catch {}
                      onToggleBookmark && onToggleBookmark(repo);
                    }}
                    icon={isBookmarked ? <BookmarkIcon sx={{ fontSize: '13px !important', color: theme.palette.primary.main }} /> : <BookmarkBorderIcon sx={{ fontSize: '13px !important' }} />}
                    label={isBookmarked ? 'In Vault' : 'Add to Vault'}
                    sx={{
                      height: 23,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      bgcolor: isBookmarked ? alpha(theme.palette.primary.main, 0.18) : alpha(theme.palette.text.primary, 0.05),
                      color: isBookmarked ? theme.palette.primary.main : 'text.primary',
                      border: `1px solid ${isBookmarked ? theme.palette.primary.main : theme.palette.divider}`
                    }}
                  />
                  {repo.language && (
                    <Chip
                      size="small"
                      label={repo.language}
                      sx={{
                        height: 23,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                        color: theme.palette.primary.main,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.28)}`
                      }}
                    />
                  )}
                  {hasApk && (
                    <Chip
                      size="small"
                      icon={<AndroidIcon sx={{ fontSize: '12px !important' }} />}
                      label={apkAssets.length > 0 ? `${apkAssets.length} APK${apkAssets.length > 1 ? 's' : ''}` : 'APK Ready'}
                      sx={{
                        height: 23,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        bgcolor: alpha('#10b981', 0.12),
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}
                    />
                  )}
                  {repo.license && (
                    <Chip
                      size="small"
                      icon={<GavelIcon sx={{ fontSize: '12px !important' }} />}
                      label={repo.license.spdx_id || repo.license.name}
                      sx={{
                        height: 23,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        bgcolor: alpha(theme.palette.text.primary, 0.04),
                        border: `1px solid ${theme.palette.divider}`
                      }}
                    />
                  )}
                </Box>
              </Box>
            )}

            {/* 2. Key Metrics Grid (6 Metrics: Stars, Forks, Watchers, Issues, Language, License) */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25, width: '100%', boxSizing: 'border-box' }}>
              {/* Metric 1: Stars */}
              <Box
                onClick={() => {
                  try { navigator.vibrate?.(10); } catch {}
                  onToggleStar && onToggleStar(repo);
                }}
                sx={{
                  p: 1.5,
                  borderRadius: '16px',
                  bgcolor: isStarred ? alpha('#f59e0b', 0.12) : alpha(theme.palette.text.primary, 0.04),
                  border: `1px solid ${isStarred ? '#f59e0b' : theme.palette.divider}`,
                  minWidth: 0,
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  '&:active': { transform: 'scale(0.97)' }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#f59e0b', mb: 0.5 }}>
                  <StarIcon sx={{ fontSize: 18 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>Stars</Typography>
                </Box>
                <Typography variant="h6" noWrap sx={{ fontWeight: 800, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {(repo.stargazers_count + (isStarred ? 1 : 0)).toLocaleString()}
                </Typography>
              </Box>

              {/* Metric 2: Forks */}
              <Box sx={{ p: 1.5, borderRadius: '16px', bgcolor: alpha(theme.palette.text.primary, 0.04), border: `1px solid ${theme.palette.divider}`, minWidth: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: theme.palette.primary.main, mb: 0.5 }}>
                  <CallSplitIcon sx={{ fontSize: 18 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>Forks</Typography>
                </Box>
                <Typography variant="h6" noWrap sx={{ fontWeight: 800, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {repo.forks_count.toLocaleString()}
                </Typography>
              </Box>

              {/* Metric 3: Watchers / Subscribers */}
              <Box sx={{ p: 1.5, borderRadius: '16px', bgcolor: alpha(theme.palette.text.primary, 0.04), border: `1px solid ${theme.palette.divider}`, minWidth: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#0284c7', mb: 0.5 }}>
                  <VisibilityIcon sx={{ fontSize: 18 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>Watchers</Typography>
                </Box>
                <Typography variant="h6" noWrap sx={{ fontWeight: 800, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {(repo.watchers_count || repo.stargazers_count).toLocaleString()}
                </Typography>
              </Box>

              {/* Metric 4: Open Issues & PRs */}
              <Box sx={{ p: 1.5, borderRadius: '16px', bgcolor: alpha(theme.palette.text.primary, 0.04), border: `1px solid ${theme.palette.divider}`, minWidth: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#f97316', mb: 0.5 }}>
                  <BugReportIcon sx={{ fontSize: 18 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>Open Issues</Typography>
                </Box>
                <Typography variant="h6" noWrap sx={{ fontWeight: 800, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {(repo.open_issues_count ?? 0).toLocaleString()}
                </Typography>
              </Box>

              {/* Metric 5: Primary Language */}
              <Box sx={{ p: 1.5, borderRadius: '16px', bgcolor: alpha(theme.palette.text.primary, 0.04), border: `1px solid ${theme.palette.divider}`, minWidth: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#10b981', mb: 0.5 }}>
                  <CodeIcon sx={{ fontSize: 18 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>Language</Typography>
                </Box>
                <Typography variant="subtitle1" noWrap sx={{ fontWeight: 800, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {repo.language || 'Documentation'}
                </Typography>
              </Box>

              {/* Metric 6: License */}
              <Box sx={{ p: 1.5, borderRadius: '16px', bgcolor: alpha(theme.palette.text.primary, 0.04), border: `1px solid ${theme.palette.divider}`, minWidth: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: 'text.secondary', mb: 0.5 }}>
                  <GavelIcon sx={{ fontSize: 18 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>License</Typography>
                </Box>
                <Typography
                  variant="subtitle1"
                  noWrap
                  title={repo.license?.name || ''}
                  sx={{
                    fontWeight: 800,
                    lineHeight: 1.1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {repo.license?.spdx_id || repo.license?.name || 'Open Source'}
                </Typography>
              </Box>
            </Box>

            {/* 3. Android Package & Release Distribution Card (if APKs or releases exist) */}
            {apkAssets.length > 0 ? (
              <Box
                sx={{
                  p: 1.75,
                  borderRadius: '18px',
                  bgcolor: alpha('#10b981', 0.06),
                  border: '1px solid rgba(16, 185, 129, 0.28)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.25
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AndroidIcon sx={{ color: '#10b981', fontSize: 22 }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#10b981', lineHeight: 1.2 }}>
                        Android APK Available
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        {latestApk ? `${latestApk.name} • ${(latestApk.size / (1024 * 1024)).toFixed(1)} MB` : 'Direct Mobile Package'}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<DownloadIcon sx={{ fontSize: 15 }} />}
                    onClick={() => {
                      if (latestApk) downloadApkFile(latestApk.browser_download_url, latestApk.name, latestApk.size);
                      else setTabIndex(2);
                    }}
                    sx={{
                      height: 30,
                      borderRadius: '10px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      textTransform: 'none',
                      bgcolor: '#10b981',
                      color: '#ffffff',
                      '&:hover': { bgcolor: '#059669' }
                    }}
                  >
                    Download APK
                  </Button>
                </Box>
                {releases.length > 1 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pt: 0.5, borderTop: '1px dashed rgba(16, 185, 129, 0.2)' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, flex: 1, minWidth: 0 }}>
                      {releases.length} releases published • {totalDownloads.toLocaleString()} total downloads
                    </Typography>
                    <Typography
                      variant="caption"
                      onClick={() => setTabIndex(2)}
                      sx={{ color: theme.palette.primary.main, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', '&:hover': { textDecoration: 'underline' } }}
                    >
                      View all releases →
                    </Typography>
                  </Box>
                )}
              </Box>
            ) : releases.length > 0 ? (
              <Box
                sx={{
                  p: 1.75,
                  borderRadius: '18px',
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0, pr: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: theme.palette.primary.main, lineHeight: 1.25 }}>
                    {releases.length} Release{releases.length > 1 ? 's' : ''} Published
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontWeight: 600,
                      display: 'block',
                      mt: 0.25,
                      lineHeight: 1.35,
                      wordBreak: 'break-word'
                    }}
                  >
                    {totalDownloads.toLocaleString()} total downloads across release assets
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setTabIndex(2)}
                  sx={{
                    height: 28,
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'none',
                    flexShrink: 0,
                    whiteSpace: 'nowrap'
                  }}
                >
                  View Releases
                </Button>
              </Box>
            ) : null}

            {/* 4. Repository Specifications & Activity */}
            <Box sx={{ p: 1.75, borderRadius: '18px', bgcolor: alpha(theme.palette.text.primary, 0.03), border: `1px solid ${theme.palette.divider}`, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <StorageIcon sx={{ fontSize: 17, color: 'text.secondary' }} />
                Repository Specifications
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.6, borderBottom: `1px solid ${theme.palette.divider}` }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Default Branch</Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, fontFamily: 'monospace' }}>{repo.default_branch || 'main'}</Typography>
              </Box>
              {repo.created_at && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.6, borderBottom: `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Created</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800 }}>{formatDate(repo.created_at)}</Typography>
                </Box>
              )}
              {repo.pushed_at && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.6, borderBottom: `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Last Commit (Pushed)</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800 }}>
                    {formatDate(repo.pushed_at)} {formatTimeAgo(repo.pushed_at) ? `(${formatTimeAgo(repo.pushed_at)})` : ''}
                  </Typography>
                </Box>
              )}
              {repo.updated_at && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.6 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Last Updated</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800 }}>
                    {formatDate(repo.updated_at)} {formatTimeAgo(repo.updated_at) ? `(${formatTimeAgo(repo.updated_at)})` : ''}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* 5. Author & Publisher Card */}
            <Box
              sx={{
                p: 1.5,
                borderRadius: '18px',
                bgcolor: alpha(theme.palette.text.primary, 0.03),
                border: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, flex: 1 }}>
                <OwnerAvatar owner={repo.owner} size={36} borderRadius="10px" />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
                    Author / Organization
                  </Typography>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
                    {repo.owner?.login || repo.full_name?.split('/')[0] || 'unknown'}
                  </Typography>
                </Box>
              </Box>
              <Button
                size="small"
                variant="outlined"
                component="a"
                href={repo.owner?.html_url || `https://github.com/${repo.owner?.login || repo.full_name?.split('/')[0] || ''}`}
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
                sx={{
                  height: 28,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  textTransform: 'none',
                  flexShrink: 0
                }}
              >
                Profile
              </Button>
            </Box>

            {/* 6. Quick Git Clone Box */}
            <Box
              sx={{
                p: 1.5,
                borderRadius: '16px',
                bgcolor: theme.palette.mode === 'dark' ? '#161b22' : '#f1f5f9',
                border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                <TerminalIcon sx={{ fontSize: 18, color: theme.palette.primary.main, flexShrink: 0 }} />
                <Typography
                  noWrap
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.75rem',
                    color: 'text.primary',
                    fontWeight: 600
                  }}
                >
                  git clone {repo.clone_url}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={() => {
                  try { navigator.vibrate?.(10); } catch {}
                  onCopyClone(repo.clone_url);
                }}
                sx={{
                  color: isCopied ? '#10b981' : 'text.secondary',
                  bgcolor: isCopied ? alpha('#10b981', 0.12) : alpha(theme.palette.text.primary, 0.05),
                  borderRadius: '8px',
                  p: 0.6
                }}
              >
                {isCopied ? <CheckIcon sx={{ fontSize: 16 }} /> : <ContentCopyIcon sx={{ fontSize: 16 }} />}
              </IconButton>
            </Box>

            {/* 6.5 Personal Notes, Workflow Tags & Smart Reminders */}
            <Box
              sx={{
                p: 1.75,
                borderRadius: '18px',
                bgcolor: alpha(theme.palette.text.primary, 0.03),
                border: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.25
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <EditNoteIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Personal Notes & Tags
                  </Typography>
                </Box>
                {/* Revisit Reminder Trigger */}
                {annotation?.reminder ? (
                  <Chip
                    size="small"
                    icon={<AlarmOnIcon sx={{ fontSize: '14px !important' }} />}
                    label={`Revisit: ${annotation.reminder.label}`}
                    onDelete={() => {
                      triggerHaptic(8);
                      clearRepoReminder(repo.id);
                      setAnnotation(getRepoAnnotation(repo.id));
                      onShareMessage?.('Reminder cleared');
                    }}
                    color="primary"
                    sx={{ height: 24, fontSize: '0.68rem', fontWeight: 800 }}
                  />
                ) : (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AlarmIcon sx={{ fontSize: 14 }} />}
                    onClick={(e) => setReminderAnchor(e.currentTarget)}
                    sx={{
                      height: 24,
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      borderRadius: '8px',
                      textTransform: 'none',
                      py: 0
                    }}
                  >
                    Revisit Later
                  </Button>
                )}
              </Box>

              {/* Private Notes Display & Editor */}
              {isEditingNote ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <TextField
                    multiline
                    minRows={2}
                    maxRows={5}
                    size="small"
                    placeholder="Add private note (e.g. 'Use this auth library for the billing microservice')..."
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    sx={{
                      fontSize: '0.8rem',
                      '& .MuiInputBase-input': { fontSize: '0.8rem', lineHeight: 1.5 },
                      '& fieldset': { borderRadius: '12px' }
                    }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Button
                      size="small"
                      onClick={() => setIsEditingNote(false)}
                      sx={{ textTransform: 'none', fontSize: '0.72rem', fontWeight: 600 }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => {
                        triggerHaptic(8);
                        saveRepoNote(repo.id, repo.full_name, noteDraft);
                        setAnnotation(getRepoAnnotation(repo.id));
                        setIsEditingNote(false);
                        onShareMessage?.('Note saved to Vault');
                      }}
                      sx={{ textTransform: 'none', fontSize: '0.72rem', fontWeight: 800, borderRadius: '8px' }}
                    >
                      Save Note
                    </Button>
                  </Box>
                </Box>
              ) : annotation?.notes ? (
                <Box
                  onClick={() => {
                    setNoteDraft(annotation.notes || '');
                    setIsEditingNote(true);
                  }}
                  sx={{
                    p: 1.25,
                    borderRadius: '12px',
                    bgcolor: alpha(theme.palette.primary.main, 0.06),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'text.primary', lineHeight: 1.5 }}>
                    "{annotation.notes}"
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'primary.main', fontSize: '0.68rem', fontWeight: 700, mt: 0.5, display: 'block' }}>
                    Tap to edit private note
                  </Typography>
                </Box>
              ) : (
                <Button
                  size="small"
                  variant="text"
                  startIcon={<EditNoteIcon sx={{ fontSize: 16 }} />}
                  onClick={() => {
                    setNoteDraft('');
                    setIsEditingNote(true);
                  }}
                  sx={{
                    justifyContent: 'flex-start',
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    p: 0,
                    fontWeight: 600
                  }}
                >
                  + Add private note (use cases, ideas, implementation notes)...
                </Button>
              )}

              {/* Custom Workflow Tags */}
              <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.6, pt: 0.5 }}>
                <LabelIcon sx={{ fontSize: 14, color: 'text.secondary', mr: 0.25 }} />
                {(annotation?.tags || []).map((tag) => (
                  <Chip
                    key={tag}
                    label={`#${tag}`}
                    size="small"
                    onDelete={() => {
                      triggerHaptic(8);
                      removeRepoTag(repo.id, tag);
                      setAnnotation(getRepoAnnotation(repo.id));
                    }}
                    sx={{
                      height: 22,
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      borderRadius: '8px',
                      bgcolor: alpha(theme.palette.secondary.main, 0.12),
                      color: theme.palette.secondary.main,
                      border: `1px solid ${alpha(theme.palette.secondary.main, 0.25)}`
                    }}
                  />
                ))}

                {isAddingTag ? (
                  <Box component="form" onSubmit={(e) => {
                    e.preventDefault();
                    if (tagDraft.trim()) {
                      triggerHaptic(8);
                      addRepoTag(repo.id, repo.full_name, tagDraft);
                      setAnnotation(getRepoAnnotation(repo.id));
                      setTagDraft('');
                      setIsAddingTag(false);
                    }
                  }} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    <TextField
                      autoFocus
                      size="small"
                      placeholder="e.g. billing"
                      value={tagDraft}
                      onChange={(e) => setTagDraft(e.target.value)}
                      onBlur={() => {
                        if (tagDraft.trim()) {
                          addRepoTag(repo.id, repo.full_name, tagDraft);
                          setAnnotation(getRepoAnnotation(repo.id));
                        }
                        setTagDraft('');
                        setIsAddingTag(false);
                      }}
                      sx={{
                        width: 90,
                        '& input': { py: 0.3, px: 0.8, fontSize: '0.68rem', fontWeight: 700 }
                      }}
                    />
                  </Box>
                ) : (
                  <Chip
                    size="small"
                    icon={<AddIcon sx={{ fontSize: '13px !important' }} />}
                    label="Tag"
                    onClick={() => setIsAddingTag(true)}
                    sx={{
                      height: 22,
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      bgcolor: alpha(theme.palette.text.primary, 0.05),
                      border: `1px solid ${theme.palette.divider}`
                    }}
                  />
                )}
              </Box>

              {/* Revisit Reminder Menu */}
              <Menu
                anchorEl={reminderAnchor}
                open={Boolean(reminderAnchor)}
                onClose={() => setReminderAnchor(null)}
                PaperProps={{
                  sx: {
                    borderRadius: '16px',
                    bgcolor: 'var(--bg-menu)',
                    backgroundImage: 'none',
                    border: `1px solid ${theme.palette.divider}`,
                    p: 0.5
                  }
                }}
              >
                <MenuItem
                  onClick={() => {
                    const sat = new Date();
                    sat.setDate(sat.getDate() + ((6 - sat.getDay() + 7) % 7 || 7));
                    sat.setHours(10, 0, 0, 0);
                    setRepoReminder(repo.id, repo.full_name, sat.toISOString(), 'This Weekend');
                    setAnnotation(getRepoAnnotation(repo.id));
                    setReminderAnchor(null);
                    triggerHaptic(10);
                    onShareMessage?.('Reminder set for Saturday morning');
                  }}
                  sx={{ fontSize: '0.78rem', fontWeight: 700, py: 1 }}
                >
                  This Weekend (Saturday 10:00 AM)
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    const tmrw = new Date();
                    tmrw.setDate(tmrw.getDate() + 1);
                    tmrw.setHours(9, 0, 0, 0);
                    setRepoReminder(repo.id, repo.full_name, tmrw.toISOString(), 'Tomorrow');
                    setAnnotation(getRepoAnnotation(repo.id));
                    setReminderAnchor(null);
                    triggerHaptic(10);
                    onShareMessage?.('Reminder set for tomorrow morning');
                  }}
                  sx={{ fontSize: '0.78rem', fontWeight: 700, py: 1 }}
                >
                  Tomorrow Morning (09:00 AM)
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    const nextWeek = new Date();
                    nextWeek.setDate(nextWeek.getDate() + ((1 + 7 - nextWeek.getDay()) % 7 || 7));
                    nextWeek.setHours(10, 0, 0, 0);
                    setRepoReminder(repo.id, repo.full_name, nextWeek.toISOString(), 'Next Week');
                    setAnnotation(getRepoAnnotation(repo.id));
                    setReminderAnchor(null);
                    triggerHaptic(10);
                    onShareMessage?.('Reminder set for next Monday');
                  }}
                  sx={{ fontSize: '0.78rem', fontWeight: 700, py: 1 }}
                >
                  Next Week (Monday 10:00 AM)
                </MenuItem>
              </Menu>
            </Box>

            {/* 7. Topics & Keywords */}
            {repo.topics && repo.topics.length > 0 && (
              <Box sx={{ p: 1.75, borderRadius: '18px', bgcolor: alpha(theme.palette.text.primary, 0.03), border: `1px solid ${theme.palette.divider}` }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                  Topics & Keywords ({repo.topics.length})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {repo.topics.map((t) => (
                    <Chip
                      key={t}
                      label={`#${t}`}
                      size="small"
                      sx={{
                        borderRadius: '12px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Generous bottom clearance spacer so all content scrolls cleanly above floating bar */}
            <Box sx={{ height: 'calc(90px + max(env(safe-area-inset-bottom, 0px), 16px))', width: '100%', flexShrink: 0 }} />
          </Box>
        )}

        {/* Tab 1: README Markdown (Clean view without duplicate description card) */}
        {tabIndex === 1 && (
          <Box>
            {loadingReadme ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={32} color="primary" />
              </Box>
            ) : (
              <Box
                onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                  const target = e.target as HTMLElement;
                  if (target && target.tagName === 'IMG') {
                    const imgEl = target as HTMLImageElement;
                    const src = imgEl.currentSrc || imgEl.src;
                    const alt = imgEl.alt || `${repo.name} Preview`;
                    if (src && !src.includes('badge') && !src.includes('shields.io') && !src.includes('travis-ci')) {
                      e.preventDefault();
                      triggerHaptic(8);
                      setViewerImage({ url: src, title: alt });
                      return;
                    }
                  }
                  handleReadmeLinkClick(e);
                }}
                onErrorCapture={(e: React.SyntheticEvent<HTMLDivElement>) => {
                  const target = e.target as HTMLElement | null;
                  if (!target || target.tagName !== 'IMG') return;
                  const img = target as HTMLImageElement;
                  const attempt = Number(img.dataset.retryAttempt || '0');
                  const currentSrc = img.getAttribute('src') || '';

                  // Fallback across HEAD / main / master for raw.githubusercontent.com before hiding broken images
                  const rawMatch = currentSrc.match(
                    /^https:\/\/raw\.githubusercontent\.com\/([^/]+\/[^/]+)\/([^/]+)\/(.+)$/i
                  );
                  if (rawMatch && attempt === 0) {
                    const altBranch = rawMatch[2] === 'HEAD' ? 'main' : rawMatch[2] === 'main' ? 'master' : 'HEAD';
                    img.dataset.retryAttempt = '1';
                    img.src = `https://raw.githubusercontent.com/${rawMatch[1]}/${altBranch}/${rawMatch[3]}`;
                    return;
                  }

                  // Hide genuinely broken/unreachable images cleanly instead of rendering broken alt placeholders
                  img.style.display = 'none';
                  const parentPic = img.closest('picture');
                  if (parentPic) (parentPic as HTMLElement).style.display = 'none';
                }}
                dangerouslySetInnerHTML={{ __html: isTranslated ? (translatedHtml || originalHtml) : originalHtml }}
                sx={{
                  color: 'text.primary',
                  lineHeight: 1.68,
                  fontSize: '0.88rem',
                  fontFamily: '"Google Sans", "Roboto", -apple-system, sans-serif',
                  '& h1, & h2, & h3, & h4': {
                    color: 'text.primary',
                    fontWeight: 800,
                    fontFamily: '"Google Sans", sans-serif',
                    mt: 2.5,
                    mb: 1.2,
                    lineHeight: 1.3
                  },
                  '& h1': { fontSize: '1.35rem', borderBottom: `1.5px solid ${theme.palette.divider}`, pb: 0.75 },
                  '& h2': { fontSize: '1.18rem', borderBottom: `1px solid ${theme.palette.divider}`, pb: 0.5 },
                  '& h3': { fontSize: '1.05rem' },
                  '& p': { mb: 1.6, color: 'text.secondary', lineHeight: 1.68 },
                  '& a': { color: theme.palette.primary.main, fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } },
                  '& ul, & ol': { pl: 3, mb: 1.6, color: 'text.secondary' },
                  '& li': { mb: 0.6 },
                  '& pre': {
                    bgcolor: theme.palette.mode === 'dark' ? '#161b22' : '#f1f5f9',
                    p: 1.75,
                    borderRadius: '14px',
                    overflowX: 'auto',
                    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                    boxShadow: theme.palette.mode === 'dark' ? '0 4px 16px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.03)',
                    fontSize: '0.82rem',
                    fontFamily: '"JetBrains Mono", "Roboto Mono", Consolas, monospace',
                    lineHeight: 1.5,
                    my: 1.5
                  },
                  '& code': {
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(37, 99, 235, 0.08)',
                    color: theme.palette.mode === 'dark' ? '#38bdf8' : theme.palette.primary.main,
                    px: 0.6,
                    py: 0.25,
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontFamily: '"JetBrains Mono", "Roboto Mono", Consolas, monospace',
                    fontWeight: 600
                  },
                  '& img': {
                    maxWidth: '100%',
                    height: 'auto',
                    borderRadius: '14px',
                    my: 1.5,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                    cursor: 'zoom-in',
                    transition: 'transform 0.15s ease',
                    '&:active': { transform: 'scale(0.97)' }
                  },
                  '& blockquote': {
                    borderLeft: `4px solid ${theme.palette.primary.main}`,
                    bgcolor: alpha(theme.palette.primary.main, 0.06),
                    borderRadius: '0 12px 12px 0',
                    pl: 2,
                    py: 0.75,
                    pr: 1.5,
                    color: 'text.secondary',
                    my: 1.75
                  },
                  '& .ogv-table-wrapper': {
                    width: '100%',
                    maxWidth: '100%',
                    overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    my: 2,
                    borderRadius: '12px',
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                  },
                  '& table': {
                    width: '100%',
                    minWidth: 420,
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    '& th, & td': {
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      borderRight: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
                      p: 1.25,
                      fontSize: '0.80rem',
                      wordBreak: 'break-word',
                      '&:last-child': { borderRight: 'none' },
                    },
                    '& th': {
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      color: theme.palette.primary.main,
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                    },
                    '& tr:last-child td': {
                      borderBottom: 'none',
                    },
                    '& tr:nth-of-type(even)': {
                      bgcolor: alpha(theme.palette.action.hover, 0.03),
                    },
                  }
                }}
              />
            )}

            {/* Generous bottom clearance spacer so all content scrolls cleanly above floating bar */}
            <Box sx={{ height: 'calc(90px + max(env(safe-area-inset-bottom, 0px), 16px))', width: '100%', flexShrink: 0 }} />
          </Box>
        )}

        {/* Tab 2: Releases & Android Installers */}
        {tabIndex === 2 && (
          <Box>
            {loadingReleases ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={32} color="primary" />
              </Box>
            ) : releases.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 5, px: 2, color: 'text.secondary', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  No release assets found on GitHub.
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', maxWidth: 340, lineHeight: 1.4 }}>
                  If this repository has releases, GitHub API rate limit (60 req/hr unauthenticated) may have been reached. Add a free GitHub PAT token for 5,000 req/hr.
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RefreshIcon sx={{ fontSize: 15 }} />}
                  onClick={() => {
                    setLoadingReleases(true);
                    fetchReleases(repo.full_name).then((assets) => {
                      setReleases(assets);
                      setLoadingReleases(false);
                    });
                  }}
                  sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, fontSize: '0.74rem' }}
                >
                  Retry Loading Releases
                </Button>
              </Box>
            ) : (
              <List disablePadding>
                {releases.map((asset) => {
                  const lowerName = asset.name.toLowerCase();
                  const isAndroid = Boolean(
                    asset.is_apk ||
                    lowerName.endsWith('.apk') ||
                    lowerName.endsWith('.xapk') ||
                    lowerName.endsWith('.aab')
                  );
                  const sizeMb = (asset.size / (1024 * 1024)).toFixed(1);
                  const abiLabel = isAndroid ? detectApkAbiBadge(asset.name) : null;
                  return (
                    <ListItem
                      key={asset.id}
                      onClick={() => {
                        triggerHaptic(8);
                        setSelectedReleaseAsset(asset);
                      }}
                      sx={{
                        px: 1.5,
                        py: 1.25,
                        mb: 1,
                        borderRadius: '14px',
                        bgcolor: alpha(theme.palette.background.default, 0.5),
                        border: `1px solid ${theme.palette.divider}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        WebkitTapHighlightColor: 'transparent',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.06),
                          borderColor: theme.palette.primary.main,
                        },
                        '&:active': {
                          transform: 'scale(0.99)',
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
                        <ListItemIcon sx={{ minWidth: 32, color: isAndroid ? '#10b981' : 'text.disabled' }}>
                          {isAndroid ? <AndroidIcon fontSize="small" /> : <ArticleIcon fontSize="small" />}
                        </ListItemIcon>
                        <ListItemText
                          primary={asset.name}
                          secondary={
                            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                              <span>{sizeMb} MB • {asset.download_count.toLocaleString()} downloads</span>
                              {abiLabel && (
                                <Chip
                                  label={abiLabel}
                                  size="small"
                                  sx={{
                                    height: 17,
                                    fontSize: '0.62rem',
                                    fontWeight: 800,
                                    borderRadius: '6px',
                                    bgcolor: alpha(theme.palette.primary.main, 0.14),
                                    color: theme.palette.primary.main,
                                  }}
                                />
                              )}
                            </Box>
                          }
                          primaryTypographyProps={{
                            fontSize: '0.825rem',
                            fontWeight: isAndroid ? 800 : 600,
                            noWrap: true,
                            color: isAndroid ? 'text.primary' : 'text.secondary'
                          }}
                          secondaryTypographyProps={{ fontSize: '0.72rem', component: 'div' }}
                        />
                      </Box>
                      {isAndroid ? (
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic(8);
                            downloadApkFile(asset.browser_download_url, asset.name, asset.size);
                          }}
                          sx={{
                            height: 28,
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            borderRadius: '8px',
                            textTransform: 'none',
                            ml: 1,
                            flexShrink: 0
                          }}
                        >
                          Download APK
                        </Button>
                      ) : (
                        <Tooltip title="Tap to inspect release notes and asset package details">
                          <span>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerHaptic(8);
                                setSelectedReleaseAsset(asset);
                              }}
                              startIcon={<InfoOutlinedIcon sx={{ fontSize: 14 }} />}
                              sx={{
                                height: 28,
                                fontSize: '0.725rem',
                                fontWeight: 700,
                                borderRadius: '8px',
                                textTransform: 'none',
                                ml: 1,
                                flexShrink: 0,
                                borderColor: alpha(theme.palette.divider, 0.8),
                                color: 'text.secondary'
                              }}
                            >
                              Inspect
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                    </ListItem>
                  );
                })}
              </List>
            )}

            {/* Generous bottom clearance spacer so all content scrolls cleanly above floating bar */}
            <Box sx={{ height: 'calc(90px + max(env(safe-area-inset-bottom, 0px), 16px))', width: '100%', flexShrink: 0 }} />
          </Box>
        )}
      </DialogContent>

      {/* ── Floating Liquid Glass Action Island (Star, Translate, APK, GitHub, Share) ── */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 4px) + 6px)',
          left: '50%',
          transform: 'translateX(-50%) translateZ(0)',
          width: 'calc(100% - 32px)',
          maxWidth: 420,
          height: 58,
          borderRadius: '29px',
          bgcolor: 'var(--bg-pill)',
          backdropFilter: 'var(--glass-backdrop, blur(10px) saturate(135%))',
          WebkitBackdropFilter: 'var(--glass-backdrop, blur(10px) saturate(135%))',
          border: theme.palette.mode === 'dark'
            ? `1px solid ${alpha(theme.palette.common.white, 0.14)}`
            : `1px solid ${alpha(theme.palette.common.white, 0.85)}`,
          boxShadow: theme.palette.mode === 'dark'
            ? `0 18px 48px rgba(0, 0, 0, 0.65), 0 2px 8px ${alpha(theme.palette.primary.main, 0.15)}, inset 0 1px 1px rgba(255, 255, 255, 0.16)`
            : `0 14px 38px rgba(0, 0, 0, 0.08), 0 2px 10px ${alpha(theme.palette.primary.main, 0.12)}, inset 0 1px 1px rgba(255, 255, 255, 0.9)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          px: 1,
          zIndex: 1200,
          userSelect: 'none',
          touchAction: 'manipulation'
        }}
      >
        {/* Action 1: Star */}
        <Tooltip title={isStarred ? "Starred on GitHub" : "Star on GitHub"}>
          <Box
            onClick={() => {
              try { navigator.vibrate?.(10); } catch {}
              onToggleStar && onToggleStar(repo);
            }}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              py: 0.4,
              px: { xs: 1, sm: 1.3 },
              borderRadius: '16px',
              bgcolor: isStarred
                ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.14)
                : 'transparent',
              border: isStarred
                ? `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.42 : 0.28)}`
                : '1px solid transparent',
              boxShadow: isStarred
                ? `0 2px 10px ${alpha(theme.palette.primary.main, 0.22)}, inset 0 1px 1px ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.7)'}`
                : 'none',
              transition: 'all 0.18s cubic-bezier(0.34, 1.25, 0.64, 1)',
              WebkitTapHighlightColor: 'transparent',
              '&:active': { transform: 'scale(0.92)' }
            }}
          >
            <StarIcon sx={{ fontSize: 20, color: isStarred ? '#e3b341' : 'text.secondary' }} />
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.67rem',
                fontWeight: isStarred ? 800 : 600,
                mt: '1px',
                color: isStarred ? '#e3b341' : 'text.secondary',
                fontFamily: '"Google Sans", "Nunito", sans-serif'
              }}
            >
              {isStarred ? 'Starred' : 'Star'}
            </Typography>
          </Box>
        </Tooltip>

        {/* Action 2: Translate */}
        {rawReadme && (
          <Tooltip title={isTranslated ? "Show original README" : "Translate README to English"}>
            <Box
              onClick={() => {
                try { navigator.vibrate?.(10); } catch {}
                handleToggleTranslate();
              }}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                py: 0.4,
                px: { xs: 1, sm: 1.3 },
                borderRadius: '16px',
                bgcolor: isTranslated
                  ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.14)
                  : 'transparent',
                border: isTranslated
                  ? `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.42 : 0.28)}`
                  : '1px solid transparent',
                boxShadow: isTranslated
                  ? `0 2px 10px ${alpha(theme.palette.primary.main, 0.22)}, inset 0 1px 1px ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.7)'}`
                  : 'none',
                transition: 'all 0.18s cubic-bezier(0.34, 1.25, 0.64, 1)',
                WebkitTapHighlightColor: 'transparent',
                '&:active': { transform: 'scale(0.92)' }
              }}
            >
              {isTranslating ? (
                <CircularProgress size={18} color="primary" />
              ) : (
                <TranslateIcon sx={{ fontSize: 20, color: isTranslated ? theme.palette.primary.main : 'text.secondary' }} />
              )}
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.67rem',
                  fontWeight: isTranslated ? 800 : 600,
                  mt: '1px',
                  color: isTranslated ? theme.palette.primary.main : 'text.secondary',
                  fontFamily: '"Google Sans", "Nunito", sans-serif'
                }}
              >
                {isTranslated ? 'Original' : 'Translate'}
              </Typography>
            </Box>
          </Tooltip>
        )}

        {/* Action 3: Download APK (if repository has release APKs) */}
        {apkAssets.length > 0 && (
          <Tooltip title={`Download APK (${(apkAssets[0].size / (1024 * 1024)).toFixed(1)}M)`}>
            <Box
              onClick={() => {
                try { navigator.vibrate?.(10); } catch {}
                downloadApkFile(apkAssets[0].browser_download_url, apkAssets[0].name, apkAssets[0].size);
              }}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                py: 0.4,
                px: { xs: 1, sm: 1.3 },
                borderRadius: '16px',
                transition: 'all 0.18s cubic-bezier(0.34, 1.25, 0.64, 1)',
                WebkitTapHighlightColor: 'transparent',
                '&:active': { transform: 'scale(0.92)' }
              }}
            >
              <AndroidIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.67rem',
                  fontWeight: 600,
                  mt: '1px',
                  color: 'text.secondary',
                  fontFamily: '"Google Sans", "Nunito", sans-serif'
                }}
              >
                APK
              </Typography>
            </Box>
          </Tooltip>
        )}

        {/* Action 5: View in GitHub */}
        <Tooltip title="Open on GitHub">
          <Box
            component="a"
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              cursor: 'pointer',
              py: 0.4,
              px: { xs: 1, sm: 1.3 },
              borderRadius: '16px',
              transition: 'all 0.18s cubic-bezier(0.34, 1.25, 0.64, 1)',
              WebkitTapHighlightColor: 'transparent',
              '&:active': { transform: 'scale(0.92)' }
            }}
          >
            <OpenInNewIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.67rem',
                fontWeight: 600,
                mt: '1px',
                color: 'text.secondary',
                fontFamily: '"Google Sans", "Nunito", sans-serif'
              }}
            >
              GitHub
            </Typography>
          </Box>
        </Tooltip>

        {/* Action 6: Share */}
        <Tooltip title="Share repository">
          <Box
            onClick={(e) => {
              triggerHaptic(8);
              setShareMenuAnchor(e.currentTarget);
            }}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              py: 0.4,
              px: { xs: 1, sm: 1.3 },
              borderRadius: '16px',
              transition: 'all 0.18s cubic-bezier(0.34, 1.25, 0.64, 1)',
              WebkitTapHighlightColor: 'transparent',
              '&:active': { transform: 'scale(0.92)' }
            }}
          >
            <ShareIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.67rem',
                fontWeight: 600,
                mt: '1px',
                color: 'text.secondary',
                fontFamily: '"Google Sans", "Nunito", sans-serif'
              }}
            >
              Share
            </Typography>
          </Box>
        </Tooltip>
      </Box>

      {/* Share Options Menu */}
      <Menu
        anchorEl={shareMenuAnchor}
        open={Boolean(shareMenuAnchor)}
        onClose={() => setShareMenuAnchor(null)}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            bgcolor: 'var(--bg-menu)',
            backgroundImage: 'none',
            border: `1px solid ${theme.palette.divider}`,
            p: 0.5
          }
        }}
      >
        <MenuItem
          onClick={() => {
            setShareMenuAnchor(null);
            triggerHaptic(10);
            const cardSummary = createSyntheticSummary(repo);
            shareVisualCard(repo, cardSummary, onShareMessage);
          }}
          sx={{ fontSize: '0.78rem', fontWeight: 700, py: 1, gap: 1 }}
        >
          <StyleIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
          Share as Visual Card (Image)
        </MenuItem>
        <MenuItem
          onClick={() => {
            setShareMenuAnchor(null);
            triggerHaptic(8);
            handleShareRepo();
          }}
          sx={{ fontSize: '0.78rem', fontWeight: 700, py: 1, gap: 1 }}
        >
          <ShareIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          Share Repository Link
        </MenuItem>
        <MenuItem
          onClick={() => {
            setShareMenuAnchor(null);
            triggerHaptic(8);
            onCopyClone(repo.clone_url);
          }}
          sx={{ fontSize: '0.78rem', fontWeight: 700, py: 1, gap: 1 }}
        >
          <ContentCopyIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          Copy Git Clone Command
        </MenuItem>
      </Menu>

      {/* Zoomable Image Viewer Modal for README Media */}
      <ImageViewerModal
        open={Boolean(viewerImage)}
        imageUrl={viewerImage?.url || null}
        title={viewerImage?.title || `${repo.name} Preview`}
        onClose={() => setViewerImage(null)}
      />

      {/* Release Asset / Tag Info Modal */}
      <Dialog
        open={Boolean(selectedReleaseAsset)}
        onClose={() => setSelectedReleaseAsset(null)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: '24px',
            bgcolor: 'var(--bg-menu)',
            backgroundImage: 'none',
            border: `1px solid ${theme.palette.divider}`,
            p: 0.5,
            overflow: 'hidden'
          }
        }}
      >
        {selectedReleaseAsset && (
          <>
            <DialogTitle sx={{ pb: 1, pt: 2, px: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                  {selectedReleaseAsset.release_tag && (
                    <Chip
                      label={selectedReleaseAsset.release_tag}
                      size="small"
                      color="primary"
                      sx={{ fontWeight: 800, fontSize: '0.72rem', height: 22 }}
                    />
                  )}
                  {selectedReleaseAsset.is_apk && (
                    <Chip
                      label="Android APK"
                      size="small"
                      sx={{
                        fontWeight: 800,
                        fontSize: '0.68rem',
                        height: 20,
                        bgcolor: alpha('#10b981', 0.15),
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}
                    />
                  )}
                  {selectedReleaseAsset.published_at && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      {formatDate(selectedReleaseAsset.published_at)} ({formatTimeAgo(selectedReleaseAsset.published_at)})
                    </Typography>
                  )}
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
                  {selectedReleaseAsset.release_name || selectedReleaseAsset.release_tag || selectedReleaseAsset.name}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={() => setSelectedReleaseAsset(null)}
                sx={{ borderRadius: '50%', color: 'text.secondary' }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ px: 2, py: 1.5, maxHeight: '60vh', overflowY: 'auto' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.25,
                  mb: 2,
                  borderRadius: '12px',
                  bgcolor: alpha(theme.palette.text.primary, 0.04),
                  border: `1px solid ${theme.palette.divider}`
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
                    Asset Package
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                    {selectedReleaseAsset.name}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right', pl: 1.5, flexShrink: 0 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
                    Size & Downloads
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    {(selectedReleaseAsset.size / (1024 * 1024)).toFixed(1)} MB • {selectedReleaseAsset.download_count.toLocaleString()}
                  </Typography>
                </Box>
              </Box>

              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75, display: 'block' }}>
                Release Notes & Changelog
              </Typography>

              {selectedReleaseAsset.release_body ? (
                <Box
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdownToSafeHtml(selectedReleaseAsset.release_body)
                  }}
                  sx={{
                    fontSize: '0.84rem',
                    lineHeight: 1.6,
                    color: 'text.primary',
                    '& p': { my: 0.75 },
                    '& ul, & ol': { pl: 2.5, my: 0.75 },
                    '& li': { my: 0.25 },
                    '& code': {
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      px: 0.6,
                      py: 0.2,
                      borderRadius: '4px',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.78rem'
                    },
                    '& pre': {
                      bgcolor: alpha(theme.palette.background.default, 0.8),
                      p: 1.25,
                      borderRadius: '8px',
                      overflowX: 'auto',
                      border: `1px solid ${theme.palette.divider}`
                    }
                  }}
                />
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', py: 2 }}>
                  No release notes or changelog provided for this release tag.
                </Typography>
              )}
            </DialogContent>

            <DialogActions sx={{ px: 2, py: 1.5, gap: 1 }}>
              {selectedReleaseAsset.release_url && (
                <Button
                  size="small"
                  variant="outlined"
                  component="a"
                  href={selectedReleaseAsset.release_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
                  sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, fontSize: '0.74rem' }}
                >
                  GitHub Release
                </Button>
              )}
              <Box sx={{ flex: 1 }} />
              {selectedReleaseAsset.is_apk ? (
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  startIcon={<DownloadIcon sx={{ fontSize: 15 }} />}
                  onClick={() => {
                    downloadApkFile(
                      selectedReleaseAsset.browser_download_url,
                      selectedReleaseAsset.name,
                      selectedReleaseAsset.size
                    );
                  }}
                  sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 800, fontSize: '0.76rem' }}
                >
                  Download APK
                </Button>
              ) : (
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  startIcon={<DownloadIcon sx={{ fontSize: 15 }} />}
                  component="a"
                  href={selectedReleaseAsset.browser_download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 800, fontSize: '0.76rem' }}
                >
                  Download Asset
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Dialog>
  );
};
