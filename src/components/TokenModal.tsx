import React, { useState } from 'react';
import { Key, ShieldCheck, ExternalLink, X, Info, Check } from 'lucide-react';
import { getStoredToken, setStoredToken, RateLimitInfo } from '../services/githubApi';

interface TokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  rateLimit: RateLimitInfo;
  onTokenUpdated: () => void;
}

export const TokenModal: React.FC<TokenModalProps> = ({
  isOpen,
  onClose,
  rateLimit,
  onTokenUpdated,
}) => {
  const [tokenInput, setTokenInput] = useState(getStoredToken());
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setStoredToken(tokenInput.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onTokenUpdated();
      onClose();
    }, 1000);
  };

  const handleClear = () => {
    setTokenInput('');
    setStoredToken('');
    onTokenUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-surface border border-themeline rounded-2xl shadow-2xl p-6 text-txt-primary transition-colors duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-txt-muted hover:text-txt-primary rounded-lg hover:bg-surface-active transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-action-soft border border-action-border text-action">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display text-base sm:text-lg font-bold text-txt-primary">GitHub API Access</h3>
            <p className="text-xs font-mono text-txt-muted">Boost search rate limit from 60 to 5,000 req/hr</p>
          </div>
        </div>

        {/* Current status */}
        <div className="mb-4 p-3 bg-surface-active rounded-xl border border-themeline text-xs font-mono">
          <div className="flex justify-between items-center mb-1">
            <span className="text-txt-muted">Current Quota:</span>
            <span className="font-bold text-txt-primary">{rateLimit.remaining} / {rateLimit.limit} req/hr</span>
          </div>
          <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden mt-1.5 border border-themeline">
            <div 
              className="bg-action h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (rateLimit.remaining / rateLimit.limit) * 100)}%` }}
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-3 mb-5">
          <div className="flex items-start gap-2 text-xs text-txt-secondary font-sans">
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <p>
              Your token is stored <strong>locally only</strong> in your computer's browser storage. It is never transmitted anywhere other than direct queries to <code className="text-action font-mono text-[11px]">api.github.com</code>.
            </p>
          </div>

          <div className="p-3 bg-surface-active rounded-xl border border-themeline text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-txt-primary mb-1">
              <Info className="w-3.5 h-3.5 text-action" />
              <span>Recommended Permissions:</span>
            </div>
            <p className="text-txt-muted text-[11px] leading-relaxed">
              Create a <strong>Fine-grained</strong> or <strong>Classic</strong> token with <code className="text-action font-mono">public_repo</code> (read-only) and <code className="text-action font-mono">gist</code> (for bookmark sync) scopes.
            </p>
            <a
              href="https://github.com/settings/tokens/new?description=OneGitVault&scopes=public_repo,gist"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-mono text-action hover:opacity-80 font-medium mt-2 underline"
            >
              <span>Generate token on GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Input Form */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-mono text-txt-muted mb-1.5">
              Personal Access Token (PAT)
            </label>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx or github_pat_xxxx"
              className="w-full px-3 py-2 text-xs font-mono bg-surface border border-themeline rounded-xl text-txt-primary placeholder-txt-muted/50 focus:outline-none focus:border-action transition-colors"
            />
          </div>

          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-500 animate-fadeIn">
              <Check className="w-4 h-4" />
              <span>Token saved successfully!</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleClear}
              type="button"
              className="text-xs font-mono text-txt-muted hover:text-rose-500 transition-colors"
            >
              Clear Token
            </button>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                type="button"
                className="px-3 py-1.5 text-xs font-mono text-txt-muted hover:text-txt-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                type="button"
                className="px-4 py-1.5 text-xs font-mono font-bold text-txt-inverse bg-action hover:opacity-90 rounded-xl shadow-md transition-all active:scale-95"
              >
                Save Token
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
