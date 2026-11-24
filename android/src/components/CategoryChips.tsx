import React from 'react';
import { Box, Chip, useTheme, alpha } from '@mui/material';
import AndroidIcon from '@mui/icons-material/Android';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PsychologyIcon from '@mui/icons-material/Psychology';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import BuildIcon from '@mui/icons-material/Build';
import SecurityIcon from '@mui/icons-material/Security';
import LanguageIcon from '@mui/icons-material/Language';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import StorageIcon from '@mui/icons-material/Storage';
import { CATEGORIES } from '../data/categories';

interface CategoryChipsProps {
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
}

const ICONS_MAP: Record<string, React.ReactElement> = {
  Android: <AndroidIcon sx={{ fontSize: 16 }} />,
  VideoLibrary: <VideoLibraryIcon sx={{ fontSize: 16 }} />,
  AutoAwesome: <AutoAwesomeIcon sx={{ fontSize: 16 }} />,
  Psychology: <PsychologyIcon sx={{ fontSize: 16 }} />,
  PhoneAndroid: <PhoneAndroidIcon sx={{ fontSize: 16 }} />,
  Build: <BuildIcon sx={{ fontSize: 16 }} />,
  Security: <SecurityIcon sx={{ fontSize: 16 }} />,
  Language: <LanguageIcon sx={{ fontSize: 16 }} />,
  CloudQueue: <CloudQueueIcon sx={{ fontSize: 16 }} />,
  Storage: <StorageIcon sx={{ fontSize: 16 }} />,
};

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  selectedCategoryId,
  onSelectCategory
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        overflowX: 'auto',
        py: 1.25,
        px: { xs: 1.5, sm: 2.5 },
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        alignItems: 'center'
      }}
    >
      {CATEGORIES.map((cat) => {
        const isSelected = selectedCategoryId === cat.id;
        const isAndroidCategory = cat.id === 'android-apks';

        return (
          <Chip
            key={cat.id}
            icon={ICONS_MAP[cat.icon]}
            label={cat.label}
            onClick={() => onSelectCategory(cat.id)}
            variant={isSelected ? 'filled' : 'outlined'}
            color={isSelected ? (isAndroidCategory ? 'primary' : 'secondary') : 'default'}
            sx={{
              height: 34,
              borderRadius: '17px',
              px: 0.5,
              fontSize: '0.8rem',
              fontWeight: isSelected ? 700 : 500,
              whiteSpace: 'nowrap',
              borderWidth: isSelected ? 0 : 1,
              borderColor: alpha(theme.palette.text.primary, 0.12),
              bgcolor: isSelected
                ? (isAndroidCategory ? theme.palette.primary.main : theme.palette.secondary.main)
                : alpha(theme.palette.text.primary, 0.03),
              color: isSelected
                ? (isAndroidCategory ? theme.palette.primary.contrastText : theme.palette.secondary.contrastText)
                : 'text.primary',
              '& .MuiChip-icon': {
                color: isSelected ? 'inherit' : 'text.secondary'
              },
              '&:hover': {
                bgcolor: isSelected
                  ? alpha(theme.palette.primary.main, 0.9)
                  : alpha(theme.palette.text.primary, 0.07)
              }
            }}
          />
        );
      })}
    </Box>
  );
};
