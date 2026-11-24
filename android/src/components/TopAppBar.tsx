import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  IconButton,
  Chip,
  Avatar,
  LinearProgress,
  useTheme,
  alpha
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import { ThemePlugin } from '../themes/types';
import { OneGitVaultLogo } from './OneGitVaultLogo';
import { AndroidUpdateInfo } from '../services/updateService';
import { fetchAuthenticatedUser, getCachedUser, GitHubUserProfile } from '../services/githubApi';

interface TopAppBarProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isAuthenticated: boolean;
  isSearchActive: boolean;
  onSearchActiveChange: (active: boolean) => void;
  onOpenSettings: () => void;
  updateInfo?: AndroidUpdateInfo | null;
  onOpenUpdateDialog?: () => void;
  onOpenTokenDialog?: () => void;
  currentThemeId?: string;
  availableThemes?: ThemePlugin[];
  onSelectTheme?: (themeId: string) => void;
  coreRemaining?: number;
  isCompactView?: boolean;
  onToggleCompactView?: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  isRefreshing = false,
  isAuthenticated,
  isSearchActive: _isSearchActive,
  onSearchActiveChange,
  onOpenSettings,
  updateInfo,
  onOpenUpdateDialog
}) => {
  const theme = useTheme();
  const [userProfile, setUserProfile] = useState<GitHubUserProfile | null>(getCachedUser());

  useEffect(() => {
    if (isAuthenticated) {
      fetchAuthenticatedUser().then(setUserProfile);
    } else {
      setUserProfile(null);
    }
  }, [isAuthenticated]);

  return (
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

          {/* Profile / Preferences Trigger: Opens Full-Page Settings */}
          <IconButton
            size="small"
            aria-label="Open Settings"
            onClick={(e) => {
              e.stopPropagation();
              try { navigator.vibrate?.(10); } catch {}
              onOpenSettings();
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
  );
};
