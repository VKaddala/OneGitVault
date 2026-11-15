export interface ThemeColors {
  // Canvas & Backgrounds
  bgCanvas: string;         // Main application window background
  bgHeader: string;         // Sticky navigation header background
  bgSurface: string;        // Cards, panels, modal dialogs
  bgSurfaceHover: string;   // Hover state for cards and interactive surfaces
  bgSurfaceActive: string;  // Active / pressed state (dropdowns, inputs)
  bgSubtle: string;         // Subtle background for containers

  // Hero Background Gradients
  heroGradient: string;     // Text gradient for Hero title

  // Borders
  borderSubtle: string;     // Soft dividers
  borderDefault: string;    // Card & container border
  borderHover: string;      // Hover border highlight
  borderFocus: string;      // Focused input outline

  // Typography
  textPrimary: string;      // Main heading & high-contrast titles
  textSecondary: string;    // Body copy and descriptions
  textMuted: string;        // Captions, timestamps, meta information
  textInverse: string;      // Text contrasting against accents/inverted surfaces

  // Accent & Brand Colors (Primary Signature)
  accent: string;           // Primary action color (Flame, Sky cyan, etc.)
  accentHover: string;      // Hover state for buttons/links
  accentSoft: string;       // Soft alpha tint for badge backgrounds
  accentBorder: string;     // Translucent border matching accent

  // Secondary Accent (Petrol / Terracotta / Sage)
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
  overlayBackdrop: string;  // Modal backdrop blur background

  // Code & Markdown Inspection
  codeBg: string;           // Code fence background
  codeBorder: string;       // Code block border
  codeText: string;         // Code syntax font color
  codeInlineBg: string;     // Inline `code` snippet background
  codeInlineText: string;   // Inline `code` font color

  // Custom Scrollbars
  scrollbarTrack: string;
  scrollbarThumb: string;
  scrollbarThumbHover: string;
}

export interface ThemePlugin {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly isDark: boolean;
  readonly colors: ThemeColors;
}
