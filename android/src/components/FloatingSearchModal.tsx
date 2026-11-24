import React, { useEffect, useRef } from 'react';
import {
  Dialog,
  Box,
  InputBase,
  IconButton,
  Chip,
  Typography,
  useTheme,
  alpha
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import CloseIcon from '@mui/icons-material/Close';

interface FloatingSearchModalProps {
  open: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const QUICK_TAGS = ['NewPipe', 'Seal', 'Termux', 'ReVanced', 'Lawnchair', 'ViMusic', 'Downloader', 'Player', 'Emulator'];

export const FloatingSearchModal: React.FC<FloatingSearchModalProps> = ({
  open,
  onClose,
  searchQuery,
  onSearchChange
}) => {
  const theme = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleSelectTag = (tag: string) => {
    onSearchChange(tag);
    onClose();
  };

  const isDark = theme.palette.mode === 'dark';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      sx={{
        '& .MuiBackdrop-root': {
          backdropFilter: 'blur(10px)',
          bgcolor: isDark ? 'rgba(0, 0, 0, 0.65)' : 'rgba(15, 23, 42, 0.45)'
        },
        '& .MuiDialog-container': {
          alignItems: 'flex-start',
          pt: { xs: 3, sm: 6 }
        }
      }}
      PaperProps={{
        sx: {
          borderRadius: '24px',
          bgcolor: isDark ? '#1c2128' : '#ffffff',
          backgroundImage: 'none',
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: isDark
            ? '0 24px 64px rgba(0, 0, 0, 0.75)'
            : '0 24px 64px rgba(0, 0, 0, 0.18)',
          overflow: 'hidden',
          m: 2
        }
      }}
    >
      <Box sx={{ p: 2 }}>
        {/* Floating Input Pill */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: alpha(theme.palette.text.primary, 0.04),
            borderRadius: '20px',
            px: 2,
            py: 0.8,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.5)}`,
            gap: 1
          }}
        >
          <SearchIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
          <InputBase
            inputRef={inputRef}
            placeholder="Search APKs, Android apps, tools..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onClose();
              }
            }}
            sx={{
              flex: 1,
              fontSize: '0.925rem',
              fontFamily: '"Nunito", "Google Sans", sans-serif',
              fontWeight: 600,
              color: 'text.primary'
            }}
          />
          {searchQuery && (
            <IconButton size="small" onClick={() => onSearchChange('')} sx={{ p: 0.3 }}>
              <ClearIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
          <IconButton size="small" onClick={onClose} sx={{ p: 0.3, color: 'text.secondary' }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* Quick Tag Recommendations */}
        <Box sx={{ mt: 2, px: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.675rem' }}>
            Popular Android Searches
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
            {QUICK_TAGS.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                onClick={() => handleSelectTag(tag)}
                sx={{
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  bgcolor: alpha(theme.palette.text.primary, 0.05),
                  color: 'text.primary',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.15),
                    color: theme.palette.primary.main
                  }
                }}
              />
            ))}
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
};
