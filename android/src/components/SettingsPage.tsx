import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Box,
  IconButton,
  Chip,
  Button,
  LinearProgress,
  Select,
  MenuItem,
  Container,
  CircularProgress,
  useTheme,
  alpha,
  Divider,
  Switch,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckIcon from '@mui/icons-material/Check';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import TableRowsIcon from '@mui/icons-material/TableRows';
import PaletteIcon from '@mui/icons-material/Palette';
import SpeedIcon from '@mui/icons-material/Speed';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import StorageIcon from '@mui/icons-material/Storage';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import VibrationIcon from '@mui/icons-material/Vibration';
import { ThemePlugin } from '../themes/types';
import { renderMarkdownToSafeHtml } from '../utils/sanitizeMarkdown';
import { OneGitVaultLogo } from './OneGitVaultLogo';
import { triggerHaptic, isHapticsEnabled, setHapticsEnabled } from '../utils/haptics';
import {
  AndroidUpdateInfo,
  CURRENT_ANDROID_VERSION,
  BUNDLED_RELEASE_NOTES,
  fetchInstalledVersionReleaseNotes,
} from '../services/updateService';
import {
  getCacheStats,
  clearAllAppCache,
  CacheStats,
  MAX_CACHE_BYTES,
} from '../services/cacheManager';

interface SettingsPageProps {
  open: boolean;
  onClose: () => void;
  coreRemaining: number;
  isAuthenticated: boolean;
  onOpenTokenDialog: () => void;
  isCompactView: boolean;
  onToggleCompactView: () => void;
  onRefresh: () => void;
  currentThemeId: string;
  availableThemes: ThemePlugin[];
  onSelectTheme: (themeId: string) => void;
  updateInfo: AndroidUpdateInfo | null;
  onOpenUpdateDialog: () => void;
  onCacheCleared?: (msg: string) => void;
}

interface InstalledReleaseNotesState {
  title: string;
  body: string;
  publishedAt?: string;
  releaseUrl: string;
}

function renderReleaseNotesHtml(markdown: string): string {
  try {
    return renderMarkdownToSafeHtml(markdown) || '<p>Unable to format release notes.</p>';
  } catch {
    return '<p>Unable to format release notes.</p>';
  }
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  open,
  onClose,
  coreRemaining,
  isAuthenticated,
  onOpenTokenDialog,
  isCompactView,
  onToggleCompactView,
  onRefresh,
  currentThemeId,
  availableThemes,
  onSelectTheme,
  updateInfo,
  onOpenUpdateDialog,
  onCacheCleared,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const maxLimit = isAuthenticated ? 5000 : 60;
  const remainingPct = Math.min(100, Math.max(0, (coreRemaining / maxLimit) * 100));

  const [showAbout, setShowAbout] = useState<boolean>(false);
  const [releaseNotes, setReleaseNotes] = useState<InstalledReleaseNotesState>({
    title: `OneGitVault v${CURRENT_ANDROID_VERSION}`,
    body: BUNDLED_RELEASE_NOTES,
    releaseUrl: `https://github.com/VKaddala/OneGitVault/releases/tag/v${CURRENT_ANDROID_VERSION}`,
  });
  const [releaseNotesHtml, setReleaseNotesHtml] = useState<string>(() =>
    renderReleaseNotesHtml(BUNDLED_RELEASE_NOTES)
  );
  const [loadingAbout, setLoadingAbout] = useState<boolean>(false);
  const [cacheStats, setCacheStats] = useState<CacheStats>(() => getCacheStats());
  const [hapticsOn, setHapticsOn] = useState<boolean>(() => isHapticsEnabled());

  const refreshCacheStats = useCallback(() => {
    setCacheStats(getCacheStats());
  }, []);

  // Reset sub-view state and refresh cache stats when Settings opens
  useEffect(() => {
    if (open) {
      setShowAbout(false);
      refreshCacheStats();
    }
  }, [open, refreshCacheStats]);

  // Fetch installed version release notes when opening About screen
  useEffect(() => {
    if (!open || !showAbout) return;
    let active = true;
    setLoadingAbout(true);
    fetchInstalledVersionReleaseNotes()
      .then((notes) => {
        if (!active) return;
        setReleaseNotes(notes);
        setReleaseNotesHtml(renderReleaseNotesHtml(notes.body));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingAbout(false);
      });
    return () => {
      active = false;
    };
  }, [open, showAbout]);

  // Handle Android hardware back & edge swipe cleanly across Settings -> About
  useEffect(() => {
    if (!open) return;
    const prevHandler = (window as any).__handleAndroidBack;
    (window as any).__handleAndroidBack = () => {
      if (showAbout) {
        setShowAbout(false);
        return true;
      }
      onClose();
      return true;
    };
    return () => {
      (window as any).__handleAndroidBack = prevHandler;
    };
  }, [open, showAbout, onClose]);

  if (!open) return null;

  const surfaceCardBg = theme.palette.background.paper;
  const hairline = theme.palette.divider;
  const activeThemeObj = availableThemes.find((t) => t.id === currentThemeId);
  const quotaBarColor =
    remainingPct < 20
      ? theme.palette.error.main
      : remainingPct < 50
      ? theme.palette.warning.main
      : theme.palette.primary.main;

  const cacheUsagePct = Math.min(100, Math.round((cacheStats.totalBytes / MAX_CACHE_BYTES) * 100));

  const handleManualClearCache = () => {
    const removed = clearAllAppCache();
    refreshCacheStats();
    const updatedStats = getCacheStats();
    onCacheCleared?.(
      removed > 0
        ? `Cleared ${removed} cached items. Next auto-clear: ${updatedStats.nextClearDateLabel}`
        : `Cache cleared. Next auto-clear: ${updatedStats.nextClearDateLabel}`
    );
  };

  const formattedPublishedDate = releaseNotes.publishedAt
    ? (() => {
        try {
          return new Date(releaseNotes.publishedAt).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
        } catch {
          return '';
        }
      })()
    : '';

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1350,
        bgcolor: theme.palette.background.default,
        color: theme.palette.text.primary,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      {/* Clean Minimal Sticky Header */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          pt: 'calc(var(--status-bar-height, 36px) + 6px)',
          pb: 1.25,
          px: 1.5,
          bgcolor: 'var(--bg-header)',
          borderBottom: `1px solid ${hairline}`,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
        }}
      >
        <IconButton
          size="small"
          onClick={() => (showAbout ? setShowAbout(false) : onClose())}
          sx={{
            bgcolor: alpha(theme.palette.text.primary, 0.06),
            color: 'text.primary',
            width: 36,
            height: 36,
          }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.015em', flexGrow: 1 }}>
          {showAbout ? 'About & Release Notes' : 'Settings'}
        </Typography>
        {showAbout && loadingAbout && <CircularProgress size={16} />}
      </Box>

      {/* Main Content */}
      <Container maxWidth="sm" sx={{ py: 2, px: 2, pb: 'calc(40px + env(safe-area-inset-bottom, 16px))' }}>
        {showAbout ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* About Hero Card */}
            <Box
              sx={{
                p: 2.25,
                borderRadius: '14px',
                bgcolor: surfaceCardBg,
                border: `1px solid ${hairline}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 1,
              }}
            >
              <Box
                sx={{
                  p: 1,
                  borderRadius: '12px',
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
                }}
              >
                <OneGitVaultLogo size={48} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
                OneGitVault
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Chip
                  size="small"
                  label={`Version ${CURRENT_ANDROID_VERSION}`}
                  color="primary"
                  sx={{ fontWeight: 800, fontSize: '0.72rem', height: 24, borderRadius: '8px' }}
                />
                {formattedPublishedDate && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={formattedPublishedDate}
                    sx={{ fontWeight: 700, fontSize: '0.7rem', height: 24, borderRadius: '8px', borderColor: hairline }}
                  />
                )}
              </Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.78rem', maxWidth: 340, lineHeight: 1.5 }}>
                Open-source GitHub APK hub, Spotlight repository observatory, and offline-resilient developer Vault.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.75, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button
                  size="small"
                  variant="outlined"
                  endIcon={<OpenInNewIcon sx={{ fontSize: '14px !important' }} />}
                  href={releaseNotes.releaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, fontSize: '0.76rem' }}
                >
                  Release Page
                </Button>
                {updateInfo?.hasUpdate && (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<SystemUpdateAltIcon sx={{ fontSize: '15px !important' }} />}
                    onClick={onOpenUpdateDialog}
                    sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 800, fontSize: '0.76rem' }}
                  >
                    Install v{updateInfo.latestVersion}
                  </Button>
                )}
              </Box>
            </Box>

            {/* Release Description Card */}
            <Box
              sx={{
                p: 2.25,
                borderRadius: '14px',
                bgcolor: surfaceCardBg,
                border: `1px solid ${hairline}`,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  color: 'text.secondary',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  fontSize: '0.68rem',
                  mb: 1,
                }}
              >
                {releaseNotes.title || `Release v${CURRENT_ANDROID_VERSION}`}
              </Typography>
              <Box
                sx={{
                  fontSize: '0.84rem',
                  lineHeight: 1.6,
                  color: 'text.primary',
                  wordBreak: 'break-word',
                  '& h1, & h2': {
                    fontSize: '0.96rem',
                    fontWeight: 800,
                    mt: 1.5,
                    mb: 0.75,
                    color: 'text.primary',
                  },
                  '& h2:first-of-type, & h1:first-of-type': { mt: 0 },
                  '& h3': {
                    fontSize: '0.86rem',
                    fontWeight: 800,
                    mt: 1.5,
                    mb: 0.5,
                    color: theme.palette.primary.main,
                  },
                  '& p': { mb: 1, color: 'text.secondary' },
                  '& ul, & ol': { pl: 2.25, mb: 1 },
                  '& li': { mb: 0.65, color: 'text.secondary' },
                  '& strong': { color: 'text.primary', fontWeight: 700 },
                  '& code': {
                    px: 0.6,
                    py: 0.15,
                    borderRadius: '6px',
                    fontSize: '0.76rem',
                    fontFamily: "'JetBrains Mono', monospace",
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                  },
                }}
                dangerouslySetInnerHTML={{ __html: releaseNotesHtml }}
              />
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Clickable Version Box -> Opens About & Release Description */}
            <Box
              role="button"
              tabIndex={0}
              onClick={() => setShowAbout(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowAbout(true);
                }
              }}
              sx={{
                p: 1.5,
                borderRadius: '14px',
                bgcolor: surfaceCardBg,
                border: `1px solid ${hairline}`,
                display: 'flex',
                alignItems: 'center',
                gap: 1.4,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease, transform 0.15s ease',
                '&:active': {
                  transform: 'scale(0.99)',
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              <OneGitVaultLogo size={40} />
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.85, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '0.96rem', lineHeight: 1.2 }}>
                    OneGitVault
                  </Typography>
                  <Chip
                    size="small"
                    label={`v${CURRENT_ANDROID_VERSION}`}
                    sx={{
                      height: 20,
                      borderRadius: '6px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      bgcolor: alpha(theme.palette.primary.main, 0.14),
                      color: theme.palette.primary.main,
                    }}
                  />
                  {updateInfo?.hasUpdate && (
                    <Chip
                      size="small"
                      label={`v${updateInfo.latestVersion} new`}
                      color="success"
                      sx={{ height: 20, borderRadius: '6px', fontSize: '0.66rem', fontWeight: 800 }}
                    />
                  )}
                </Box>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.35 }}
                >
                  <InfoOutlinedIcon sx={{ fontSize: 13 }} />
                  Tap to view release notes & app info
                </Typography>
              </Box>
              <ChevronRightIcon fontSize="small" sx={{ color: 'text.secondary', flexShrink: 0 }} />
            </Box>

            {/* Group 1: Preferences (Layout, Palette, Refresh) */}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  px: 0.75,
                  mb: 0.75,
                  display: 'block',
                  fontWeight: 800,
                  fontSize: '0.7rem',
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                }}
              >
                Display & Sync
              </Typography>
              <Box
                sx={{
                  borderRadius: '14px',
                  bgcolor: surfaceCardBg,
                  border: `1px solid ${hairline}`,
                  overflow: 'hidden',
                }}
              >
                {/* Row 1: Feed Layout */}
                <Box sx={{ px: 1.65, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                    {isCompactView ? (
                      <TableRowsIcon sx={{ fontSize: 19, color: 'text.secondary', flexShrink: 0 }} />
                    ) : (
                      <ViewAgendaIcon sx={{ fontSize: 19, color: 'text.secondary', flexShrink: 0 }} />
                    )}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.88rem' }}>Feed Layout</Typography>
                      <Typography variant="caption" noWrap sx={{ color: 'text.secondary', fontSize: '0.72rem', display: 'block' }}>
                        {isCompactView ? 'Dense 1-row list' : 'Rich detail cards'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Segmented Toggle Pill */}
                  <Box
                    sx={{
                      display: 'inline-flex',
                      p: 0.35,
                      borderRadius: '10px',
                      flexShrink: 0,
                      bgcolor: alpha(theme.palette.text.primary, isDark ? 0.08 : 0.05),
                    }}
                  >
                    <Button
                      size="small"
                      disableElevation
                      onClick={() => {
                        if (isCompactView) {
                          triggerHaptic(8);
                          onToggleCompactView();
                        }
                      }}
                      sx={{
                        minWidth: 58,
                        py: 0.35,
                        px: 1.1,
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        bgcolor: !isCompactView ? theme.palette.background.paper : 'transparent',
                        color: !isCompactView ? theme.palette.primary.main : 'text.secondary',
                        boxShadow: !isCompactView ? '0 1px 4px rgba(0,0,0,0.16)' : 'none',
                      }}
                    >
                      Cards
                    </Button>
                    <Button
                      size="small"
                      disableElevation
                      onClick={() => {
                        if (!isCompactView) {
                          triggerHaptic(8);
                          onToggleCompactView();
                        }
                      }}
                      sx={{
                        minWidth: 58,
                        py: 0.35,
                        px: 1.1,
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        bgcolor: isCompactView ? theme.palette.background.paper : 'transparent',
                        color: isCompactView ? theme.palette.primary.main : 'text.secondary',
                        boxShadow: isCompactView ? '0 1px 4px rgba(0,0,0,0.16)' : 'none',
                      }}
                    >
                      List
                    </Button>
                  </Box>
                </Box>

                <Divider sx={{ borderColor: hairline }} />

                {/* Row 2: Theme Selector */}
                <Box sx={{ px: 1.65, py: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                    <PaletteIcon sx={{ fontSize: 19, color: 'text.secondary', flexShrink: 0 }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.88rem' }}>Theme</Typography>
                      <Typography variant="caption" noWrap sx={{ color: 'text.secondary', fontSize: '0.72rem', display: 'block' }}>
                        {activeThemeObj?.id === 'system'
                          ? `System (${isDark ? 'Dark' : 'Light'})`
                          : (activeThemeObj?.name || 'System')}
                      </Typography>
                    </Box>
                  </Box>

                  <Select
                    size="small"
                    value={currentThemeId}
                    onChange={(e) => {
                      triggerHaptic(8);
                      onSelectTheme(e.target.value);
                    }}
                    renderValue={(val) => {
                      const t = availableThemes.find((item) => item.id === val);
                      if (!t) return val;
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.85, minWidth: 0 }}>
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              bgcolor: t.colors.accent,
                              flexShrink: 0,
                            }}
                          />
                          <Typography noWrap sx={{ fontSize: '0.76rem', fontWeight: 700 }}>
                            {t.name}
                          </Typography>
                        </Box>
                      );
                    }}
                    MenuProps={{
                      sx: { zIndex: 1600 },
                      PaperProps: {
                        sx: {
                          zIndex: 1600,
                          borderRadius: '18px',
                          mt: 0.75,
                          p: 0.5,
                          bgcolor: 'var(--bg-menu)',
                          backgroundImage: 'none',
                          border: `1px solid ${hairline}`,
                          boxShadow: theme.palette.mode === 'dark'
                            ? '0 18px 44px rgba(0, 0, 0, 0.72), inset 0 1px 0 rgba(255, 255, 255, 0.10)'
                            : '0 14px 36px rgba(15, 23, 42, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.92)',
                        },
                      },
                    }}
                    sx={{
                      minWidth: 160,
                      maxWidth: 190,
                      flexShrink: 0,
                      borderRadius: '9px',
                      bgcolor: alpha(theme.palette.text.primary, 0.04),
                      fontSize: '0.76rem',
                      '& .MuiSelect-select': { py: 0.65, pl: 1.2, pr: '28px !important' },
                      '& fieldset': { borderColor: hairline },
                    }}
                  >
                    {availableThemes.map((t) => (
                      <MenuItem key={t.id} value={t.id} sx={{ py: 1, gap: 1, borderRadius: '8px', mx: 0.5 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: t.colors.accent,
                            border: `2px solid ${t.colors.bgSurface}`,
                            flexShrink: 0,
                          }}
                        />
                        <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', flexGrow: 1 }}>{t.name}</Typography>
                        {currentThemeId === t.id && <CheckIcon sx={{ fontSize: 15, color: theme.palette.primary.main }} />}
                      </MenuItem>
                    ))}
                  </Select>
                </Box>

                <Divider sx={{ borderColor: hairline }} />

                {/* Row 3: Haptic Feedback Switch */}
                <Box sx={{ px: 1.65, py: 1.15, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                    <VibrationIcon sx={{ fontSize: 19, color: 'text.secondary', flexShrink: 0 }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.88rem' }}>Haptic Feedback</Typography>
                      <Typography variant="caption" noWrap sx={{ color: 'text.secondary', fontSize: '0.72rem', display: 'block' }}>
                        {hapticsOn ? 'Vibrate on tap, tabs & gestures' : 'Haptics disabled'}
                      </Typography>
                    </Box>
                  </Box>

                  <Switch
                    size="small"
                    checked={hapticsOn}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setHapticsEnabled(next);
                      setHapticsOn(next);
                      if (next) triggerHaptic(10);
                    }}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: theme.palette.primary.main,
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        bgcolor: theme.palette.primary.main,
                      },
                    }}
                  />
                </Box>

                <Divider sx={{ borderColor: hairline }} />

                {/* Row 4: Quick Refresh */}
                <Box
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    onRefresh();
                    onClose();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onRefresh();
                      onClose();
                    }
                  }}
                  sx={{
                    px: 1.65,
                    py: 1.25,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    '&:active': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <RefreshIcon sx={{ fontSize: 19, color: 'text.secondary' }} />
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.88rem' }}>Sync Latest Repositories</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
                        Bypass cache & fetch fresh GitHub data
                      </Typography>
                    </Box>
                  </Box>
                  <ChevronRightIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </Box>
              </Box>
            </Box>

            {/* Group 2: GitHub API & Storage */}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  px: 0.75,
                  mb: 0.75,
                  display: 'block',
                  fontWeight: 800,
                  fontSize: '0.7rem',
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                }}
              >
                Account & Storage
              </Typography>
              <Box
                sx={{
                  borderRadius: '14px',
                  bgcolor: surfaceCardBg,
                  border: `1px solid ${hairline}`,
                  overflow: 'hidden',
                }}
              >
                {/* GitHub Quota + PAT */}
                <Box sx={{ px: 1.65, py: 1.35 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.9 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <SpeedIcon sx={{ fontSize: 19, color: quotaBarColor }} />
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.88rem' }}>
                          GitHub API ({isAuthenticated ? 'Token Active' : 'Guest'})
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
                          {coreRemaining} / {maxLimit} requests left
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      size="small"
                      variant={isAuthenticated ? 'outlined' : 'contained'}
                      startIcon={<VpnKeyIcon sx={{ fontSize: '14px !important' }} />}
                      onClick={onOpenTokenDialog}
                      sx={{
                        borderRadius: '9px',
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '0.74rem',
                        px: 1.35,
                        py: 0.45,
                      }}
                    >
                      {isAuthenticated ? 'Token' : 'Connect'}
                    </Button>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={remainingPct}
                    sx={{
                      height: 5,
                      borderRadius: '4px',
                      bgcolor: alpha(theme.palette.text.primary, 0.08),
                      '& .MuiLinearProgress-bar': { borderRadius: '4px', bgcolor: quotaBarColor },
                    }}
                  />
                </Box>

                <Divider sx={{ borderColor: hairline }} />

                {/* Cache Storage */}
                <Box sx={{ px: 1.65, py: 1.35 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.9 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <StorageIcon sx={{ fontSize: 19, color: theme.palette.primary.main }} />
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.88rem' }}>
                          Cache ({cacheStats.formattedSize} / 250 MB)
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
                          {cacheStats.entryCount} items · Next auto-clear {cacheStats.nextClearDateLabel}
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteSweepIcon sx={{ fontSize: '15px !important' }} />}
                      onClick={handleManualClearCache}
                      sx={{
                        borderRadius: '9px',
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '0.74rem',
                        px: 1.25,
                        py: 0.45,
                      }}
                    >
                      Clear
                    </Button>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={cacheUsagePct}
                    sx={{
                      height: 5,
                      borderRadius: '4px',
                      bgcolor: alpha(theme.palette.text.primary, 0.08),
                      '& .MuiLinearProgress-bar': { borderRadius: '4px', bgcolor: theme.palette.primary.main },
                    }}
                  />
                </Box>

                <Divider sx={{ borderColor: hairline }} />

                {/* App Updates Status Row */}
                <Box sx={{ px: 1.65, py: 1.3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    {updateInfo?.hasUpdate ? (
                      <SystemUpdateAltIcon sx={{ fontSize: 19, color: theme.palette.success.main }} />
                    ) : (
                      <CheckCircleOutlineIcon sx={{ fontSize: 19, color: 'text.secondary' }} />
                    )}
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.88rem' }}>
                        {updateInfo?.hasUpdate ? `Update v${updateInfo.latestVersion} Ready` : 'App Updates'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
                        {updateInfo?.hasUpdate
                          ? updateInfo.releaseName || 'Tap to download latest APK'
                          : `Installed v${CURRENT_ANDROID_VERSION} is up to date`}
                      </Typography>
                    </Box>
                  </Box>

                  {updateInfo?.hasUpdate ? (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      onClick={onOpenUpdateDialog}
                      sx={{
                        borderRadius: '9px',
                        textTransform: 'none',
                        fontWeight: 800,
                        fontSize: '0.74rem',
                        px: 1.35,
                        py: 0.45,
                      }}
                    >
                      Update
                    </Button>
                  ) : (
                    <Chip
                      size="small"
                      label="Current"
                      sx={{
                        height: 22,
                        borderRadius: '8px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        bgcolor: alpha(theme.palette.text.primary, 0.06),
                        color: 'text.secondary',
                      }}
                    />
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  );
};
