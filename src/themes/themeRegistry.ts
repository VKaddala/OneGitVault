import { ThemePlugin, ThemeColors, ThemeId } from './types';
import { prometheusDarkTheme } from './plugins/prometheusDark';
import { sandLightTheme } from './plugins/sandLight';
import { ambientTwilightTheme } from './plugins/ambientTwilight';
import { githubLightTheme } from './plugins/githubLight';
import { githubDarkTheme } from './plugins/githubDark';

class ThemeRegistry {
  private themes: Map<string, ThemePlugin> = new Map();
  private defaultThemeId: ThemeId = 'prometheus-dark';

  constructor() {
    this.register(prometheusDarkTheme);
    this.register(sandLightTheme);
    this.register(ambientTwilightTheme);
    this.register(githubLightTheme);
    this.register(githubDarkTheme);
  }

  public register(plugin: ThemePlugin): void {
    this.themes.set(plugin.id, plugin);
  }

  public get(id: string): ThemePlugin {
    // Also handle legacy aliases: 'dark' -> 'prometheus-dark', 'light' -> 'sand-light'
    if (id === 'dark') return prometheusDarkTheme;
    if (id === 'light') return sandLightTheme;
    return this.themes.get(id) || this.themes.get(this.defaultThemeId) || prometheusDarkTheme;
  }

  public getAll(): ThemePlugin[] {
    return Array.from(this.themes.values());
  }

  public has(id: string): boolean {
    if (id === 'dark' || id === 'light') return true;
    return this.themes.has(id);
  }

  public applyToDom(theme: ThemePlugin): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Set standard class for dark / light
    if (theme.isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    // Set data-theme attribute for scoped styling
    root.setAttribute('data-theme', theme.id);

    // Inject CSS variables
    const colorEntries = Object.entries(theme.colors) as [keyof ThemeColors, string][];
    for (const [key, value] of colorEntries) {
      const cssVarName = '--' + key.replace(/([A-Z])/g, (m) => '-' + m.toLowerCase());
      root.style.setProperty(cssVarName, value);
    }
  }
}

export const themeRegistry = new ThemeRegistry();
