import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ThemeProvider } from './context/ThemeContext';
import { themeRegistry } from './themes';
import './index.css';

// Apply active theme immediately before render to prevent any flash of unstyled theme
try {
  const saved = localStorage.getItem('onegitvault_active_theme_plugin') || localStorage.getItem('onegitvault_theme_mode') || 'prometheus-dark';
  themeRegistry.applyToDom(themeRegistry.get(saved));
} catch {
  themeRegistry.applyToDom(themeRegistry.get('prometheus-dark'));
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
