import React, { useState, useEffect, useRef } from 'react';
import { 
  Minus, 
  Square, 
  Copy, 
  X, 
  Sparkles, 
  Search
} from 'lucide-react';
import { OneGitVaultLogo } from './OneGitVaultLogo';
import { UpdateInfo } from '../services/updateService';

interface TitleBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  updateInfo?: UpdateInfo | null;
  onOpenUpdateModal?: () => void;
  onCheckUpdates?: () => void;
  isCheckingUpdates?: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  searchQuery,
  onSearchChange,
  updateInfo,
  onOpenUpdateModal,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isSearchFlyoutOpen, setIsSearchFlyoutOpen] = useState(false);
  const [flyoutSearchInput, setFlyoutSearchInput] = useState(searchQuery);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchFlyoutRef = useRef<HTMLDivElement | null>(null);

  const isElectron = Boolean(window.electronAPI?.isElectron);

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

  const popularTopics = ['rust', 'deepseek', 'llm', 'agents', 'vite', 'python', 'react', 'database'];

  const handleTitleBarClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInsideFlyout = target.closest('[data-search-flyout="true"]') || target.closest('[data-search-trigger="true"]');

    if (!isInsideFlyout && isSearchFlyoutOpen) {
      setIsSearchFlyoutOpen(false);
    }
  };

  return (
    <>
      {/* ── Main Unified TitleBar ── */}
      <div
        onDoubleClick={handleDoubleClickDrag}
        onMouseDown={handleTitleBarClick}
        className={`w-full h-11 bg-header border-b border-themeline flex items-center justify-between px-3 select-none relative z-50 flex-shrink-0 transition-colors duration-200 ${
          isSearchFlyoutOpen ? 'app-no-drag' : 'app-drag-region'
        }`}
      >
        {/* ── Left Side: App Brand ── */}
        <div className="flex items-center gap-2 app-no-drag relative flex-shrink-0">
          <div className="w-4 h-4 flex-shrink-0 cursor-pointer" onClick={() => onSearchChange('')}>
            <OneGitVaultLogo className="w-4 h-4" />
          </div>

          <span 
            onClick={() => onSearchChange('')}
            className="font-display font-bold text-xs tracking-tight text-txt-primary cursor-pointer hover:text-action transition-colors whitespace-nowrap"
          >
            OneGit<span className="text-action">Vault</span>
          </span>

          {/* Update Available Badge */}
          {updateInfo?.hasUpdate && onOpenUpdateModal && (
            <button
              onClick={onOpenUpdateModal}
              className="flex items-center gap-1 px-2 py-0.5 ml-1.5 rounded-full bg-action/20 border border-action text-action hover:bg-action hover:text-txt-inverse transition-all text-[10px] font-mono font-bold animate-pulse shadow-sm"
              title={`New update v${updateInfo.latestVersion} available!`}
            >
              <Sparkles className="w-3 h-3 text-action fill-current" />
              <span className="hidden sm:inline">Update</span>
            </button>
          )}
        </div>

        {/* ── Center: Search Trigger (Flyout Launcher) ── */}
        <div className="flex-1 max-w-lg mx-1.5 sm:mx-3 flex items-center justify-center app-no-drag min-w-0">
          <button
            data-search-trigger="true"
            onClick={(e) => {
              e.stopPropagation();
              setIsSearchFlyoutOpen((prev) => !prev);
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

        {/* ── Right Side: Window Controls (Frameless Native) ── */}
        <div className="flex items-center gap-1 app-no-drag flex-shrink-0">
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

      {/* ── Below TitleBar: Expandable Flyout Searchbar (Responsive) ── */}
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
                <div className="flex items-center gap-1.5 flex-wrap pt-2.5 mt-2 border-t border-themeline">
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
