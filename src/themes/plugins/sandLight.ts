import { ThemePlugin } from '../types';

export const sandLightTheme: ThemePlugin = {
  id: 'sand-light',
  name: 'Sand & Ivory Light',
  description: 'Warm natural sand canvas with ivory cards, petrol headings, and terracotta details',
  isDark: false,
  iconName: 'Sun',
  colors: {
    bgCanvas: '#FBE9D0',          // Warm biscuit sand
    bgHeader: 'rgba(251, 233, 208, 0.98)',
    bgSurface: '#FFF9F0',          // Warm ivory cards (high contrast against sand)
    bgSurfaceHover: '#F2DFCA',
    bgSurfaceActive: '#FAF0E4',
    bgSubtle: 'rgba(135, 79, 65, 0.1)',

    heroGradient: 'linear-gradient(to right, #E64833, #874F41, #244855)',

    borderSubtle: 'rgba(135, 79, 65, 0.22)',
    borderDefault: '#e3d1ba',      // Clean stone border
    borderHover: '#874F41',
    borderFocus: '#E64833',

    textPrimary: '#244855',        // Deep petrol teal
    textSecondary: '#874F41',      // Warm terracotta
    textMuted: '#874F41',
    textInverse: '#ffffff',        // White text on flame buttons!

    accent: '#E64833',             // Vibrant vermilion flame
    accentHover: '#ff5c47',
    accentSoft: 'rgba(230, 72, 51, 0.14)',
    accentBorder: 'rgba(230, 72, 51, 0.35)',

    secondaryAccent: '#874F41',
    secondarySoft: 'rgba(135, 79, 65, 0.14)',
    secondaryBorder: 'rgba(135, 79, 65, 0.3)',

    starColor: '#E64833',
    starBg: 'rgba(230, 72, 51, 0.12)',
    starBorder: 'rgba(230, 72, 51, 0.3)',

    tagBg: '#FFF9F0',
    tagBorder: '#e3d1ba',
    tagText: '#874F41',
    tagHoverText: '#E64833',

    activePillBg: '#E64833',
    activePillText: '#ffffff',
    activePillBorder: '#E64833',

    overlayBackdrop: 'rgba(36, 72, 85, 0.55)',

    codeBg: '#FFF9F0',
    codeBorder: '#e3d1ba',
    codeText: '#244855',
    codeInlineBg: '#F2DFCA',
    codeInlineText: '#E64833',

    scrollbarTrack: '#FBE9D0',
    scrollbarThumb: '#e3d1ba',
    scrollbarThumbHover: '#E64833',
  }
};
