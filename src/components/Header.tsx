import React, { useState, useRef, useEffect } from 'react';
import { 
  Bookmark, 
  Key, 
  Search,
  ShieldAlert,
  Sun,
  Moon,
  Sparkles,
  Palette,
  Check,
  ChevronDown
} from 'lucide-react';
import { OneGitVaultLogo } from './OneGitVaultLogo';
import { GithubIcon } from './GithubIcon';
import { RateLimitInfo } from '../services/rateLimit';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  bookmarksCount: number;
  onOpenBookmarks: () => void;
  onOpenTokenModal: () => void;
  rateLimit: RateLimitInfo;
  isOfflineFallback: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  bookmarksCount,
  onOpenBookmarks,
  onOpenTokenModal,
  rateLimit,
  isOfflineFallback,
}) => {
  const { currentTheme, themeId, setTheme, cycleTheme, availableThemes } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // Close theme menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getThemeIcon = (id: string, isDark: boolean) => {
    if (id === 'ambient') return <Sparkles className="w-3.5 h-3.5 text-action" />;
    if (!isDark) return <Sun className="w-3.5 h-3.5 text-action" />;
    return <Moon className="w-3.5 h-3.5 text-action" />;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b backdrop-blur-xl bg-header border-themeline transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div 
            className="flex items-center gap-3 flex-shrink-0 cursor-pointer select-none group" 
            onClick={() => onSearchChange('')}
          >
            <div className="transition-transform duration-300 group-hover:scale-105">
              <OneGitVaultLogo className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-lg sm:text-xl tracking-tight text-txt-primary group-hover:text-action transition-colors">
                  OneGit<span className="text-action">Vault</span>
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-action-soft text-action border border-action-border font-semibold">
                  Desktop
                </span>
              </div>
              <p className="text-[11px] font-mono text-txt-muted hidden sm:block tracking-wide">
                Unified Open-Source Observatory
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl mx-2">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search open source repositories (e.g. pytorch, rust, llm, vite)..."
                className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-surface hover:bg-surface-hover focus:bg-surface-active text-txt-primary border-themeline placeholder-txt-muted/60 rounded-xl border focus:border-action focus:outline-none focus:ring-2 focus:ring-action-soft transition-all shadow-inner font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-txt-muted hover:text-txt-primary px-1.5 py-0.5 rounded-md hover:bg-surface-hover transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Actions & Utilities */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Rate limit status pill */}
            <button
              onClick={onOpenTokenModal}
              title={`API Quota: ${rateLimit.remaining} / ${rateLimit.limit} req/hr. Click to configure GitHub Token`}
              className={`hidden md:flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded-xl border transition-all ${
                isOfflineFallback 
                  ? 'bg-action-soft text-action border-action-border' 
                  : 'bg-surface text-txt-secondary border-themeline hover:border-action-border hover:text-action'
              }`}
            >
              {isOfflineFallback ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-action" />
                  <span>Curated Mode</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-action animate-pulse" />
                  <span>{rateLimit.remaining} calls</span>
                </>
              )}
              <Key className="w-3 h-3 ml-0.5 text-txt-muted" />
            </button>

            {/* Theme Plugin Switcher with Dropdown Menu */}
            <div className="relative" ref={themeMenuRef}>
              <div className="flex items-center rounded-xl bg-surface border border-themeline overflow-hidden shadow-sm">
                <button
                  onClick={cycleTheme}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-txt-secondary hover:text-txt-primary hover:bg-surface-hover transition-colors"
                  title={`Active Theme Plugin: ${currentTheme.name} (Click to cycle)`}
                >
                  {getThemeIcon(currentTheme.id, currentTheme.isDark)}
                  <span className="hidden sm:inline text-[11px] font-mono font-semibold text-txt-primary">
                    {currentTheme.name.split(' ')[0]}
                  </span>
                </button>

                <button
                  onClick={() => setShowThemeMenu((prev) => !prev)}
                  className="px-1.5 py-1.5 text-txt-muted hover:text-txt-primary hover:bg-surface-hover border-l border-themeline transition-colors"
                  title="Theme Plugins Catalog"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {/* Plugin Dropdown List */}
              {showThemeMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-surface border border-themeline shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-txt-muted border-b border-themeline flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Palette className="w-3 h-3 text-action" /> Theme Plugins
                    </span>
                    <span className="text-[9px] bg-action-soft text-action px-1 rounded">
                      {availableThemes.length} Plugins
                    </span>
                  </div>
                  <div className="py-1">
                    {availableThemes.map((plugin) => (
                      <button
                        key={plugin.id}
                        onClick={() => {
                          setTheme(plugin.id);
                          setShowThemeMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition-colors ${
                          plugin.id === themeId
                            ? 'bg-action-soft text-action font-semibold'
                            : 'text-txt-secondary hover:bg-surface-hover hover:text-txt-primary'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-3 h-3 rounded-full border border-themeline flex-shrink-0" 
                            style={{ backgroundColor: plugin.colors.bgCanvas }}
                          />
                          <div>
                            <div className="font-sans leading-tight">{plugin.name}</div>
                            <div className="text-[10px] font-mono text-txt-muted line-clamp-1">
                              {plugin.isDark ? 'Dark Mode' : 'Light Mode'}
                            </div>
                          </div>
                        </div>
                        {plugin.id === themeId && <Check className="w-3.5 h-3.5 text-action flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bookmarks Vault Button */}
            <button
              onClick={onOpenBookmarks}
              className="relative p-2 rounded-xl bg-surface hover:bg-surface-hover text-txt-secondary hover:text-action border border-themeline hover:border-action-border transition-all"
              title="Saved Repositories"
            >
              <Bookmark className="w-4 h-4" />
              {bookmarksCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-mono font-bold text-white bg-action rounded-full border border-surface">
                  {bookmarksCount}
                </span>
              )}
            </button>

            {/* GitHub Trending */}
            <a
              href="https://github.com/trending"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-surface hover:bg-surface-hover text-txt-secondary hover:text-txt-primary border border-themeline hover:border-action-border transition-all"
              title="GitHub Trending"
            >
              <GithubIcon className="w-4 h-4" />
            </a>
          </div>

        </div>
      </div>
    </header>
  );
};
