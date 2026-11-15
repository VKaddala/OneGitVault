import { ThemePlugin } from '../types';

/**
 * Ambient Twilight Theme Plugin
 * Restful midnight slate canvas (#0f141c), high-contrast readable typography (#f1f5f9),
 * cool slate containers (#17202c), and serene sky cyan accents (#38bdf8).
 */
export const ambientTheme: ThemePlugin = {
  id: 'ambient',
  name: 'Ambient Twilight',
  description: 'Cool midnight slate with serene sky-cyan accents and relaxed eye comfort',
  isDark: true,
  colors: {
    bgCanvas: '#0f141c',
    bgHeader: 'rgba(15, 20, 28, 0.95)',
    bgSurface: '#17202c',
    bgSurfaceHover: '#1e2938',
    bgSurfaceActive: '#131b26',
    bgSubtle: 'rgba(56, 189, 248, 0.1)',

    heroGradient: 'linear-gradient(to right, #38bdf8, #60a5fa, #c084fc)',

    borderSubtle: '#1e2938',
    borderDefault: '#273548',
    borderHover: '#38bdf8',
    borderFocus: '#38bdf8',

    textPrimary: '#f1f5f9',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    textInverse: '#0f141c',

    accent: '#38bdf8',
    accentHover: '#7dd3fc',
    accentSoft: 'rgba(56, 189, 248, 0.15)',
    accentBorder: 'rgba(56, 189, 248, 0.35)',

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
    activePillText: '#0f141c',
    activePillBorder: '#38bdf8',

    overlayBackdrop: 'rgba(10, 14, 20, 0.85)',

    codeBg: '#131b26',
    codeBorder: '#273548',
    codeText: '#f1f5f9',
    codeInlineBg: '#1a2332',
    codeInlineText: '#38bdf8',

    scrollbarTrack: '#0f141c',
    scrollbarThumb: '#273548',
    scrollbarThumbHover: '#38bdf8',
  },
};
