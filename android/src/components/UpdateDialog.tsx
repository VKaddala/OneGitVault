import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
  IconButton,
  Chip,
  Alert,
  useTheme,
  alpha
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { AndroidUpdateInfo, startAndroidUpdate } from '../services/updateService';
import { renderMarkdownToSafeHtml, isSafeHttpUrl } from '../utils/sanitizeMarkdown';

interface UpdateDialogProps {
  open: boolean;
  onClose: () => void;
  updateInfo: AndroidUpdateInfo | null;
}

export const UpdateDialog: React.FC<UpdateDialogProps> = ({
  open,
  onClose,
  updateInfo,
}) => {
  const theme = useTheme();
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (open) {
      setDownloading(false);
      setProgress(0);
      setStatusText('');
      setErrorText(null);
      setCompleted(false);
    }
  }, [open]);

  if (!updateInfo) return null;

  const handleStartUpdate = () => {
    if (!updateInfo.apkDownloadUrl) {
      if (isSafeHttpUrl(updateInfo.releaseUrl, true)) {
        window.open(updateInfo.releaseUrl, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    setDownloading(true);
    setCompleted(false);
    setProgress(5);
    setStatusText('Downloading APK...');
    setErrorText(null);

    startAndroidUpdate(
      updateInfo.apkDownloadUrl,
      updateInfo.latestVersion,
      (pct, status) => {
        setProgress(pct);
        setStatusText(status);
        if (pct >= 100) {
          setCompleted(true);
        }
      },
      (err) => {
        setDownloading(false);
        setCompleted(false);
        setErrorText(err);
      },
      updateInfo.apkDigest
    );
  };

  const handleCloseApp = async () => {
    try {
      const { App: CapApp } = await import('@capacitor/app');
      await CapApp.exitApp();
    } catch {
      // Fallback for non-native preview
    } finally {
      onClose();
    }
  };

  const targetApkName = `OneGitVault-v${updateInfo.latestVersion}.apk`;

  const formattedSize = updateInfo.apkSize
    ? `${(updateInfo.apkSize / (1024 * 1024)).toFixed(1)} MB`
    : '';

  const parsedBody = updateInfo.releaseBody
    ? renderMarkdownToSafeHtml(updateInfo.releaseBody)
    : '';

  return (
    <Dialog
      open={open}
      onClose={downloading && !completed ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: 'var(--bg-menu)',
          backgroundImage: 'none',
          border: `1px solid ${theme.palette.divider}`,
          overflow: 'hidden',
          mx: { xs: 2, sm: 'auto' },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          py: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 38,
              height: 38,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              color: 'primary.main',
            }}
          >
            <SystemUpdateAltIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Update Available
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                v{updateInfo.currentVersion} →
              </Typography>
              <Chip
                label={`v${updateInfo.latestVersion}`}
                size="small"
                color="primary"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  px: 0.2,
                }}
              />
              {formattedSize && (
                <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
                  ({formattedSize})
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
        {(!downloading || completed) && (
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, py: 2 }}>
        {errorText && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {errorText}
          </Alert>
        )}

        {downloading ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: completed ? 'success.main' : 'text.primary' }}>
                {completed ? 'Download successful!' : (statusText || 'Downloading APK in background...')}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, color: completed ? 'success.main' : 'primary.main' }}>
                {progress}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              color={completed ? 'success' : 'primary'}
              value={progress}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: alpha(completed ? theme.palette.success.main : theme.palette.primary.main, 0.12),
              }}
            />
            {completed ? (
              <Box
                sx={{
                  mt: 2.5,
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.8
                }}
              >
                <CheckCircleIcon sx={{ fontSize: 36, color: 'success.main' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'success.main' }}>
                  Download Successful!
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, textAlign: 'center', lineHeight: 1.45 }}>
                  Close the app and install the APK ({targetApkName}) from your notification bar or Downloads folder.
                </Typography>
              </Box>
            ) : (
              <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1.5, display: 'block' }}>
                Downloading update directly from GitHub release.
              </Typography>
            )}
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
              A new version of OneGitVault is ready to download and install.
            </Typography>

            {parsedBody ? (
              <Box
                sx={{
                  maxHeight: 220,
                  overflowY: 'auto',
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.background.default, 0.6),
                  border: `1px solid ${theme.palette.divider}`,
                  fontSize: '0.825rem',
                  color: 'text.primary',
                  '& h1, & h2, & h3': {
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    mt: 1,
                    mb: 0.5,
                  },
                  '& ul, & ol': {
                    pl: 2.5,
                    my: 0.5,
                  },
                  '& li': {
                    mb: 0.3,
                  },
                  '& p': {
                    my: 0.5,
                  },
                  '& code': {
                    px: 0.6,
                    py: 0.2,
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                  },
                }}
                dangerouslySetInnerHTML={{ __html: parsedBody }}
              />
            ) : null}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.8, borderTop: `1px solid ${theme.palette.divider}` }}>
        {!downloading ? (
          <>
            <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600, textTransform: 'none' }}>
              Later
            </Button>
            <Button
              onClick={handleStartUpdate}
              variant="contained"
              startIcon={<SystemUpdateAltIcon />}
              sx={{
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 2,
                px: 2.5,
              }}
            >
              Update Now
            </Button>
          </>
        ) : completed ? (
          <>
            <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600, textTransform: 'none' }}>
              Dismiss
            </Button>
            <Button
              onClick={handleCloseApp}
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2, px: 2.5 }}
            >
              Close App
            </Button>
          </>
        ) : (
          <Button disabled sx={{ textTransform: 'none', fontWeight: 600 }}>
            Downloading APK...
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
