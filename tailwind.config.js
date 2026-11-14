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
        display: ['"Bricolage Grotesque"', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
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
        }
      }
    },
  },
  plugins: [],
}
