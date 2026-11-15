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
      const saved = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem('onegitvault_theme_mode');
      if (saved && themeRegistry.has(saved)) {
        return themeRegistry.get(saved).id;
      }
      return 'prometheus-dark';
    } catch {
      return 'prometheus-dark';
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
      const nextTheme = themeRegistry.get(id);
      themeRegistry.applyToDom(nextTheme);
      setThemeId(nextTheme.id);
    }
  }, []);

  const cycleTheme = useCallback(() => {
    const all = themeRegistry.getAll();
    const currentIndex = all.findIndex((t) => t.id === currentTheme.id);
    const nextIndex = (currentIndex + 1) % all.length;
    const nextTheme = all[nextIndex];
    themeRegistry.applyToDom(nextTheme);
    setThemeId(nextTheme.id);
  }, [currentTheme.id]);

  const value = useMemo<ThemeContextType>(() => ({
    currentTheme,
    themeId: currentTheme.id,
    setTheme,
    cycleTheme,
    availableThemes,
    isDark: currentTheme.isDark,
  }), [currentTheme, setTheme, cycleTheme, availableThemes]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
