import React, { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  ListItemIcon,
  ListItemText,
  useTheme,
  alpha
} from '@mui/material';
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
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import StarIcon from '@mui/icons-material/Star';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckIcon from '@mui/icons-material/Check';
import { CATEGORIES } from '../data/categories';
import { SortOption, Category } from '../types';

interface CompactFilterBarProps {
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  sortOption: SortOption;
  onSelectSort: (sort: SortOption) => void;
  minStars: number;
  onSelectMinStars: (stars: number) => void;
  totalCount: number;
  categories?: Category[];
}

const ICONS_MAP: Record<string, React.ReactElement> = {
  Android: <AndroidIcon sx={{ fontSize: 11 }} />,
  VideoLibrary: <VideoLibraryIcon sx={{ fontSize: 11 }} />,
  AutoAwesome: <AutoAwesomeIcon sx={{ fontSize: 11 }} />,
  Psychology: <PsychologyIcon sx={{ fontSize: 11 }} />,
  PhoneAndroid: <PhoneAndroidIcon sx={{ fontSize: 11 }} />,
  Build: <BuildIcon sx={{ fontSize: 11 }} />,
  Security: <SecurityIcon sx={{ fontSize: 11 }} />,
  Language: <LanguageIcon sx={{ fontSize: 11 }} />,
  CloudQueue: <CloudQueueIcon sx={{ fontSize: 11 }} />,
  Storage: <StorageIcon sx={{ fontSize: 11 }} />,
};

export const CompactFilterBar: React.FC<CompactFilterBarProps> = ({
  selectedCategoryId,
  onSelectCategory,
  sortOption,
  onSelectSort,
  minStars,
  onSelectMinStars,
  totalCount,
  categories
}) => {
  const theme = useTheme();

  const [categoryAnchor, setCategoryAnchor] = useState<null | HTMLElement>(null);
  const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null);
  const [starsAnchor, setStarsAnchor] = useState<null | HTMLElement>(null);

  const categoryList = categories || CATEGORIES;
  const selectedCategory = categoryList.find(c => c.id === selectedCategoryId) || categoryList[0];
  const displayCategoryLabel = selectedCategory.id === 'android-apks' ? 'APK' : selectedCategory.label;

  const sortLabels: Record<SortOption, { label: string; icon: React.ReactElement }> = {
    stars: { label: 'Stars', icon: <StarIcon sx={{ fontSize: 12 }} /> },
    forks: { label: 'Forks', icon: <CallSplitIcon sx={{ fontSize: 12 }} /> },
    newest: { label: 'Newest', icon: <AutoAwesomeIcon sx={{ fontSize: 12 }} /> },
    updated: { label: 'Recent', icon: <AccessTimeIcon sx={{ fontSize: 12 }} /> },
  };

  const starLabels: Record<number, string> = {
    0: 'All Stars',
    1000: '1k+ ★',
    10000: '10k+ ★',
    50000: '50k+ ★',
  };

  return (
    <Box
      sx={{
        px: { xs: 1.5, sm: 2 },
        py: 0.85,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${theme.palette.divider}`,
        bgcolor: alpha(theme.palette.background.paper, 0.65),
        backdropFilter: 'blur(12px)',
        gap: 0.75,
        overflowX: 'auto',
        '&::-webkit-scrollbar': { display: 'none' }
      }}
    >
      {/* Left: Extra Small Filter Dropdown Pills */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
        {/* Category Dropdown Pill — Ultra-Compact & Refined */}
        <Button
          size="small"
          variant="contained"
          color="primary"
          onClick={(e) => setCategoryAnchor(e.currentTarget)}
          startIcon={ICONS_MAP[selectedCategory.icon] || <AndroidIcon sx={{ fontSize: 11 }} />}
          endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 11, ml: -0.6 }} />}
          sx={{
            height: 21,
            px: 0.75,
            py: 0,
            fontSize: '0.63rem',
            fontWeight: 800,
            borderRadius: '10px',
            textTransform: 'none',
            whiteSpace: 'nowrap',
            lineHeight: 1
          }}
        >
          {displayCategoryLabel}
        </Button>

        {/* Category Menu */}
        <Menu
          anchorEl={categoryAnchor}
          open={Boolean(categoryAnchor)}
          onClose={() => setCategoryAnchor(null)}
          sx={{
            '& .MuiPaper-root': {
              borderRadius: '14px',
              minWidth: 220,
              maxHeight: 380,
              p: 0.5,
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)'
            }
          }}
        >
          <Box sx={{ px: 1.5, py: 0.6, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.625rem' }}>
              Select Sector
            </Typography>
          </Box>
          {categoryList.map((cat) => {
            const isSelected = cat.id === selectedCategoryId;
            return (
              <MenuItem
                key={cat.id}
                onClick={() => {
                  onSelectCategory(cat.id);
                  setCategoryAnchor(null);
                }}
                sx={{
                  borderRadius: '8px',
                  my: 0.2,
                  py: 0.6,
                  px: 1.25,
                  bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.12) : 'transparent'
                }}
              >
                <ListItemIcon sx={{ minWidth: 24, color: isSelected ? theme.palette.primary.main : 'text.secondary' }}>
                  {ICONS_MAP[cat.icon]}
                </ListItemIcon>
                <ListItemText
                  primary={cat.label}
                  primaryTypographyProps={{
                    fontSize: '0.75rem',
                    fontWeight: isSelected ? 800 : 500,
                    color: isSelected ? theme.palette.primary.main : 'text.primary'
                  }}
                />
                {isSelected && (
                  <CheckIcon sx={{ fontSize: 13, color: theme.palette.primary.main, ml: 1 }} />
                )}
              </MenuItem>
            );
          })}
        </Menu>

        {/* Sort Dropdown Pill — Ultra-Compact & Refined */}
        <Button
          size="small"
          variant="outlined"
          onClick={(e) => setSortAnchor(e.currentTarget)}
          startIcon={sortLabels[sortOption].icon}
          endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 11, ml: -0.6 }} />}
          sx={{
            height: 21,
            px: 0.75,
            py: 0,
            fontSize: '0.63rem',
            fontWeight: 700,
            borderRadius: '10px',
            textTransform: 'none',
            color: 'text.primary',
            borderColor: theme.palette.divider,
            whiteSpace: 'nowrap',
            lineHeight: 1
          }}
        >
          {sortLabels[sortOption].label}
        </Button>

        {/* Sort Menu */}
        <Menu
          anchorEl={sortAnchor}
          open={Boolean(sortAnchor)}
          onClose={() => setSortAnchor(null)}
          sx={{
            '& .MuiPaper-root': {
              borderRadius: '14px',
              minWidth: 140,
              p: 0.5,
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)'
            }
          }}
        >
          {(['stars', 'forks', 'newest', 'updated'] as SortOption[]).map((opt) => {
            const isSelected = opt === sortOption;
            return (
              <MenuItem
                key={opt}
                onClick={() => {
                  onSelectSort(opt);
                  setSortAnchor(null);
                }}
                sx={{
                  borderRadius: '8px',
                  my: 0.2,
                  py: 0.6,
                  px: 1.25,
                  bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.12) : 'transparent'
                }}
              >
                <ListItemIcon sx={{ minWidth: 22, color: isSelected ? theme.palette.primary.main : 'text.secondary' }}>
                  {sortLabels[opt].icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    opt === 'stars'
                      ? 'Most Stars'
                      : opt === 'forks'
                      ? 'Most Forks'
                      : opt === 'newest'
                      ? 'Newest Repos'
                      : 'Recently Updated'
                  }
                  primaryTypographyProps={{
                    fontSize: '0.75rem',
                    fontWeight: isSelected ? 800 : 500,
                    color: isSelected ? theme.palette.primary.main : 'text.primary'
                  }}
                />
              </MenuItem>
            );
          })}
        </Menu>

        {/* Stars Dropdown Pill — Ultra-Compact & Refined */}
        <Button
          size="small"
          variant="outlined"
          onClick={(e) => setStarsAnchor(e.currentTarget)}
          endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 11, ml: -0.6 }} />}
          sx={{
            height: 21,
            px: 0.75,
            py: 0,
            fontSize: '0.63rem',
            fontWeight: 700,
            borderRadius: '10px',
            textTransform: 'none',
            color: 'text.primary',
            borderColor: theme.palette.divider,
            whiteSpace: 'nowrap',
            lineHeight: 1
          }}
        >
          {starLabels[minStars] || `${minStars}+ ★`}
        </Button>

        {/* Stars Menu */}
        <Menu
          anchorEl={starsAnchor}
          open={Boolean(starsAnchor)}
          onClose={() => setStarsAnchor(null)}
          sx={{
            '& .MuiPaper-root': {
              borderRadius: '14px',
              minWidth: 130,
              p: 0.5,
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)'
            }
          }}
        >
          {[0, 1000, 10000, 50000].map((count) => {
            const isSelected = count === minStars;
            return (
              <MenuItem
                key={count}
                onClick={() => {
                  onSelectMinStars(count);
                  setStarsAnchor(null);
                }}
                sx={{
                  borderRadius: '8px',
                  my: 0.2,
                  py: 0.6,
                  px: 1.25,
                  bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.12) : 'transparent'
                }}
              >
                <ListItemText
                  primary={starLabels[count]}
                  primaryTypographyProps={{
                    fontSize: '0.75rem',
                    fontWeight: isSelected ? 800 : 500,
                    color: isSelected ? theme.palette.primary.main : 'text.primary'
                  }}
                />
              </MenuItem>
            );
          })}
        </Menu>
      </Box>

      {/* Right: Small Repository Count */}
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontSize: '0.675rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          pl: 1
        }}
      >
        {totalCount > 0 ? `${totalCount.toLocaleString()} repos` : ''}
      </Typography>
    </Box>
  );
};
