import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Chip,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  useTheme,
  alpha
} from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
import SearchIcon from '@mui/icons-material/Search';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckIcon from '@mui/icons-material/Check';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import TableRowsIcon from '@mui/icons-material/TableRows';
import { ThemePlugin } from '../themes/types';

interface TopAppBarProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onOpenTokenDialog: () => void;
  currentThemeId: string;
  availableThemes: ThemePlugin[];
  onSelectTheme: (themeId: string) => void;
  coreRemaining: number;
  isAuthenticated: boolean;
  isSearchActive: boolean;
  onSearchActiveChange: (active: boolean) => void;
  isCompactView: boolean;
  onToggleCompactView: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  onRefresh,
  isRefreshing = false,
  onOpenTokenDialog,
  currentThemeId,
  availableThemes,
  onSelectTheme,
  coreRemaining,
  isAuthenticated,
  isSearchActive,
  onSearchActiveChange,
  isCompactView,
  onToggleCompactView
}) => {
  const theme = useTheme();
  const [themeMenuAnchor, setThemeMenuAnchor] = useState<null | HTMLElement>(null);

  const handleOpenThemeMenu = (event: React.MouseEvent<HTMLElement>) => {
    setThemeMenuAnchor(event.currentTarget);
  };

  const handleCloseThemeMenu = () => {
    setThemeMenuAnchor(null);
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
        pt: 'max(env(safe-area-inset-top, 0px), var(--status-bar-height, 44px))',
        bgcolor: 'background.default',
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundImage: 'none'
      }}
    >
      <Toolbar
        variant="dense"
        sx={{
          px: { xs: 1.5, sm: 2 },
          py: 0.6,
          minHeight: 50,
          alignItems: 'center'
        }}
      >
        <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left: Small Logo & Clean OneGitVault Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              component="img"
              src="./favicon.png"
              alt="OneGitVault Logo"
              sx={{
                width: 22,
                height: 22,
                borderRadius: '6px',
                objectFit: 'contain'
              }}
            />
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 900,
                fontSize: '0.925rem',
                letterSpacing: '-0.02em',
                lineHeight: 1,
                color: 'text.primary'
              }}
            >
              OneGitVault
            </Typography>
          </Box>

          {/* Right: Search Trigger, Quota Badge, Refresh, Theme Selector */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
            {/* Search Icon Button: Launches WhatsApp/Instagram-style Translucent Flyout */}
            <Tooltip title="Search APKs & Repos">
              <IconButton
                aria-label="search-button"
                size="small"
                onClick={() => onSearchActiveChange(true)}
                sx={{
                  p: 0.6,
                  color: isSearchActive ? theme.palette.primary.main : 'text.primary',
                  bgcolor: isSearchActive ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
                  borderRadius: '8px'
                }}
              >
                <SearchIcon sx={{ fontSize: 19 }} />
              </IconButton>
            </Tooltip>

            {/* Real-time Quota Badge (Core API remaining) */}
            <Tooltip title={isAuthenticated ? "Token Active (5,000 req/hr)" : "Add Token (60 req/hr)"}>
              <Chip
                icon={<VpnKeyIcon sx={{ fontSize: 11 }} />}
                label={`${coreRemaining} req`}
                size="small"
                onClick={onOpenTokenDialog}
                color={isAuthenticated ? "primary" : "default"}
                variant={isAuthenticated ? "filled" : "outlined"}
                sx={{
                  height: 22,
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  borderRadius: '6px',
                  mx: 0.2,
                  bgcolor: isAuthenticated ? theme.palette.primary.main : alpha(theme.palette.text.primary, 0.05),
                  borderColor: theme.palette.divider
                }}
              />
            </Tooltip>

            {/* Refresh Button with Spinner Animation when refreshing */}
            <Tooltip title="Refresh Feed">
              <IconButton
                size="small"
                onClick={onRefresh}
                disabled={isRefreshing}
                sx={{
                  p: 0.6,
                  color: isRefreshing ? theme.palette.primary.main : 'text.secondary'
                }}
              >
                <RefreshIcon
                  sx={{
                    fontSize: 18,
                    animation: isRefreshing ? 'spinRefresh 0.8s linear infinite' : 'none',
                    '@keyframes spinRefresh': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' }
                    }
                  }}
                />
              </IconButton>
            </Tooltip>

            {/* Compact / Comfortable View Density Toggle */}
            <Tooltip title={isCompactView ? "Comfortable View" : "Compact View"}>
              <IconButton
                size="small"
                onClick={onToggleCompactView}
                sx={{
                  p: 0.6,
                  color: isCompactView ? theme.palette.primary.main : 'text.secondary',
                  bgcolor: isCompactView ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
                  borderRadius: '8px'
                }}
              >
                {isCompactView ? <ViewAgendaIcon sx={{ fontSize: 18 }} /> : <TableRowsIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            </Tooltip>

            {/* Theme Selector Palette Button */}
            <Tooltip title="Themes">
              <IconButton size="small" onClick={handleOpenThemeMenu} sx={{ p: 0.6, color: theme.palette.primary.main }}>
                <PaletteIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>

            {/* Themes Dropdown Menu */}
            <Menu
              anchorEl={themeMenuAnchor}
              open={Boolean(themeMenuAnchor)}
              onClose={handleCloseThemeMenu}
              sx={{
                '& .MuiPaper-root': {
                  borderRadius: '16px',
                  minWidth: 210,
                  p: 0.5,
                  bgcolor: 'background.paper',
                  boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65)',
                  border: `1px solid ${theme.palette.divider}`
                }
              }}
            >
              <Box sx={{ px: 2, py: 0.75, borderBottom: `1px solid ${theme.palette.divider}` }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                  Select Theme
                </Typography>
              </Box>
              {availableThemes.map((t) => {
                const isSelected = t.id === currentThemeId;
                return (
                  <MenuItem
                    key={t.id}
                    onClick={() => {
                      onSelectTheme(t.id);
                      handleCloseThemeMenu();
                    }}
                    sx={{
                      borderRadius: '8px',
                      my: 0.25,
                      py: 0.75,
                      bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.12) : 'transparent'
                    }}
                  >
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: t.colors.accent,
                        border: `1.5px solid ${t.colors.borderDefault}`,
                        mr: 1.25
                      }}
                    />
                    <ListItemText
                      primary={t.name}
                      primaryTypographyProps={{
                        fontSize: '0.8rem',
                        fontWeight: isSelected ? 800 : 500,
                        color: isSelected ? theme.palette.primary.main : 'text.primary'
                      }}
                    />
                    {isSelected && (
                      <ListItemIcon sx={{ minWidth: 16, color: theme.palette.primary.main, justifyContent: 'flex-end' }}>
                        <CheckIcon sx={{ fontSize: 14 }} />
                      </ListItemIcon>
                    )}
                  </MenuItem>
                );
              })}
            </Menu>
          </Box>
        </Box>
      </Toolbar>
      {/* Sleek refresh indicator line at bottom edge of TopAppBar */}
      {isRefreshing && (
        <LinearProgress
          color="primary"
          sx={{
            height: 2.5,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1300
          }}
        />
      )}
    </AppBar>
  );
};
