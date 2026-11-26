import { ThemePlugin, ThemeColors, ThemeId } from './types';
import { githubLightTheme } from './plugins/githubLight';
import { githubDarkTheme } from './plugins/githubDark';

export interface SystemAppearanceInfo {
  isDark: boolean;
}

const systemAutoDescriptor: ThemePlugin = {
  ...githubDarkTheme,
  id: 'system',
  name: 'System (Auto)',
  description: 'Automatically switches between GitHub Dark and GitHub Simple Light based on system mode',
  iconName: 'Sparkles',
};

class ThemeRegistry {
  private themes: Map<string, ThemePlugin> = new Map();
  private lastSignature: string | null = null;
  private bridgeInitTimer: any = null;
  private cachedSysInfo: SystemAppearanceInfo | null = null;
  private resolvedThemeCache: Map<string, ThemePlugin> = new Map();
  private cachedAllThemes: ThemePlugin[] | null = null;

  constructor() {
    this.register(systemAutoDescriptor);
    this.register(githubDarkTheme);
    this.register(githubLightTheme);
  }

  public register(plugin: ThemePlugin): void {
    this.themes.set(plugin.id, plugin);
    this.resolvedThemeCache.clear();
    this.cachedAllThemes = null;
  }

  public invalidateSystemAppearance(): void {
    this.cachedSysInfo = null;
    this.resolvedThemeCache.clear();
    this.cachedAllThemes = null;
  }

  public getSystemAppearance(): SystemAppearanceInfo {
    if (this.cachedSysInfo) {
      return this.cachedSysInfo;
    }

    const mediaDark =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : true;

    try {
      const bridge = (window as any)?.AndroidThemeBridge;
      if (bridge && typeof bridge.getSystemAppearance === 'function') {
        const parsed = JSON.parse(bridge.getSystemAppearance() || '{}');
        const isDark = typeof parsed.isDark === 'boolean' ? parsed.isDark : mediaDark;
        this.cachedSysInfo = { isDark };
        return this.cachedSysInfo;
      }
    } catch {}

    this.cachedSysInfo = { isDark: mediaDark };
    return this.cachedSysInfo;
  }

  public getSystemThemeId(): ThemeId {
    return 'system';
  }

  public normalizeThemeId(id?: string | null): ThemeId {
    if (!id || id === 'system' || id === 'system-black' || id === 'system-light') return 'system';
    if (id === 'dark' || id === 'github-dark') return 'github-dark';
    if (id === 'light' || id === 'github-light') return 'github-light';
    return 'system';
  }

  public get(id?: string): ThemePlugin {
    const resolvedKey = this.normalizeThemeId(id);

    const cached = this.resolvedThemeCache.get(resolvedKey);
    if (cached) {
      return cached;
    }

    if (resolvedKey !== 'system') {
      const staticPlugin = this.themes.get(resolvedKey) || githubDarkTheme;
      this.resolvedThemeCache.set(resolvedKey, staticPlugin);
      return staticPlugin;
    }

    const sys = this.getSystemAppearance();
    const base = sys.isDark ? githubDarkTheme : githubLightTheme;
    const resolved: ThemePlugin = {
      ...base,
      id: 'system',
      name: 'System (Auto)',
      description: 'Automatically switches between GitHub Dark and GitHub Simple Light based on system mode',
      iconName: 'Sparkles',
    };
    this.resolvedThemeCache.set(resolvedKey, resolved);
    return resolved;
  }

  public getAll(): ThemePlugin[] {
    if (!this.cachedAllThemes) {
      this.cachedAllThemes = Array.from(this.themes.keys()).map((id) => this.get(id));
    }
    return this.cachedAllThemes;
  }

  public has(id: string): boolean {
    return (
      id === 'system' ||
      id === 'system-black' ||
      id === 'system-light' ||
      id === 'dark' ||
      id === 'light' ||
      id === 'github-dark' ||
      id === 'github-light'
    );
  }

  public applyThemeToDom(theme: ThemePlugin): void {
    this.applyToDom(theme);
  }

  public applyToDom(theme: ThemePlugin): void {
    if (typeof document === 'undefined') return;

    const sig = `${theme.id}|${theme.isDark}|${theme.colors.accent}|${theme.colors.bgCanvas}`;

    if (this.lastSignature === sig) {
      return;
    }

    this.lastSignature = sig;
    (window as any).__ogvSystemBlurEnabled = false;

    const root = document.documentElement;

    if (theme.isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    root.setAttribute('data-theme', theme.id);
    root.setAttribute('data-theme-glass', 'false');
    root.style.setProperty('--glass-backdrop', 'none');
    root.style.setProperty('--glass-backdrop-menu', 'none');
    root.style.setProperty('--bg-mesh-gradient', 'none');
    root.style.setProperty('--bg-menu', theme.colors.bgMenu || theme.colors.bgSurface);
    root.style.setProperty('--bg-pill', theme.colors.bgPill || theme.colors.bgHeader || theme.colors.bgSurface);
    root.style.setProperty('--primary-container', theme.colors.primaryContainer || theme.colors.accentSoft);
    root.style.setProperty('--on-primary-container', theme.colors.onPrimaryContainer || theme.colors.accent);

    const colorEntries = Object.entries(theme.colors) as [keyof ThemeColors, string | undefined][];
    for (const [key, value] of colorEntries) {
      if (!value) continue;
      const cssVarName = '--' + key.replace(/([A-Z])/g, (m) => '-' + m.toLowerCase());
      root.style.setProperty(cssVarName, value);
    }

    root.style.backgroundColor = theme.colors.bgCanvas;
    document.body.style.backgroundColor = theme.colors.bgCanvas;
    document.body.style.backgroundImage = 'none';
    document.body.style.backgroundAttachment = 'scroll';

    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.setAttribute('name', 'theme-color');
      document.head.appendChild(metaTheme);
    }
    metaTheme.setAttribute('content', theme.colors.bgCanvas);

    const applyBars = () => {
      try {
        (window as any).AndroidThemeBridge?.setStatusBarStyle?.(theme.isDark);
      } catch {}
      try {
        (window as any).Capacitor?.Plugins?.SystemBars?.setStyle?.({
          style: theme.isDark ? 'DARK' : 'LIGHT',
        });
      } catch {}
    };
    applyBars();
    if (this.bridgeInitTimer) clearTimeout(this.bridgeInitTimer);
    this.bridgeInitTimer = setTimeout(applyBars, 150);
  }
}

export const themeRegistry = new ThemeRegistry();
