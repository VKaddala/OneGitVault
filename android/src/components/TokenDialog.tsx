import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Collapse,
  CircularProgress,
  Chip,
  useTheme,
  alpha
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShieldIcon from '@mui/icons-material/Shield';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LoginIcon from '@mui/icons-material/Login';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SpeedIcon from '@mui/icons-material/Speed';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  getStoredToken,
  setStoredToken,
  checkLiveRateLimit,
  getCurrentRateLimit
} from '../services/githubApi';
import {
  DeviceCodeSession,
  getConfiguredOAuthClientId,
  startGitHubDeviceFlow,
  pollGitHubDeviceToken,
} from '../services/oauthDeviceFlow';
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

  // GitHub OAuth 8-character Device Flow state
  const [clientIdInput, setClientIdInput] = useState<string>(() => getConfiguredOAuthClientId());
  const [deviceSession, setDeviceSession] = useState<DeviceCodeSession | null>(null);
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [deviceStatusMsg, setDeviceStatusMsg] = useState<string>('');
  const [deviceError, setDeviceError] = useState<string>('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [showManualPat, setShowManualPat] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const now = Date.now();

  const openExternalBrowserUrl = useCallback((url: string) => {
    const cleanUrl = (url || '').trim();
    if (!cleanUrl) return;
    try {
      const bridge = (window as any)?.AndroidThemeBridge;
      if (bridge && typeof bridge.openExternalUrl === 'function') {
        bridge.openExternalUrl(cleanUrl);
        return;
      }
    } catch {}
    window.open(cleanUrl, '_blank', 'noopener,noreferrer');
  }, []);

  const stopDevicePolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

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
      setClientIdInput(getConfiguredOAuthClientId());
      setLiveRateLimit(getCurrentRateLimit());
      setSavedSuccess(false);
      setDeviceSession(null);
      setDeviceError('');
      setDeviceStatusMsg('');
      stopDevicePolling();

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
        stopDevicePolling();
      };
    } else {
      stopDevicePolling();
    }
  }, [open, stopDevicePolling]);

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const latest = await checkLiveRateLimit();
      setLiveRateLimit({ ...latest });
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  }, []);

  const schedulePoll = useCallback(
    (clientId: string, deviceCode: string, intervalSec: number) => {
      stopDevicePolling();
      pollTimerRef.current = setTimeout(async () => {
        const res = await pollGitHubDeviceToken(clientId, deviceCode, intervalSec);
        if (res.status === 'authorized' && res.accessToken) {
          stopDevicePolling();
          await setStoredToken(res.accessToken);
          const latest = await checkLiveRateLimit();
          setLiveRateLimit({ ...latest });
          setDeviceSession(null);
          setDeviceStatusMsg('');
          setSavedSuccess(true);
          onTokenSaved();
          setTimeout(() => {
            setSavedSuccess(false);
            onClose();
          }, 800);
          return;
        }
        if (res.status === 'pending' || res.status === 'slow_down') {
          setDeviceStatusMsg('Waiting for approval on GitHub...');
          schedulePoll(clientId, deviceCode, res.nextIntervalSec || intervalSec);
          return;
        }
        stopDevicePolling();
        setDeviceSession(null);
        setDeviceError(res.message || 'Authorization did not complete.');
      }, intervalSec * 1000);
    },
    [onClose, onTokenSaved, stopDevicePolling]
  );

  const handleStartDeviceFlow = async () => {
    setDeviceError('');
    setDeviceStatusMsg('');
    setDeviceLoading(true);
    try {
      const session = await startGitHubDeviceFlow(clientIdInput);
      setDeviceSession(session);
      setDeviceStatusMsg('Code copied — tap "Copy Code & Open GitHub" below to authorize.');
      try {
        await navigator.clipboard.writeText(session.user_code);
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2500);
      } catch {}
      schedulePoll(clientIdInput, session.device_code, session.interval);
    } catch (err: any) {
      setDeviceError(err?.message || 'Unable to start Device Flow.');
    } finally {
      setDeviceLoading(false);
    }
  };

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
      }, 700);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    stopDevicePolling();
    setDeviceSession(null);
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
        zIndex: 1800,
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
      {/* Top App Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          pt: 'calc(max(env(safe-area-inset-top, 0px), var(--status-bar-height, 44px)) + 8px)',
          px: 2,
          pb: 1.5,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
          bgcolor: 'var(--bg-header)',
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

        <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem', color: 'text.primary', flex: 1 }}>
          GitHub Account &amp; Quota
        </Typography>
      </Box>

      {/* Scrollable Body */}
      <Container
        maxWidth="sm"
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: { xs: 2, sm: 3 },
          py: 2.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {/* Card 1: Live GitHub API Quota */}
        <Box
          sx={{
            p: 2,
            borderRadius: '14px',
            bgcolor: alpha(theme.palette.background.paper, 0.7),
            border: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.25
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 0.75, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}` }}>
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
              startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
              sx={{ fontSize: '0.72rem', minWidth: 'auto', fontWeight: 700, textTransform: 'none' }}
            >
              {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
          </Box>

          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.78rem', fontWeight: 600 }}>
                Core API ({coreMinutesLeft > 0 ? `resets ${coreMinutesLeft}m` : 'Active'})
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.82rem' }}>
                {liveRateLimit.remaining.toLocaleString()} / {liveRateLimit.limit.toLocaleString()}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={coreProgress}
              sx={{
                height: 6,
                borderRadius: '4px',
                bgcolor: alpha(theme.palette.text.primary, 0.08),
              }}
            />
            <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: searchSecLeft > 0 ? '#f59e0b' : 'text.secondary', fontWeight: 700 }}>
              Search API: {effectiveSearchRemaining} / {liveRateLimit.searchLimit || 30} req/min
              {searchSecLeft > 0 ? ` (resets in ${searchSecLeft}s)` : ''}
            </Typography>
          </Box>
        </Box>

        {/* Card 2: Primary 8-Code GitHub OAuth Device Flow */}
        <Box
          sx={{
            p: 2,
            borderRadius: '14px',
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.24)}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.85, minWidth: 0 }}>
              <LoginIcon sx={{ fontSize: 19, color: 'primary.main', flexShrink: 0 }} />
              <Typography
                variant="subtitle2"
                noWrap
                sx={{ fontWeight: 800, fontSize: '0.88rem', lineHeight: 1.2 }}
              >
                GitHub Device Login
              </Typography>
            </Box>
            <Chip
              size="small"
              label="1-Tap Auto-Copy"
              color="primary"
              sx={{ height: 22, fontSize: '0.66rem', fontWeight: 800, borderRadius: '6px', flexShrink: 0 }}
            />
          </Box>

          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.76rem', lineHeight: 1.5 }}>
            Authorizes{' '}
            <Box
              component="code"
              sx={{
                px: 0.65,
                py: 0.15,
                borderRadius: '5px',
                fontSize: '0.72rem',
                fontWeight: 700,
                fontFamily: 'monospace',
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                color: 'primary.main',
              }}
            >
              public_repo
            </Box>{' '}
            +{' '}
            <Box
              component="code"
              sx={{
                px: 0.65,
                py: 0.15,
                borderRadius: '5px',
                fontSize: '0.72rem',
                fontWeight: 700,
                fontFamily: 'monospace',
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                color: 'primary.main',
              }}
            >
              gist
            </Box>{' '}
            scopes via an 8-character GitHub code and stores tokens inside Android Hardware Keystore.
          </Typography>

          {!deviceSession ? (
            <>
              <TextField
                fullWidth
                size="small"
                label="GitHub OAuth App Client ID"
                value={clientIdInput}
                onChange={(e) => setClientIdInput(e.target.value)}
                placeholder="e.g. Ov23liXXXXXXXXXXXXXX"
                helperText={
                  clientIdInput.trim()
                    ? 'Client ID ready — tap "Get 8-Char Login Code" below.'
                    : 'Optional: paste an OAuth App Client ID (Device Flow enabled), or use Classic PAT below.'
                }
                sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: '0.82rem', fontFamily: 'monospace' },
                }}
              />
              {deviceError && (
                <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 700 }}>
                  {deviceError}
                </Typography>
              )}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.25,
                  pt: 0.25,
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  size="small"
                  onClick={() => openExternalBrowserUrl('https://github.com/settings/applications/new')}
                  endIcon={<OpenInNewIcon sx={{ fontSize: '14px !important', ml: 0.25 }} />}
                  sx={{
                    minHeight: 44,
                    px: 1.5,
                    borderRadius: '10px',
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.76rem',
                  }}
                >
                  Create OAuth App
                </Button>
                <Button
                  variant={clientIdInput.trim() ? 'contained' : 'outlined'}
                  size="medium"
                  disabled={deviceLoading || !clientIdInput.trim()}
                  onClick={handleStartDeviceFlow}
                  startIcon={deviceLoading ? <CircularProgress size={14} color="inherit" /> : <LoginIcon />}
                  sx={{
                    minHeight: 44,
                    px: 2,
                    borderRadius: '10px',
                    textTransform: 'none',
                    fontWeight: 800,
                  }}
                >
                  {deviceLoading ? 'Requesting Code…' : 'Get 8-Char Login Code'}
                </Button>
              </Box>
            </>
          ) : (
            <Box
              sx={{
                p: 2,
                borderRadius: '12px',
                bgcolor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1.25
              }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                Tap below to copy your 8-character code and enter it on GitHub
              </Typography>
              <Typography
                sx={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '1.6rem',
                  fontWeight: 900,
                  letterSpacing: '0.12em',
                  color: 'primary.main',
                }}
              >
                {deviceSession.user_code}
              </Typography>
              <Button
                fullWidth
                size="medium"
                variant="contained"
                startIcon={<ContentCopyIcon sx={{ fontSize: 16 }} />}
                endIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
                onClick={() => {
                  navigator.clipboard?.writeText(deviceSession.user_code).catch(() => {});
                  setCodeCopied(true);
                  setTimeout(() => setCodeCopied(false), 2500);
                  openExternalBrowserUrl(deviceSession.verification_uri);
                }}
                sx={{
                  minHeight: 46,
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                }}
              >
                {codeCopied ? 'Copied! Opening GitHub…' : 'Copy Code & Open GitHub'}
              </Button>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                <CircularProgress size={14} />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                  {deviceStatusMsg || 'Waiting for confirmation on GitHub...'}
                </Typography>
              </Box>
              <Button
                size="small"
                color="inherit"
                onClick={() => {
                  stopDevicePolling();
                  setDeviceSession(null);
                }}
                sx={{ minHeight: 38, fontSize: '0.74rem', textTransform: 'none' }}
              >
                Cancel Device Login
              </Button>
            </Box>
          )}
        </Box>

        {savedSuccess && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#10b981', px: 1 }}>
            <CheckCircleIcon sx={{ fontSize: 18 }} />
            <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.82rem' }}>
              Authenticated securely! Live quota upgraded to 5,000 req/hr.
            </Typography>
          </Box>
        )}

        {/* Card 3: Collapsible Manual Classic PAT Fallback */}
        <Box
          sx={{
            p: 1.75,
            borderRadius: '14px',
            bgcolor: alpha(theme.palette.text.primary, 0.03),
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box
            role="button"
            tabIndex={0}
            onClick={() => setShowManualPat((p) => !p)}
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <VpnKeyIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.84rem' }}>
                Or use Classic Personal Access Token (PAT)
              </Typography>
            </Box>
            <ExpandMoreIcon
              sx={{
                transform: showManualPat ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s ease',
              }}
            />
          </Box>

          <Collapse in={showManualPat}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mt: 1.5 }}>
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
                    borderRadius: '10px',
                    fontSize: '0.84rem',
                    fontFamily: 'monospace',
                    bgcolor: alpha(theme.palette.background.paper, 0.6)
                  }
                }}
              />

              {tokenInput.trim().startsWith('github_pat_') && (
                <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.72rem' }}>
                  Fine-grained tokens (github_pat_) do not support Gist sync. Use Classic PAT (ghp_) or Device Flow.
                </Typography>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Button
                  onClick={() =>
                    openExternalBrowserUrl('https://github.com/settings/tokens/new?description=OneGitVault&scopes=public_repo,gist')
                  }
                  size="small"
                  endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
                  sx={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'none' }}
                >
                  Generate ghp_ Token
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  disabled={isSaving}
                  onClick={handleSave}
                  sx={{ borderRadius: '9px', px: 2.2, fontWeight: 800, textTransform: 'none' }}
                >
                  {isSaving ? 'Verifying…' : 'Save PAT'}
                </Button>
              </Box>
            </Box>
          </Collapse>
        </Box>

        {/* Sign Out / Clear Token Button */}
        {getStoredToken() && (
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={handleClear}
            sx={{ alignSelf: 'flex-start', borderRadius: '9px', textTransform: 'none', fontWeight: 700 }}
          >
            Disconnect &amp; Clear Stored Token
          </Button>
        )}

        {/* Security Guarantee */}
        <Box
          sx={{
            p: 1.5,
            borderRadius: '12px',
            bgcolor: alpha('#10b981', 0.06),
            border: '1px solid rgba(16, 185, 129, 0.22)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.25
          }}
        >
          <ShieldIcon sx={{ fontSize: 18, color: '#10b981', mt: 0.2, flexShrink: 0 }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.74rem', lineHeight: 1.45 }}>
            Tokens are encrypted with Android Hardware Keystore (AES-256-GCM) and never leave your device except directly over HTTPS to GitHub.
          </Typography>
        </Box>
      </Container>
    </Dialog>
  );
};
