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
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#FFF9F0] dark:bg-[#16272f] ambient:bg-[#161b22] border border-[#e3d1ba] dark:border-[#244855] ambient:border-[#30363d] rounded-2xl shadow-2xl flex flex-col text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc] overflow-hidden transition-colors duration-200">

        {/* ── Header ── */}
        <div className="flex items-center justify-between p-5 border-b border-[#e3d1ba] dark:border-[#244855] ambient:border-[#30363d] bg-[#FAF0E4] dark:bg-[#132229] ambient:bg-[#0f141c]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#E64833]/10 ambient:bg-[#38bdf8]/15 border border-[#E64833]/25 ambient:border-[#38bdf8]/30 text-[#E64833] ambient:text-[#38bdf8]">
              <Bookmark className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc]">Repository Vault</h3>
              <p className="text-xs font-mono text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8]">{bookmarks.length} bookmarked repositories</p>
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
              className="p-1.5 text-[#874F41] hover:text-[#244855] hover:bg-[#F2DFCA] dark:text-[#90AEAD] dark:hover:text-white dark:hover:bg-[#1c323c] ambient:text-[#94a3b8] ambient:hover:text-white ambient:hover:bg-[#1f2937] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── GitHub Gist Sync Banner ── */}
        <div className={`px-5 py-3 border-b border-[#e3d1ba] dark:border-[#244855] ambient:border-[#30363d] ${hasToken ? 'bg-[#FAF0E4] dark:bg-[#101b20] ambient:bg-[#131b26]' : 'bg-[#FAF0E4]/70 dark:bg-[#101b20]/70 ambient:bg-[#131b26]/70'}`}>
          {hasToken ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs font-mono text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8]">
                  <Cloud className="w-3.5 h-3.5 text-[#E64833] ambient:text-[#38bdf8]" />
                  <span className="font-semibold text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc]">GitHub Gist Sync</span>
                  <span className="text-[#874F41]/70 dark:text-[#90AEAD]/70 ambient:text-[#94a3b8]/70 hidden sm:inline">— back up & restore across devices</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handlePull}
                    disabled={syncStatus === 'pushing' || syncStatus === 'pulling'}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-[#FFF9F0] hover:bg-white dark:bg-[#1c323c] dark:hover:bg-[#244855] ambient:bg-[#1f2937] ambient:hover:bg-[#374151] border border-[#e3d1ba] dark:border-[#2d5564] ambient:border-[#374151] text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc] transition-all disabled:opacity-50 shadow-sm"
                    title="Pull bookmarks from your GitHub Gist"
                  >
                    <CloudDownload className="w-3.5 h-3.5" />
                    Pull
                  </button>
                  <button
                    onClick={handlePush}
                    disabled={syncStatus === 'pushing' || syncStatus === 'pulling' || bookmarks.length === 0}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-[#E64833] ambient:bg-[#38bdf8] hover:opacity-90 text-white ambient:text-[#0f141c] border border-[#E64833] ambient:border-[#38bdf8] transition-all disabled:opacity-50 font-semibold shadow-sm"
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
                    : 'bg-[#E64833]/10 ambient:bg-[#38bdf8]/15 border-[#E64833]/25 ambient:border-[#38bdf8]/30 text-[#E64833] ambient:text-[#38bdf8]'
                }`}>
                  {syncIcon()}
                  <span className="flex-1">{syncMessage || (syncStatus === 'pushing' ? 'Syncing to GitHub Gist…' : 'Fetching from GitHub Gist…')}</span>
                  {gistUrl && (
                    <a href={gistUrl} target="_blank" rel="noreferrer" className="underline text-[#E64833] ambient:text-[#38bdf8] hover:opacity-80 flex items-center gap-1">
                      View Gist <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8]">
              <Cloud className="w-3.5 h-3.5 text-[#E64833] ambient:text-[#38bdf8]" />
              <span>Connect a GitHub Token to enable Gist Sync — back up your vault to GitHub</span>
            </div>
          )}
        </div>

        {/* ── Bookmark List ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {bookmarks.length === 0 ? (
            <div className="text-center py-12">
              <Bookmark className="w-12 h-12 text-[#874F41]/40 dark:text-[#90AEAD]/40 ambient:text-[#94a3b8]/40 mx-auto mb-3 opacity-60" />
              <h4 className="text-sm font-display font-semibold text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc]">Your Vault is Empty</h4>
              <p className="text-xs font-sans text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8] max-w-sm mx-auto mt-1">
                Click the bookmark icon on any project card to store it in your local OneGitVault.
              </p>
            </div>
          ) : (
            bookmarks.map((repo) => (
              <div
                key={repo.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#FAF0E4] hover:bg-white dark:bg-[#101b20] dark:hover:bg-[#132229] ambient:bg-[#0f141c] ambient:hover:bg-[#17202c] border border-[#e3d1ba] dark:border-[#203943] ambient:border-[#273548] hover:border-[#874F41]/40 dark:hover:border-[#356374] ambient:hover:border-[#38bdf8]/40 transition-all gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={repo.owner.avatar_url}
                    alt={repo.owner.login}
                    className="w-8 h-8 rounded-lg ring-1 ring-[#e3d1ba] dark:ring-[#244855] ambient:ring-[#273548] bg-[#FFF9F0] dark:bg-[#16272f] ambient:bg-[#161b22] flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-display font-bold text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc] hover:text-[#E64833] dark:hover:text-[#ff5c47] ambient:hover:text-[#38bdf8] flex items-center gap-1.5 truncate transition-colors"
                    >
                      <span>{repo.full_name}</span>
                      <ExternalLink className="w-3 h-3 text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8] flex-shrink-0" />
                    </a>
                    <p className="text-xs text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8] truncate max-w-md font-sans">
                      {repo.description || 'No description provided.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1 text-xs font-mono font-bold text-[#E64833] ambient:text-[#38bdf8] bg-[#E64833]/10 ambient:bg-[#38bdf8]/15 border border-[#E64833]/25 ambient:border-[#38bdf8]/30 px-2 py-0.5 rounded-md">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{repo.stargazers_count.toLocaleString()}</span>
                  </div>

                  <button
                    onClick={() => onRemoveBookmark(repo.id)}
                    className="p-1.5 text-[#874F41] hover:text-rose-600 hover:bg-rose-50 dark:text-[#90AEAD] dark:hover:text-rose-400 dark:hover:bg-rose-500/10 ambient:text-[#94a3b8] ambient:hover:text-rose-400 rounded-lg transition-colors"
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
        <div className="p-4 border-t border-[#e3d1ba] dark:border-[#244855] ambient:border-[#30363d] bg-[#FAF0E4] dark:bg-[#101b20] ambient:bg-[#0f141c] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono font-semibold text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc] hover:text-[#E64833] dark:hover:text-white ambient:hover:text-[#38bdf8] bg-[#FFF9F0] hover:bg-white dark:bg-[#1c323c] dark:hover:bg-[#244855] ambient:bg-[#1f2937] ambient:hover:bg-[#374151] border border-[#e3d1ba] dark:border-[#2d5564] ambient:border-[#374151] rounded-xl transition-colors shadow-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
