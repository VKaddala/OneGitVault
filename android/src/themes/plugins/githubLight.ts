import { ThemePlugin } from '../types';

export const githubLightTheme: ThemePlugin = {
  id: 'github-light',
  name: 'GitHub Simple Light',
  description: 'Crisp cool-porcelain canvas with bright white cards, sapphire accents, emerald highlights, and high contrast',
  isDark: false,
  iconName: 'Github',
  colors: {
    bgCanvas: '#f1f5f9',
    bgHeader: 'rgba(255, 255, 255, 0.96)',
    bgSurface: '#ffffff',
    bgSurfaceHover: '#f8fafc',
    bgSurfaceActive: '#e8eff7',
    bgSubtle: 'rgba(29, 78, 216, 0.08)',

    heroGradient: 'linear-gradient(135deg, #1d4ed8, #0284c7, #059669)',

    borderSubtle: '#e2e8f0',
    borderDefault: '#cbd5e1',
    borderHover: '#1d4ed8',
    borderFocus: '#1d4ed8',

    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#64748b',
    textInverse: '#ffffff',

    accent: '#1d4ed8',
    accentHover: '#1e40af',
    accentSoft: 'rgba(29, 78, 216, 0.12)',
    accentBorder: 'rgba(29, 78, 216, 0.35)',

    secondaryAccent: '#0f766e',
    secondarySoft: 'rgba(15, 118, 110, 0.11)',
    secondaryBorder: 'rgba(15, 118, 110, 0.28)',

    starColor: '#d97706',
    starBg: 'rgba(217, 119, 6, 0.13)',
    starBorder: 'rgba(217, 119, 6, 0.35)',

    tagBg: '#f8fafc',
    tagBorder: '#cbd5e1',
    tagText: '#1d4ed8',
    tagHoverText: '#1e40af',

    activePillBg: '#1d4ed8',
    activePillText: '#ffffff',
    activePillBorder: '#1d4ed8',

    overlayBackdrop: 'rgba(15, 23, 42, 0.55)',

    codeBg: '#f8fafc',
    codeBorder: '#cbd5e1',
    codeText: '#0f172a',
    codeInlineBg: '#e2e8f0',
    codeInlineText: '#1d4ed8',

    scrollbarTrack: '#f1f5f9',
    scrollbarThumb: '#cbd5e1',
    scrollbarThumbHover: '#1d4ed8',
  }
};
