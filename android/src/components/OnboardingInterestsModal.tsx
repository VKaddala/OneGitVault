import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Chip,
  Button,
  useTheme,
  alpha,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckIcon from '@mui/icons-material/Check';
import {
  saveUserInterests,
  markOnboardingCompleted,
  getUserInterests,
} from '../services/bookmarkStore';
import { refreshSpotlightSuggestionsIfDue } from '../services/spotlightSuggestions';

interface OnboardingInterestsModalProps {
  open: boolean;
  onClose: () => void;
  onInterestsSaved?: (topics: string[]) => void;
}

const INTEREST_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'android apk', label: 'Android APKs' },
  { id: 'ai-agents', label: 'AI & Agents' },
  { id: 'ollama', label: 'Local LLMs' },
  { id: 'privacy', label: 'Privacy & Security' },
  { id: 'self-hosted', label: 'Self-Hosted' },
  { id: 'rust cli', label: 'CLI & DevTools' },
  { id: 'emulator', label: 'Emulators & Gaming' },
  { id: 'music-player', label: 'Media & Streaming' },
  { id: 'material-you', label: 'Material You Apps' },
  { id: 'docker-compose', label: 'Homelab & Docker' },
];

export const OnboardingInterestsModal: React.FC<OnboardingInterestsModalProps> = ({
  open,
  onClose,
  onInterestsSaved,
}) => {
  const theme = useTheme();
  const [selected, setSelected] = useState<string[]>(() => getUserInterests());

  const toggleTopic = (topicId: string) => {
    setSelected((prev) =>
      prev.includes(topicId)
        ? prev.filter((t) => t !== topicId)
        : prev.length < 6
        ? [...prev, topicId]
        : prev
    );
  };

  const handleSkip = () => {
    markOnboardingCompleted();
    onClose();
  };

  const handleSave = () => {
    saveUserInterests(selected);
    try {
      localStorage.removeItem('ogv_spotlight_suggestions_v1');
    } catch {}
    refreshSpotlightSuggestionsIfDue().catch(() => {});
    onInterestsSaved?.(selected);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleSkip}
      maxWidth="xs"
      fullWidth
      sx={{ zIndex: 1850 }}
      PaperProps={{
        sx: {
          borderRadius: '20px',
          bgcolor: 'var(--bg-menu)',
          backgroundImage: 'none',
          border: `1px solid ${theme.palette.divider}`,
          mx: { xs: 2.5, sm: 'auto' },
        },
      }}
    >
      <DialogContent sx={{ pt: 2.5, pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: '10px',
              bgcolor: alpha(theme.palette.primary.main, 0.14),
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AutoAwesomeIcon sx={{ fontSize: 19 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Tailor Your Observatory
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Optional — pick topics to tune Spotlight suggestions
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.85, mt: 2 }}>
          {INTEREST_OPTIONS.map((opt) => {
            const isPicked = selected.includes(opt.id);
            return (
              <Chip
                key={opt.id}
                label={opt.label}
                icon={isPicked ? <CheckIcon sx={{ fontSize: '15px !important' }} /> : undefined}
                onClick={() => toggleTopic(opt.id)}
                sx={{
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  bgcolor: isPicked
                    ? alpha(theme.palette.primary.main, 0.18)
                    : alpha(theme.palette.text.primary, 0.05),
                  color: isPicked ? 'primary.main' : 'text.primary',
                  border: `1px solid ${isPicked ? theme.palette.primary.main : theme.palette.divider}`,
                }}
              />
            );
          })}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2, pt: 1, justifyContent: 'space-between' }}>
        <Button onClick={handleSkip} color="inherit" sx={{ textTransform: 'none', fontWeight: 700 }}>
          Skip
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={selected.length === 0}
          sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 800, px: 2.5 }}
        >
          Save ({selected.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
};
