import { ThemePlugin } from '../types';

export const githubLightTheme: ThemePlugin = {
  id: 'github-light',
  name: 'GitHub Simple Light',
  description: 'Clean classic GitHub light with crisp off-white canvas, white cards, and signature blue buttons',
  isDark: false,
  iconName: 'Github',
  colors: {
    bgCanvas: '#f6f8fa',          // Soft light canvas
    bgHeader: 'rgba(255, 255, 255, 0.98)',
    bgSurface: '#ffffff',          // Crisp white elevated cards
    bgSurfaceHover: '#f3f4f6',     // Smooth visible hover
    bgSurfaceActive: '#eaeef2',    // Subtle recessed active area
    bgSubtle: 'rgba(9, 105, 218, 0.08)',

    heroGradient: 'linear-gradient(to right, #0969da, #1a7f37, #8250df)',

    borderSubtle: '#e5e9f0',
    borderDefault: '#d0d7de',      // GitHub standard border
    borderHover: '#0969da',
    borderFocus: '#0969da',

    textPrimary: '#1f2328',        // Deep GitHub black text
    textSecondary: '#57606a',
    textMuted: '#656d76',
    textInverse: '#ffffff',        // White text on blue buttons!

    accent: '#0969da',             // Signature GitHub blue
    accentHover: '#0550ae',
    accentSoft: 'rgba(9, 105, 218, 0.12)',
    accentBorder: 'rgba(9, 105, 218, 0.35)',

    secondaryAccent: '#1a7f37',
    secondarySoft: 'rgba(26, 127, 55, 0.1)',
    secondaryBorder: 'rgba(26, 127, 55, 0.25)',

    starColor: '#d4a72c',          // GitHub gold star
    starBg: 'rgba(212, 167, 44, 0.14)',
    starBorder: 'rgba(212, 167, 44, 0.35)',

    tagBg: '#f6f8fa',
    tagBorder: '#d0d7de',
    tagText: '#0969da',
    tagHoverText: '#0550ae',

    activePillBg: '#0969da',
    activePillText: '#ffffff',
    activePillBorder: '#0969da',

    overlayBackdrop: 'rgba(31, 35, 40, 0.55)',

    codeBg: '#f6f8fa',
    codeBorder: '#d0d7de',
    codeText: '#1f2328',
    codeInlineBg: '#eff1f3',
    codeInlineText: '#0969da',

    scrollbarTrack: '#f6f8fa',
    scrollbarThumb: '#d0d7de',
    scrollbarThumbHover: '#0969da',
  }
};
