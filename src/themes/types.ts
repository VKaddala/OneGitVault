export interface ThemeColors {
  // Canvas & Backgrounds
  bgCanvas: string;
  bgHeader: string;
  bgSurface: string;
  bgSurfaceHover: string;
  bgSurfaceActive: string;
  bgSubtle: string;

  // Hero Background Gradients
  heroGradient: string;

  // Borders
  borderSubtle: string;
  borderDefault: string;
  borderHover: string;
  borderFocus: string;

  // Typography
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Primary Accent (Buttons, Highlights)
  accent: string;
  accentHover: string;
  accentSoft: string;
  accentBorder: string;

  // Secondary Accent (Badges, Tag Accents)
  secondaryAccent: string;
  secondarySoft: string;
  secondaryBorder: string;

  // Star & Popularity Badges
  starColor: string;
  starBg: string;
  starBorder: string;

  // Tag Chips
  tagBg: string;
  tagBorder: string;
  tagText: string;
  tagHoverText: string;

  // Active Category / Filter Pill
  activePillBg: string;
  activePillText: string;
  activePillBorder: string;

  // Modals & Overlays
  overlayBackdrop: string;

  // Code & Markdown Inspection
  codeBg: string;
  codeBorder: string;
  codeText: string;
  codeInlineBg: string;
  codeInlineText: string;

  // Custom Scrollbars
  scrollbarTrack: string;
  scrollbarThumb: string;
  scrollbarThumbHover: string;
}

export type ThemeId = 
  | 'prometheus-dark'
  | 'sand-light'
  | 'ambient'
  | 'github-light'
  | 'github-dark';

export interface ThemePlugin {
  readonly id: ThemeId;
  readonly name: string;
  readonly description: string;
  readonly isDark: boolean;
  readonly iconName: 'Flame' | 'Sun' | 'Sparkles' | 'Github';
  readonly colors: ThemeColors;
}
