import React, { useState, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  Download, 
  ExternalLink, 
  Loader2, 
  Clock, 
  Package, 
  RefreshCw 
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { UpdateInfo } from '../services/updateService';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo | null;
  isChecking: boolean;
  onCheckAgain: () => void;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateString?: string): string {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
  isChecking,
  onCheckAgain
}) => {
  if (!isOpen) return null;

  const [isSilentUpdating, setIsSilentUpdating] = useState(false);
  const [silentProgress, setSilentProgress] = useState<number | null>(null);
  const [silentStatusText, setSilentStatusText] = useState<string>('');

  const renderedNotes = useMemo(() => {
    if (!updateInfo?.releaseBody) return '';
    try {
      const parsed = marked.parse(updateInfo.releaseBody) as string;
      return DOMPurify.sanitize(parsed, {
        ADD_ATTR: ['target', 'rel'],
      });
    } catch {
      return updateInfo.releaseBody;
    }
  }, [updateInfo?.releaseBody]);

  const handleDownload = () => {
    if (!updateInfo) return;
    const targetUrl = updateInfo.downloadUrl || updateInfo.releaseUrl;
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(targetUrl);
    } else {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleOpenReleasePage = () => {
    if (!updateInfo) return;
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(updateInfo.releaseUrl);
    } else {
      window.open(updateInfo.releaseUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSilentInstall = async () => {
    if (!updateInfo?.downloadUrl) {
      handleDownload();
      return;
    }
    if (!window.electronAPI?.installUpdateSilently) {
      handleDownload();
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
      setSilentStatusText('Applying update and restarting OneGitVault...');
    } catch (err: any) {
      console.error('Silent update error:', err);
      setIsSilentUpdating(false);
      setSilentStatusText(`Update error: ${err.message || 'Failed'}`);
      setTimeout(() => {
        handleDownload();
      }, 1500);
    } finally {
      if (unsubscribe) unsubscribe();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-xl max-h-[85vh] flex flex-col bg-surface border border-themeline text-txt-primary rounded-2xl shadow-2xl overflow-hidden transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-themeline bg-surface-active flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              updateInfo?.hasUpdate 
                ? 'bg-action-soft border-action-border text-action' 
                : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500'
            }`}>
              {isChecking ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : updateInfo?.hasUpdate ? (
                <Sparkles className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-txt-primary">
                {isChecking
                  ? 'Checking for Updates...'
                  : updateInfo?.hasUpdate
                    ? `Update Available: v${updateInfo.latestVersion}`
                    : "You're on the Latest Version"}
              </h3>
              <p className="text-xs font-sans text-txt-muted">
                {updateInfo 
                  ? `Current: v${updateInfo.currentVersion} ${updateInfo.hasUpdate ? `• Latest: v${updateInfo.latestVersion}` : '• Up to date'}`
                  : 'Connecting to GitHub Releases...'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-txt-muted hover:text-txt-primary rounded-lg hover:bg-surface-hover transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto max-h-[55vh] space-y-4">
          {isChecking ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-txt-muted">
              <Loader2 className="w-8 h-8 text-action animate-spin" />
              <p className="text-xs font-sans font-medium">Querying GitHub API for latest release assets...</p>
            </div>
          ) : updateInfo?.hasUpdate ? (
            <>
              {/* Release Header Banner */}
              <div className="p-4 rounded-xl bg-surface-active border border-themeline flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h4 className="font-display font-bold text-sm text-txt-primary">
                    {updateInfo.releaseName}
                  </h4>
                  {updateInfo.publishedAt && (
                    <div className="flex items-center gap-1.5 text-[11px] font-sans text-txt-muted mt-1">
                      <Clock className="w-3.5 h-3.5 text-action" />
                      <span>Published on {formatDate(updateInfo.publishedAt)}</span>
                    </div>
                  )}
                </div>

                {updateInfo.assetName && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface text-xs font-sans font-medium border border-themeline text-txt-secondary flex-shrink-0 self-start sm:self-auto">
                    <Package className="w-3.5 h-3.5 text-action" />
                    <span>{formatBytes(updateInfo.assetSize)}</span>
                  </span>
                )}
              </div>

              {/* Silent Update Progress Bar (if active) */}
              {isSilentUpdating && (
                <div className="p-4 rounded-xl bg-action-soft border border-action-border text-action space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs font-sans font-bold">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{silentStatusText}</span>
                    </div>
                    {silentProgress !== null && <span>{silentProgress}%</span>}
                  </div>
                  {silentProgress !== null && (
                    <div className="w-full bg-surface-active rounded-full h-2 overflow-hidden border border-action-border">
                      <div 
                        className="bg-action h-full transition-all duration-200" 
                        style={{ width: `${silentProgress}%` }} 
                      />
                    </div>
                  )}
                  <p className="text-[11px] font-sans text-txt-muted">
                    The installer will seamlessly upgrade OneGitVault and restart the application automatically.
                  </p>
                </div>
              )}

              {/* Release Notes */}
              <div>
                <span className="text-xs font-sans font-bold uppercase tracking-wider text-txt-muted block mb-2">
                  Changelog & Release Notes:
                </span>
                <div 
                  className="readme-body prose prose-sm max-w-none p-4 rounded-xl bg-surface-active border border-themeline overflow-x-auto text-xs sm:text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderedNotes }}
                />
              </div>
            </>
          ) : (
            <div className="py-8 flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500 shadow-sm">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-display text-base font-bold text-txt-primary">
                  OneGitVault is Up to Date
                </h4>
                <p className="text-xs font-sans text-txt-muted mt-1 max-w-xs">
                  You are running version v{updateInfo?.currentVersion || '2.1.0'}. No newer release was found on GitHub.
                </p>
              </div>

              <button
                onClick={onCheckAgain}
                className="mt-2 flex items-center gap-2 text-xs font-sans font-medium px-3.5 py-1.5 rounded-xl bg-surface hover:bg-surface-hover text-txt-primary border border-themeline transition-colors shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5 text-action" />
                <span>Check Again</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-themeline bg-surface-active flex-shrink-0 gap-3">
          <button
            onClick={onClose}
            disabled={isSilentUpdating}
            className="px-4 py-2 rounded-xl text-xs font-sans text-txt-secondary hover:text-txt-primary hover:bg-surface transition-colors disabled:opacity-50"
          >
            {updateInfo?.hasUpdate ? 'Later' : 'Close'}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenReleasePage}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-sans bg-surface hover:bg-surface-hover text-txt-primary border border-themeline transition-all"
              title="Open GitHub Releases page"
            >
              <span>GitHub Release</span>
              <ExternalLink className="w-3.5 h-3.5 text-txt-muted" />
            </button>

            {updateInfo?.hasUpdate && (
              <button
                onClick={handleSilentInstall}
                disabled={isSilentUpdating}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-sans font-semibold bg-action text-txt-inverse border border-action hover:opacity-90 shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {isSilentUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span>Update Silently & Restart</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
