import React, { useState, useEffect } from 'react';
import { Minus, Square, Copy, X, Sparkles, RefreshCw } from 'lucide-react';
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

  return (
    <div
      onDoubleClick={handleDoubleClickDrag}
      className="w-full h-9 bg-header border-b border-themeline flex items-center justify-between select-none app-drag-region sticky top-0 z-50 transition-colors duration-200"
    >
      {/* ── Left: App Brand & Version Tag ── */}
      <div className="flex items-center gap-2 pl-3">
        <div className="w-4 h-4 flex-shrink-0">
          <OneGitVaultLogo className="w-4 h-4" />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-display font-bold text-xs tracking-tight text-txt-primary">
            OneGit<span className="text-action">Vault</span>
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface border border-themeline text-txt-muted font-medium">
            v{CURRENT_APP_VERSION}
          </span>
          <span className="text-txt-muted text-[10px] hidden sm:inline">·</span>
          <span className="text-[11px] font-mono text-txt-muted hidden sm:inline truncate max-w-[200px]">
            Open-Source Observatory
          </span>
        </div>
      </div>

      {/* ── Center: Draggable Spacer ── */}
      <div className="flex-1 h-full" />

      {/* ── Right: Update Status Pill & Window Controls ── */}
      <div className="flex items-center h-full app-no-drag">
        {/* Update Pill or Check Trigger */}
        <div className="mr-2">
          {updateInfo?.hasUpdate ? (
            <button
              onClick={onOpenUpdateModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-action text-txt-inverse text-[11px] font-mono font-semibold shadow-sm hover:opacity-90 transition-all animate-pulse"
              title={`Update available: v${updateInfo.latestVersion}. Click to view details and install`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Update v{updateInfo.latestVersion}</span>
            </button>
          ) : (
            <button
              onClick={onCheckUpdates}
              disabled={isCheckingUpdates}
              className="flex items-center gap-1 text-[11px] font-mono text-txt-muted hover:text-txt-primary hover:bg-surface-hover px-2 py-1 rounded-lg border border-transparent hover:border-themeline transition-all disabled:opacity-50"
              title="Check for updates on GitHub"
            >
              <RefreshCw className={`w-3 h-3 ${isCheckingUpdates ? 'animate-spin text-action' : ''}`} />
              <span className="hidden md:inline">Check updates</span>
            </button>
          )}
        </div>

        {/* ── Window Control Buttons (Electron Only) ── */}
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
