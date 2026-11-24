import { createTheme, alpha, Theme } from '@mui/material/styles';
import { ThemePlugin } from './themes/types';

export const createMuiThemeFromPlugin = (plugin: ThemePlugin): Theme => {
  const isDark = plugin.isDark;
  const c = plugin.colors;

  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: {
        main: c.accent,
        light: c.accentHover,
        dark: c.accent,
        contrastText: c.textInverse || '#ffffff',
      },
      secondary: {
        main: c.secondaryAccent,
        contrastText: c.textInverse || '#ffffff',
      },
      background: {
        default: c.bgCanvas,
        paper: c.bgSurface,
      },
      text: {
        primary: c.textPrimary,
        secondary: c.textSecondary,
      },
      divider: c.borderDefault,
    },
    shape: {
      borderRadius: 16,
    },
    zIndex: {
      mobileStepper: 1000,
      fab: 1050,
      speedDial: 1050,
      appBar: 1100,
      drawer: 1200,
      modal: 1600,
      snackbar: 1700,
      tooltip: 1800,
    },
    typography: {
      fontFamily: '"Nunito", "Google Sans", "Google Sans Text", system-ui, -apple-system, sans-serif',
      h5: {
        fontWeight: 800,
        letterSpacing: '-0.01em',
      },
      h6: {
        fontWeight: 700,
        letterSpacing: '-0.01em',
      },
      subtitle1: {
        fontWeight: 600,
      },
      body1: {
        fontSize: '0.925rem',
        lineHeight: 1.5,
      },
      body2: {
        fontSize: '0.825rem',
        lineHeight: 1.45,
      },
      caption: {
        fontSize: '0.75rem',
        fontWeight: 600,
      },
      button: {
        fontWeight: 700,
        textTransform: 'none',
        letterSpacing: '0.01em',
      },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: c.bgHeader || c.bgSurface,
            backdropFilter: 'blur(16px)',
            boxShadow: 'none',
            borderBottom: `1px solid ${c.borderDefault}`,
            color: c.textPrimary,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 18,
            backgroundColor: c.bgSurface,
            backgroundImage: 'none',
            border: `1px solid ${c.borderDefault}`,
            boxShadow: isDark
              ? '0 4px 18px rgba(0, 0, 0, 0.45)'
              : '0 4px 18px rgba(0, 0, 0, 0.05)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
            '&:hover': {
              borderColor: c.borderHover || c.accent,
              boxShadow: isDark
                ? '0 6px 24px rgba(0, 0, 0, 0.65)'
                : '0 6px 24px rgba(0, 0, 0, 0.09)',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 20,
            padding: '7px 18px',
            fontSize: '0.85rem',
            boxShadow: 'none',
            fontFamily: '"Nunito", "Google Sans", sans-serif',
            '&:hover': {
              boxShadow: 'none',
            },
          },
          containedPrimary: {
            backgroundColor: c.accent,
            color: c.textInverse || '#ffffff',
            '&:hover': {
              backgroundColor: c.accentHover,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            fontWeight: 700,
            fontSize: '0.75rem',
            fontFamily: '"Nunito", "Google Sans", sans-serif',
          },
          filled: {
            backgroundColor: c.bgSubtle || alpha(c.accent, 0.1),
            border: `1px solid ${c.borderSubtle || c.borderDefault}`,
            color: c.textSecondary,
          },
          filledPrimary: {
            backgroundColor: c.accent,
            color: c.textInverse || '#ffffff',
            border: `1px solid ${c.accent}`,
          },
        },
      },
      MuiBottomNavigation: {
        styleOverrides: {
          root: {
            backgroundColor: c.bgHeader || c.bgSurface,
            backdropFilter: 'blur(20px)',
            borderTop: `1px solid ${c.borderDefault}`,
            height: 64,
          },
        },
      },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: {
            color: c.textSecondary,
            padding: '6px 0',
            '&.Mui-selected': {
              color: c.accent,
            },
            '& .MuiBottomNavigationAction-label': {
              fontSize: '0.725rem',
              fontWeight: 600,
              fontFamily: '"Nunito", "Google Sans", sans-serif',
              marginTop: 3,
              '&.Mui-selected': {
                fontSize: '0.75rem',
                fontWeight: 800,
              },
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 24,
            backgroundColor: isDark ? '#0d1117' : (c.bgSurface || '#ffffff'),
            backgroundImage: 'none',
            border: `1px solid ${c.borderDefault}`,
            color: c.textPrimary,
          },
        },
      },
    },
  });
};
