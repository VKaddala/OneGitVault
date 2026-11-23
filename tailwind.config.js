/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Inter"', '"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        sans: ['"Inter"', '"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // ── Prometheus Cinematic Palette ──
        petrol: {
          950: '#0b1418',
          900: '#101b20', // deep background
          850: '#16272f', // container / tile
          800: '#244855', // primary signature petrol teal
          750: '#2c5362',
          700: '#356374',
          600: '#467c91',
          500: '#5c96ac',
          400: '#7bb0c4',
          300: '#90aead', // dusty sage teal
          200: '#b8cbca',
          100: '#e1ebeb',
        },
        flame: {
          brand: '#e64833', // vibrant vermilion flame
          glow: '#ff5c47',  // glowing flame
          deep: '#c73a27',  // dark flame
          soft: '#fbece9',
        },
        terracotta: {
          brand: '#874f41',
          light: '#a66556',
          dark: '#683a2f',
        },
        sage: {
          DEFAULT: '#90aead',
          light: '#b0c7c6',
          dark: '#6d8c8b',
        },
        cream: {
          DEFAULT: '#fbe9d0', // warm biscuit sand
          paper: '#f6dfc0',
          soft: '#fff6e9',
          card: '#ffffff',
        },
        // ── Legacy Token Aliases Mapped to Prometheus ──
        charcoal: {
          950: '#0b1418',
          900: '#101b20',
          850: '#16272f',
          800: '#244855',
          750: '#2c5362',
          700: '#356374',
          600: '#467c91',
          500: '#688d9c',
          400: '#90aead', // mapped to sage teal
          300: '#b8cbca',
          200: '#d7e2e1',
          100: '#fbe9d0', // mapped to cream
        },
        amber: {
          glow: '#ff5c47',  // mapped to flame glow
          brand: '#e64833', // mapped to flame vermilion
          deep: '#c73a27',
          dark: '#874f41',  // mapped to terracotta
        },
        // ── Ambient Theme Palette (Pleasant Cool Twilight Slate & Sky Cyan) ──
        ambient: {
          bg: '#0f141c',        // Deep cool twilight slate background
          surface: '#17202c',   // Restful slate surface
          hover: '#1e2938',     // Smooth surface hover
          border: '#273548',    // Muted twilight border
          text: '#f1f5f9',      // High-contrast readable font
          muted: '#94a3b8',     // Pleasant cool slate text
          accent: '#38bdf8',    // Serene sky cyan (no harsh glare)
          accentHover: '#7dd3fc',
          accentSoft: 'rgba(56, 189, 248, 0.12)',
          accentBorder: 'rgba(56, 189, 248, 0.35)',
        },
        // ── Semantic Theme Plugin Tokens (Dynamic CSS Variables) ──
        canvas: 'var(--bg-canvas)',
        header: 'var(--bg-header)',
        surface: {
          DEFAULT: 'var(--bg-surface)',
          hover: 'var(--bg-surface-hover)',
          active: 'var(--bg-surface-active)',
          subtle: 'var(--bg-subtle)',
        },
        themeline: {
          subtle: 'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          hover: 'var(--border-hover)',
          focus: 'var(--border-focus)',
        },
        txt: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
        },
        action: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          soft: 'var(--accent-soft)',
          border: 'var(--accent-border)',
        },
        secondary: {
          DEFAULT: 'var(--secondary-accent)',
          soft: 'var(--secondary-soft)',
          border: 'var(--secondary-border)',
        },
        star: {
          DEFAULT: 'var(--star-color)',
          bg: 'var(--star-bg)',
          border: 'var(--star-border)',
        },
        tag: {
          bg: 'var(--tag-bg)',
          border: 'var(--tag-border)',
          txt: 'var(--tag-text)',
          hoverTxt: 'var(--tag-hover-text)',
        },
        pill: {
          activeBg: 'var(--active-pill-bg)',
          activeTxt: 'var(--active-pill-text)',
          activeBorder: 'var(--active-pill-border)',
        }
      }
    },
  },
  plugins: [
    function({ addVariant }) {
      addVariant('ambient', '.ambient &');
    }
  ],
}
