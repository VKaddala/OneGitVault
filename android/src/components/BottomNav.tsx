import React from 'react';
import { Box, Typography, Badge, useTheme, alpha } from '@mui/material';
import AndroidIcon from '@mui/icons-material/Android';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import BookmarksIcon from '@mui/icons-material/Bookmarks';
import ExploreIcon from '@mui/icons-material/Explore';

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  vaultCount: number;
  visible?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  vaultCount,
  visible = true
}) => {
  const theme = useTheme();

  if (!visible) return null;

  const TABS = [
    { id: 'apks', label: 'APK', icon: <AndroidIcon sx={{ fontSize: 22 }} /> },
    { id: 'trending', label: 'Trending', icon: <WhatshotIcon sx={{ fontSize: 22 }} /> },
    {
      id: 'vault',
      label: 'Vault',
      icon: (
        <Badge
          badgeContent={vaultCount}
          color="primary"
          max={99}
          sx={{ '& .MuiBadge-badge': { fontSize: '0.62rem', height: 16, minWidth: 16, px: 0.4, fontWeight: 700 } }}
        >
          <BookmarksIcon sx={{ fontSize: 20 }} />
        </Badge>
      )
    },
    { id: 'explore', label: 'Explore', icon: <ExploreIcon sx={{ fontSize: 22 }} /> },
  ];

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 'calc(10px + max(env(safe-area-inset-bottom, 0px), var(--nav-bar-height, 10px)))',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'fit-content',
        maxWidth: { xs: 330, sm: 360 },
        height: 52,
        borderRadius: '26px',
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(20, 25, 34, 0.96)' : 'rgba(255, 255, 255, 0.97)',
        backdropFilter: 'blur(30px) saturate(200%)',
        WebkitBackdropFilter: 'blur(30px) saturate(200%)',
        border: theme.palette.mode === 'dark'
          ? '1.5px solid rgba(255, 255, 255, 0.22)'
          : '1.5px solid rgba(0, 0, 0, 0.12)',
        boxShadow: theme.palette.mode === 'dark'
          ? '0 16px 40px rgba(0, 0, 0, 0.95), 0 4px 16px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)'
          : '0 12px 32px rgba(0, 0, 0, 0.16), 0 4px 12px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: { xs: 0.5, sm: 0.8 },
        px: 1.2,
        py: 0,
        zIndex: 1200,
        userSelect: 'none'
      }}
    >
      {TABS.map((tab) => {
        const isSelected = currentTab === tab.id;
        return (
          <Box
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 0.45,
              px: { xs: 1.35, sm: 1.7 },
              borderRadius: '20px',
              cursor: 'pointer',
              transition: 'all 0.18s cubic-bezier(0.2, 0, 0, 1)',
              bgcolor: isSelected
                ? (theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.26) : alpha(theme.palette.primary.main, 0.14))
                : 'transparent',
              border: isSelected
                ? (theme.palette.mode === 'dark' ? `1px solid ${alpha(theme.palette.primary.main, 0.45)}` : `1px solid ${alpha(theme.palette.primary.main, 0.25)}`)
                : '1px solid transparent',
              color: isSelected ? theme.palette.primary.main : theme.palette.text.secondary,
              transform: isSelected ? 'scale(1.03)' : 'scale(1)',
              '&:active': {
                transform: 'scale(0.96)'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {tab.icon}
            </Box>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.68rem',
                fontWeight: isSelected ? 800 : 600,
                lineHeight: 1.15,
                mt: 0.2,
                fontFamily: '"Nunito", "Google Sans", sans-serif'
              }}
            >
              {tab.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};
