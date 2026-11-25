import React from 'react';
import { Box, Typography, Badge, useTheme, alpha } from '@mui/material';
import AndroidIcon from '@mui/icons-material/Android';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
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
    { id: 'apks', label: 'APK', icon: <AndroidIcon sx={{ fontSize: 20 }} /> },
    { id: 'trending', label: 'Trending', icon: <WhatshotIcon sx={{ fontSize: 20 }} /> },
    { id: 'spotlight', label: 'Spotlight', icon: <AutoAwesomeIcon sx={{ fontSize: 20 }} /> },
    {
      id: 'vault',
      label: 'Vault',
      icon: (
        <Badge
          badgeContent={vaultCount}
          color="primary"
          max={99}
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '0.6rem',
              height: 16,
              minWidth: 16,
              px: 0.4,
              fontWeight: 800,
              bgcolor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              boxShadow: `0 2px 6px ${alpha(theme.palette.primary.main, 0.45)}`,
              top: 2,
              right: -3
            }
          }}
        >
          <BookmarksIcon sx={{ fontSize: 19 }} />
        </Badge>
      )
    },
    { id: 'explore', label: 'Explore', icon: <ExploreIcon sx={{ fontSize: 19 }} /> },
  ];

  const activeIndex = Math.max(0, TABS.findIndex(t => t.id === currentTab));

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 4px) + 6px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 24px)',
        maxWidth: 410,
        height: 60,
        borderRadius: '30px',
        bgcolor: theme.palette.mode === 'dark'
          ? alpha(theme.palette.background.paper, 0.88)
          : alpha(theme.palette.background.paper, 0.92),
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: theme.palette.mode === 'dark'
          ? `1px solid ${alpha(theme.palette.common.white, 0.12)}`
          : `1px solid ${alpha(theme.palette.common.white, 0.8)}`,
        boxShadow: theme.palette.mode === 'dark'
          ? `0 18px 48px rgba(0, 0, 0, 0.65), 0 2px 8px ${alpha(theme.palette.primary.main, 0.15)}, inset 0 1px 1px rgba(255, 255, 255, 0.16)`
          : `0 14px 38px rgba(0, 0, 0, 0.08), 0 2px 10px ${alpha(theme.palette.primary.main, 0.12)}, inset 0 1px 1px rgba(255, 255, 255, 0.9)`,
        display: 'flex',
        alignItems: 'center',
        px: 0.8,
        zIndex: 1200,
        userSelect: 'none',
        touchAction: 'manipulation'
      }}
    >
      {/* ── Slidable Selection Pill (Liquid Glass Theme Blend) ── */}
      <Box
        sx={{
          position: 'absolute',
          top: 6,
          left: 6,
          width: 'calc((100% - 12px) / 5)',
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          transform: `translateX(${activeIndex * 100}%)`,
          transition: 'transform 0.32s cubic-bezier(0.34, 1.25, 0.64, 1)',
          zIndex: 1
        }}
      >
        <Box
          sx={{
            width: 50,
            height: 32,
            borderRadius: '16px',
            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.15),
            border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.42 : 0.28)}`,
            boxShadow: `0 2px 12px ${alpha(theme.palette.primary.main, 0.24)}, inset 0 1px 1px ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.75)'}`
          }}
        />
      </Box>

      {TABS.map((tab) => {
        const isSelected = currentTab === tab.id;
        return (
          <Box
            key={tab.id}
            onClick={() => {
              try { navigator.vibrate?.(10); } catch {}
              onTabChange(tab.id);
            }}
            sx={{
              flex: 1,
              zIndex: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              transition: 'transform 0.15s ease',
              '&:active': {
                transform: 'scale(0.92)'
              }
            }}
          >
            <Box
              sx={{
                width: 50,
                height: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isSelected
                  ? theme.palette.primary.main
                  : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.88)' : theme.palette.text.secondary),
                transition: 'color 0.22s ease'
              }}
            >
              {tab.icon}
            </Box>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.64rem',
                fontWeight: isSelected ? 800 : 600,
                lineHeight: 1.15,
                mt: '1px',
                fontFamily: '"Google Sans", "Nunito", sans-serif',
                color: isSelected
                  ? theme.palette.primary.main
                  : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.72)' : theme.palette.text.secondary),
                transition: 'color 0.22s ease'
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
