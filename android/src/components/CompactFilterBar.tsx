import React, { useState } from 'react';
import {
  Box,
  Chip,
  Menu,
  MenuItem,
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
import CheckIcon from '@mui/icons-material/Check';
import CategoryIcon from '@mui/icons-material/Category';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import StarIcon from '@mui/icons-material/Star';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TuneIcon from '@mui/icons-material/Tune';
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

export const CompactFilterBar = React.memo<CompactFilterBarProps>(({
  selectedCategoryId,
  onSelectCategory,
  sortOption,
  onSelectSort,
  minStars,
  onSelectMinStars,
  categories
}) => {
  const theme = useTheme();

  const [categoryAnchor, setCategoryAnchor] = useState<null | HTMLElement>(null);
  const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null);
  const [starsAnchor, setStarsAnchor] = useState<null | HTMLElement>(null);

  const categoryList = categories || CATEGORIES;
  const selectedCat = categoryList.find(c => c.id === selectedCategoryId) || categoryList[0];

  const sortLabels: Record<SortOption, { label: string; icon: React.ReactElement }> = {
    stars: { label: 'Most Stars', icon: <StarIcon sx={{ fontSize: 14 }} /> },
    forks: { label: 'Most Forks', icon: <CallSplitIcon sx={{ fontSize: 14 }} /> },
    newest: { label: 'Newest', icon: <AutoAwesomeIcon sx={{ fontSize: 14 }} /> },
    updated: { label: 'Recent', icon: <AccessTimeIcon sx={{ fontSize: 14 }} /> },
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
        position: 'sticky',
        top: 'calc(max(env(safe-area-inset-top, 0px), var(--status-bar-height, 44px)) + 63px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        overflowX: 'auto',
        px: { xs: 1.5, sm: 2 },
        py: 0.85,
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
        bgcolor: theme.palette.mode === 'dark'
          ? alpha(theme.palette.background.default, 0.88)
          : alpha(theme.palette.background.default, 0.92),
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: theme.palette.mode === 'dark'
          ? '0 4px 16px rgba(0, 0, 0, 0.35)'
          : `0 2px 10px ${alpha(theme.palette.primary.main, 0.05)}`,
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
    >
      {/* ── 1. Category Combobox Filter (Replaces divided chips) ── */}
      <Chip
        icon={ICONS_MAP[selectedCat?.icon] || <CategoryIcon sx={{ fontSize: 15 }} />}
        label={selectedCat ? selectedCat.label : 'All Categories'}
        deleteIcon={<KeyboardArrowDownIcon sx={{ fontSize: 15 }} />}
        onDelete={(e) => setCategoryAnchor(e.currentTarget as HTMLElement)}
        onClick={(e) => setCategoryAnchor(e.currentTarget)}
        variant="outlined"
        sx={{
          height: 32,
          borderRadius: '16px',
          px: 0.6,
          fontSize: '0.75rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          flexShrink: 0,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'manipulation',
          bgcolor: theme.palette.mode === 'dark'
            ? 'rgba(56, 189, 248, 0.14)'
            : 'rgba(37, 99, 235, 0.10)',
          borderColor: theme.palette.mode === 'dark'
            ? 'rgba(56, 189, 248, 0.35)'
            : 'rgba(37, 99, 235, 0.25)',
          color: theme.palette.mode === 'dark' ? '#38bdf8' : theme.palette.primary.main,
          boxShadow: theme.palette.mode === 'dark'
            ? '0 2px 8px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,0.1)'
            : '0 2px 6px rgba(0,0,0,0.05), inset 0 1px 1px rgba(255,255,255,0.6)',
          '&:hover, &:focus, &:active, &.Mui-focusVisible': {
            bgcolor: theme.palette.mode === 'dark'
              ? 'rgba(56, 189, 248, 0.22)'
              : 'rgba(37, 99, 235, 0.16)',
            color: theme.palette.mode === 'dark' ? '#38bdf8' : theme.palette.primary.main
          },
          '& .MuiChip-deleteIcon': {
            color: 'inherit',
            mr: 0.4
          },
          '& .MuiChip-icon': {
            color: 'inherit',
            fontSize: 16
          }
        }}
      />

      {/* ── 2. Sort Filter Combobox ── */}
      <Chip
        icon={sortLabels[sortOption].icon}
        label={sortLabels[sortOption].label}
        deleteIcon={<KeyboardArrowDownIcon sx={{ fontSize: 15 }} />}
        onDelete={(e) => setSortAnchor(e.currentTarget as HTMLElement)}
        onClick={(e) => setSortAnchor(e.currentTarget)}
        variant="outlined"
        sx={{
          height: 32,
          borderRadius: '16px',
          px: 0.6,
          fontSize: '0.74rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          flexShrink: 0,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'manipulation',
          bgcolor: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(0, 0, 0, 0.04)',
          borderColor: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.12)'
            : 'rgba(0, 0, 0, 0.10)',
          color: 'text.primary',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 2px 6px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.06)'
            : '0 2px 4px rgba(0,0,0,0.03), inset 0 1px 1px rgba(255,255,255,0.5)',
          '&:hover, &:focus, &:active, &.Mui-focusVisible': {
            bgcolor: theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.10)'
              : 'rgba(0, 0, 0, 0.08)',
            color: 'text.primary'
          },
          '& .MuiChip-deleteIcon': {
            color: 'text.secondary',
            mr: 0.4
          }
        }}
      />

      {/* ── 3. Min Stars Filter Combobox ── */}
      <Chip
        icon={<TuneIcon sx={{ fontSize: 14 }} />}
        label={starLabels[minStars] || `${minStars}+ ★`}
        deleteIcon={<KeyboardArrowDownIcon sx={{ fontSize: 15 }} />}
        onDelete={(e) => setStarsAnchor(e.currentTarget as HTMLElement)}
        onClick={(e) => setStarsAnchor(e.currentTarget)}
        variant="outlined"
        sx={{
          height: 32,
          borderRadius: '16px',
          px: 0.6,
          fontSize: '0.74rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          flexShrink: 0,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'manipulation',
          bgcolor: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(0, 0, 0, 0.04)',
          borderColor: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.12)'
            : 'rgba(0, 0, 0, 0.10)',
          color: 'text.primary',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 2px 6px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.06)'
            : '0 2px 4px rgba(0,0,0,0.03), inset 0 1px 1px rgba(255,255,255,0.5)',
          '&:hover, &:focus, &:active, &.Mui-focusVisible': {
            bgcolor: theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.10)'
              : 'rgba(0, 0, 0, 0.08)',
            color: 'text.primary'
          },
          '& .MuiChip-deleteIcon': {
            color: 'text.secondary',
            mr: 0.4
          }
        }}
      />

      {/* ── Category Combobox Dropdown Menu ── */}
      <Menu
        anchorEl={categoryAnchor}
        open={Boolean(categoryAnchor)}
        onClose={() => setCategoryAnchor(null)}
        sx={{
          '& .MuiPaper-root': {
            borderRadius: '20px',
            minWidth: 210,
            maxHeight: 380,
            bgcolor: alpha(theme.palette.background.paper, 0.96),
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
            boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
            p: 0.5
          }
        }}
      >
        {categoryList.map((cat) => {
          const isSelected = cat.id === selectedCategoryId;
          return (
            <MenuItem
              key={cat.id}
              selected={isSelected}
              onClick={() => {
                try { navigator.vibrate?.(8); } catch {}
                onSelectCategory(cat.id);
                setCategoryAnchor(null);
              }}
              sx={{
                borderRadius: '12px',
                py: 0.75,
                px: 1.5,
                my: 0.2,
                fontSize: '0.8rem',
                fontWeight: isSelected ? 800 : 600,
                color: isSelected ? 'primary.main' : 'text.primary',
                bgcolor: isSelected
                  ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.1)
                  : 'transparent'
              }}
            >
              <ListItemIcon sx={{ minWidth: 30, color: isSelected ? 'primary.main' : 'text.secondary' }}>
                {ICONS_MAP[cat.icon] || <CategoryIcon sx={{ fontSize: 16 }} />}
              </ListItemIcon>
              <ListItemText
                primary={cat.label}
                primaryTypographyProps={{
                  fontSize: '0.8rem',
                  fontWeight: isSelected ? 800 : 600,
                  color: isSelected ? 'primary.main' : 'text.primary'
                }}
              />
              {isSelected && (
                <CheckIcon sx={{ fontSize: 16, color: 'primary.main', ml: 1 }} />
              )}
            </MenuItem>
          );
        })}
      </Menu>

      {/* ── Sort Menu ── */}
      <Menu
        anchorEl={sortAnchor}
        open={Boolean(sortAnchor)}
        onClose={() => setSortAnchor(null)}
        sx={{
          '& .MuiPaper-root': {
            borderRadius: '20px',
            minWidth: 165,
            p: 0.5,
            bgcolor: alpha(theme.palette.background.paper, 0.96),
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)'
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
                borderRadius: '12px',
                my: 0.25,
                py: 0.75,
                px: 1.5,
                bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.12) : 'transparent'
              }}
            >
              <ListItemIcon sx={{ minWidth: 26, color: isSelected ? theme.palette.primary.main : 'text.secondary' }}>
                {sortLabels[opt].icon}
              </ListItemIcon>
              <ListItemText
                primary={sortLabels[opt].label}
                primaryTypographyProps={{
                  fontSize: '0.78rem',
                  fontWeight: isSelected ? 800 : 500,
                  color: isSelected ? theme.palette.primary.main : 'text.primary'
                }}
              />
              {isSelected && (
                <CheckIcon sx={{ fontSize: 16, color: 'primary.main', ml: 1 }} />
              )}
            </MenuItem>
          );
        })}
      </Menu>

      {/* ── Stars Menu ── */}
      <Menu
        anchorEl={starsAnchor}
        open={Boolean(starsAnchor)}
        onClose={() => setStarsAnchor(null)}
        sx={{
          '& .MuiPaper-root': {
            borderRadius: '20px',
            minWidth: 155,
            p: 0.5,
            bgcolor: alpha(theme.palette.background.paper, 0.96),
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)'
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
                borderRadius: '12px',
                my: 0.25,
                py: 0.75,
                px: 1.5,
                bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.12) : 'transparent'
              }}
            >
              <ListItemText
                primary={starLabels[count]}
                primaryTypographyProps={{
                  fontSize: '0.78rem',
                  fontWeight: isSelected ? 800 : 500,
                  color: isSelected ? theme.palette.primary.main : 'text.primary'
                }}
              />
              {isSelected && (
                <CheckIcon sx={{ fontSize: 16, color: 'primary.main', ml: 1 }} />
              )}
            </MenuItem>
          );
        })}
      </Menu>
    </Box>
  );
});
