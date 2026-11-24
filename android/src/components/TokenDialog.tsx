import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Button,
  TextField,
  IconButton,
  LinearProgress,
  useTheme,
  alpha
} from '@mui/material';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import ShieldIcon from '@mui/icons-material/Shield';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
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
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [liveRateLimit, setLiveRateLimit] = useState<RateLimitInfo>(getCurrentRateLimit());
  const now = Date.now();

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
      // Gentle polling (every 10s) to keep quota updated without interrupting typing
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
        onClose();
      }, 900);
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
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      sx={{
        '& .MuiBackdrop-root': {
          backdropFilter: 'blur(12px)',
          bgcolor: 'rgba(0, 0, 0, 0.75)'
        },
        '& .MuiDialog-paper': {
          borderRadius: '24px',
          bgcolor: theme.palette.mode === 'dark' ? '#0d1117 !important' : '#ffffff !important',
          backgroundColor: theme.palette.mode === 'dark' ? '#0d1117 !important' : '#ffffff !important',
          backgroundImage: 'none !important',
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.95)',
          overflow: 'hidden',
          m: 2,
          mt: 'calc(max(env(safe-area-inset-top, 0px), var(--status-bar-height, 42px)) + 12px)'
        }
      }}
    >
      {/* Header */}
      <DialogTitle sx={{ px: 2.5, pt: 2.5, pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: '12px',
              bgcolor: alpha(theme.palette.primary.main, 0.15),
              color: theme.palette.primary.main,
              display: 'flex'
            }}
          >
            <VpnKeyIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2, fontSize: '1rem' }}>
              GitHub API Access
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem' }}>
              Real-Time Quota & Authentication
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, py: 1 }}>
        {/* Live GitHub API Quota Box */}
        <Box
          sx={{
            p: 1.75,
            mb: 2,
            borderRadius: '16px',
            bgcolor: alpha(theme.palette.background.default, 0.7),
            border: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.25
          }}
        >
          {/* Live Header with Pulsing Green Indicator */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: '#10b981',
                  boxShadow: '0 0 8px #10b981'
                }}
              />
              <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.primary' }}>
                Live GitHub API Quota
              </Typography>
            </Box>
            <Button
              size="small"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              startIcon={<RefreshIcon sx={{ fontSize: 13, animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />}
              sx={{
                p: '2px 6px',
                fontSize: '0.675rem',
                minWidth: 'auto',
                color: theme.palette.primary.main,
                fontWeight: 700
              }}
            >
              {isRefreshing ? 'Refreshing…' : 'Refresh Live'}
            </Button>
          </Box>

          {/* Core API Quota */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                Core API Quota:
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.75rem' }}>
                {liveRateLimit.remaining} / {liveRateLimit.limit} req/hr
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={coreProgress}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: alpha(theme.palette.text.primary, 0.08),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  bgcolor: theme.palette.primary.main
                }
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                Repos, Stars, READMEs & Gists
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem', fontWeight: 700 }}>
                {coreMinutesLeft > 0 ? `Resets in ${coreMinutesLeft}m` : 'Active'}
              </Typography>
            </Box>
          </Box>

          {/* Search API Quota */}
          <Box sx={{ pt: 1, borderTop: `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                Search API Quota:
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.75rem' }}>
                {effectiveSearchRemaining} / {liveRateLimit.searchLimit || 30} req/min
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                Streaming & Filter Queries
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  color: searchSecLeft > 0 ? '#f59e0b' : '#10b981'
                }}
              >
                {searchSecLeft > 0 ? `Resets in ${searchSecLeft}s` : '✓ Ready (30/30)'}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Security & Token Info */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
          <ShieldIcon sx={{ fontSize: 16, color: '#10b981', mt: 0.25, flexShrink: 0 }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem', lineHeight: 1.4 }}>
            Your token is stored <strong>locally only</strong> on your device. It is never transmitted anywhere other than direct calls to <code style={{ color: theme.palette.primary.main }}>api.github.com</code>.
          </Typography>
        </Box>

        <Box
          sx={{
            p: 1.5,
            mb: 2,
            borderRadius: '14px',
            bgcolor: alpha(theme.palette.primary.main, 0.06),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
            <InfoOutlinedIcon sx={{ fontSize: 14, color: theme.palette.primary.main }} />
            <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.72rem', color: 'text.primary' }}>
              Required Token Type & Permissions:
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem', display: 'block', lineHeight: 1.4 }}>
            Create a <strong>Classic Personal Access Token (ghp_)</strong> with <code style={{ color: theme.palette.primary.main }}>public_repo</code> and <code style={{ color: theme.palette.primary.main }}>gist</code> scopes. <em>Note: GitHub Fine-grained tokens (github_pat_) do not support Gist sync.</em>
          </Typography>
          <Button
            href="https://github.com/settings/tokens/new?description=OneGitVault&scopes=public_repo,gist"
            target="_blank"
            size="small"
            endIcon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
            sx={{
              mt: 0.75,
              p: 0,
              fontSize: '0.7rem',
              fontWeight: 800,
              color: theme.palette.primary.main,
              textTransform: 'none'
            }}
          >
            Generate Classic token on GitHub (ghp_)
          </Button>
        </Box>

        {/* Token Input */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mb: 0.5, display: 'block', fontSize: '0.72rem' }}>
            Personal Access Token (PAT)
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxx"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '14px',
                fontSize: '0.8rem',
                fontFamily: 'monospace'
              }
            }}
          />
          {tokenInput.trim().startsWith('github_pat_') && (
            <Typography
              variant="caption"
              sx={{
                color: '#f59e0b',
                fontWeight: 700,
                fontSize: '0.68rem',
                display: 'block',
                mt: 0.75,
                lineHeight: 1.3
              }}
            >
              ⚠️ GitHub Fine-grained tokens do not support Gists. To sync bookmarks, please use a Classic Token (starts with ghp_).
            </Typography>
          )}
        </Box>

        {savedSuccess && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, color: '#10b981' }}>
            <CheckCircleIcon sx={{ fontSize: 16 }} />
            <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.75rem' }}>
              Token saved & live quota verified!
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 1, justifyContent: 'space-between' }}>
        <Button
          size="small"
          onClick={handleClear}
          sx={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 700 }}
        >
          Clear Token
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            onClick={onClose}
            sx={{ color: 'text.secondary', fontSize: '0.75rem', fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            disabled={isSaving}
            onClick={handleSave}
            sx={{
              borderRadius: '12px',
              px: 2,
              fontSize: '0.75rem',
              fontWeight: 800
            }}
          >
            {isSaving ? 'Verifying…' : 'Save Token'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
