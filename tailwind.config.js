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
        charcoal: {
          950: '#090a0d',
          900: '#0e0f13',
          850: '#131419',
          800: '#191a21',
          750: '#20212b',
          700: '#292b37',
          600: '#3a3c4c',
          500: '#525569',
          400: '#7b7f97',
          300: '#a7abbf',
          200: '#d3d5e2',
          100: '#f0f1f6',
        },
        amber: {
          glow: '#fbbf24',
          brand: '#f59e0b',
          deep: '#d97706',
          dark: '#b45309',
        }
      }
    },
  },
  plugins: [],
}