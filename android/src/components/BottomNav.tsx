import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Badge, useTheme, alpha } from '@mui/material';
import AndroidIcon from '@mui/icons-material/Android';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BookmarksIcon from '@mui/icons-material/Bookmarks';
import ExploreIcon from '@mui/icons-material/Explore';
import { triggerHaptic } from '../utils/haptics';

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  vaultCount: number;
  visible?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = React.memo(({
  currentTab,
  onTabChange,
  vaultCount,
  visible = true
}) => {
  const theme = useTheme();
  const [optimisticTab, setOptimisticTab] = useState<string>(currentTab);

  useEffect(() => {
    setOptimisticTab(currentTab);
  }, [currentTab]);

  const TABS = useMemo(() => [
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
  ], [vaultCount, theme.palette.primary.main, theme.palette.primary.contrastText]);

  if (!visible) return null;

  const activeIndex = Math.max(0, TABS.findIndex(t => t.id === optimisticTab));

  return (
    <Box
      component="nav"
      role="tablist"
      aria-label="Main Navigation"
      sx={{
        position: 'fixed',
        bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 4px) + 6px)',
        left: '50%',
        transform: 'translateX(-50%) translateZ(0)',
        width: 'calc(100% - 24px)',
        maxWidth: 410,
        height: 62,
        borderRadius: '31px',
        bgcolor: theme.palette.mode === 'dark'
          ? alpha(theme.palette.background.paper, 0.96)
          : alpha(theme.palette.background.paper, 0.98),
        border: theme.palette.mode === 'dark'
          ? `1px solid ${alpha(theme.palette.common.white, 0.14)}`
          : `1px solid ${alpha(theme.palette.common.white, 0.85)}`,
        boxShadow: theme.palette.mode === 'dark'
          ? `0 18px 48px rgba(0, 0, 0, 0.65), 0 2px 10px ${alpha(theme.palette.primary.main, 0.14)}, inset 0 1px 0 rgba(255, 255, 255, 0.16)`
          : `0 14px 38px rgba(15, 23, 42, 0.12), 0 2px 10px ${alpha(theme.palette.primary.main, 0.10)}, inset 0 1px 0 rgba(255, 255, 255, 0.95)`,
        display: 'flex',
        alignItems: 'center',
        px: 0.75,
        zIndex: 1200,
        userSelect: 'none',
        touchAction: 'manipulation'
      }}
    >
      {/* ── Full-Tab Sliding Liquid Glass Capsule (Vivo / Material You Style) ── */}
      <Box
        sx={{
          position: 'absolute',
          top: 5,
          left: 6,
          width: 'calc((100% - 12px) / 5)',
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          transform: `translateX(${activeIndex * 100}%) translateZ(0)`,
          willChange: 'transform',
          transition: 'transform 0.20s cubic-bezier(0.22, 1, 0.36, 1)',
          zIndex: 1
        }}
      >
        <Box
          sx={{
            width: 'calc(100% - 4px)',
            height: '100%',
            borderRadius: '26px',
            background: theme.palette.mode === 'dark'
              ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.30)}, ${alpha(theme.palette.secondary.main, 0.22)})`
              : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.17)}, ${alpha(theme.palette.secondary.main, 0.12)})`,
            border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.45 : 0.28)}`,
            boxShadow: theme.palette.mode === 'dark'
              ? `0 4px 16px ${alpha(theme.palette.primary.main, 0.26)}, inset 0 1px 0 rgba(255, 255, 255, 0.22)`
              : `0 3px 12px ${alpha(theme.palette.primary.main, 0.14)}, inset 0 1px 0 rgba(255, 255, 255, 0.90)`
          }}
        />
      </Box>

      {TABS.map((tab) => {
        const isSelected = optimisticTab === tab.id;
        return (
          <Box
            key={tab.id}
            role="tab"
            id={`bottom-nav-tab-${tab.id}`}
            aria-selected={isSelected}
            aria-label={tab.label}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (optimisticTab !== tab.id) {
                  setOptimisticTab(tab.id);
                }
                triggerHaptic(10);
                onTabChange(tab.id);
              }
            }}
            onClick={() => {
              if (optimisticTab !== tab.id) {
                setOptimisticTab(tab.id);
              }
              triggerHaptic(10);
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
              transition: 'transform 0.12s ease',
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
                transition: 'color 0.14s ease'
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
                transition: 'color 0.14s ease'
              }}
            >
              {tab.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
});
