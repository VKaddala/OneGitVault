import { ThemePlugin } from '../types';

export const githubDarkTheme: ThemePlugin = {
  id: 'github-dark',
  name: 'GitHub Dark',
  description: 'Pure pitch-black canvas with high-contrast midnight cards, vivid sapphire blue accents, and rich gold stars',
  isDark: true,
  iconName: 'Github',
  colors: {
    bgCanvas: '#000000',
    bgHeader: 'rgba(6, 9, 14, 0.94)',
    bgSurface: '#0d121a',
    bgSurfaceHover: '#161f2c',
    bgSurfaceActive: '#090d13',
    bgSubtle: 'rgba(47, 129, 247, 0.16)',

    heroGradient: 'linear-gradient(135deg, #2f81f7, #58a6ff, #a371f7)',

    borderSubtle: '#171e28',
    borderDefault: '#232c38',
    borderHover: '#58a6ff',
    borderFocus: '#2f81f7',

    textPrimary: '#f3f7fc',
    textSecondary: '#9ba6b5',
    textMuted: '#788392',
    textInverse: '#ffffff',

    accent: '#2f81f7',
    accentHover: '#58a6ff',
    accentSoft: 'rgba(47, 129, 247, 0.18)',
    accentBorder: 'rgba(88, 166, 255, 0.45)',

    secondaryAccent: '#79c0ff',
    secondarySoft: 'rgba(121, 192, 255, 0.14)',
    secondaryBorder: 'rgba(121, 192, 255, 0.35)',

    starColor: '#f0b429',
    starBg: 'rgba(240, 180, 41, 0.16)',
    starBorder: 'rgba(240, 180, 41, 0.42)',

    tagBg: '#0b1017',
    tagBorder: '#232c38',
    tagText: '#79c0ff',
    tagHoverText: '#a5d6ff',

    activePillBg: '#2f81f7',
    activePillText: '#ffffff',
    activePillBorder: '#2f81f7',

    overlayBackdrop: 'rgba(0, 0, 0, 0.88)',

    codeBg: '#090d14',
    codeBorder: '#232c38',
    codeText: '#f3f7fc',
    codeInlineBg: '#161f2c',
    codeInlineText: '#79c0ff',

    scrollbarTrack: '#000000',
    scrollbarThumb: '#232c38',
    scrollbarThumbHover: '#58a6ff',
  }
};
