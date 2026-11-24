import { ThemePlugin } from '../types';

export const prometheusDarkTheme: ThemePlugin = {
  id: 'prometheus-dark',
  name: 'Prometheus Dark',
  description: 'Cinematic deep black petrol teal with warm sand typography and flame vermilion accents',
  isDark: true,
  iconName: 'Flame',
  colors: {
    bgCanvas: '#050a0d',          // Pure deep black petrol
    bgHeader: 'rgba(5, 10, 13, 0.96)',
    bgSurface: '#0b161b',          // Elevated visible petrol tile
    bgSurfaceHover: '#13232b',     // Clear visible hover
    bgSurfaceActive: '#071014',    // Recessed active
    bgSubtle: 'rgba(36, 72, 85, 0.35)',

    heroGradient: 'linear-gradient(to right, #ff5c47, #e64833, #90aead)',

    borderSubtle: 'rgba(23, 46, 55, 0.45)',
    borderDefault: '#172e37',      // Petrol teal border
    borderHover: '#264a58',
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

    tagBg: '#071014',
    tagBorder: '#172e37',
    tagText: '#90aead',
    tagHoverText: '#ff5c47',

    activePillBg: '#e64833',
    activePillText: '#ffffff',
    activePillBorder: '#e64833',

    overlayBackdrop: 'rgba(5, 10, 13, 0.9)',

    codeBg: '#071014',
    codeBorder: '#172e37',
    codeText: '#fbe9d0',
    codeInlineBg: '#0f1e24',
    codeInlineText: '#ff5c47',

    scrollbarTrack: '#050a0d',
    scrollbarThumb: '#172e37',
    scrollbarThumbHover: '#e64833',
  }
};
