import { ThemePlugin } from '../types';

export const githubDarkTheme: ThemePlugin = {
  id: 'github-dark',
  name: 'GitHub Simple Dark',
  description: 'Classic GitHub dark with high-contrast slate surfaces, crisp blue buttons, and gold stars',
  isDark: true,
  iconName: 'Github',
  colors: {
    bgCanvas: '#0d1117',
    bgHeader: 'rgba(13, 17, 23, 0.98)',
    bgSurface: '#1c2128',          // Elevated visible container (distinct from #0d1117 canvas)
    bgSurfaceHover: '#282e38',     // Clear visible hover
    bgSurfaceActive: '#161b22',    // Subtle recessed active area
    bgSubtle: 'rgba(56, 139, 253, 0.15)',

    heroGradient: 'linear-gradient(to right, #388bfd, #58a6ff, #a371f7)',

    borderSubtle: '#262c36',
    borderDefault: '#373e47',      // Visible high-contrast card border
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

    tagBg: '#161b22',
    tagBorder: '#373e47',
    tagText: '#58a6ff',
    tagHoverText: '#79c0ff',

    activePillBg: '#1f6feb',
    activePillText: '#ffffff',
    activePillBorder: '#1f6feb',

    overlayBackdrop: 'rgba(1, 4, 9, 0.85)',

    codeBg: '#161b22',
    codeBorder: '#373e47',
    codeText: '#f0f6fc',
    codeInlineBg: '#21262d',
    codeInlineText: '#79c0ff',

    scrollbarTrack: '#0d1117',
    scrollbarThumb: '#373e47',
    scrollbarThumbHover: '#58a6ff',
  }
};
