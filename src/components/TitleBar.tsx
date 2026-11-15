import React, { useState, useEffect, useRef } from 'react';
import { 
  Minus, 
  Square, 
  Copy, 
  X, 
  Sparkles, 
  RefreshCw, 
  ChevronDown, 
  ExternalLink,
  Download
} from 'lucide-react';
import { OneGitVaultLogo } from './OneGitVaultLogo';
import { CURRENT_APP_VERSION, UpdateInfo } from '../services/updateService';

interface TitleBarProps {
  updateInfo: UpdateInfo | null;
  onOpenUpdateModal: () => void;
  onCheckUpdates: () => void;
  isCheckingUpdates: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  updateInfo,
  onOpenUpdateModal,
  onCheckUpdates,
  isCheckingUpdates,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const isElectron = Boolean(window.electronAPI?.isElectron);

  useEffect(() => {
    if (!isElectron || !window.electronAPI?.onMaximizedChange) return;

    // Check initial state
    window.electronAPI.isMaximized().then(setIsMaximized).catch(() => {});

    // Subscribe to maximize changes
    const cleanup = window.electronAPI.onMaximizedChange((maximized) => {
      setIsMaximized(maximized);
    });

    return cleanup;
  }, [isElectron]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
    // Only double click on the drag area itself, not buttons
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

  return (
    <div
      onDoubleClick={handleDoubleClickDrag}
      className="w-full h-9 bg-header border-b border-themeline flex items-center justify-between select-none app-drag-region relative z-50 flex-shrink-0 transition-colors duration-200"
    >
      {/* ── Left: App Brand & Expand About Button (No version or subtitle text on bar) ── */}
      <div className="flex items-center gap-1.5 pl-3 app-no-drag relative" ref={dropdownRef}>
        <div className="w-4 h-4 flex-shrink-0">
          <OneGitVaultLogo className="w-4 h-4" />
        </div>

        <span className="font-display font-bold text-xs tracking-tight text-txt-primary">
          OneGit<span className="text-action">Vault</span>
        </span>

        {/* Expand button that shows the About & updates popover */}
        <button
          onClick={() => setIsAboutOpen((prev) => !prev)}
          className={`flex items-center justify-center p-1 rounded-md text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors ${
            isAboutOpen ? 'bg-surface-hover text-txt-primary' : ''
          }`}
          title="About OneGitVault & Options"
          aria-label="Expand About and updates menu"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isAboutOpen ? 'rotate-180 text-action' : ''
            }`}
          />
        </button>

        {/* If update is available: show update symbol */}
        {updateInfo?.hasUpdate && (
          <button
            onClick={onOpenUpdateModal}
            className="flex items-center gap-1 px-2 py-0.5 ml-1 rounded-full bg-action/20 border border-action text-action hover:bg-action hover:text-txt-inverse transition-all text-[10px] font-mono font-bold animate-pulse shadow-sm"
            title={`New update v${updateInfo.latestVersion} available! Click to view and install`}
          >
            <Sparkles className="w-3 h-3 text-action fill-current" />
            <span>Update available</span>
          </button>
        )}

        {/* ── Expand Popover: About OneGitVault & Check Updates ── */}
        {isAboutOpen && (
          <div className="absolute top-8 left-0 w-80 bg-surface border border-themeline rounded-xl shadow-2xl p-4 z-50 animate-fadeIn text-left backdrop-blur-xl">
            {/* About App Info */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-surface-active border border-themeline flex-shrink-0 shadow-sm">
                <OneGitVaultLogo className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-sm text-txt-primary tracking-tight">
                    OneGit<span className="text-action">Vault</span>
                  </h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-active border border-themeline text-txt-muted font-semibold">
                    v{CURRENT_APP_VERSION}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-txt-secondary mt-0.5">
                  Open-Source Repository Explorer
                </p>
              </div>
            </div>

            <p className="text-xs text-txt-muted mt-2.5 font-sans leading-relaxed">
              Explore, stream, and bookmark popular GitHub open-source repositories.
            </p>

            <div className="flex items-center justify-between text-[11px] font-mono text-txt-muted mt-3 pt-2.5 border-t border-themeline/60">
              <span>Author: <span className="text-txt-primary font-medium">VKaddala</span></span>
              <button
                onClick={() => openExternal('https://github.com/VKaddala/OneGitVault')}
                className="flex items-center gap-1 text-action hover:underline"
              >
                <span>GitHub Repo</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {/* Check Updates Section (inside expand popup) */}
            <div className="mt-3.5 pt-3 border-t border-themeline">
              {updateInfo?.hasUpdate ? (
                <div className="p-2.5 rounded-lg bg-action-soft border border-action-border">
                  <div className="flex items-center gap-1.5 text-action text-xs font-bold font-display">
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    <span>New Version v{updateInfo.latestVersion} Available!</span>
                  </div>
                  <p className="text-[10px] text-txt-muted mt-1 font-mono">
                    Current: v{CURRENT_APP_VERSION} → Latest: v{updateInfo.latestVersion}
                  </p>
                  <button
                    onClick={() => {
                      setIsAboutOpen(false);
                      onOpenUpdateModal();
                    }}
                    className="w-full mt-2 py-1.5 px-3 rounded-lg bg-action hover:bg-action-hover text-txt-inverse text-xs font-mono font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>View Release & Install</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      onCheckUpdates();
                    }}
                    disabled={isCheckingUpdates}
                    className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-surface-active hover:bg-surface-hover border border-themeline text-xs font-mono text-txt-primary hover:text-action transition-all disabled:opacity-50 shadow-sm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdates ? 'animate-spin text-action' : 'text-action'}`} />
                    <span>{isCheckingUpdates ? 'Checking GitHub...' : 'Check for updates'}</span>
                  </button>
                  <p className="text-[10px] font-mono text-txt-muted text-center">
                    {updateInfo ? `Up to date · Running v${CURRENT_APP_VERSION}` : 'Queries GitHub for newer releases'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Center: Draggable Spacer ── */}
      <div className="flex-1 h-full" />

      {/* ── Right: Window Controls Only (NO scrollbar at title level) ── */}
      <div className="flex items-center h-full app-no-drag">
        {isElectron && (
          <div className="flex items-center h-full">
            {/* Minimize */}
            <button
              onClick={handleMinimize}
              className="w-10 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors"
              title="Minimize"
              aria-label="Minimize"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            {/* Maximize / Restore */}
            <button
              onClick={handleMaximize}
              className="w-10 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors"
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
              className="w-10 h-full flex items-center justify-center text-txt-muted hover:text-white hover:bg-rose-600 transition-colors"
              title="Close"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
