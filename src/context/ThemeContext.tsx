import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ThemePlugin, themeRegistry } from '../themes';

const THEME_STORAGE_KEY = 'onegitvault_active_theme_plugin';

interface ThemeContextType {
  currentTheme: ThemePlugin;
  themeId: string;
  setTheme: (id: string) => void;
  cycleTheme: () => void;
  availableThemes: ThemePlugin[];
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved && themeRegistry.has(saved)) {
        return saved;
      }
      // Migrate legacy 'dark' | 'light' | 'ambient' if present
      const legacy = localStorage.getItem('onegitvault_theme_mode');
      if (legacy && themeRegistry.has(legacy)) {
        return legacy;
      }
      return 'dark';
    } catch {
      return 'dark';
    }
  });

  const currentTheme = useMemo(() => themeRegistry.get(themeId), [themeId]);
  const availableThemes = useMemo(() => themeRegistry.getAll(), []);

  // Synchronize CSS custom properties onto :root whenever currentTheme changes
  useEffect(() => {
    themeRegistry.applyToDom(currentTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, currentTheme.id);
    } catch (e) {
      console.warn('Failed to persist active theme', e);
    }
  }, [currentTheme]);

  const setTheme = useCallback((id: string) => {
    if (themeRegistry.has(id)) {
      setThemeId(id);
    }
  }, []);

  const cycleTheme = useCallback(() => {
    const all = themeRegistry.getAll();
    const currentIndex = all.findIndex((t) => t.id === themeId);
    const nextIndex = (currentIndex + 1) % all.length;
    setThemeId(all[nextIndex].id);
  }, [themeId]);

  const value = useMemo<ThemeContextType>(() => ({
    currentTheme,
    themeId,
    setTheme,
    cycleTheme,
    availableThemes,
    isDark: currentTheme.isDark,
  }), [currentTheme, themeId, setTheme, cycleTheme, availableThemes]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
