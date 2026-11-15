import { ThemePlugin } from '../types';

export const ambientTwilightTheme: ThemePlugin = {
  id: 'ambient',
  name: 'Ambient Twilight',
  description: 'Cool midnight slate with serene sky-cyan accents and relaxed eye comfort',
  isDark: true,
  iconName: 'Sparkles',
  colors: {
    bgCanvas: '#0a0e14',          // Deep midnight twilight
    bgHeader: 'rgba(15, 20, 28, 0.98)',
    bgSurface: '#161e2b',          // Elevated visible slate surface
    bgSurfaceHover: '#1f2a3c',     // Clear visible hover
    bgSurfaceActive: '#121822',
    bgSubtle: 'rgba(56, 189, 248, 0.1)',

    heroGradient: 'linear-gradient(to right, #38bdf8, #60a5fa, #c084fc)',

    borderSubtle: '#1d2737',
    borderDefault: '#273548',      // Clean slate border
    borderHover: '#38bdf8',
    borderFocus: '#38bdf8',

    textPrimary: '#f1f5f9',        // High-contrast clean font
    textSecondary: '#94a3b8',      // Relaxed cool slate
    textMuted: '#64748b',
    textInverse: '#0a0e14',        // Deep dark text on bright cyan pills!

    accent: '#38bdf8',             // Serene sky cyan
    accentHover: '#7dd3fc',
    accentSoft: 'rgba(56, 189, 248, 0.15)',
    accentBorder: 'rgba(56, 189, 248, 0.4)',

    secondaryAccent: '#60a5fa',
    secondarySoft: 'rgba(96, 165, 250, 0.12)',
    secondaryBorder: 'rgba(96, 165, 250, 0.3)',

    starColor: '#38bdf8',
    starBg: 'rgba(56, 189, 248, 0.12)',
    starBorder: 'rgba(56, 189, 248, 0.3)',

    tagBg: '#0f141c',
    tagBorder: '#273548',
    tagText: '#94a3b8',
    tagHoverText: '#38bdf8',

    activePillBg: '#38bdf8',
    activePillText: '#0a0e14',
    activePillBorder: '#38bdf8',

    overlayBackdrop: 'rgba(10, 14, 20, 0.85)',

    codeBg: '#121822',
    codeBorder: '#273548',
    codeText: '#f1f5f9',
    codeInlineBg: '#1a2332',
    codeInlineText: '#38bdf8',

    scrollbarTrack: '#0a0e14',
    scrollbarThumb: '#273548',
    scrollbarThumbHover: '#38bdf8',
  }
};
