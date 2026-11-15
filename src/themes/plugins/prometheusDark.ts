import { ThemePlugin } from '../types';

export const prometheusDarkTheme: ThemePlugin = {
  id: 'prometheus-dark',
  name: 'Prometheus Dark',
  description: 'Cinematic deep petrol teal with warm sand typography and flame vermilion accents',
  isDark: true,
  iconName: 'Flame',
  colors: {
    bgCanvas: '#0c1519',          // Deep cinematic petrol-black
    bgHeader: 'rgba(16, 27, 32, 0.98)',
    bgSurface: '#16272f',          // Elevated visible petrol tile
    bgSurfaceHover: '#1e343e',     // Clear visible hover
    bgSurfaceActive: '#122026',    // Recessed active
    bgSubtle: 'rgba(36, 72, 85, 0.35)',

    heroGradient: 'linear-gradient(to right, #ff5c47, #e64833, #90aead)',

    borderSubtle: 'rgba(36, 72, 85, 0.45)',
    borderDefault: '#244855',      // Petrol teal border
    borderHover: '#356374',
    borderFocus: '#e64833',

    textPrimary: '#fbe9d0',        // Warm biscuit sand
    textSecondary: '#90aead',      // Sage teal
    textMuted: '#688d9c',
    textInverse: '#ffffff',        // White text on flame buttons!

    accent: '#e64833',             // Vermilion flame
    accentHover: '#ff5c47',
    accentSoft: 'rgba(230, 72, 51, 0.18)',
    accentBorder: 'rgba(230, 72, 51, 0.45)',

    secondaryAccent: '#90aead',
    secondarySoft: 'rgba(144, 174, 173, 0.15)',
    secondaryBorder: 'rgba(144, 174, 173, 0.3)',

    starColor: '#e64833',
    starBg: 'rgba(230, 72, 51, 0.15)',
    starBorder: 'rgba(230, 72, 51, 0.4)',

    tagBg: '#111e24',
    tagBorder: '#244855',
    tagText: '#90aead',
    tagHoverText: '#ff5c47',

    activePillBg: '#e64833',
    activePillText: '#ffffff',
    activePillBorder: '#e64833',

    overlayBackdrop: 'rgba(11, 20, 24, 0.85)',

    codeBg: '#0d161a',
    codeBorder: '#244855',
    codeText: '#fbe9d0',
    codeInlineBg: '#1c323c',
    codeInlineText: '#ff5c47',

    scrollbarTrack: '#0c1519',
    scrollbarThumb: '#244855',
    scrollbarThumbHover: '#e64833',
  }
};
