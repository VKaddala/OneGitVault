import { ThemePlugin, ThemeColors, ThemeId } from './types';
import { prometheusDarkTheme } from './plugins/prometheusDark';
import { sandLightTheme } from './plugins/sandLight';
import { ambientTwilightTheme } from './plugins/ambientTwilight';
import { githubLightTheme } from './plugins/githubLight';
import { githubDarkTheme } from './plugins/githubDark';

class ThemeRegistry {
  private themes: Map<string, ThemePlugin> = new Map();

  constructor() {
    this.register(githubDarkTheme);
    this.register(githubLightTheme);
    this.register(prometheusDarkTheme);
    this.register(sandLightTheme);
    this.register(ambientTwilightTheme);
  }

  public register(plugin: ThemePlugin): void {
    this.themes.set(plugin.id, plugin);
  }

  public getSystemThemeId(): ThemeId {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'github-dark' : 'github-light';
    }
    return 'github-dark';
  }

  public get(id?: string): ThemePlugin {
    // Map generic 'dark' and 'light' to GitHub Dark and GitHub Light
    if (id === 'dark') return githubDarkTheme;
    if (id === 'light') return githubLightTheme;
    if (id && this.themes.has(id)) {
      return this.themes.get(id)!;
    }
    return this.themes.get(this.getSystemThemeId()) || githubDarkTheme;
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
