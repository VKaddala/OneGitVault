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
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { AndroidUpdateInfo, startAndroidUpdate } from '../services/updateService';

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
      window.open(updateInfo.releaseUrl, '_blank');
      return;
    }

    setDownloading(true);
    setProgress(5);
    setStatusText('Starting background download...');
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
        setErrorText(err);
      }
    );
  };

  const formattedSize = updateInfo.apkSize
    ? `${(updateInfo.apkSize / (1024 * 1024)).toFixed(1)} MB`
    : '';

  const parsedBody = updateInfo.releaseBody
    ? DOMPurify.sanitize(marked.parse(updateInfo.releaseBody) as string)
    : '';

  return (
    <Dialog
      open={open}
      onClose={downloading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: 'background.paper',
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
        {!downloading && (
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
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {statusText || 'Downloading APK in background...'}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                {progress}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: alpha(theme.palette.primary.main, 0.12),
              }}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1.5, display: 'block' }}>
              {completed
                ? 'Launching native package installer...'
                : 'Downloading update directly from GitHub release.'}
            </Typography>
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
          <Button
            onClick={handleStartUpdate}
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
          >
            Re-Open Installer
          </Button>
        ) : (
          <Button disabled sx={{ textTransform: 'none', fontWeight: 600 }}>
            Installing in background...
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
