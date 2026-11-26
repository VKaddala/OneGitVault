import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  useTheme,
  alpha
} from '@mui/material';
import AndroidIcon from '@mui/icons-material/Android';
import DownloadIcon from '@mui/icons-material/Download';
import {
  ApkDownloadRequest,
  executeApkDownload,
  setDownloadConfirmationListenerActive
} from '../services/downloadHelper';

export const ApkDownloadDialog: React.FC = () => {
  const theme = useTheme();
  const [pendingRequest, setPendingRequest] = useState<ApkDownloadRequest | null>(null);

  useEffect(() => {
    setDownloadConfirmationListenerActive(true);

    const handleRequest = (e: Event) => {
      const custom = e as CustomEvent<ApkDownloadRequest>;
      if (custom?.detail?.url) {
        setPendingRequest(custom.detail);
      }
    };

    (window as any).__requestApkDownload = (url: string, filename?: string) => {
      if (!url) return;
      const cleanName = filename || url.split('/').pop()?.split('?')[0] || 'app-release.apk';
      setPendingRequest({ url, filename: cleanName });
    };

    window.addEventListener('ogv_request_apk_download', handleRequest);
    return () => {
      setDownloadConfirmationListenerActive(false);
      (window as any).__requestApkDownload = null;
      window.removeEventListener('ogv_request_apk_download', handleRequest);
    };
  }, []);

  useEffect(() => {
    if (!pendingRequest) return;
    (window as any).__onActiveDownloadDialogClose = () => {
      setPendingRequest(null);
      return true;
    };
    return () => {
      (window as any).__onActiveDownloadDialogClose = null;
    };
  }, [pendingRequest]);

  if (!pendingRequest) return null;

  const formattedSize =
    pendingRequest.sizeBytes && pendingRequest.sizeBytes > 0
      ? `${(pendingRequest.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
      : '';

  const handleConfirm = () => {
    const req = pendingRequest;
    setPendingRequest(null);
    if (req) {
      executeApkDownload(req.url, req.filename);
    }
  };

  return (
    <Dialog
      open={Boolean(pendingRequest)}
      onClose={() => setPendingRequest(null)}
      maxWidth="xs"
      fullWidth
      sx={{ zIndex: 1950 }}
      PaperProps={{
        sx: {
          borderRadius: '24px',
          bgcolor: 'var(--bg-menu)',
          backgroundImage: 'none',
          border: `1px solid ${theme.palette.divider}`,
          mx: { xs: 2.5, sm: 'auto' },
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1.25 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '14px',
            bgcolor: alpha(theme.palette.primary.main, 0.14),
            color: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <AndroidIcon sx={{ fontSize: 22 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            Allow APK Download?
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            System Download Manager
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 0.5, pb: 1.5 }}>
        <Box
          sx={{
            p: 1.5,
            mb: 1.5,
            borderRadius: '14px',
            bgcolor: alpha(theme.palette.text.primary, 0.04),
            border: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              wordBreak: 'break-all',
              fontSize: '0.82rem',
              color: 'text.primary'
            }}
          >
            {pendingRequest.filename}
          </Typography>
          {formattedSize && (
            <Chip
              label={formattedSize}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.7rem',
                fontWeight: 800,
                flexShrink: 0,
                bgcolor: alpha(theme.palette.primary.main, 0.14),
                color: 'primary.main'
              }}
            />
          )}
        </Box>

        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.83rem', lineHeight: 1.45 }}>
          Do you want to hand off this APK download to Android Download Manager? Progress will appear in your notification drawer and save to your Downloads folder.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2, pt: 0.5, gap: 1 }}>
        <Button
          onClick={() => setPendingRequest(null)}
          color="inherit"
          sx={{ fontWeight: 700, textTransform: 'none', borderRadius: '12px' }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          startIcon={<DownloadIcon sx={{ fontSize: 17 }} />}
          sx={{ fontWeight: 800, textTransform: 'none', borderRadius: '12px', px: 2.2 }}
        >
          Allow &amp; Download
        </Button>
      </DialogActions>
    </Dialog>
  );
};
