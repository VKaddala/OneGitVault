import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  Typography,
  Box,
  Button,
  TextField,
  IconButton,
  LinearProgress,
  Container,
  InputAdornment,
  useTheme,
  alpha
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShieldIcon from '@mui/icons-material/Shield';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SpeedIcon from '@mui/icons-material/Speed';
import {
  getStoredToken,
  setStoredToken,
  checkLiveRateLimit,
  getCurrentRateLimit
} from '../services/githubApi';
import { RateLimitInfo } from '../types';

interface TokenDialogProps {
  open: boolean;
  onClose: () => void;
  onTokenSaved: () => void;
}

export const TokenDialog: React.FC<TokenDialogProps> = ({
  open,
  onClose,
  onTokenSaved,
}) => {
  const theme = useTheme();
  const [tokenInput, setTokenInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [liveRateLimit, setLiveRateLimit] = useState<RateLimitInfo>(getCurrentRateLimit());
  const now = Date.now();

  // Intercept Android hardware back button & edge swipe gesture
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

  useEffect(() => {
    if (open) {
      setTokenInput(getStoredToken());
      setLiveRateLimit(getCurrentRateLimit());
      setSavedSuccess(false);

      let mounted = true;
      const fetchLive = async () => {
        try {
          const latest = await checkLiveRateLimit();
          if (mounted) setLiveRateLimit({ ...latest });
        } catch {}
      };

      fetchLive();
      const pollInterval = setInterval(fetchLive, 10000);

      return () => {
        mounted = false;
        clearInterval(pollInterval);
      };
    }
  }, [open]);

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const latest = await checkLiveRateLimit();
      setLiveRateLimit({ ...latest });
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setStoredToken(tokenInput.trim());
      const latest = await checkLiveRateLimit();
      setLiveRateLimit({ ...latest });
      setSavedSuccess(true);
      onTokenSaved();
      setTimeout(() => {
        setSavedSuccess(false);
        onClose(); // Returns to the redirected view (Settings, Vault, etc.)
      }, 700);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setTokenInput('');
    await setStoredToken('');
    const latest = await checkLiveRateLimit();
    setLiveRateLimit({ ...latest });
    onTokenSaved();
  };

  if (!open) return null;

  const searchSecLeft = liveRateLimit.searchResetTime
    ? Math.max(0, Math.ceil((liveRateLimit.searchResetTime.getTime() - now) / 1000))
    : 0;

  const coreMinutesLeft = liveRateLimit.resetTime
    ? Math.max(0, Math.ceil((liveRateLimit.resetTime.getTime() - now) / 60000))
    : 0;

  const effectiveSearchRemaining =
    searchSecLeft === 0
      ? liveRateLimit.searchLimit || 30
      : (liveRateLimit.searchRemaining ?? liveRateLimit.searchLimit ?? 30);

  const coreProgress = Math.min(100, Math.max(0, (liveRateLimit.remaining / (liveRateLimit.limit || 60)) * 100));

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      sx={{
        zIndex: 1800, // Highest layer, guaranteed on top of RepoDetailSheet (1600), Settings (1350) and BottomNav (1100)
        '& .MuiDialog-paper': {
          bgcolor: 'background.default',
          backgroundImage: 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          p: 0,
          m: 0
        }
      }}
    >
      {/* ── 1. Native Top App Bar with Back Navigation to Redirected View ── */}
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
          aria-label="Back to previous screen"
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

        <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.15rem', color: 'text.primary', flex: 1 }}>
          Personal Access Token
        </Typography>
      </Box>

      {/* ── 2. Full Page Scrollable Body ── */}
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
        {/* Card 1: Live GitHub API Quota */}
        <Box
          sx={{
            p: 2,
            borderRadius: '24px',
            bgcolor: alpha(theme.palette.background.paper, 0.7),
            border: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5
          }}
        >
          {/* Live Header with Pulsing Indicator */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SpeedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                Live GitHub API Quota
              </Typography>
            </Box>
            <Button
              size="small"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              startIcon={<RefreshIcon sx={{ fontSize: 14, animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />}
              sx={{
                p: '3px 8px',
                fontSize: '0.72rem',
                minWidth: 'auto',
                color: theme.palette.primary.main,
                fontWeight: 700,
                textTransform: 'none'
              }}
            >
              {isRefreshing ? 'Refreshing…' : 'Refresh Live'}
            </Button>
          </Box>

          {/* Core API Quota */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem', fontWeight: 600 }}>
                Core API Quota (Repos, Stars, READMEs & Gists)
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                {liveRateLimit.remaining.toLocaleString()} / {liveRateLimit.limit.toLocaleString()} req/hr
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={coreProgress}
              sx={{
                height: 7,
                borderRadius: '4px',
                bgcolor: alpha(theme.palette.text.primary, 0.08),
                '& .MuiLinearProgress-bar': {
                  borderRadius: '4px',
                  bgcolor: liveRateLimit.remaining > 500 ? 'primary.main' : liveRateLimit.remaining > 100 ? '#f59e0b' : '#ef4444'
                }
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {coreMinutesLeft > 0 ? `Resets in ${coreMinutesLeft}m` : 'Active'}
              </Typography>
            </Box>
          </Box>

          {/* Search API Quota */}
          <Box sx={{ pt: 1, borderTop: `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem', fontWeight: 600 }}>
                Search API Quota (Streaming Queries)
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                {effectiveSearchRemaining} / {liveRateLimit.searchLimit || 30} req/min
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: searchSecLeft > 0 ? '#f59e0b' : '#10b981'
                }}
              >
                {searchSecLeft > 0 ? `Resets in ${searchSecLeft}s` : '✓ Ready (30/30)'}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Card 2: Token Input & Actions */}
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VpnKeyIcon sx={{ fontSize: 20, color: 'primary.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Personal Access Token (PAT)
            </Typography>
          </Box>

          <TextField
            fullWidth
            size="small"
            type={showPassword ? 'text' : 'password'}
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    sx={{ color: 'text.secondary' }}
                  >
                    {showPassword ? <VisibilityOffIcon sx={{ fontSize: 18 }} /> : <VisibilityIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '16px',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
                bgcolor: alpha(theme.palette.background.paper, 0.6)
              }
            }}
          />

          {tokenInput.trim().startsWith('github_pat_') && (
            <Typography
              variant="caption"
              sx={{
                color: '#f59e0b',
                fontWeight: 700,
                fontSize: '0.72rem',
                display: 'block',
                lineHeight: 1.4
              }}
            >
              ⚠️ GitHub Fine-grained tokens (github_pat_) do not support Gist sync. For cloud bookmarks sync, please generate a Classic Token (starts with ghp_).
            </Typography>
          )}

          {savedSuccess && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#10b981' }}>
              <CheckCircleIcon sx={{ fontSize: 18 }} />
              <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.82rem' }}>
                Token saved & live quota upgraded to 5,000 req/hr!
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1, gap: 1 }}>
            <Button
              size="small"
              onClick={handleClear}
              sx={{ color: '#ef4444', fontSize: '0.78rem', fontWeight: 700, textTransform: 'none' }}
            >
              Clear Token
            </Button>

            <Button
              variant="contained"
              size="medium"
              disabled={isSaving}
              onClick={handleSave}
              sx={{
                borderRadius: '14px',
                px: 3,
                py: 1,
                fontSize: '0.82rem',
                fontWeight: 800,
                textTransform: 'none'
              }}
            >
              {isSaving ? 'Verifying…' : 'Save Token'}
            </Button>
          </Box>
        </Box>

        {/* Card 3: Security Guarantee */}
        <Box
          sx={{
            p: 1.75,
            borderRadius: '20px',
            bgcolor: alpha('#10b981', 0.06),
            border: '1px solid rgba(16, 185, 129, 0.22)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.25
          }}
        >
          <ShieldIcon sx={{ fontSize: 18, color: '#10b981', mt: 0.2, flexShrink: 0 }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', lineHeight: 1.45 }}>
            Your token is stored <strong>locally only</strong> in Android secure storage on your device. It is never transmitted to any third-party server, communicating solely with <code style={{ color: theme.palette.primary.main }}>api.github.com</code>.
          </Typography>
        </Box>

        {/* Card 4: Required Scopes & Quick Generator Link */}
        <Box
          sx={{
            p: 2,
            borderRadius: '20px',
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <InfoOutlinedIcon sx={{ fontSize: 16, color: theme.palette.primary.main }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.82rem', color: 'text.primary' }}>
              Required Token Permissions
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.74rem', lineHeight: 1.45 }}>
            Generate a <strong>Classic Personal Access Token (ghp_)</strong> with <code style={{ color: theme.palette.primary.main }}>public_repo</code> (for starred repos & releases) and <code style={{ color: theme.palette.primary.main }}>gist</code> (for cloud bookmark sync) scopes.
          </Typography>
          <Button
            href="https://github.com/settings/tokens/new?description=OneGitVault&scopes=public_repo,gist"
            target="_blank"
            size="small"
            variant="text"
            endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
            sx={{
              mt: 0.5,
              p: 0,
              fontSize: '0.76rem',
              fontWeight: 800,
              color: theme.palette.primary.main,
              textTransform: 'none',
              justifyContent: 'flex-start'
            }}
          >
            Generate Classic token on GitHub (ghp_) →
          </Button>
        </Box>

        {/* Generous bottom clearance spacer */}
        <Box sx={{ height: 'calc(80px + env(safe-area-inset-bottom, 0px))', flexShrink: 0 }} />
      </Container>
    </Dialog>
  );
};
