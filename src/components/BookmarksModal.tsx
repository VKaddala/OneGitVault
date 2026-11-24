import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  X, 
  Trash2, 
  ExternalLink, 
  Star, 
  Bookmark, 
  Cloud, 
  CloudUpload, 
  CloudDownload, 
  Check, 
  AlertCircle, 
  Loader2,
  Search,
  Copy,
  RefreshCw,
  Key
} from 'lucide-react';
import { Repository } from '../types';
import { pushBookmarksToGist, pullBookmarksFromGist, fetchUserStarredRepositories } from '../services/gistSync';
import { storageService } from '../services/storage';

export type VaultTab = 'bookmarks' | 'starred';

interface BookmarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: Repository[];
  onRemoveBookmark: (repoId: number | string) => void;
  onClearAll: () => void;
  onImportBookmarks: (bookmarks: Repository[]) => void;
  onSelectRepo?: (repo: Repository) => void;
  isStarred?: (fullName: string) => boolean;
  onToggleStar?: (repo: Repository) => void;
  onOpenTokenModal?: () => void;
}

export const BookmarksModal: React.FC<BookmarksModalProps> = ({
  isOpen,
  onClose,
  bookmarks,
  onRemoveBookmark,
  onClearAll,
  onImportBookmarks,
  onSelectRepo,
  isStarred,
  onToggleStar,
  onOpenTokenModal,
}) => {
  const [activeTab, setActiveTab] = useState<VaultTab>('bookmarks');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'pushing' | 'pulling' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [gistUrl, setGistUrl] = useState<string>('');

  // Starred Repositories State
  const [starredList, setStarredList] = useState<Repository[]>([]);
  const [isLoadingStarred, setIsLoadingStarred] = useState<boolean>(false);
  const [starredLoaded, setStarredLoaded] = useState<boolean>(false);
  const [starredSearch, setStarredSearch] = useState<string>('');
  const [copiedCloneId, setCopiedCloneId] = useState<number | string | null>(null);

  const hasToken = Boolean(storageService.getGithubToken());

  // Load Starred Repositories
  const loadStarred = useCallback(async () => {
    const token = storageService.getGithubToken();
    if (!token) return;
    setIsLoadingStarred(true);
    try {
      const items = await fetchUserStarredRepositories(token, 1, 100);
      setStarredList(items);
      setStarredLoaded(true);
    } catch (e) {
      console.warn('Failed to load starred repos in desktop:', e);
    } finally {
      setIsLoadingStarred(false);
    }
  }, []);

  // Fetch starred repos when tab is selected or opened
  useEffect(() => {
    if (isOpen && activeTab === 'starred' && !starredLoaded && hasToken) {
      loadStarred();
    }
  }, [isOpen, activeTab, starredLoaded, hasToken, loadStarred]);

  if (!isOpen) return null;

  const handlePush = async () => {
    const token = storageService.getGithubToken();
    if (!token) {
      setSyncStatus('error');
      setSyncMessage('No GitHub token configured');
      return;
    }
    setSyncStatus('pushing');
    setSyncMessage('');
    try {
      const url = await pushBookmarksToGist(token, bookmarks);
      if (url) {
        setSyncStatus('success');
        setSyncMessage(`Successfully backed up ${bookmarks.length} repos to Gist!`);
        setGistUrl(url);
      } else {
        setSyncStatus('error');
        setSyncMessage('Failed to sync to Gist');
      }
    } catch {
      setSyncStatus('error');
      setSyncMessage('Network error occurred during backup');
    }
  };

  const handlePull = async () => {
    const token = storageService.getGithubToken();
    if (!token) {
      setSyncStatus('error');
      setSyncMessage('No GitHub token configured');
      return;
    }
    setSyncStatus('pulling');
    setSyncMessage('');
    try {
      const pulled = await pullBookmarksFromGist(token);
      if (pulled) {
        onImportBookmarks(pulled);
        setSyncStatus('success');
        setSyncMessage(`Restored ${pulled.length} repos from Gist!`);
      } else {
        setSyncStatus('error');
        setSyncMessage('No backup found or pull failed');
      }
    } catch {
      setSyncStatus('error');
      setSyncMessage('Network error occurred during restore');
    }
  };

  const syncIcon = () => {
    if (syncStatus === 'pushing' || syncStatus === 'pulling')
      return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
    if (syncStatus === 'success') return <Check className="w-3.5 h-3.5 text-emerald-500" />;
    if (syncStatus === 'error') return <AlertCircle className="w-3.5 h-3.5 text-rose-500" />;
    return null;
  };

  const handleCopyClone = (e: React.MouseEvent, repo: Repository) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${repo.html_url}.git`);
    setCopiedCloneId(repo.id);
    setTimeout(() => setCopiedCloneId(null), 2000);
  };

  const filteredStarred = starredList.filter((repo) => {
    if (!starredSearch.trim()) return true;
    const q = starredSearch.toLowerCase();
    return (
      repo.name.toLowerCase().includes(q) ||
      repo.full_name.toLowerCase().includes(q) ||
      (repo.description && repo.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-surface border border-themeline rounded-2xl shadow-2xl flex flex-col text-txt-primary overflow-hidden transition-colors duration-200">

        {/* ── Header with Dual Tabs ── */}
        <div className="flex items-center justify-between p-4 border-b border-themeline bg-surface-active">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-display font-bold transition-all ${
                activeTab === 'bookmarks'
                  ? 'bg-action text-txt-inverse shadow-md'
                  : 'text-txt-muted hover:text-txt-primary hover:bg-surface'
              }`}
            >
              <Bookmark className="w-4 h-4 fill-current" />
              <span>Vault Bookmarks ({bookmarks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('starred')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-display font-bold transition-all ${
                activeTab === 'starred'
                  ? 'bg-action text-txt-inverse shadow-md'
                  : 'text-txt-muted hover:text-txt-primary hover:bg-surface'
              }`}
            >
              <Star className="w-4 h-4 fill-current text-star" />
              <span>GitHub Starred {starredLoaded ? `(${starredList.length})` : ''}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'bookmarks' && bookmarks.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs font-mono text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                Clear Vault
              </button>
            )}

            {activeTab === 'starred' && hasToken && (
              <button
                onClick={loadStarred}
                disabled={isLoadingStarred}
                className="p-1.5 text-txt-muted hover:text-txt-primary hover:bg-surface rounded-lg transition-colors"
                title="Refresh Starred Repositories"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingStarred ? 'animate-spin text-action' : ''}`} />
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

        {/* ── Sub-header / Banner depending on Tab ── */}
        {activeTab === 'bookmarks' ? (
          /* GitHub Gist Sync Banner */
          <div className={`px-5 py-3 border-b border-themeline ${hasToken ? 'bg-surface-active' : 'bg-surface-active opacity-85'}`}>
            {hasToken ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-xs font-mono text-txt-muted">
                    <Cloud className="w-3.5 h-3.5 text-action" />
                    <span className="font-semibold text-txt-primary">GitHub Gist Cloud Sync</span>
                    <span className="text-txt-muted/70 hidden sm:inline">— syncs seamlessly with Android app</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handlePull}
                      disabled={syncStatus === 'pushing' || syncStatus === 'pulling'}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-surface hover:bg-surface-hover border border-themeline text-txt-primary transition-all disabled:opacity-50 shadow-sm"
                      title="Pull bookmarks from your GitHub Gist"
                    >
                      <CloudDownload className="w-3.5 h-3.5 text-action" />
                      Pull from Gist
                    </button>
                    <button
                      onClick={handlePush}
                      disabled={syncStatus === 'pushing' || syncStatus === 'pulling' || bookmarks.length === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-action hover:opacity-90 text-txt-inverse border border-action transition-all disabled:opacity-50 font-semibold shadow-sm"
                      title="Push bookmarks to GitHub Gist"
                    >
                      <CloudUpload className="w-3.5 h-3.5" />
                      Push to Gist
                    </button>
                  </div>
                </div>

                {/* Sync status feedback */}
                {syncStatus !== 'idle' && (
                  <div className={`flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-lg border ${
                    syncStatus === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500'
                      : syncStatus === 'error'
                      ? 'bg-rose-500/10 border-rose-500/25 text-rose-500'
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
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-mono text-txt-muted">
                  <Cloud className="w-3.5 h-3.5 text-action" />
                  <span>Connect your GitHub Token to sync bookmarks with Gist and mobile</span>
                </div>
                {onOpenTokenModal && (
                  <button
                    onClick={onOpenTokenModal}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono bg-action text-txt-inverse rounded-lg font-semibold hover:opacity-90 transition-all shadow-sm"
                  >
                    <Key className="w-3 h-3" /> Connect Token
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Starred Repos Search Filter Banner */
          <div className="px-5 py-2.5 border-b border-themeline bg-surface-active flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
              <input
                type="text"
                placeholder="Filter starred repositories..."
                value={starredSearch}
                onChange={(e) => setStarredSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-themeline rounded-lg text-txt-primary focus:outline-none focus:border-action transition-all placeholder:text-txt-muted/60"
              />
            </div>
            {!hasToken && onOpenTokenModal && (
              <button
                onClick={onOpenTokenModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-action text-txt-inverse rounded-lg font-semibold hover:opacity-90 transition-all shadow-sm flex-shrink-0"
              >
                <Key className="w-3 h-3" /> Connect PAT Token
              </button>
            )}
          </div>
        )}

        {/* ── Content Body ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {activeTab === 'bookmarks' ? (
            /* Bookmarks List */
            bookmarks.length === 0 ? (
              <div className="text-center py-12">
                <Bookmark className="w-12 h-12 text-txt-muted/40 mx-auto mb-3 opacity-60" />
                <h4 className="text-sm font-display font-semibold text-txt-primary">Your Vault is Empty</h4>
                <p className="text-xs font-sans text-txt-muted max-w-sm mx-auto mt-1">
                  Click the bookmark icon on any project card to store it in your local OneGitVault and sync to Gist.
                </p>
              </div>
            ) : (
              bookmarks.map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => onSelectRepo && onSelectRepo(repo)}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-surface-active hover:bg-surface border border-themeline hover:border-action-border transition-all gap-4 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={repo.owner.avatar_url}
                      alt={repo.owner.login}
                      className="w-8 h-8 rounded-lg ring-1 ring-themeline bg-surface flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-display font-bold text-txt-primary group-hover:text-action flex items-center gap-1.5 truncate transition-colors">
                        <span>{repo.full_name}</span>
                      </div>
                      <p className="text-xs text-txt-muted truncate max-w-md font-sans">
                        {repo.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleCopyClone(e, repo)}
                      className="p-1.5 text-txt-muted hover:text-txt-primary hover:bg-surface rounded-lg transition-colors text-xs font-mono flex items-center gap-1"
                      title="Copy git clone"
                    >
                      {copiedCloneId === repo.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-txt-muted hover:text-txt-primary hover:bg-surface rounded-lg transition-colors"
                      title="Open on GitHub"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <div className="flex items-center gap-1 text-xs font-mono font-bold text-star bg-star-bg border border-star-border px-2 py-0.5 rounded-md">
                      <Star className="w-3 h-3 fill-current text-star" />
                      <span>{repo.stargazers_count.toLocaleString()}</span>
                    </div>

                    <button
                      onClick={() => onRemoveBookmark(repo.id)}
                      className="p-1.5 text-txt-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Remove from vault"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            /* Starred Repos List */
            !hasToken ? (
              <div className="text-center py-12">
                <Star className="w-12 h-12 text-star mx-auto mb-3 opacity-60" />
                <h4 className="text-sm font-display font-semibold text-txt-primary">Connect GitHub Token</h4>
                <p className="text-xs font-sans text-txt-muted max-w-sm mx-auto mt-1 mb-4">
                  Add a personal access token with public_repo scope to browse and synchronize your GitHub starred repositories.
                </p>
                {onOpenTokenModal && (
                  <button
                    onClick={onOpenTokenModal}
                    className="px-4 py-2 text-xs font-mono font-semibold bg-action text-txt-inverse rounded-xl shadow-md hover:opacity-90 transition-all inline-flex items-center gap-2"
                  >
                    <Key className="w-4 h-4" /> Connect Token
                  </button>
                )}
              </div>
            ) : isLoadingStarred ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 text-action animate-spin mx-auto mb-2" />
                <p className="text-xs font-mono text-txt-muted">Fetching your starred repositories from GitHub...</p>
              </div>
            ) : filteredStarred.length === 0 ? (
              <div className="text-center py-12">
                <Star className="w-12 h-12 text-txt-muted/40 mx-auto mb-3 opacity-60" />
                <h4 className="text-sm font-display font-semibold text-txt-primary">
                  {starredSearch ? 'No matching starred repositories' : 'No starred repositories found'}
                </h4>
                <p className="text-xs font-sans text-txt-muted max-w-sm mx-auto mt-1">
                  Star repositories across GitHub or in OneGitVault to see them appear here.
                </p>
              </div>
            ) : (
              filteredStarred.map((repo) => {
                const starred = isStarred ? isStarred(repo.full_name) : true;
                return (
                  <div
                    key={repo.id}
                    onClick={() => onSelectRepo && onSelectRepo(repo)}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-surface-active hover:bg-surface border border-themeline hover:border-action-border transition-all gap-4 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={repo.owner.avatar_url}
                        alt={repo.owner.login}
                        className="w-8 h-8 rounded-lg ring-1 ring-themeline bg-surface flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-display font-bold text-txt-primary group-hover:text-action flex items-center gap-1.5 truncate transition-colors">
                          <span>{repo.full_name}</span>
                        </div>
                        <p className="text-xs text-txt-muted truncate max-w-md font-sans">
                          {repo.description || 'No description provided.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleCopyClone(e, repo)}
                        className="p-1.5 text-txt-muted hover:text-txt-primary hover:bg-surface rounded-lg transition-colors text-xs font-mono flex items-center gap-1"
                        title="Copy git clone"
                      >
                        {copiedCloneId === repo.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-txt-muted hover:text-txt-primary hover:bg-surface rounded-lg transition-colors"
                        title="Open on GitHub"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      {onToggleStar && (
                        <button
                          onClick={() => onToggleStar(repo)}
                          className={`flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-md border transition-all ${
                            starred
                              ? 'text-star bg-star-bg border-star-border hover:bg-star-bg/80'
                              : 'text-txt-muted bg-surface border-themeline hover:text-star hover:border-star-border'
                          }`}
                          title={starred ? 'Unstar repository' : 'Star repository'}
                        >
                          <Star className={`w-3 h-3 ${starred ? 'fill-current text-star' : ''}`} />
                          <span>{repo.stargazers_count.toLocaleString()}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>

        {/* ── Footer ── */}
        <div className="p-4 border-t border-themeline bg-surface-active flex items-center justify-between">
          <span className="text-[11px] font-mono text-txt-muted">
            {activeTab === 'bookmarks'
              ? `${bookmarks.length} repos in Vault`
              : `${starredList.length} starred on GitHub`}
          </span>
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
