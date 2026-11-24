import React, { useState, useEffect, useCallback } from 'react';
import { 
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
  Key,
  BookOpen
} from 'lucide-react';
import { Repository } from '../types';
import { pushBookmarksToGist, pullBookmarksFromGist, fetchUserStarredRepositories } from '../services/gistSync';
import { storageService } from '../services/storage';

export type VaultTab = 'bookmarks' | 'starred';

interface VaultViewProps {
  bookmarks: Repository[];
  onRemoveBookmark: (repoId: number | string) => void;
  onClearAll: () => void;
  onImportBookmarks: (bookmarks: Repository[]) => void;
  onSelectRepo: (repo: Repository) => void;
  isStarred?: (fullName: string) => boolean;
  onToggleStar?: (repo: Repository) => void;
  onOpenTokenModal?: () => void;
}

export const VaultView: React.FC<VaultViewProps> = ({
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
  const [searchQuery, setSearchQuery] = useState<string>('');
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

  useEffect(() => {
    if (activeTab === 'starred' && !starredLoaded && hasToken) {
      loadStarred();
    }
  }, [activeTab, starredLoaded, hasToken, loadStarred]);

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

  const currentList = activeTab === 'bookmarks' ? bookmarks : starredList;
  const filteredList = currentList.filter((repo) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      repo.name.toLowerCase().includes(q) ||
      repo.full_name.toLowerCase().includes(q) ||
      (repo.description && repo.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full max-w-[2400px] mx-auto px-3 sm:px-5 lg:px-6 py-4 flex flex-col gap-4 animate-fadeIn">
      {/* ── Banner Header with Tabs ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-surface border border-themeline shadow-sm">
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-display font-bold transition-all ${
              activeTab === 'bookmarks'
                ? 'bg-action text-txt-inverse shadow-md'
                : 'bg-surface-active hover:bg-surface text-txt-primary border border-themeline'
            }`}
          >
            <Bookmark className="w-4 h-4 fill-current" />
            <span>Vault Bookmarks ({bookmarks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('starred')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-display font-bold transition-all ${
              activeTab === 'starred'
                ? 'bg-action text-txt-inverse shadow-md'
                : 'bg-surface-active hover:bg-surface text-txt-primary border border-themeline'
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
              className="text-xs font-mono text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/30 transition-colors"
            >
              Clear Vault
            </button>
          )}

          {activeTab === 'starred' && hasToken && (
            <button
              onClick={loadStarred}
              disabled={isLoadingStarred}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-active hover:bg-surface text-txt-primary border border-themeline text-xs font-mono transition-colors"
              title="Refresh Starred Repositories"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStarred ? 'animate-spin text-action' : 'text-action'}`} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Sub-header: Cloud Sync / Search ── */}
      {activeTab === 'bookmarks' ? (
        <div className="p-4 rounded-xl border border-themeline bg-surface shadow-sm">
          {hasToken ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs font-mono text-txt-muted">
                  <Cloud className="w-4 h-4 text-action" />
                  <span className="font-semibold text-txt-primary">GitHub Gist Cloud Sync</span>
                  <span className="text-txt-muted hidden sm:inline">— syncs seamlessly with OneGitVault Android</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePull}
                    disabled={syncStatus === 'pushing' || syncStatus === 'pulling'}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-surface-active hover:bg-surface border border-themeline text-txt-primary transition-all disabled:opacity-50 shadow-sm"
                    title="Pull bookmarks from your GitHub Gist"
                  >
                    <CloudDownload className="w-3.5 h-3.5 text-action" />
                    <span>Pull from Gist</span>
                  </button>
                  <button
                    onClick={handlePush}
                    disabled={syncStatus === 'pushing' || syncStatus === 'pulling' || bookmarks.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-action hover:opacity-90 text-txt-inverse border border-action transition-all disabled:opacity-50 font-semibold shadow-sm"
                    title="Push bookmarks to GitHub Gist"
                  >
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>Push to Gist</span>
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
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs font-mono text-txt-muted">
                <Cloud className="w-4 h-4 text-action" />
                <span>Connect your GitHub Token to sync your Vault with Gist and mobile</span>
              </div>
              {onOpenTokenModal && (
                <button
                  onClick={onOpenTokenModal}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono bg-action text-txt-inverse rounded-lg font-semibold hover:opacity-90 transition-all shadow-sm"
                >
                  <Key className="w-3.5 h-3.5" /> Connect Token
                </button>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* ── Search filter row ── */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-surface border border-themeline rounded-xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
          <input
            type="text"
            placeholder={activeTab === 'bookmarks' ? 'Filter vault bookmarks...' : 'Filter starred repositories...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-active border border-themeline rounded-lg text-txt-primary focus:outline-none focus:border-action transition-all placeholder:text-txt-muted/60"
          />
        </div>
        <span className="text-xs font-mono text-txt-muted">
          Showing {filteredList.length} of {currentList.length} repositories
        </span>
      </div>

      {/* ── Content List ── */}
      <div className="space-y-3 pb-16">
        {activeTab === 'bookmarks' ? (
          bookmarks.length === 0 ? (
            <div className="text-center py-20 bg-surface border border-themeline rounded-2xl p-8 my-4">
              <Bookmark className="w-12 h-12 text-txt-muted/30 mx-auto mb-3" />
              <h4 className="text-base font-display font-semibold text-txt-primary">Your Vault is Empty</h4>
              <p className="text-xs font-sans text-txt-muted max-w-sm mx-auto mt-1">
                Click the bookmark icon on any project card to store it in your Vault and sync to Gist.
              </p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-16 bg-surface border border-themeline rounded-2xl p-8">
              <p className="text-xs font-mono text-txt-muted">No bookmarks matched your search keyword.</p>
            </div>
          ) : (
            filteredList.map((repo) => (
              <div
                key={repo.id}
                onClick={() => onSelectRepo(repo)}
                className="flex items-center justify-between p-4 rounded-xl bg-surface hover:bg-surface-hover border border-themeline hover:border-action-border transition-all gap-4 cursor-pointer group shadow-sm"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <img
                    src={repo.owner.avatar_url}
                    alt={repo.owner.login}
                    className="w-10 h-10 rounded-xl ring-1 ring-themeline bg-surface-active flex-shrink-0 shadow-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-display font-bold text-txt-primary group-hover:text-action flex items-center gap-1.5 truncate transition-colors">
                      <span>{repo.full_name}</span>
                    </div>
                    <p className="text-xs text-txt-secondary truncate max-w-xl font-sans mt-0.5">
                      {repo.description || 'No description provided.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onSelectRepo(repo)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-active hover:bg-surface border border-themeline hover:border-action-border text-xs font-mono text-txt-primary hover:text-action transition-all shadow-sm"
                    title="Inspect README and details"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-action" />
                    <span>README</span>
                  </button>

                  <button
                    onClick={(e) => handleCopyClone(e, repo)}
                    className="p-2 text-txt-muted hover:text-txt-primary hover:bg-surface-active rounded-xl border border-themeline transition-colors text-xs font-mono flex items-center gap-1"
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
                    className="p-2 text-txt-muted hover:text-txt-primary hover:bg-surface-active border border-themeline rounded-xl transition-colors"
                    title="Open on GitHub"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <div className="flex items-center gap-1 text-xs font-mono font-bold text-star bg-star-bg border border-star-border px-2.5 py-1 rounded-lg">
                    <Star className="w-3 h-3 fill-current text-star" />
                    <span>{repo.stargazers_count.toLocaleString()}</span>
                  </div>

                  <button
                    onClick={() => onRemoveBookmark(repo.id)}
                    className="p-2 text-txt-muted hover:text-rose-500 hover:bg-rose-500/10 border border-themeline hover:border-rose-500/30 rounded-xl transition-colors"
                    title="Remove from vault"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )
        ) : (
          !hasToken ? (
            <div className="text-center py-20 bg-surface border border-themeline rounded-2xl p-8 my-4">
              <Star className="w-12 h-12 text-star mx-auto mb-3 opacity-60" />
              <h4 className="text-base font-display font-semibold text-txt-primary">Connect GitHub Token</h4>
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
            <div className="text-center py-20">
              <Loader2 className="w-8 h-8 text-action animate-spin mx-auto mb-2" />
              <p className="text-xs font-mono text-txt-muted">Fetching your starred repositories from GitHub...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-16 bg-surface border border-themeline rounded-2xl p-8">
              <Star className="w-12 h-12 text-txt-muted/30 mx-auto mb-3" />
              <h4 className="text-sm font-display font-semibold text-txt-primary">
                {searchQuery ? 'No matching starred repositories' : 'No starred repositories found'}
              </h4>
              <p className="text-xs font-sans text-txt-muted max-w-sm mx-auto mt-1">
                Star repositories across GitHub or in OneGitVault to see them appear here.
              </p>
            </div>
          ) : (
            filteredList.map((repo) => {
              const starred = isStarred ? isStarred(repo.full_name) : true;
              return (
                <div
                  key={repo.id}
                  onClick={() => onSelectRepo(repo)}
                  className="flex items-center justify-between p-4 rounded-xl bg-surface hover:bg-surface-hover border border-themeline hover:border-action-border transition-all gap-4 cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <img
                      src={repo.owner.avatar_url}
                      alt={repo.owner.login}
                      className="w-10 h-10 rounded-xl ring-1 ring-themeline bg-surface-active flex-shrink-0 shadow-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-display font-bold text-txt-primary group-hover:text-action flex items-center gap-1.5 truncate transition-colors">
                        <span>{repo.full_name}</span>
                      </div>
                      <p className="text-xs text-txt-secondary truncate max-w-xl font-sans mt-0.5">
                        {repo.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onSelectRepo(repo)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-active hover:bg-surface border border-themeline hover:border-action-border text-xs font-mono text-txt-primary hover:text-action transition-all shadow-sm"
                      title="Inspect README and details"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-action" />
                      <span>README</span>
                    </button>

                    <button
                      onClick={(e) => handleCopyClone(e, repo)}
                      className="p-2 text-txt-muted hover:text-txt-primary hover:bg-surface-active rounded-xl border border-themeline transition-colors text-xs font-mono flex items-center gap-1"
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
                      className="p-2 text-txt-muted hover:text-txt-primary hover:bg-surface-active border border-themeline rounded-xl transition-colors"
                      title="Open on GitHub"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {onToggleStar && (
                      <button
                        onClick={() => onToggleStar(repo)}
                        className={`flex items-center gap-1 text-xs font-mono font-bold px-3 py-1 rounded-lg border transition-all ${
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
    </div>
  );
};
