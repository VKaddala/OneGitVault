import { ThemePlugin } from '../types';

/**
 * Sand & Ivory Light Theme Plugin
 * Warm natural biscuit sand canvas (#fbe9d0), crisp white container cards (#ffffff),
 * deep petrol teal typography (#244855), terracotta details (#874f41),
 * and energetic flame accents (#e64833).
 */
export const lightTheme: ThemePlugin = {
  id: 'light',
  name: 'Sand & Ivory Light',
  description: 'Warm natural sand canvas with crisp white cards and deep petrol teal typography',
  isDark: false,
  colors: {
    bgCanvas: '#fbe9d0',
    bgHeader: 'rgba(251, 233, 208, 0.95)',
    bgSurface: '#ffffff',
    bgSurfaceHover: '#fff9f2',
    bgSurfaceActive: '#faf0e4',
    bgSubtle: 'rgba(135, 79, 65, 0.1)',

    heroGradient: 'linear-gradient(to right, #e64833, #874f41, #244855)',

    borderSubtle: 'rgba(135, 79, 65, 0.18)',
    borderDefault: '#e3d1ba',
    borderHover: '#874f41',
    borderFocus: '#e64833',

    textPrimary: '#244855',
    textSecondary: '#5a3d36',
    textMuted: '#874f41',
    textInverse: '#ffffff',

    accent: '#e64833',
    accentHover: '#c73a27',
    accentSoft: 'rgba(230, 72, 51, 0.12)',
    accentBorder: 'rgba(230, 72, 51, 0.32)',

    secondaryAccent: '#874f41',
    secondarySoft: 'rgba(135, 79, 65, 0.12)',
    secondaryBorder: 'rgba(135, 79, 65, 0.28)',

    starColor: '#e64833',
    starBg: 'rgba(230, 72, 51, 0.1)',
    starBorder: 'rgba(230, 72, 51, 0.25)',

    tagBg: '#faf0e4',
    tagBorder: '#e3d1ba',
    tagText: '#874f41',
    tagHoverText: '#e64833',

    activePillBg: '#e64833',
    activePillText: '#ffffff',
    activePillBorder: '#e64833',

    overlayBackdrop: 'rgba(36, 72, 85, 0.5)',

    codeBg: '#fbf4ea',
    codeBorder: '#e3d1ba',
    codeText: '#244855',
    codeInlineBg: '#f3e6d3',
    codeInlineText: '#c73a27',

    scrollbarTrack: '#f6dfc0',
    scrollbarThumb: '#90aead',
    scrollbarThumbHover: '#e64833',
  },
};
