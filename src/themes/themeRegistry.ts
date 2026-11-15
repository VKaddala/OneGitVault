import { ThemePlugin, ThemeColors } from './types';
import { darkTheme } from './plugins/dark';
import { lightTheme } from './plugins/light';
import { ambientTheme } from './plugins/ambient';

class ThemeRegistry {
  private themes: Map<string, ThemePlugin> = new Map();
  private defaultThemeId = 'dark';

  constructor() {
    // Register core theme plugins
    this.register(darkTheme);
    this.register(lightTheme);
    this.register(ambientTheme);
  }

  /**
   * Register a new theme plugin (Open-Closed Principle: extend without modifying existing code)
   */
  public register(plugin: ThemePlugin): void {
    this.themes.set(plugin.id, plugin);
  }

  public get(id: string): ThemePlugin {
    return this.themes.get(id) || this.themes.get(this.defaultThemeId) || darkTheme;
  }

  public getAll(): ThemePlugin[] {
    return Array.from(this.themes.values());
  }

  public has(id: string): boolean {
    return this.themes.has(id);
  }

  /**
   * Injects the active theme's tokens as CSS custom properties on :root
   * and toggles the standard .dark class for compatibility.
   */
  public applyToDom(theme: ThemePlugin): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Toggle dark class based on theme metadata
    if (theme.isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    // Set data-theme attribute
    root.setAttribute('data-theme', theme.id);

    // Map theme colors to CSS variables
    const colorEntries = Object.entries(theme.colors) as [keyof ThemeColors, string][];
    for (const [key, value] of colorEntries) {
      // kebab-case the property name: e.g. bgCanvas -> --bg-canvas
      const cssVarName = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
      root.style.setProperty(cssVarName, value);
    }
  }
}

export const themeRegistry = new ThemeRegistry();
