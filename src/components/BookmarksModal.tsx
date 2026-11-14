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
    if (syncStatus === 'success') return <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
    if (syncStatus === 'error') return <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />;
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-[#111217] border border-neutral-200 dark:border-[#242634] rounded-2xl shadow-2xl flex flex-col text-neutral-900 dark:text-charcoal-100 overflow-hidden transition-colors duration-200">

        {/* ── Header ── */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-[#20212b]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-brand">
              <Bookmark className="w-5 h-5 fill-amber-600 dark:fill-amber-brand" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-neutral-900 dark:text-white">Repository Vault</h3>
              <p className="text-xs font-mono text-neutral-500 dark:text-charcoal-400">{bookmarks.length} bookmarked repositories</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {bookmarks.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs font-mono text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-500/10 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                Clear Vault
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 dark:text-charcoal-400 dark:hover:text-white dark:hover:bg-[#1a1c26] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── GitHub Gist Sync Banner ── */}
        <div className={`px-5 py-3 border-b border-neutral-200 dark:border-[#20212b] ${hasToken ? 'bg-neutral-50 dark:bg-[#0d0e14]' : 'bg-neutral-50/60 dark:bg-[#13141a]'}`}>
          {hasToken ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs font-mono text-neutral-600 dark:text-charcoal-300">
                  <Cloud className="w-3.5 h-3.5 text-amber-600 dark:text-amber-brand" />
                  <span className="font-semibold text-neutral-900 dark:text-white">GitHub Gist Sync</span>
                  <span className="text-neutral-500 dark:text-charcoal-500 hidden sm:inline">— back up & restore across devices</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handlePull}
                    disabled={syncStatus === 'pushing' || syncStatus === 'pulling'}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-white hover:bg-neutral-100 dark:bg-[#161720] dark:hover:bg-[#1d1f2b] border border-neutral-300 dark:border-[#2b2d3d] text-neutral-700 dark:text-charcoal-200 hover:text-neutral-900 dark:hover:text-white transition-all disabled:opacity-50 shadow-sm"
                    title="Pull bookmarks from your GitHub Gist"
                  >
                    <CloudDownload className="w-3.5 h-3.5" />
                    Pull
                  </button>
                  <button
                    onClick={handlePush}
                    disabled={syncStatus === 'pushing' || syncStatus === 'pulling' || bookmarks.length === 0}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-800 dark:text-amber-brand transition-all disabled:opacity-50 font-semibold"
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
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/25 dark:text-emerald-400'
                    : syncStatus === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/25 dark:text-rose-400'
                    : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-brand'
                }`}>
                  {syncIcon()}
                  <span className="flex-1">{syncMessage || (syncStatus === 'pushing' ? 'Syncing to GitHub Gist…' : 'Fetching from GitHub Gist…')}</span>
                  {gistUrl && (
                    <a href={gistUrl} target="_blank" rel="noreferrer" className="underline text-amber-700 dark:text-charcoal-300 hover:text-amber-900 dark:hover:text-white flex items-center gap-1">
                      View Gist <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono text-neutral-500 dark:text-charcoal-500">
              <Cloud className="w-3.5 h-3.5 text-amber-600 dark:text-amber-brand" />
              <span>Connect a GitHub Token to enable Gist Sync — back up your vault to GitHub</span>
            </div>
          )}
        </div>

        {/* ── Bookmark List ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {bookmarks.length === 0 ? (
            <div className="text-center py-12">
              <Bookmark className="w-12 h-12 text-neutral-300 dark:text-charcoal-500 mx-auto mb-3 opacity-60" />
              <h4 className="text-sm font-display font-semibold text-neutral-700 dark:text-charcoal-300">Your Vault is Empty</h4>
              <p className="text-xs font-sans text-neutral-500 dark:text-charcoal-400 max-w-sm mx-auto mt-1">
                Click the bookmark icon on any project card to store it in your local OneGitVault.
              </p>
            </div>
          ) : (
            bookmarks.map((repo) => (
              <div
                key={repo.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-50 hover:bg-neutral-100/80 dark:bg-[#161720] dark:hover:bg-[#1a1c27] border border-neutral-200 dark:border-[#242634] hover:border-neutral-300 dark:hover:border-[#2f3244] transition-all gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={repo.owner.avatar_url}
                    alt={repo.owner.login}
                    className="w-8 h-8 rounded-lg ring-1 ring-neutral-200 dark:ring-[#262836] bg-neutral-100 dark:bg-[#20212b] flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-display font-bold text-neutral-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-brand flex items-center gap-1.5 truncate transition-colors"
                    >
                      <span>{repo.full_name}</span>
                      <ExternalLink className="w-3 h-3 text-neutral-400 dark:text-charcoal-400 flex-shrink-0" />
                    </a>
                    <p className="text-xs text-neutral-600 dark:text-charcoal-400 truncate max-w-md font-sans">
                      {repo.description || 'No description provided.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-700 dark:text-amber-brand bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-md">
                    <Star className="w-3 h-3 fill-amber-600 dark:fill-amber-brand text-amber-600 dark:text-amber-brand" />
                    <span>{repo.stargazers_count.toLocaleString()}</span>
                  </div>

                  <button
                    onClick={() => onRemoveBookmark(repo.id)}
                    className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:text-charcoal-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
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
        <div className="p-4 border-t border-neutral-200 dark:border-[#20212b] bg-neutral-50 dark:bg-[#0e0f13] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono font-semibold text-neutral-700 dark:text-charcoal-300 hover:text-neutral-900 dark:hover:text-white bg-white hover:bg-neutral-100 dark:bg-[#1a1c26] dark:hover:bg-[#222432] border border-neutral-300 dark:border-transparent rounded-xl transition-colors shadow-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
