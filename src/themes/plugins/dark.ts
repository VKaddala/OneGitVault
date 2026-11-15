import { ThemePlugin } from '../types';

/**
 * Prometheus Cinematic Dark Theme Plugin
 * Rich petrol teal surfaces (#16272f), signature petrol borders (#244855),
 * dusty sage typography (#90aead), warm biscuit headings (#fbe9d0),
 * and radiant flame vermilion highlights (#e64833).
 */
export const darkTheme: ThemePlugin = {
  id: 'dark',
  name: 'Prometheus Dark',
  description: 'Cinematic deep petrol teal with warm sand typography and flame vermilion accents',
  isDark: true,
  colors: {
    bgCanvas: '#101b20',
    bgHeader: 'rgba(16, 27, 32, 0.95)',
    bgSurface: '#16272f',
    bgSurfaceHover: '#1c323c',
    bgSurfaceActive: '#132229',
    bgSubtle: 'rgba(36, 72, 85, 0.35)',

    heroGradient: 'linear-gradient(to right, #ff5c47, #e64833, #90aead)',

    borderSubtle: 'rgba(36, 72, 85, 0.45)',
    borderDefault: '#244855',
    borderHover: '#356374',
    borderFocus: '#e64833',

    textPrimary: '#fbe9d0',
    textSecondary: '#90aead',
    textMuted: '#688d9c',
    textInverse: '#101b20',

    accent: '#e64833',
    accentHover: '#ff5c47',
    accentSoft: 'rgba(230, 72, 51, 0.15)',
    accentBorder: 'rgba(230, 72, 51, 0.35)',

    secondaryAccent: '#90aead',
    secondarySoft: 'rgba(144, 174, 173, 0.15)',
    secondaryBorder: 'rgba(144, 174, 173, 0.3)',

    starColor: '#e64833',
    starBg: 'rgba(230, 72, 51, 0.12)',
    starBorder: 'rgba(230, 72, 51, 0.3)',

    tagBg: '#101b20',
    tagBorder: '#244855',
    tagText: '#90aead',
    tagHoverText: '#ff5c47',

    activePillBg: '#e64833',
    activePillText: '#ffffff',
    activePillBorder: '#e64833',

    overlayBackdrop: 'rgba(11, 20, 24, 0.8)',

    codeBg: '#0d161a',
    codeBorder: '#244855',
    codeText: '#fbe9d0',
    codeInlineBg: '#1c323c',
    codeInlineText: '#ff5c47',

    scrollbarTrack: '#101b20',
    scrollbarThumb: '#244855',
    scrollbarThumbHover: '#e64833',
  },
};
