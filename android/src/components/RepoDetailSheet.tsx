import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Avatar,
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
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Repository, ReleaseAsset } from '../types';
import { fetchReadme, fetchReleases } from '../services/githubApi';
import { shareProject } from '../services/shareHelper';
import { translateMarkdownToEnglish } from '../services/translateService';
import { downloadApkFile } from '../services/downloadHelper';

interface RepoDetailSheetProps {
  repo: Repository | null;
  open: boolean;
  onClose: () => void;
  onCopyClone: (cloneUrl: string) => void;
  copiedId: number | null;
  isStarred?: boolean;
  onToggleStar?: (repo: Repository) => void;
  onShareMessage?: (msg: string) => void;
}

export const RepoDetailSheet: React.FC<RepoDetailSheetProps> = ({
  repo,
  open,
  onClose,
  onCopyClone,
  copiedId,
  isStarred = false,
  onToggleStar,
  onShareMessage
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [tabIndex, setTabIndex] = useState<number>(0);
  const [rawReadme, setRawReadme] = useState<string>('');
  const [originalHtml, setOriginalHtml] = useState<string>('');
  const [translatedHtml, setTranslatedHtml] = useState<string>('');
  const [isTranslated, setIsTranslated] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [releases, setReleases] = useState<ReleaseAsset[]>([]);
  const [loadingReadme, setLoadingReadme] = useState<boolean>(false);
  const [loadingReleases, setLoadingReleases] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    if (repo && open) {
      setTabIndex(0);
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

      fetchReadme(repo.full_name).then((raw) => {
        if (!isMounted) return;
        setRawReadme(raw);
        try {
          const parsed = marked.parse(raw);
          const sanitized = DOMPurify.sanitize(typeof parsed === 'string' ? parsed : '', {
            ADD_ATTR: ['id', 'name', 'target', 'rel']
          });
          setOriginalHtml(sanitized);
        } catch {
          setOriginalHtml('<p>Error rendering README.</p>');
        }
        setLoadingReadme(false);
      });

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

    if (!rawReadme) return;
    setIsTranslating(true);
    try {
      const translatedMd = await translateMarkdownToEnglish(rawReadme);
      const parsed = marked.parse(translatedMd);
      const sanitized = DOMPurify.sanitize(typeof parsed === 'string' ? parsed : '', {
        ADD_ATTR: ['id', 'name', 'target', 'rel']
      });
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
      const rawId = decodeURIComponent(href.slice(1)).toLowerCase().trim();
      if (!rawId) return;

      let el: Element | null = document.getElementById(rawId) ||
                               document.getElementById(`user-content-${rawId}`) ||
                               document.querySelector(`[name="${rawId}"]`) ||
                               document.querySelector(`[name="user-content-${rawId}"]`);

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
      const cleanPath = href.replace(/^\.?\//, '');
      const fullUrl = `https://github.com/${repo.full_name}/blob/main/${cleanPath}`;
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // 3. Absolute HTTP / HTTPS URLs
    if (href.startsWith('http://') || href.startsWith('https://')) {
      e.preventDefault();
      window.open(href, '_blank', 'noopener,noreferrer');
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
    const result = await shareProject(
      repo.name,
      `${repo.name} — ${repo.description || 'Open-source repository'}`,
      repo.html_url
    );
    if (result === 'copied' && onShareMessage) {
      onShareMessage(`Copied ${repo.name} URL`);
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
          bgcolor: alpha(theme.palette.background.paper, 0.88),
          backdropFilter: 'blur(30px) saturate(200%)',
          WebkitBackdropFilter: 'blur(30px) saturate(200%)',
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

        <Avatar
          src={repo.owner.avatar_url}
          alt={repo.owner.login}
          variant="rounded"
          sx={{
            width: 38,
            height: 38,
            borderRadius: '12px',
            bgcolor: 'background.default',
            boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.12)}`,
            border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
            flexShrink: 0
          }}
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
            by {repo.owner.login}
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
                    icon={<StarIcon sx={{ fontSize: '13px !important', color: '#e3b341' }} />}
                    label={`${formatCount(repo.stargazers_count + (isStarred ? 1 : 0))} stars`}
                    sx={{
                      height: 23,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      bgcolor: alpha(theme.palette.text.primary, 0.05),
                      border: `1px solid ${theme.palette.divider}`
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
              <Box sx={{ p: 1.5, borderRadius: '16px', bgcolor: alpha(theme.palette.text.primary, 0.04), border: `1px solid ${theme.palette.divider}`, minWidth: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
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
                      if (latestApk) downloadApkFile(latestApk.browser_download_url, latestApk.name);
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
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 0.5, borderTop: '1px dashed rgba(16, 185, 129, 0.2)' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      {releases.length} releases published • {totalDownloads.toLocaleString()} total downloads
                    </Typography>
                    <Typography
                      variant="caption"
                      onClick={() => setTabIndex(2)}
                      sx={{ color: theme.palette.primary.main, fontWeight: 700, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
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
                  justifyContent: 'space-between'
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>
                    {releases.length} Release{releases.length > 1 ? 's' : ''} Published
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
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
                    textTransform: 'none'
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
                <Avatar
                  src={repo.owner.avatar_url}
                  alt={repo.owner.login}
                  sx={{ width: 36, height: 36, borderRadius: '10px' }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
                    Author / Organization
                  </Typography>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
                    {repo.owner.login}
                  </Typography>
                </Box>
              </Box>
              <Button
                size="small"
                variant="outlined"
                component="a"
                href={repo.owner.html_url}
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
                onClick={handleReadmeLinkClick}
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
                  '& img': { maxWidth: '100%', height: 'auto', borderRadius: '14px', my: 1.5, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' },
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
                  '& table': {
                    width: '100%',
                    borderCollapse: 'collapse',
                    my: 2,
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: `1px solid ${theme.palette.divider}`,
                    '& th, & td': {
                      border: `1px solid ${theme.palette.divider}`,
                      p: 1.25,
                      textAlign: 'left',
                      fontSize: '0.82rem'
                    },
                    '& th': { bgcolor: alpha(theme.palette.primary.main, 0.12), fontWeight: 800 }
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
                  return (
                    <ListItem
                      key={asset.id}
                      sx={{
                        px: 1.5,
                        py: 1.25,
                        mb: 1,
                        borderRadius: '12px',
                        bgcolor: alpha(theme.palette.background.default, 0.5),
                        border: `1px solid ${theme.palette.divider}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
                        <ListItemIcon sx={{ minWidth: 32, color: isAndroid ? '#10b981' : 'text.disabled' }}>
                          {isAndroid ? <AndroidIcon fontSize="small" /> : <ArticleIcon fontSize="small" />}
                        </ListItemIcon>
                        <ListItemText
                          primary={asset.name}
                          secondary={`${sizeMb} MB • ${asset.download_count.toLocaleString()} downloads`}
                          primaryTypographyProps={{
                            fontSize: '0.825rem',
                            fontWeight: isAndroid ? 800 : 600,
                            noWrap: true,
                            color: isAndroid ? 'text.primary' : 'text.secondary'
                          }}
                          secondaryTypographyProps={{ fontSize: '0.72rem' }}
                        />
                      </Box>
                      {isAndroid ? (
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                          onClick={() => downloadApkFile(asset.browser_download_url, asset.name)}
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
                        <Tooltip title="This package is not an Android installer (.exe, .deb, etc.)">
                          <span>
                            <Button
                              size="small"
                              variant="outlined"
                              disabled
                              startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                              sx={{
                                height: 28,
                                fontSize: '0.725rem',
                                fontWeight: 700,
                                borderRadius: '8px',
                                textTransform: 'none',
                                ml: 1,
                                flexShrink: 0,
                                opacity: 0.6,
                                borderColor: alpha(theme.palette.divider, 0.7),
                                color: 'text.disabled'
                              }}
                            >
                              Desktop only
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
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: 420,
          height: 58,
          borderRadius: '29px',
          bgcolor: theme.palette.mode === 'dark'
            ? alpha(theme.palette.background.paper, 0.78)
            : alpha(theme.palette.background.paper, 0.86),
          backdropFilter: 'blur(36px) saturate(210%)',
          WebkitBackdropFilter: 'blur(36px) saturate(210%)',
          border: theme.palette.mode === 'dark'
            ? `1px solid ${alpha(theme.palette.common.white, 0.12)}`
            : `1px solid ${alpha(theme.palette.common.white, 0.8)}`,
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
                downloadApkFile(apkAssets[0].browser_download_url, apkAssets[0].name);
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
            onClick={() => {
              try { navigator.vibrate?.(10); } catch {}
              handleShareRepo();
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
    </Dialog>
  );
};
