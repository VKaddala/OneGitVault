import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { 
  Minus, 
  Square, 
  Copy, 
  X, 
  Sparkles, 
  RefreshCw, 
  ChevronDown, 
  ExternalLink,
  Download,
  Search,
  Bookmark,
  Key,
  ShieldAlert,
  Sun,
  Moon,
  Palette,
  Check,
  Flame,
  Loader2
} from 'lucide-react';
import { OneGitVaultLogo } from './OneGitVaultLogo';
import { GithubIcon } from './GithubIcon';
import { CURRENT_APP_VERSION, UpdateInfo } from '../services/updateService';
import { RateLimitInfo } from '../services/rateLimit';
import { useTheme } from '../context/ThemeContext';

interface TitleBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  bookmarksCount: number;
  onOpenBookmarks: () => void;
  onOpenTokenModal: () => void;
  onOpenTrending: () => void;
  rateLimit: RateLimitInfo;
  isOfflineFallback: boolean;
  updateInfo: UpdateInfo | null;
  onOpenUpdateModal: () => void;
  onCheckUpdates: () => void;
  isCheckingUpdates: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  searchQuery,
  onSearchChange,
  bookmarksCount,
  onOpenBookmarks,
  onOpenTokenModal,
  onOpenTrending,
  rateLimit,
  isOfflineFallback,
  updateInfo,
  onOpenUpdateModal,
  onCheckUpdates,
  isCheckingUpdates,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSearchFlyoutOpen, setIsSearchFlyoutOpen] = useState(false);
  const [flyoutSearchInput, setFlyoutSearchInput] = useState(searchQuery);

  const { currentTheme, themeId, setTheme, availableThemes } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeTriggerRef = useRef<HTMLButtonElement>(null);
  const [themeMenuPos, setThemeMenuPos] = useState<{ top: number; right: number } | null>(null);

  const aboutDropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchFlyoutRef = useRef<HTMLDivElement | null>(null);

  const isElectron = Boolean(window.electronAPI?.isElectron);

  // Silent updater state
  const [isSilentUpdating, setIsSilentUpdating] = useState(false);
  const [silentProgress, setSilentProgress] = useState<number | null>(null);
  const [silentStatusText, setSilentStatusText] = useState<string>('');

  const handleSilentInstall = async () => {
    if (!updateInfo?.downloadUrl) {
      onOpenUpdateModal();
      return;
    }
    if (!window.electronAPI?.installUpdateSilently) {
      onOpenUpdateModal();
      return;
    }

    setIsSilentUpdating(true);
    setSilentStatusText('Downloading update silently...');
    setSilentProgress(0);

    let unsubscribe: (() => void) | undefined;
    if (window.electronAPI.onUpdateDownloadProgress) {
      unsubscribe = window.electronAPI.onUpdateDownloadProgress((prog) => {
        setSilentProgress(prog.percent);
        setSilentStatusText(`Downloading update... ${prog.percent}%`);
      });
    }

    try {
      await window.electronAPI.installUpdateSilently(updateInfo.downloadUrl);
      setSilentStatusText('Applying update and restarting...');
    } catch (err: any) {
      console.error('Silent update error:', err);
      setIsSilentUpdating(false);
      setSilentStatusText(`Update error: ${err.message || 'Failed'}`);
      setTimeout(() => {
        onOpenUpdateModal();
      }, 1500);
    } finally {
      if (unsubscribe) unsubscribe();
    }
  };

  // Sync internal search input with external searchQuery
  useEffect(() => {
    setFlyoutSearchInput(searchQuery);
  }, [searchQuery]);

  // Window maximize listeners
  useEffect(() => {
    if (!isElectron || !window.electronAPI?.onMaximizedChange) return;

    window.electronAPI.isMaximized().then(setIsMaximized).catch(() => {});
    const cleanup = window.electronAPI.onMaximizedChange((maximized) => {
      setIsMaximized(maximized);
    });
    return cleanup;
  }, [isElectron]);

  // Close About dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (aboutDropdownRef.current && !aboutDropdownRef.current.contains(event.target as Node)) {
        setIsAboutOpen(false);
      }
    };
    if (isAboutOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAboutOpen]);

  // Handle Search Flyout outside click & escape key
  useEffect(() => {
    if (!isSearchFlyoutOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchFlyoutOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideFlyout = searchFlyoutRef.current?.contains(target);
      const isSearchTrigger = (target as HTMLElement).closest('[data-search-trigger="true"]');
      if (!insideFlyout && !isSearchTrigger) {
        setIsSearchFlyoutOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchFlyoutOpen]);

  // Focus input when Search Flyout opens
  useEffect(() => {
    if (isSearchFlyoutOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
    }
  }, [isSearchFlyoutOpen]);

  // Global Ctrl+K / Cmd+K listener to open search flyout
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchFlyoutOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, []);

  // Theme menu positioning
  const updateThemeMenuPos = useCallback(() => {
    if (themeTriggerRef.current) {
      const rect = themeTriggerRef.current.getBoundingClientRect();
      setThemeMenuPos({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }
  }, []);

  const handleToggleThemeMenu = useCallback(() => {
    updateThemeMenuPos();
    setShowThemeMenu((prev) => !prev);
  }, [updateThemeMenuPos]);

  useEffect(() => {
    if (!showThemeMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideTrigger = themeTriggerRef.current?.contains(target);
      const insideMenu = document.getElementById('titlebar-theme-portal')?.contains(target);
      if (!insideTrigger && !insideMenu) {
        setShowThemeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showThemeMenu]);

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow();
  };

  const handleMaximize = () => {
    window.electronAPI?.maximizeWindow();
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow();
  };

  const handleDoubleClickDrag = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.app-no-drag')) return;
    if (isElectron) {
      handleMaximize();
    }
  };

  const openExternal = (url: string) => {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const getThemeIcon = (iconName: string, isDark: boolean) => {
    switch (iconName) {
      case 'Flame': return <Flame className="w-3.5 h-3.5 text-action" />;
      case 'Sparkles': return <Sparkles className="w-3.5 h-3.5 text-action" />;
      case 'Github': return <GithubIcon className="w-3.5 h-3.5 text-action" />;
      case 'Sun': return <Sun className="w-3.5 h-3.5 text-action" />;
      default: return isDark ? <Moon className="w-3.5 h-3.5 text-action" /> : <Sun className="w-3.5 h-3.5 text-action" />;
    }
  };

  const popularTopics = ['rust', 'deepseek', 'llm', 'agents', 'vite', 'python', 'react', 'database'];

  const hasAnyPopoverOpen = isAboutOpen || isSearchFlyoutOpen || showThemeMenu;

  const handleTitleBarClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInsideAbout = target.closest('[data-about-popover="true"]') || target.closest('[data-about-trigger="true"]');
    const isInsideFlyout = target.closest('[data-search-flyout="true"]') || target.closest('[data-search-trigger="true"]');
    const isInsideTheme = target.closest('#titlebar-theme-portal') || target.closest('[data-theme-trigger="true"]');

    if (!isInsideAbout && isAboutOpen) {
      setIsAboutOpen(false);
    }
    if (!isInsideFlyout && isSearchFlyoutOpen) {
      setIsSearchFlyoutOpen(false);
    }
    if (!isInsideTheme && showThemeMenu) {
      setShowThemeMenu(false);
    }
  };

  return (
    <>
      {/* ── Main Unified TitleBar ── */}
      <div
        onDoubleClick={handleDoubleClickDrag}
        onMouseDown={handleTitleBarClick}
        className={`w-full h-11 bg-header border-b border-themeline flex items-center justify-between px-3 select-none relative z-50 flex-shrink-0 transition-colors duration-200 ${
          hasAnyPopoverOpen ? 'app-no-drag' : 'app-drag-region'
        }`}
      >
        {/* ── Left Side: App Brand & Expand About ── */}
        <div className="flex items-center gap-1.5 app-no-drag relative flex-shrink-0" ref={aboutDropdownRef}>
          <div className="w-4 h-4 flex-shrink-0 cursor-pointer" onClick={() => onSearchChange('')}>
            <OneGitVaultLogo className="w-4 h-4" />
          </div>

          <span 
            onClick={() => onSearchChange('')}
            className="font-display font-bold text-xs tracking-tight text-txt-primary cursor-pointer hover:text-action transition-colors whitespace-nowrap"
          >
            OneGit<span className="text-action">Vault</span>
          </span>

          <span className="hidden xl:inline-block text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-action-soft text-action border border-action-border font-bold">
            Desktop
          </span>

          {/* Expand chevron that toggles About popover */}
          <button
            data-about-trigger="true"
            onClick={(e) => {
              e.stopPropagation();
              setIsAboutOpen((prev) => !prev);
              if (isSearchFlyoutOpen) setIsSearchFlyoutOpen(false);
              if (showThemeMenu) setShowThemeMenu(false);
            }}
            className={`flex items-center justify-center p-1 rounded-md text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors ${
              isAboutOpen ? 'bg-surface-hover text-txt-primary' : ''
            }`}
            title="About OneGitVault & Check Updates"
            aria-label="Expand About menu"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isAboutOpen ? 'rotate-180 text-action' : ''
              }`}
            />
          </button>

          {/* Update Available Badge */}
          {updateInfo?.hasUpdate && (
            <button
              onClick={onOpenUpdateModal}
              className="flex items-center gap-1 px-2 py-0.5 ml-1 rounded-full bg-action/20 border border-action text-action hover:bg-action hover:text-txt-inverse transition-all text-[10px] font-mono font-bold animate-pulse shadow-sm"
              title={`New update v${updateInfo.latestVersion} available!`}
            >
              <Sparkles className="w-3 h-3 text-action fill-current" />
              <span className="hidden sm:inline">Update</span>
            </button>
          )}

          {/* About Popover with Click-Away Backdrop */}
          {isAboutOpen && (
            <>
              <div 
                className="fixed inset-0 z-40 app-no-drag"
                onClick={() => setIsAboutOpen(false)}
              />
              <div 
                data-about-popover="true"
                className="absolute top-9 left-0 w-80 bg-surface border border-themeline rounded-xl shadow-2xl p-4 z-50 animate-fadeIn text-left backdrop-blur-xl"
              >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-surface-active border border-themeline flex-shrink-0 shadow-sm">
                  <OneGitVaultLogo className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-sm text-txt-primary tracking-tight">
                      OneGit<span className="text-action">Vault</span>
                    </h3>
                    <span className="text-[10px] font-sans font-semibold px-1.5 py-0.5 rounded bg-surface-active border border-themeline text-txt-muted">
                      v{CURRENT_APP_VERSION}
                    </span>
                  </div>
                  <p className="text-[11px] font-sans text-txt-secondary mt-0.5">
                    Open-Source Repository Explorer
                  </p>
                </div>
              </div>

              <p className="text-xs text-txt-muted mt-2.5 font-sans leading-relaxed">
                Stream, explore, and bookmark GitHub open-source repositories with real-time rate monitoring.
              </p>

              <div className="flex items-center justify-between text-[11px] font-sans text-txt-muted mt-3 pt-2.5 border-t border-themeline/60">
                <span>Author: <span className="text-txt-primary font-medium">VKaddala</span></span>
                <button
                  onClick={() => openExternal('https://github.com/VKaddala/OneGitVault')}
                  className="flex items-center gap-1 text-action hover:underline"
                >
                  <span>GitHub Repo</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="mt-3.5 pt-3 border-t border-themeline">
                {updateInfo?.hasUpdate ? (
                  <div className="p-2.5 rounded-lg bg-action-soft border border-action-border">
                    <div className="flex items-center gap-1.5 text-action text-xs font-bold font-sans">
                      <Sparkles className="w-3.5 h-3.5 fill-current" />
                      <span>New Version v{updateInfo.latestVersion} Available!</span>
                    </div>

                    {isSilentUpdating ? (
                      <div className="mt-2 text-xs font-sans text-action space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="font-medium">{silentStatusText}</span>
                        </div>
                        {silentProgress !== null && (
                          <div className="w-full bg-surface-active rounded-full h-1.5 overflow-hidden border border-themeline">
                            <div className="bg-action h-full transition-all duration-150" style={{ width: `${silentProgress}%` }} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5 mt-2">
                        <button
                          onClick={handleSilentInstall}
                          className="w-full py-1.5 px-3 rounded-lg bg-action hover:bg-action-hover text-txt-inverse text-xs font-sans font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                        >
                          <Sparkles className="w-3.5 h-3.5 fill-current" />
                          <span>Update Silently & Restart</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsAboutOpen(false);
                            onOpenUpdateModal();
                          }}
                          className="text-[11px] font-sans text-txt-muted hover:text-txt-primary text-center transition-colors"
                        >
                          View Release Notes
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => onCheckUpdates()}
                    disabled={isCheckingUpdates}
                    className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-surface-active hover:bg-surface-hover border border-themeline text-xs font-sans font-medium text-txt-primary hover:text-action transition-all disabled:opacity-50 shadow-sm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdates ? 'animate-spin text-action' : 'text-action'}`} />
                    <span>{isCheckingUpdates ? 'Checking GitHub...' : 'Check for updates'}</span>
                  </button>
                )}
              </div>
            </div>
            </>
          )}
        </div>

        {/* ── Center: Search Trigger (Flyout Launcher - Mobile Responsive) ── */}
        <div className="flex-1 max-w-lg mx-1.5 sm:mx-3 flex items-center justify-center app-no-drag min-w-0">
          <button
            data-search-trigger="true"
            onClick={(e) => {
              e.stopPropagation();
              setIsSearchFlyoutOpen((prev) => !prev);
              if (isAboutOpen) setIsAboutOpen(false);
              if (showThemeMenu) setShowThemeMenu(false);
            }}
            className={`w-full max-w-md flex items-center justify-between gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl border text-xs font-sans transition-all duration-150 shadow-inner group ${
              isSearchFlyoutOpen
                ? 'bg-surface-active border-action ring-1 ring-action/30 text-txt-primary'
                : 'bg-surface/80 hover:bg-surface border-themeline hover:border-action-border text-txt-muted hover:text-txt-primary'
            }`}
            title="Click to search repositories (Ctrl+K)"
          >
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <Search className="w-3.5 h-3.5 text-action flex-shrink-0" />
              <span className="truncate text-left text-xs">
                {searchQuery.trim() ? (
                  <span className="font-semibold text-txt-primary">"{searchQuery}"</span>
                ) : (
                  <>
                    <span className="hidden sm:inline text-txt-muted">Search repositories (e.g. rust, llm, vite)...</span>
                    <span className="sm:hidden text-txt-muted">Search...</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {searchQuery.trim() && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onSearchChange('');
                  }}
                  className="p-0.5 rounded text-txt-muted hover:text-txt-primary hover:bg-surface-active transition-colors"
                  title="Clear search"
                >
                  ✕
                </span>
              )}
              <kbd className="hidden md:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-canvas border border-themeline text-txt-muted group-hover:text-txt-secondary">
                Ctrl+K
              </kbd>
            </div>
          </button>
        </div>

        {/* ── Right Side: Smaller Icons Near Minimize Button ── */}
        <div className="flex items-center gap-1 app-no-drag flex-shrink-0">
          
          {/* Rate Limit Badge Pill (Dynamic for mobile) */}
          <button
            onClick={onOpenTokenModal}
            className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg text-xs font-sans font-medium border transition-all ${
              isOfflineFallback
                ? 'bg-action-soft text-action border-action-border'
                : 'bg-surface hover:bg-surface-hover text-txt-primary border-themeline hover:border-action-border hover:text-action shadow-sm'
            }`}
            title={`GitHub API Quota: ${rateLimit.remaining} / ${rateLimit.limit} req/hr (Core API)${
              rateLimit.searchRemaining !== undefined ? ` • ${rateLimit.searchRemaining} / ${rateLimit.searchLimit || 30} req/min (Search API)` : ''
            }. Click to manage GitHub Token`}
          >
            {isOfflineFallback ? (
              <>
                <ShieldAlert className="w-3 h-3 text-action" />
                <span className="hidden sm:inline text-[11px]">Curated</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-action animate-pulse flex-shrink-0" />
                <span className="text-[11px] font-bold">{rateLimit.remaining}</span>
                <span className="hidden xl:inline text-[10px] text-txt-muted font-normal">calls</span>
                {rateLimit.searchRemaining !== undefined && (
                  <span
                    className="hidden 2xl:inline text-[9px] font-mono text-txt-muted bg-surface-active px-1 py-0.5 rounded border border-themeline"
                    title={`Search quota: ${rateLimit.searchRemaining}/${rateLimit.searchLimit || 30} queries/min remaining`}
                  >
                    search:{rateLimit.searchRemaining}
                  </span>
                )}
              </>
            )}
            <Key className="w-3 h-3 text-txt-muted ml-0.5 hidden sm:inline" />
          </button>

          {/* Theme Selector Button (Fixed Palette Icon - never changes with active theme) */}
          <button
            ref={themeTriggerRef}
            data-theme-trigger="true"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleThemeMenu();
              if (isAboutOpen) setIsAboutOpen(false);
              if (isSearchFlyoutOpen) setIsSearchFlyoutOpen(false);
            }}
            className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover text-txt-primary hover:text-action border border-themeline transition-all shadow-sm flex items-center justify-center"
            title={`Themes: ${currentTheme.name} (Click to change theme)`}
          >
            <Palette className="w-3.5 h-3.5 text-action" />
          </button>

          {/* Theme Selection Portal */}
          {showThemeMenu && themeMenuPos && ReactDOM.createPortal(
            <div
              id="titlebar-theme-portal"
              style={{
                position: 'fixed',
                top: themeMenuPos.top,
                right: themeMenuPos.right,
                zIndex: 99999,
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
                        padding: '0.5rem 0.7rem',
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
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                        <div
                          style={{
                            width: '28px',
                            height: '22px',
                            borderRadius: '0.4rem',
                            border: `1px solid ${theme.colors.borderDefault}`,
                            backgroundColor: theme.colors.bgCanvas,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            position: 'relative',
                            overflow: 'hidden',
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
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: theme.colors.accent,
                              zIndex: 2,
                            }}
                          />
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '12px', fontWeight: isSelected ? 700 : 600, color: isSelected ? currentTheme.colors.accent : currentTheme.colors.textPrimary }}>
                              {theme.name}
                            </span>
                            <span
                              style={{
                                fontSize: '9px',
                                fontFamily: 'JetBrains Mono, monospace',
                                padding: '1px 4px',
                                borderRadius: '4px',
                                backgroundColor: theme.isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.06)',
                                color: currentTheme.colors.textMuted,
                              }}
                            >
                              {theme.isDark ? 'Dark' : 'Light'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <Check style={{ width: '13px', height: '13px', strokeWidth: 3, color: currentTheme.colors.accent }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body
          )}

          {/* Bookmarks Vault Button */}
          <button
            onClick={onOpenBookmarks}
            className="relative p-1.5 rounded-lg bg-surface hover:bg-surface-hover text-txt-primary hover:text-action border border-themeline transition-all shadow-sm"
            title="Saved Vault Repositories"
          >
            <Bookmark className="w-3.5 h-3.5" />
            {bookmarksCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[15px] h-[15px] px-1 text-[9px] font-mono font-bold text-white bg-action rounded-full border border-surface">
                {bookmarksCount}
              </span>
            )}
          </button>

          {/* GitHub Trending in-app Button */}
          <button
            onClick={onOpenTrending}
            className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover text-txt-primary hover:text-action border border-themeline transition-all shadow-sm flex items-center justify-center"
            title="GitHub Trending Repositories (In-App View)"
          >
            <Flame className="w-3.5 h-3.5 text-action" />
          </button>

          {/* Vertical Divider before Window Controls */}
          <div className="h-4 w-px bg-themeline mx-0.5 sm:mx-1" />

          {/* Native-style Window Controls */}
          {isElectron && (
            <div className="flex items-center">
              {/* Minimize */}
              <button
                onClick={handleMinimize}
                className="w-7 sm:w-8 h-8 flex items-center justify-center rounded-lg text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors"
                title="Minimize"
                aria-label="Minimize"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              {/* Maximize / Restore */}
              <button
                onClick={handleMaximize}
                className="w-7 sm:w-8 h-8 flex items-center justify-center rounded-lg text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors"
                title={isMaximized ? 'Restore' : 'Maximize'}
                aria-label={isMaximized ? 'Restore' : 'Maximize'}
              >
                {isMaximized ? (
                  <Copy className="w-3 h-3 rotate-180" />
                ) : (
                  <Square className="w-3 h-3" />
                )}
              </button>

              {/* Close */}
              <button
                onClick={handleClose}
                className="w-7 sm:w-8 h-8 flex items-center justify-center rounded-lg text-txt-muted hover:text-white hover:bg-rose-600 transition-colors"
                title="Close"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Below TitleBar: Expandable Flyout Searchbar (Responsive & Longer) ── */}
      {isSearchFlyoutOpen && (
        <>
          {/* Full-screen backdrop to dismiss on outside click including titlebar */}
          <div
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px] app-no-drag"
            onClick={() => setIsSearchFlyoutOpen(false)}
          />
          <div className="fixed top-11 inset-x-0 z-50 animate-fadeIn select-none pointer-events-none">
            <div className="max-w-3xl w-full mx-auto px-4 pt-2 pointer-events-auto">
              <div 
                ref={searchFlyoutRef}
                data-search-flyout="true"
                className="bg-surface/95 backdrop-blur-2xl border border-themeline rounded-2xl shadow-2xl p-3 text-txt-primary transition-all duration-200"
              >
              {/* Input Row */}
              <div className="relative flex items-center gap-2">
                <Search className="w-4 h-4 text-action ml-2 flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={flyoutSearchInput}
                  onChange={(e) => {
                    setFlyoutSearchInput(e.target.value);
                    onSearchChange(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsSearchFlyoutOpen(false);
                    }
                  }}
                  placeholder="Type keywords, topics or repo name (e.g. rust, llm, vite, deepseek)..."
                  className="flex-1 bg-transparent py-2 px-1 text-sm sm:text-base font-sans text-txt-primary placeholder-txt-muted focus:outline-none"
                />

                {flyoutSearchInput && (
                  <button
                    onClick={() => {
                      setFlyoutSearchInput('');
                      onSearchChange('');
                      searchInputRef.current?.focus();
                    }}
                    className="p-1.5 rounded-lg text-txt-muted hover:text-txt-primary hover:bg-surface-active transition-colors text-xs font-mono"
                    title="Clear query"
                  >
                    ✕
                  </button>
                )}

                <button
                  onClick={() => setIsSearchFlyoutOpen(false)}
                  className="px-2.5 py-1 rounded-lg bg-surface-active hover:bg-surface-hover border border-themeline text-[11px] font-mono text-txt-muted hover:text-txt-primary transition-all"
                  title="Close search flyout (Esc)"
                >
                  ESC
                </button>
              </div>

              {/* Quick Topics & Suggestions */}
              <div className="flex items-center gap-1.5 flex-wrap pt-2.5 mt-2 border-t border-themeline/60">
                <span className="text-[11px] font-mono text-txt-muted mr-1">Popular:</span>
                {popularTopics.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => {
                      setFlyoutSearchInput(topic);
                      onSearchChange(topic);
                      setIsSearchFlyoutOpen(false);
                    }}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-surface-active hover:bg-action hover:text-txt-inverse text-txt-secondary border border-themeline transition-all"
                  >
                    #{topic}
                  </button>
                ))}
                {searchQuery.trim() && (
                  <button
                    onClick={() => {
                      setFlyoutSearchInput('');
                      onSearchChange('');
                    }}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-surface-active hover:bg-rose-500 hover:text-white text-txt-muted border border-themeline transition-all ml-auto"
                  >
                    Reset Search
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        </>
      )}
    </>
  );
};
