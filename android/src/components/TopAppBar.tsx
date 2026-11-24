import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  IconButton,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  LinearProgress,
  Switch,
  FormControlLabel,
  useTheme,
  alpha
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckIcon from '@mui/icons-material/Check';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import TableRowsIcon from '@mui/icons-material/TableRows';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import CloseIcon from '@mui/icons-material/Close';
import PaletteIcon from '@mui/icons-material/Palette';
import SpeedIcon from '@mui/icons-material/Speed';
import { ThemePlugin } from '../themes/types';
import { OneGitVaultLogo } from './OneGitVaultLogo';
import { AndroidUpdateInfo } from '../services/updateService';
import { fetchAuthenticatedUser, getCachedUser, GitHubUserProfile } from '../services/githubApi';

interface TopAppBarProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onOpenTokenDialog: () => void;
  currentThemeId: string;
  availableThemes: ThemePlugin[];
  onSelectTheme: (themeId: string) => void;
  coreRemaining: number;
  isAuthenticated: boolean;
  isSearchActive: boolean;
  onSearchActiveChange: (active: boolean) => void;
  isCompactView: boolean;
  onToggleCompactView: () => void;
  updateInfo?: AndroidUpdateInfo | null;
  onOpenUpdateDialog?: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  onRefresh,
  isRefreshing = false,
  onOpenTokenDialog,
  currentThemeId,
  availableThemes,
  onSelectTheme,
  coreRemaining,
  isAuthenticated,
  isSearchActive: _isSearchActive,
  onSearchActiveChange,
  isCompactView,
  onToggleCompactView,
  updateInfo,
  onOpenUpdateDialog
}) => {
  const theme = useTheme();
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<GitHubUserProfile | null>(getCachedUser());

  useEffect(() => {
    if (isAuthenticated) {
      fetchAuthenticatedUser().then(setUserProfile);
    } else {
      setUserProfile(null);
    }
  }, [isAuthenticated]);

  return (
    <>
      {/* ── Native Material 3 Top App Bar (Protects System Status Bar & Houses SearchBar) ── */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          bgcolor: theme.palette.mode === 'dark'
            ? alpha(theme.palette.background.default, 0.82)
            : alpha(theme.palette.background.default, 0.88),
          backdropFilter: 'blur(35px) saturate(210%)',
          WebkitBackdropFilter: 'blur(35px) saturate(210%)',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
          pt: 'calc(max(env(safe-area-inset-top, 0px), var(--status-bar-height, 44px)) + 6px)',
          px: { xs: 1.5, sm: 2 },
          pb: 1,
          boxShadow: theme.palette.mode === 'dark'
            ? '0 4px 20px rgba(0, 0, 0, 0.5), inset 0 -1px 0 rgba(255, 255, 255, 0.05)'
            : `0 2px 10px ${alpha(theme.palette.primary.main, 0.06)}`
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 48,
            px: 1.5,
            borderRadius: '24px',
            bgcolor: theme.palette.mode === 'dark'
              ? alpha(theme.palette.common.white, 0.06)
              : alpha(theme.palette.common.white, 0.65),
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 4px 16px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.08)'
              : '0 2px 8px rgba(0, 0, 0, 0.03), inset 0 1px 1px rgba(255, 255, 255, 0.8)',
            cursor: 'pointer',
            transition: 'transform 0.15s ease',
            '&:active': { transform: 'scale(0.995)' }
          }}
          onClick={() => onSearchActiveChange(true)}
        >
          {/* Left: Search Icon & Placeholder Text */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: 1, minWidth: 0 }}>
            <SearchIcon sx={{ color: theme.palette.text.secondary, fontSize: 22 }} />
            <Typography
              noWrap
              sx={{
                color: 'text.secondary',
                fontSize: '0.88rem',
                fontWeight: 500,
                fontFamily: '"Google Sans", "Nunito", sans-serif'
              }}
            >
              Search 400k+ repositories...
            </Typography>
          </Box>

          {/* Right: Update Badge & Profile / Settings Avatar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }} onClick={(e) => e.stopPropagation()}>
            {updateInfo?.hasUpdate && (
              <Chip
                icon={<SystemUpdateAltIcon sx={{ fontSize: '13px !important' }} />}
                label={`v${updateInfo.latestVersion}`}
                size="small"
                color="primary"
                onClick={onOpenUpdateDialog}
                sx={{
                  height: 24,
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  borderRadius: '12px',
                  animation: 'pulse 2s infinite'
                }}
              />
            )}

            {/* Profile / Preferences Trigger */}
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                try { navigator.vibrate?.(10); } catch {}
                setSettingsOpen(true);
              }}
              sx={{
                p: 0.2,
                borderRadius: '50%',
                transition: 'transform 0.15s ease',
                '&:active': { transform: 'scale(0.92)' }
              }}
            >
              {isAuthenticated && userProfile?.login ? (
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.14),
                    color: theme.palette.primary.main,
                    border: `1.5px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                    boxShadow: `0 2px 6px ${alpha(theme.palette.primary.main, 0.2)}`
                  }}
                >
                  {userProfile.login.slice(0, 2).toUpperCase()}
                </Avatar>
              ) : (
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.08),
                    border: `1.5px solid ${alpha(theme.palette.primary.main, 0.35)}`,
                    boxShadow: `0 2px 6px ${alpha(theme.palette.primary.main, 0.15)}`
                  }}
                >
                  <OneGitVaultLogo size={19} outlineOnly color={theme.palette.primary.main} />
                </Box>
              )}
            </IconButton>
          </Box>
        </Box>

        {/* Sleek refresh indicator line */}
        {isRefreshing && (
          <LinearProgress
            color="primary"
            sx={{
              height: 2.5,
              borderRadius: '2px',
              mt: 0.5,
              mx: 2
            }}
          />
        )}
      </Box>

      {/* ── Native Material 3 Settings & Account Bottom Sheet ── */}
      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '28px',
            bgcolor: 'background.paper',
            p: 1,
            boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
            border: `1px solid ${theme.palette.divider}`
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, px: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <OneGitVaultLogo size={26} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                OneGitVault
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                v1.1.0 · Publisher: VKaddala
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setSettingsOpen(false)}>
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Card 1: GitHub API Quota */}
          <Box
            sx={{
              p: 1.75,
              borderRadius: '18px',
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SpeedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
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

            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
              {coreRemaining} requests remaining of {isAuthenticated ? '5,000 req/hr' : '60 req/hr'}.
            </Typography>

            <LinearProgress
              variant="determinate"
              value={Math.min(100, (coreRemaining / (isAuthenticated ? 5000 : 60)) * 100)}
              sx={{ height: 6, borderRadius: '3px', mb: 1.5 }}
            />

            <Button
              size="small"
              variant="outlined"
              fullWidth
              startIcon={<VpnKeyIcon sx={{ fontSize: 15 }} />}
              onClick={() => {
                setSettingsOpen(false);
                onOpenTokenDialog();
              }}
              sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700 }}
            >
              {isAuthenticated ? 'Manage GitHub Token' : 'Connect Personal Access Token'}
            </Button>
          </Box>

          {/* Card 2: Feed & View Preferences */}
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
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              Display & Controls
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isCompactView ? <TableRowsIcon sx={{ fontSize: 18, color: 'text.secondary' }} /> : <ViewAgendaIcon sx={{ fontSize: 18, color: 'text.secondary' }} />}
                <Typography variant="body2" sx={{ fontSize: '0.82rem' }}>
                  Compact Card View
                </Typography>
              </Box>
              <FormControlLabel
                control={<Switch size="small" checked={isCompactView} onChange={onToggleCompactView} />}
                label=""
                sx={{ m: 0 }}
              />
            </Box>

            <Button
              size="small"
              variant="text"
              startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
              onClick={() => {
                setSettingsOpen(false);
                onRefresh();
              }}
              sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 700, p: 0 }}
            >
              Refresh Repository Feeds
            </Button>
          </Box>

          {/* Card 3: Theme Selector */}
          <Box
            sx={{
              p: 1.75,
              borderRadius: '18px',
              bgcolor: alpha(theme.palette.text.primary, 0.03),
              border: `1px solid ${theme.palette.divider}`
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.2 }}>
              <PaletteIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                Theme & Palette
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
              {availableThemes.map((t) => {
                const isSelected = t.id === currentThemeId;
                return (
                  <Box
                    key={t.id}
                    onClick={() => onSelectTheme(t.id)}
                    sx={{
                      p: 1,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      border: `1.5px solid ${isSelected ? theme.palette.primary.main : theme.palette.divider}`,
                      bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: t.colors.accent,
                          border: `1px solid ${t.colors.borderDefault}`
                        }}
                      />
                      <Typography variant="caption" sx={{ fontWeight: isSelected ? 800 : 600, fontSize: '0.72rem' }}>
                        {t.name}
                      </Typography>
                    </Box>
                    {isSelected && <CheckIcon sx={{ fontSize: 14, color: 'primary.main' }} />}
                  </Box>
                );
              })}
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};
