import { ThemePlugin } from '../types';

export const githubDarkTheme: ThemePlugin = {
  id: 'github-dark',
  name: 'GitHub Dark (AMOLED)',
  description: 'Pure pitch-black AMOLED dark with high-contrast surfaces, crisp blue buttons, and gold stars',
  isDark: true,
  iconName: 'Github',
  colors: {
    bgCanvas: '#000000',           // Pure AMOLED deep pitch black (not grey!)
    bgHeader: 'rgba(0, 0, 0, 0.96)',
    bgSurface: '#0d1117',          // Deep sleek dark surface
    bgSurfaceHover: '#161b22',     // Clear visible hover
    bgSurfaceActive: '#080c10',    // Recessed active area
    bgSubtle: 'rgba(56, 139, 253, 0.15)',

    heroGradient: 'linear-gradient(to right, #388bfd, #58a6ff, #a371f7)',

    borderSubtle: '#161b22',
    borderDefault: '#21262d',      // Crisp, visible high-contrast border
    borderHover: '#58a6ff',
    borderFocus: '#1f6feb',

    textPrimary: '#f0f6fc',
    textSecondary: '#8d96a0',
    textMuted: '#7d8590',
    textInverse: '#ffffff',        // White text on blue buttons!

    accent: '#1f6feb',             // Classic GitHub blue
    accentHover: '#388bfd',
    accentSoft: 'rgba(56, 139, 253, 0.18)',
    accentBorder: 'rgba(56, 139, 253, 0.45)',

    secondaryAccent: '#58a6ff',
    secondarySoft: 'rgba(88, 166, 255, 0.15)',
    secondaryBorder: 'rgba(88, 166, 255, 0.35)',

    starColor: '#e3b341',          // GitHub gold star
    starBg: 'rgba(227, 179, 65, 0.15)',
    starBorder: 'rgba(227, 179, 65, 0.4)',

    tagBg: '#090d12',
    tagBorder: '#21262d',
    tagText: '#58a6ff',
    tagHoverText: '#79c0ff',

    activePillBg: '#1f6feb',
    activePillText: '#ffffff',
    activePillBorder: '#1f6feb',

    overlayBackdrop: 'rgba(0, 0, 0, 0.88)',

    codeBg: '#090d12',
    codeBorder: '#21262d',
    codeText: '#f0f6fc',
    codeInlineBg: '#161b22',
    codeInlineText: '#79c0ff',

    scrollbarTrack: '#000000',
    scrollbarThumb: '#21262d',
    scrollbarThumbHover: '#58a6ff',
  }
};
