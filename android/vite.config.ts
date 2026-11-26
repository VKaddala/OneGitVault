import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@mui/icons-material')) return 'mui-icons';
          if (id.includes('@mui/material') || id.includes('@emotion')) return 'mui-core';
          if (id.includes('marked') || id.includes('dompurify')) return 'markdown-security';
          if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor';
        },
      },
    },
  },
});
