import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
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
  ChevronDown,
  Flame
} from 'lucide-react';
import { OneGitVaultLogo } from './OneGitVaultLogo';
import { GithubIcon } from './GithubIcon';
import { RateLimitInfo } from '../services/rateLimit';
import { useTheme } from '../context/ThemeContext';
import { UpdateInfo } from '../services/updateService';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  bookmarksCount: number;
  onOpenBookmarks: () => void;
  onOpenTokenModal: () => void;
  rateLimit: RateLimitInfo;
  isOfflineFallback: boolean;
  updateInfo?: UpdateInfo | null;
  onOpenUpdateModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  bookmarksCount,
  onOpenBookmarks,
  onOpenTokenModal,
  rateLimit,
  isOfflineFallback,
  updateInfo,
  onOpenUpdateModal,
}) => {
  const { currentTheme, themeId, setTheme, cycleTheme, availableThemes } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  const updateMenuPos = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, []);

  const handleToggleMenu = useCallback(() => {
    updateMenuPos();
    setShowThemeMenu((prev) => !prev);
  }, [updateMenuPos]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const insideTrigger = triggerRef.current?.contains(target);
      const insideMenu = document.getElementById('theme-selection-portal')?.contains(target);
      if (!insideTrigger && !insideMenu) {
        setShowThemeMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getThemeIcon = (iconName: string, isDark: boolean) => {
    switch (iconName) {
      case 'Flame':
        return <Flame className="w-3.5 h-3.5 text-action" />;
      case 'Sparkles':
        return <Sparkles className="w-3.5 h-3.5 text-action" />;
      case 'Github':
        return <GithubIcon className="w-3.5 h-3.5 text-action" />;
      case 'Sun':
        return <Sun className="w-3.5 h-3.5 text-action" />;
      default:
        return isDark ? <Moon className="w-3.5 h-3.5 text-action" /> : <Sun className="w-3.5 h-3.5 text-action" />;
    }
  };

  return (
    <header className="w-full border-b backdrop-blur-xl bg-header border-themeline flex-shrink-0 z-40 transition-colors duration-200">
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
              </div>
              <p className="text-[11px] font-mono text-txt-muted hidden sm:block tracking-wide">
                Open-Source Repository Explorer
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
                placeholder="Search repositories (e.g. rust, llm, vite)..."
                className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-surface hover:bg-surface-hover focus:bg-surface-active text-txt-primary border-themeline placeholder-txt-muted rounded-xl border focus:border-action focus:outline-none focus:ring-2 focus:ring-action-soft transition-all shadow-inner font-sans"
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
            {/* Optional Update Available Pill in Header */}
            {updateInfo?.hasUpdate && (
              <button
                onClick={onOpenUpdateModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-xl bg-action text-txt-inverse border border-action font-semibold shadow-sm hover:opacity-90 transition-all animate-pulse"
                title={`New update v${updateInfo.latestVersion} available! Click to view and download`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Update v{updateInfo.latestVersion}</span>
              </button>
            )}

            {/* Rate limit status pill */}
            <button
              onClick={onOpenTokenModal}
              title={`API Quota: ${rateLimit.remaining} / ${rateLimit.limit} req/hr. Click to configure GitHub Token`}
              className={`hidden md:flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded-xl border transition-all ${
                isOfflineFallback 
                  ? 'bg-action-soft text-action border-action-border' 
                  : 'bg-surface text-txt-primary border-themeline hover:border-action-border hover:text-action'
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

            {/* Theme Selector Trigger with Dropdown */}
            <div className="relative" ref={triggerRef}>
              <button
                onClick={handleToggleMenu}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface hover:bg-surface-hover text-txt-primary hover:text-action border border-themeline hover:border-action-border transition-all shadow-sm"
                title={`Active Theme: ${currentTheme.name} (Click to open theme menu)`}
              >
                {getThemeIcon(currentTheme.iconName, currentTheme.isDark)}
                <span className="hidden sm:inline text-[11px] font-mono font-semibold">
                  {currentTheme.name.split(' ')[0]}
                </span>
                <ChevronDown className={`w-3 h-3 text-txt-muted transition-transform duration-150 ${showThemeMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Theme Selection Popup (Portal to escape stacking context) */}
              {showThemeMenu && menuPos && ReactDOM.createPortal(
                <div
                  id="theme-selection-portal"
                  style={{
                    position: 'fixed',
                    top: menuPos.top,
                    right: menuPos.right,
                    zIndex: 9999,
                    width: '19.5rem',
                    backgroundColor: currentTheme.colors.bgSurface,
                    border: `1.5px solid ${currentTheme.colors.borderDefault}`,
                    borderRadius: '1rem',
                    boxShadow: '0 24px 50px -10px rgba(0, 0, 0, 0.65), 0 4px 16px rgba(0, 0, 0, 0.25)',
                    padding: '0.5rem',
                    animation: 'fadeIn 0.15s ease-out',
                    color: currentTheme.colors.textPrimary,
                  }}
                >
                  {/* Menu Header */}
                  <div
                    style={{
                      padding: '0.45rem 0.75rem 0.6rem 0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: `1px solid ${currentTheme.colors.borderSubtle}`,
                      marginBottom: '0.4rem',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: currentTheme.colors.textSecondary }}>
                      <Palette style={{ width: '14px', height: '14px', color: currentTheme.colors.accent }} />
                      Theme Palette
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontFamily: 'JetBrains Mono, monospace',
                        backgroundColor: currentTheme.colors.accentSoft,
                        color: currentTheme.colors.accent,
                        border: `1px solid ${currentTheme.colors.accentBorder}`,
                        padding: '1px 7px',
                        borderRadius: '9999px',
                        fontWeight: 700,
                      }}
                    >
                      {availableThemes.length} Themes
                    </span>
                  </div>

                  {/* Themes List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {availableThemes.map((theme) => {
                      const isSelected = theme.id === themeId;
                      return (
                        <button
                          key={theme.id}
                          onClick={() => {
                            setTheme(theme.id);
                            setShowThemeMenu(false);
                          }}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '0.55rem 0.7rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            borderRadius: '0.65rem',
                            border: isSelected ? `1.5px solid ${theme.colors.accent}` : `1px solid ${currentTheme.colors.borderSubtle}`,
                            backgroundColor: isSelected ? currentTheme.colors.accentSoft : currentTheme.colors.bgSurfaceActive,
                            color: currentTheme.colors.textPrimary,
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              (e.currentTarget as HTMLButtonElement).style.backgroundColor = currentTheme.colors.bgSurfaceHover;
                              (e.currentTarget as HTMLButtonElement).style.borderColor = currentTheme.colors.borderHover;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              (e.currentTarget as HTMLButtonElement).style.backgroundColor = currentTheme.colors.bgSurfaceActive;
                              (e.currentTarget as HTMLButtonElement).style.borderColor = currentTheme.colors.borderSubtle;
                            }
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                            {/* Color Swatch Preview Pill */}
                            <div
                              style={{
                                width: '32px',
                                height: '26px',
                                borderRadius: '0.45rem',
                                border: `1.5px solid ${theme.colors.borderDefault}`,
                                backgroundColor: theme.colors.bgCanvas,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                position: 'relative',
                                overflow: 'hidden',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                              }}
                            >
                              <div
                                style={{
                                  position: 'absolute',
                                  right: 0,
                                  top: 0,
                                  bottom: 0,
                                  width: '50%',
                                  backgroundColor: theme.colors.bgSurface,
                                }}
                              />
                              <div
                                style={{
                                  width: '9px',
                                  height: '9px',
                                  borderRadius: '50%',
                                  backgroundColor: theme.colors.accent,
                                  zIndex: 2,
                                  boxShadow: '0 0 6px rgba(0,0,0,0.4)',
                                }}
                              />
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '13px', fontWeight: isSelected ? 700 : 600, color: isSelected ? currentTheme.colors.accent : currentTheme.colors.textPrimary }}>
                                  {theme.name}
                                </span>
                                <span
                                  style={{
                                    fontSize: '9px',
                                    fontFamily: 'JetBrains Mono, monospace',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    backgroundColor: theme.isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.06)',
                                    color: currentTheme.colors.textMuted,
                                    fontWeight: 600,
                                  }}
                                >
                                  {theme.isDark ? 'Dark' : 'Light'}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: '10.5px',
                                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                                  color: currentTheme.colors.textSecondary,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '10.5rem',
                                  marginTop: '1px',
                                }}
                              >
                                {theme.description.split(',')[0]}
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                backgroundColor: currentTheme.colors.accent,
                                color: currentTheme.colors.textInverse,
                                flexShrink: 0,
                                boxShadow: `0 2px 6px ${currentTheme.colors.accentBorder}`,
                              }}
                            >
                              <Check style={{ width: '13px', height: '13px', strokeWidth: 3 }} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>,
                document.body
              )}
            </div>

            {/* Bookmarks Vault Button */}
            <button
              onClick={onOpenBookmarks}
              className="relative p-2 rounded-xl bg-surface hover:bg-surface-hover text-txt-primary hover:text-action border border-themeline hover:border-action-border transition-all"
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
              className="p-2 rounded-xl bg-surface hover:bg-surface-hover text-txt-primary hover:text-action border border-themeline hover:border-action-border transition-all"
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
