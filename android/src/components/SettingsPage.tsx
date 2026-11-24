import React, { useEffect } from 'react';
import {
  Typography,
  Box,
  IconButton,
  Chip,
  Button,
  LinearProgress,
  FormControl,
  Select,
  MenuItem,
  Container,
  useTheme,
  alpha
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckIcon from '@mui/icons-material/Check';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import TableRowsIcon from '@mui/icons-material/TableRows';
import PaletteIcon from '@mui/icons-material/Palette';
import SpeedIcon from '@mui/icons-material/Speed';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import { ThemePlugin } from '../themes/types';
import { OneGitVaultLogo } from './OneGitVaultLogo';
import { AndroidUpdateInfo, CURRENT_ANDROID_VERSION } from '../services/updateService';

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
  updateInfo?: AndroidUpdateInfo | null;
  onOpenUpdateDialog?: () => void;
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
  onOpenUpdateDialog
}) => {
  const theme = useTheme();

  // Intercept Android hardware back button and edge-swipe gesture
  useEffect(() => {
    if (!open) return;

    const prevHandler = (window as any).__handleAndroidBack;
    (window as any).__handleAndroidBack = () => {
      onClose();
      return true;
    };

    return () => {
      (window as any).__handleAndroidBack = prevHandler;
    };
  }, [open, onClose]);

  if (!open) return null;

  const quotaPercent = Math.min(100, (coreRemaining / (isAuthenticated ? 5000 : 60)) * 100);

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1350,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        overflow: 'hidden',
        animation: 'fadeIn 0.15s ease-out',
        '@keyframes fadeIn': {
          from: { opacity: 0, transform: 'translateY(12px)' },
          to: { opacity: 1, transform: 'translateY(0)' }
        }
      }}
    >
      {/* ── 1. Native Android Top App Bar with Back Navigation ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          pt: 'calc(max(env(safe-area-inset-top, 0px), var(--status-bar-height, 44px)) + 8px)',
          px: 2,
          pb: 1.5,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
          bgcolor: alpha(theme.palette.background.default, 0.92),
          backdropFilter: 'blur(30px) saturate(200%)',
          WebkitBackdropFilter: 'blur(30px) saturate(200%)',
          zIndex: 10
        }}
      >
        <IconButton
          onClick={onClose}
          size="medium"
          aria-label="Back to repositories"
          sx={{
            color: 'text.primary',
            p: 0.75,
            borderRadius: '12px',
            bgcolor: alpha(theme.palette.text.primary, 0.05),
            '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.1) }
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 24 }} />
        </IconButton>

        <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.2rem', color: 'text.primary', flex: 1 }}>
          Settings
        </Typography>
      </Box>

      {/* ── 2. Full Page Scrollable Settings Body ── */}
      <Container
        maxWidth="sm"
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: { xs: 2, sm: 3 },
          py: 2.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {/* App Info Header Card */}
        <Box
          sx={{
            p: 2,
            borderRadius: '24px',
            bgcolor: alpha(theme.palette.text.primary, 0.03),
            border: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}
        >
          <Box
            sx={{
              p: 1.25,
              borderRadius: '18px',
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              border: `1.5px solid ${alpha(theme.palette.primary.main, 0.3)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.2)}`
            }}
          >
            <OneGitVaultLogo size={36} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                OneGitVault
              </Typography>
              <Chip
                label={`v${CURRENT_ANDROID_VERSION}`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  bgcolor: alpha(theme.palette.primary.main, 0.14),
                  color: theme.palette.primary.main,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mt: 0.25 }}>
              Open-Source Repository Explorer & APK Observatory
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
              Publisher: VKaddala
            </Typography>
          </Box>
        </Box>

        {/* Card 1: GitHub API Quota */}
        <Box
          sx={{
            p: 2,
            borderRadius: '24px',
            bgcolor: alpha(theme.palette.primary.main, 0.06),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SpeedIcon sx={{ fontSize: 20, color: 'primary.main' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                GitHub API Quota
              </Typography>
            </Box>
            <Chip
              size="small"
              label={isAuthenticated ? 'PAT Connected' : 'Public Limit'}
              sx={{
                height: 22,
                fontSize: '0.68rem',
                fontWeight: 800,
                borderRadius: '12px',
                bgcolor: isAuthenticated
                  ? alpha(theme.palette.primary.main, 0.16)
                  : alpha(theme.palette.text.secondary, 0.12),
                color: isAuthenticated ? theme.palette.primary.main : 'text.secondary',
                border: `1px solid ${isAuthenticated ? alpha(theme.palette.primary.main, 0.38) : theme.palette.divider}`
              }}
            />
          </Box>

          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.82rem', mb: 1.25 }}>
            <strong style={{ color: theme.palette.text.primary }}>{coreRemaining.toLocaleString()}</strong> requests remaining of {isAuthenticated ? '5,000 req/hr' : '60 req/hr'}.
          </Typography>

          <LinearProgress
            variant="determinate"
            value={quotaPercent}
            sx={{
              height: 7,
              borderRadius: '4px',
              mb: 2,
              bgcolor: alpha(theme.palette.text.primary, 0.08),
              '& .MuiLinearProgress-bar': {
                bgcolor: coreRemaining > 500 ? 'primary.main' : coreRemaining > 100 ? '#f59e0b' : '#ef4444'
              }
            }}
          />

          <Button
            size="medium"
            variant="outlined"
            fullWidth
            startIcon={<VpnKeyIcon sx={{ fontSize: 17 }} />}
            onClick={() => {
              onOpenTokenDialog();
            }}
            sx={{
              borderRadius: '14px',
              textTransform: 'none',
              fontWeight: 800,
              fontSize: '0.85rem',
              py: 1
            }}
          >
            {isAuthenticated ? 'Manage GitHub Token' : 'Connect Personal Access Token'}
          </Button>
        </Box>

        {/* Card 2: Display & Layout (Card & List View) */}
        <Box
          sx={{
            p: 2,
            borderRadius: '24px',
            bgcolor: alpha(theme.palette.text.primary, 0.03),
            border: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ViewAgendaIcon sx={{ fontSize: 20, color: 'primary.main' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Card & List View
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              {isCompactView ? 'List View Active' : 'Card View Active'}
            </Typography>
          </Box>

          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: -0.5 }}>
            Switch between full-size detailed repository cards and high-density list items.
          </Typography>

          {/* Segmented Switcher for Card View vs List View */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 1,
              p: 0.5,
              borderRadius: '16px',
              bgcolor: alpha(theme.palette.background.paper, 0.7),
              border: `1px solid ${alpha(theme.palette.divider, 0.7)}`
            }}
          >
            <Button
              size="small"
              onClick={() => {
                if (isCompactView) onToggleCompactView();
              }}
              startIcon={<ViewAgendaIcon sx={{ fontSize: 18 }} />}
              sx={{
                borderRadius: '12px',
                py: 0.9,
                fontSize: '0.82rem',
                fontWeight: !isCompactView ? 800 : 600,
                color: !isCompactView ? 'primary.contrastText' : 'text.secondary',
                bgcolor: !isCompactView ? 'primary.main' : 'transparent',
                boxShadow: !isCompactView ? `0 2px 8px ${alpha(theme.palette.primary.main, 0.35)}` : 'none',
                '&:hover': {
                  bgcolor: !isCompactView ? 'primary.main' : alpha(theme.palette.text.primary, 0.05)
                }
              }}
            >
              Card View
            </Button>

            <Button
              size="small"
              onClick={() => {
                if (!isCompactView) onToggleCompactView();
              }}
              startIcon={<TableRowsIcon sx={{ fontSize: 18 }} />}
              sx={{
                borderRadius: '12px',
                py: 0.9,
                fontSize: '0.82rem',
                fontWeight: isCompactView ? 800 : 600,
                color: isCompactView ? 'primary.contrastText' : 'text.secondary',
                bgcolor: isCompactView ? 'primary.main' : 'transparent',
                boxShadow: isCompactView ? `0 2px 8px ${alpha(theme.palette.primary.main, 0.35)}` : 'none',
                '&:hover': {
                  bgcolor: isCompactView ? 'primary.main' : alpha(theme.palette.text.primary, 0.05)
                }
              }}
            >
              List View
            </Button>
          </Box>

          <Box sx={{ pt: 1, borderTop: `1px solid ${alpha(theme.palette.divider, 0.6)}` }}>
            <Button
              size="small"
              variant="text"
              startIcon={<RefreshIcon sx={{ fontSize: 18 }} />}
              onClick={() => {
                onClose();
                onRefresh();
              }}
              sx={{
                justifyContent: 'flex-start',
                textTransform: 'none',
                fontWeight: 700,
                color: theme.palette.primary.main,
                px: 1,
                py: 0.5
              }}
            >
              Refresh Repository Feeds
            </Button>
          </Box>
        </Box>

        {/* Card 3: Theme & Palette (Dropdown Selector) */}
        <Box
          sx={{
            p: 2,
            borderRadius: '24px',
            bgcolor: alpha(theme.palette.text.primary, 0.03),
            border: `1px solid ${theme.palette.divider}`
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PaletteIcon sx={{ fontSize: 20, color: 'primary.main' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Theme & Palette
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {availableThemes.length} Available
            </Typography>
          </Box>

          <FormControl fullWidth size="small">
            <Select
              value={currentThemeId}
              onChange={(e) => onSelectTheme(e.target.value as string)}
              MenuProps={{
                sx: { zIndex: 1600 },
                PaperProps: {
                  sx: {
                    zIndex: 1600,
                    borderRadius: '20px',
                    mt: 1,
                    maxHeight: 320,
                    bgcolor: 'background.paper',
                    backgroundImage: 'none',
                    border: `1px solid ${theme.palette.divider}`,
                    boxShadow: theme.palette.mode === 'dark'
                      ? '0 12px 40px rgba(0,0,0,0.7)'
                      : '0 12px 40px rgba(0,0,0,0.15)',
                  }
                }
              }}
              sx={{
                borderRadius: '16px',
                bgcolor: alpha(theme.palette.background.paper, 0.6),
                fontSize: '0.88rem',
                fontWeight: 700,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: alpha(theme.palette.divider, 0.8)
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: theme.palette.primary.main
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: theme.palette.primary.main
                }
              }}
              renderValue={(selectedId) => {
                const selectedTheme = availableThemes.find((t) => t.id === selectedId);
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <Box
                      sx={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        bgcolor: selectedTheme?.colors.accent || theme.palette.primary.main,
                        border: `1px solid ${selectedTheme?.colors.borderDefault || theme.palette.divider}`,
                        flexShrink: 0
                      }}
                    />
                    <Typography sx={{ fontSize: '0.88rem', fontWeight: 700 }}>
                      {selectedTheme?.name || selectedId}
                    </Typography>
                  </Box>
                );
              }}
            >
              {availableThemes.map((t) => (
                <MenuItem
                  key={t.id}
                  value={t.id}
                  sx={{
                    py: 1.25,
                    px: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <Box
                      sx={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        bgcolor: t.colors.accent,
                        border: `1px solid ${t.colors.borderDefault}`,
                        flexShrink: 0
                      }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: t.id === currentThemeId ? 800 : 500 }}>
                      {t.name}
                    </Typography>
                  </Box>
                  {t.id === currentThemeId && (
                    <CheckIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                  )}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Card 4: Updates & Maintenance */}
        {updateInfo?.hasUpdate && onOpenUpdateDialog && (
          <Box
            sx={{
              p: 2,
              borderRadius: '24px',
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <SystemUpdateAltIcon sx={{ fontSize: 22, color: 'primary.main' }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                  Update Available (v{updateInfo.latestVersion})
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  A newer release of OneGitVault is available
                </Typography>
              </Box>
            </Box>
            <Button
              size="small"
              variant="contained"
              onClick={() => {
                onClose();
                onOpenUpdateDialog();
              }}
              sx={{
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.74rem',
                textTransform: 'none',
                flexShrink: 0
              }}
            >
              Update
            </Button>
          </Box>
        )}

        {/* Generous bottom clearance spacer for Android navigation bar */}
        <Box sx={{ height: 'calc(80px + env(safe-area-inset-bottom, 0px))', flexShrink: 0 }} />
      </Container>
    </Box>
  );
};
