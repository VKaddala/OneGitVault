import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ThemePlugin, themeRegistry } from '../themes';

const THEME_STORAGE_KEY = 'onegitvault_active_theme_plugin';
const THEME_USER_EXPLICIT_KEY = 'onegitvault_theme_user_explicit';

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
      const isExplicit = localStorage.getItem(THEME_USER_EXPLICIT_KEY) === 'true';
      const saved = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem('onegitvault_theme_mode');
      if (isExplicit && saved && themeRegistry.has(saved)) {
        return themeRegistry.get(saved).id;
      }
      return themeRegistry.getSystemThemeId();
    } catch {
      return themeRegistry.getSystemThemeId();
    }
  });

  const currentTheme = useMemo(() => themeRegistry.get(themeId), [themeId]);
  const availableThemes = useMemo(() => themeRegistry.getAll(), []);

  // Listen to OS system theme changes (prefers-color-scheme)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const isExplicit = localStorage.getItem(THEME_USER_EXPLICIT_KEY) === 'true';
      if (!isExplicit) {
        const nextTheme = e.matches ? 'github-dark' : 'github-light';
        setThemeId(nextTheme);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleSystemThemeChange);
      return () => mediaQuery.removeListener(handleSystemThemeChange);
    }
  }, []);

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
      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme.id);
        localStorage.setItem(THEME_USER_EXPLICIT_KEY, 'true');
      } catch (e) {
        console.warn('Failed to persist explicit theme choice', e);
      }
    }
  }, []);

  const cycleTheme = useCallback(() => {
    const all = themeRegistry.getAll();
    const currentIndex = all.findIndex((t) => t.id === currentTheme.id);
    const nextIndex = (currentIndex + 1) % all.length;
    const nextTheme = all[nextIndex];
    themeRegistry.applyToDom(nextTheme);
    setThemeId(nextTheme.id);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme.id);
      localStorage.setItem(THEME_USER_EXPLICIT_KEY, 'true');
    } catch (e) {
      console.warn('Failed to persist explicit theme choice', e);
    }
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
