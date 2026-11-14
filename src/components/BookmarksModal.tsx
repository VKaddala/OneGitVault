import React from 'react';
import { Bookmark, X, ExternalLink, Trash2, Star } from 'lucide-react';
import { Repository } from '../types';

interface BookmarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: Repository[];
  onRemoveBookmark: (id: number | string) => void;
  onClearAll: () => void;
}

export const BookmarksModal: React.FC<BookmarksModalProps> = ({
  isOpen,
  onClose,
  bookmarks,
  onRemoveBookmark,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-[#111217] border border-[#242634] rounded-2xl shadow-2xl flex flex-col text-charcoal-100 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#20212b]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-brand">
              <Bookmark className="w-5 h-5 fill-amber-brand" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-white">Repository Vault</h3>
              <p className="text-xs font-mono text-charcoal-400">{bookmarks.length} bookmarked repositories</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {bookmarks.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs font-mono text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                Clear Vault
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-charcoal-400 hover:text-white rounded-lg hover:bg-[#1a1c26] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {bookmarks.length === 0 ? (
            <div className="text-center py-12">
              <Bookmark className="w-12 h-12 text-charcoal-500 mx-auto mb-3 opacity-40" />
              <h4 className="text-sm font-display font-semibold text-charcoal-300">Your Vault is Empty</h4>
              <p className="text-xs font-sans text-charcoal-400 max-w-sm mx-auto mt-1">
                Click the bookmark icon on any project card to store it in your local OneGitVault.
              </p>
            </div>
          ) : (
            bookmarks.map((repo) => (
              <div
                key={repo.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#161720] border border-[#242634] hover:border-[#2f3244] transition-all gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={repo.owner.avatar_url}
                    alt={repo.owner.login}
                    className="w-8 h-8 rounded-lg bg-[#20212b] flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-display font-bold text-white hover:text-amber-brand flex items-center gap-1.5 truncate"
                    >
                      <span>{repo.full_name}</span>
                      <ExternalLink className="w-3 h-3 text-charcoal-400" />
                    </a>
                    <p className="text-xs text-charcoal-400 truncate max-w-md font-sans">
                      {repo.description || 'No description'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-brand bg-amber-500/10 px-2 py-0.5 rounded-md">
                    <Star className="w-3 h-3 fill-amber-brand" />
                    <span>{repo.stargazers_count.toLocaleString()}</span>
                  </div>

                  <button
                    onClick={() => onRemoveBookmark(repo.id)}
                    className="p-1.5 text-charcoal-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Remove from vault"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#20212b] bg-[#0e0f13] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono font-semibold text-charcoal-300 hover:text-white bg-[#1a1c26] hover:bg-[#222432] rounded-xl transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
