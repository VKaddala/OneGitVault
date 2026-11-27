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
  CircularProgress,
  Chip,
  Tabs,
  Tab,
  Avatar,
  Alert,
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
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LanguageIcon from '@mui/icons-material/Language';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  getStoredToken,
  setStoredToken,
  checkLiveRateLimit,
  getCurrentRateLimit,
  fetchAuthenticatedUser,
  getCachedUser,
  GitHubUserProfile
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
  const [activeTab, setActiveTab] = useState<'pat' | 'oauth'>('pat');
  const [tokenInput, setTokenInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string>('');
  const [userProfile, setUserProfile] = useState<GitHubUserProfile | null>(() => getCachedUser());
  const [authNotice, setAuthNotice] = useState<string>('');
  const [clipboardToken, setClipboardToken] = useState<string>('');
  const [liveRateLimit, setLiveRateLimit] = useState<RateLimitInfo>(getCurrentRateLimit());

  // GitHub OAuth 8-character Device Flow state
  const [clientIdInput, setClientIdInput] = useState<string>(() => getConfiguredOAuthClientId());
  const [deviceSession, setDeviceSession] = useState<DeviceCodeSession | null>(null);
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [deviceStatusMsg, setDeviceStatusMsg] = useState<string>('');
  const [deviceError, setDeviceError] = useState<string>('');
  const [codeCopied, setCodeCopied] = useState(false);
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

  // Inspect clipboard for GitHub token (e.g. ghp_... or github_pat_...)
  const checkClipboardForToken = useCallback(async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) return;
      const text = (await navigator.clipboard.readText() || '').trim();
      if ((text.startsWith('ghp_') || text.startsWith('github_pat_')) && text.length >= 20) {
        if (text !== getStoredToken()) {
          setClipboardToken(text);
        }
      }
    } catch {}
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

  // Window focus listener: detect when user returns from GitHub in the browser
  useEffect(() => {
    if (!open) return;

    const handleFocus = () => {
      checkClipboardForToken();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [open, checkClipboardForToken]);

  useEffect(() => {
    if (open) {
      const current = getStoredToken();
      setTokenInput(current);
      setClientIdInput(getConfiguredOAuthClientId());
      setLiveRateLimit(getCurrentRateLimit());
      setSavedSuccess(false);
      setSaveError('');
      setDeviceSession(null);
      setDeviceError('');
      setDeviceStatusMsg('');
      stopDevicePolling();

      // Check if there was an auth error from previous expired token
      try {
        const lastErr = sessionStorage.getItem('ogv_last_auth_error');
        if (lastErr && !current) {
          setAuthNotice(lastErr);
          sessionStorage.removeItem('ogv_last_auth_error');
        } else {
          setAuthNotice('');
        }
      } catch {}

      // Check clipboard immediately on open
      checkClipboardForToken();

      let mounted = true;
      const fetchLive = async () => {
        try {
          const latest = await checkLiveRateLimit();
          if (mounted) setLiveRateLimit({ ...latest });
          if (getStoredToken()) {
            const profile = await fetchAuthenticatedUser();
            if (mounted && profile) setUserProfile(profile);
          } else {
            if (mounted) setUserProfile(null);
          }
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
  }, [open, stopDevicePolling, checkClipboardForToken]);

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const latest = await checkLiveRateLimit(true);
      setLiveRateLimit({ ...latest });
      if (getStoredToken()) {
        const profile = await fetchAuthenticatedUser();
        if (profile) setUserProfile(profile);
      }
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
          const profile = await fetchAuthenticatedUser();
          if (profile) setUserProfile(profile);
          const latest = await checkLiveRateLimit(true);
          setLiveRateLimit({ ...latest });
          setDeviceSession(null);
          setDeviceStatusMsg('');
          setSavedSuccess(true);
          setClipboardToken('');
          onTokenSaved();
          setTimeout(() => {
            setSavedSuccess(false);
            onClose();
          }, 900);
          return;
        }
        if (res.status === 'pending' || res.status === 'slow_down') {
          setDeviceStatusMsg('Waiting for approval on GitHub…');
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

  const handleSaveToken = async (tokenToSave: string) => {
    const clean = tokenToSave.trim();
    if (!clean) {
      setSaveError('Please enter or paste a valid GitHub token.');
      return;
    }
    setSaveError('');
    setIsSaving(true);
    try {
      await setStoredToken(clean);
      const profile = await fetchAuthenticatedUser();
      const latest = await checkLiveRateLimit(true);
      setLiveRateLimit({ ...latest });

      if (profile && profile.login) {
        setUserProfile(profile);
        setSavedSuccess(true);
        setAuthNotice('');
        setClipboardToken('');
        onTokenSaved();
        setTimeout(() => {
          setSavedSuccess(false);
          onClose();
        }, 900);
      } else {
        // If profile fetch failed or returned null, token might be invalid
        const activeToken = getStoredToken();
        if (!activeToken) {
          setSaveError('Token was rejected by GitHub (HTTP 401: Bad credentials). Please check the token.');
        } else {
          setSavedSuccess(true);
          setClipboardToken('');
          onTokenSaved();
          setTimeout(() => {
            setSavedSuccess(false);
            onClose();
          }, 900);
        }
      }
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to verify token with GitHub.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = (await navigator.clipboard.readText() || '').trim();
        if (text) {
          setTokenInput(text);
          setSaveError('');
        }
      }
    } catch {
      setSaveError('Could not read clipboard. Please paste manually into the input box.');
    }
  };

  const handleClear = async () => {
    stopDevicePolling();
    setDeviceSession(null);
    setTokenInput('');
    setClipboardToken('');
    setUserProfile(null);
    await setStoredToken('');
    const latest = await checkLiveRateLimit(true);
    setLiveRateLimit({ ...latest });
    onTokenSaved();
  };

  if (!open) return null;

  const isConnected = !!getStoredToken();

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

        {isConnected && (
          <Chip
            size="small"
            label="5,000 req/hr"
            color="success"
            sx={{ fontWeight: 800, fontSize: '0.72rem', height: 24, borderRadius: '7px' }}
          />
        )}
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
        {/* Token Expired or Auth Error Notice */}
        {authNotice && (
          <Alert
            severity="warning"
            icon={<WarningAmberIcon />}
            onClose={() => setAuthNotice('')}
            sx={{ borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}
          >
            {authNotice}. OneGitVault kept your requests online using public guest access. Connect a new token below to restore 5,000 req/hr!
          </Alert>
        )}

        {/* Card 1: Account Status & Profile */}
        <Box
          sx={{
            p: 2,
            borderRadius: '16px',
            bgcolor: isConnected ? alpha('#10b981', 0.08) : alpha(theme.palette.text.primary, 0.04),
            border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.35)' : theme.palette.divider}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
              <Avatar
                src={userProfile?.avatar_url}
                sx={{
                  width: 44,
                  height: 44,
                  bgcolor: isConnected ? 'primary.main' : alpha(theme.palette.text.primary, 0.15),
                  border: isConnected ? '2px solid #10b981' : 'none'
                }}
              >
                {userProfile?.login ? userProfile.login.charAt(0).toUpperCase() : <VpnKeyIcon sx={{ fontSize: 22 }} />}
              </Avatar>

              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2, color: 'text.primary' }} noWrap>
                  {isConnected
                    ? (userProfile?.name || `@${userProfile?.login || 'Authenticated User'}`)
                    : 'Guest Access (Unauthenticated)'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
                  {isConnected
                    ? `@${userProfile?.login || 'user'} • 5,000 req/hr • Cloud Sync Active`
                    : 'Public Limit: 60 req/hr • Direct Starring Locked'}
                </Typography>
              </Box>
            </Box>

            {isConnected ? (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<LogoutIcon sx={{ fontSize: 14 }} />}
                onClick={handleClear}
                sx={{
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.74rem',
                  flexShrink: 0,
                  py: 0.6
                }}
              >
                Sign Out
              </Button>
            ) : (
              <Chip
                size="small"
                label="Guest"
                sx={{ borderRadius: '7px', fontWeight: 800, fontSize: '0.7rem' }}
              />
            )}
          </Box>

          {/* Live Quota Progress */}
          <Box sx={{ pt: 1, borderTop: `1px solid ${alpha(theme.palette.divider, 0.6)}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.78rem', fontWeight: 700 }}>
                Core API: {liveRateLimit.remaining.toLocaleString()} / {liveRateLimit.limit.toLocaleString()}
                {coreMinutesLeft > 0 ? ` (resets in ${coreMinutesLeft}m)` : ''}
              </Typography>
              <Button
                size="small"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                startIcon={<RefreshIcon sx={{ fontSize: 12 }} />}
                sx={{ fontSize: '0.7rem', minWidth: 'auto', p: '2px 8px', fontWeight: 700, textTransform: 'none' }}
              >
                {isRefreshing ? 'Checking…' : 'Refresh'}
              </Button>
            </Box>

            <LinearProgress
              variant="determinate"
              value={coreProgress}
              sx={{
                height: 6,
                borderRadius: '4px',
                bgcolor: alpha(theme.palette.text.primary, 0.08),
                '& .MuiLinearProgress-bar': {
                  bgcolor: isConnected ? '#10b981' : theme.palette.primary.main
                }
              }}
            />

            <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: searchSecLeft > 0 ? '#f59e0b' : 'text.secondary', fontWeight: 700 }}>
              Search API: {effectiveSearchRemaining} / {liveRateLimit.searchLimit || 30} req/min
              {searchSecLeft > 0 ? ` (resets in ${searchSecLeft}s)` : ''}
            </Typography>
          </Box>
        </Box>

        {/* Clipboard Token Auto-Detected Prompt */}
        {clipboardToken && !isConnected && (
          <Box
            sx={{
              p: 2,
              borderRadius: '14px',
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              border: `1.5px solid ${theme.palette.primary.main}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.25,
              animation: 'pulse 2s infinite'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ContentPasteIcon sx={{ color: 'primary.main', fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                GitHub Token Detected on Clipboard!
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
              {clipboardToken.substring(0, 8)}••••••••••••••••••••••••••••
            </Typography>
            <Button
              variant="contained"
              size="medium"
              disabled={isSaving}
              onClick={() => handleSaveToken(clipboardToken)}
              startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
              sx={{
                borderRadius: '10px',
                fontWeight: 800,
                textTransform: 'none',
                minHeight: 42
              }}
            >
              {isSaving ? 'Connecting…' : 'Connect with Detected Token'}
            </Button>
          </Box>
        )}

        {/* Authentication Method Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            variant="fullWidth"
            sx={{
              minHeight: 42,
              '& .MuiTab-root': {
                minHeight: 42,
                fontSize: '0.82rem',
                fontWeight: 800,
                textTransform: 'none'
              }
            }}
          >
            <Tab
              value="pat"
              icon={<VpnKeyIcon sx={{ fontSize: 16 }} />}
              iconPosition="start"
              label="PAT Key (Recommended)"
            />
            <Tab
              value="oauth"
              icon={<LanguageIcon sx={{ fontSize: 16 }} />}
              iconPosition="start"
              label="Web Login / OAuth"
            />
          </Tabs>
        </Box>

        {/* TAB 1: 1-Tap Web Redirect PAT Flow (Recommended & Simple) */}
        {activeTab === 'pat' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Step 1: 1-Tap GitHub Web Redirect Button */}
            <Box
              sx={{
                p: 2,
                borderRadius: '14px',
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.9rem' }}>
                  Step 1: Open GitHub in Browser
                </Typography>
                <Chip
                  size="small"
                  label="1-Tap Pre-Configured"
                  color="primary"
                  sx={{ height: 22, fontSize: '0.68rem', fontWeight: 800, borderRadius: '6px' }}
                />
              </Box>

              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.78rem', lineHeight: 1.5 }}>
                Tapping the button below opens GitHub with the exact required permissions (<code>public_repo</code> and <code>gist</code>) and token note already pre-filled. Just scroll to the bottom, tap <strong>Generate token</strong>, and copy it!
              </Typography>

              <Button
                variant="contained"
                size="large"
                startIcon={<OpenInNewIcon />}
                onClick={() =>
                  openExternalBrowserUrl(
                    'https://github.com/settings/tokens/new?description=OneGitVault&scopes=public_repo,gist'
                  )
                }
                sx={{
                  minHeight: 48,
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  textTransform: 'none',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
                }}
              >
                Open GitHub Token Generator ↗
              </Button>
            </Box>

            {/* Step 2: Paste and Connect */}
            <Box
              sx={{
                p: 2,
                borderRadius: '14px',
                bgcolor: alpha(theme.palette.background.paper, 0.7),
                border: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.9rem' }}>
                Step 2: Paste &amp; Connect Token
              </Typography>

              <TextField
                fullWidth
                size="small"
                type={showPassword ? 'text' : 'password'}
                value={tokenInput}
                onChange={(e) => {
                  setTokenInput(e.target.value);
                  setSaveError('');
                }}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={handlePasteFromClipboard}
                        title="Paste from clipboard"
                        sx={{ color: 'text.secondary', mr: 0.5 }}
                      >
                        <ContentPasteIcon sx={{ fontSize: 19 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: 'text.secondary' }}
                      >
                        {showPassword ? <VisibilityOffIcon sx={{ fontSize: 19 }} /> : <VisibilityIcon sx={{ fontSize: 19 }} />}
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

              {saveError && (
                <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 700, fontSize: '0.74rem' }}>
                  {saveError}
                </Typography>
              )}

              {tokenInput.trim().startsWith('github_pat_') && (
                <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.72rem' }}>
                  Note: Fine-grained tokens (github_pat_) do not support Gist sync. Classic tokens (ghp_) support both starring and Cloud Gist sync.
                </Typography>
              )}

              <Button
                variant="contained"
                size="medium"
                disabled={isSaving || !tokenInput.trim()}
                onClick={() => handleSaveToken(tokenInput)}
                startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                sx={{
                  minHeight: 46,
                  borderRadius: '11px',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  textTransform: 'none'
                }}
              >
                {isSaving ? 'Verifying with GitHub…' : 'Save & Connect Account'}
              </Button>
            </Box>
          </Box>
        )}

        {/* TAB 2: Web Login / OAuth Device Flow */}
        {activeTab === 'oauth' && (
          <Box
            sx={{
              p: 2,
              borderRadius: '14px',
              bgcolor: alpha(theme.palette.background.paper, 0.7),
              border: `1px solid ${theme.palette.divider}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.85 }}>
                <LoginIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.9rem' }}>
                  GitHub OAuth Device Flow
                </Typography>
              </Box>
              <Chip
                size="small"
                label="No Secret Required"
                sx={{ height: 22, fontSize: '0.68rem', fontWeight: 800, borderRadius: '6px' }}
              />
            </Box>

            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.76rem', lineHeight: 1.5 }}>
              Enter an OAuth App Client ID (with Device Flow enabled on GitHub) to log in using an 8-character code.
            </Typography>

            {!deviceSession ? (
              <>
                <TextField
                  fullWidth
                  size="small"
                  label="OAuth App Client ID"
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  placeholder="e.g. Ov23liXXXXXXXXXXXXXX"
                  sx={{
                    '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: '0.82rem', fontFamily: 'monospace' },
                  }}
                />

                {deviceError && (
                  <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 700 }}>
                    {deviceError}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.25, pt: 0.25 }}>
                  <Button
                    size="small"
                    onClick={() => openExternalBrowserUrl('https://github.com/settings/applications/new')}
                    endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                    sx={{ minHeight: 42, textTransform: 'none', fontWeight: 700, fontSize: '0.76rem' }}
                  >
                    Create OAuth App
                  </Button>
                  <Button
                    variant="contained"
                    size="medium"
                    disabled={deviceLoading || !clientIdInput.trim()}
                    onClick={handleStartDeviceFlow}
                    startIcon={deviceLoading ? <CircularProgress size={14} color="inherit" /> : <LoginIcon />}
                    sx={{
                      minHeight: 42,
                      px: 2,
                      borderRadius: '10px',
                      textTransform: 'none',
                      fontWeight: 800,
                    }}
                  >
                    {deviceLoading ? 'Requesting Code…' : 'Get 8-Char Code'}
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
                  Enter this code on GitHub to authorize:
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
                  Cancel
                </Button>
              </Box>
            )}
          </Box>
        )}

        {/* Success Banner */}
        {savedSuccess && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#10b981', px: 1, py: 0.5 }}>
            <CheckCircleIcon sx={{ fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.84rem' }}>
              Authenticated successfully! Upgraded to 5,000 req/hr.
            </Typography>
          </Box>
        )}

        {/* Hardware Security Guarantee */}
        <Box
          sx={{
            p: 1.5,
            borderRadius: '12px',
            bgcolor: alpha('#10b981', 0.06),
            border: '1px solid rgba(16, 185, 129, 0.22)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.25,
            mt: 'auto'
          }}
        >
          <ShieldIcon sx={{ fontSize: 18, color: '#10b981', mt: 0.2, flexShrink: 0 }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.74rem', lineHeight: 1.45 }}>
            Tokens are stored with hardware-backed encryption (AES-256-GCM) in the Android Keystore. They are strictly communicated directly to official <code>api.github.com</code> endpoints.
          </Typography>
        </Box>
      </Container>
    </Dialog>
  );
};
