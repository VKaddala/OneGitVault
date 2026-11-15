import React, { useState } from 'react';
import {
  Bookmark, X, ExternalLink, Trash2, Star,
  CloudUpload, CloudDownload, Cloud, Loader2, Check, AlertCircle
} from 'lucide-react';
import { Repository } from '../types';
import { getStoredToken } from '../services/githubApi';
import { pushBookmarksToGist, pullBookmarksFromGist } from '../services/gistSync';

interface BookmarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: Repository[];
  onRemoveBookmark: (id: number | string) => void;
  onClearAll: () => void;
  onImportBookmarks: (repos: Repository[]) => void;
}

type SyncStatus = 'idle' | 'pushing' | 'pulling' | 'success' | 'error';

export const BookmarksModal: React.FC<BookmarksModalProps> = ({
  isOpen,
  onClose,
  bookmarks,
  onRemoveBookmark,
  onClearAll,
  onImportBookmarks,
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [gistUrl, setGistUrl] = useState('');

  const hasToken = Boolean(getStoredToken());

  if (!isOpen) return null;

  const handlePush = async () => {
    const token = getStoredToken();
    if (!token) return;
    setSyncStatus('pushing');
    setSyncMessage('');
    setGistUrl('');
    try {
      const url = await pushBookmarksToGist(token, bookmarks);
      if (url) {
        setSyncStatus('success');
        setSyncMessage(`Synced ${bookmarks.length} bookmarks to GitHub Gist`);
        setGistUrl(url);
      } else {
        setSyncStatus('error');
        setSyncMessage('Failed to push to Gist. Check your token permissions (gist scope required).');
      }
    } catch {
      setSyncStatus('error');
      setSyncMessage('Unexpected error during sync.');
    }
  };

  const handlePull = async () => {
    const token = getStoredToken();
    if (!token) return;
    setSyncStatus('pulling');
    setSyncMessage('');
    try {
      const remote = await pullBookmarksFromGist(token);
      if (remote && remote.length > 0) {
        onImportBookmarks(remote);
        setSyncStatus('success');
        setSyncMessage(`Imported ${remote.length} bookmarks from GitHub Gist`);
      } else if (remote && remote.length === 0) {
        setSyncStatus('success');
        setSyncMessage('Your Gist bookmark vault is empty.');
      } else {
        setSyncStatus('error');
        setSyncMessage('No OneGitVault Gist found. Push first to create one.');
      }
    } catch {
      setSyncStatus('error');
      setSyncMessage('Failed to pull from Gist.');
    }
  };

  const syncIcon = () => {
    if (syncStatus === 'pushing' || syncStatus === 'pulling')
      return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
    if (syncStatus === 'success') return <Check className="w-3.5 h-3.5 text-emerald-500" />;
    if (syncStatus === 'error') return <AlertCircle className="w-3.5 h-3.5 text-rose-500" />;
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-surface border border-themeline rounded-2xl shadow-2xl flex flex-col text-txt-primary overflow-hidden transition-colors duration-200">

        {/* ── Header ── */}
        <div className="flex items-center justify-between p-5 border-b border-themeline bg-surface-active">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-action-soft border border-action-border text-action">
              <Bookmark className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-txt-primary">Repository Vault</h3>
              <p className="text-xs font-mono text-txt-muted">{bookmarks.length} bookmarked repositories</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {bookmarks.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs font-mono text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                Clear Vault
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-txt-muted hover:text-txt-primary hover:bg-surface rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── GitHub Gist Sync Banner ── */}
        <div className="px-5 py-3 border-b border-themeline bg-surface/70">
          {hasToken ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs font-mono text-txt-muted">
                  <Cloud className="w-3.5 h-3.5 text-action" />
                  <span className="font-semibold text-txt-primary">GitHub Gist Sync</span>
                  <span className="text-txt-muted/70 hidden sm:inline">— back up & restore across devices</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handlePull}
                    disabled={syncStatus === 'pushing' || syncStatus === 'pulling'}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-surface hover:bg-surface-hover border border-themeline text-txt-primary transition-all disabled:opacity-50 shadow-sm"
                    title="Pull bookmarks from your GitHub Gist"
                  >
                    <CloudDownload className="w-3.5 h-3.5" />
                    Pull
                  </button>
                  <button
                    onClick={handlePush}
                    disabled={syncStatus === 'pushing' || syncStatus === 'pulling' || bookmarks.length === 0}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-action hover:opacity-90 text-txt-inverse border border-action transition-all disabled:opacity-50 font-semibold shadow-sm"
                    title="Push bookmarks to GitHub Gist"
                  >
                    <CloudUpload className="w-3.5 h-3.5" />
                    Push
                  </button>
                </div>
              </div>

              {/* Sync status feedback */}
              {syncStatus !== 'idle' && (
                <div className={`flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-lg border ${
                  syncStatus === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                    : syncStatus === 'error'
                    ? 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                    : 'bg-action-soft border-action-border text-action'
                }`}>
                  {syncIcon()}
                  <span className="flex-1">{syncMessage || (syncStatus === 'pushing' ? 'Syncing to GitHub Gist…' : 'Fetching from GitHub Gist…')}</span>
                  {gistUrl && (
                    <a href={gistUrl} target="_blank" rel="noreferrer" className="underline text-action hover:opacity-80 flex items-center gap-1">
                      View Gist <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono text-txt-muted">
              <Cloud className="w-3.5 h-3.5 text-action" />
              <span>Connect a GitHub Token to enable Gist Sync — back up your vault to GitHub</span>
            </div>
          )}
        </div>

        {/* ── Bookmark List ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {bookmarks.length === 0 ? (
            <div className="text-center py-12">
              <Bookmark className="w-12 h-12 text-txt-muted/40 mx-auto mb-3 opacity-60" />
              <h4 className="text-sm font-display font-semibold text-txt-primary">Your Vault is Empty</h4>
              <p className="text-xs font-sans text-txt-muted max-w-sm mx-auto mt-1">
                Click the bookmark icon on any project card to store it in your local OneGitVault.
              </p>
            </div>
          ) : (
            bookmarks.map((repo) => (
              <div
                key={repo.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-surface-active hover:bg-surface border border-themeline hover:border-action-border transition-all gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={repo.owner.avatar_url}
                    alt={repo.owner.login}
                    className="w-8 h-8 rounded-lg ring-1 ring-themeline bg-surface flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-display font-bold text-txt-primary hover:text-action flex items-center gap-1.5 truncate transition-colors"
                    >
                      <span>{repo.full_name}</span>
                      <ExternalLink className="w-3 h-3 text-txt-muted flex-shrink-0" />
                    </a>
                    <p className="text-xs text-txt-muted truncate max-w-md font-sans">
                      {repo.description || 'No description provided.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1 text-xs font-mono font-bold text-action bg-action-soft border border-action-border px-2 py-0.5 rounded-md">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{repo.stargazers_count.toLocaleString()}</span>
                  </div>

                  <button
                    onClick={() => onRemoveBookmark(repo.id)}
                    className="p-1.5 text-txt-muted hover:text-rose-500 rounded-lg transition-colors"
                    title="Remove from vault"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Footer ── */}
        <div className="p-4 border-t border-themeline bg-surface-active flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono font-semibold text-txt-primary hover:text-action bg-surface hover:bg-surface-hover border border-themeline rounded-xl transition-colors shadow-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
