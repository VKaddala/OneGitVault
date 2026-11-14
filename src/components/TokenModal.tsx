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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#111217] border border-[#242634] rounded-2xl shadow-2xl p-6 text-charcoal-100">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-charcoal-400 hover:text-white rounded-lg hover:bg-[#1a1c26] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-brand">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display text-base sm:text-lg font-bold text-white">GitHub API Access</h3>
            <p className="text-xs font-mono text-charcoal-400">Boost search rate limit from 60 to 5,000 req/hr</p>
          </div>
        </div>

        {/* Current status */}
        <div className="mb-4 p-3 bg-[#161720] rounded-xl border border-[#242634] text-xs font-mono">
          <div className="flex justify-between items-center mb-1">
            <span className="text-charcoal-400">Current Quota:</span>
            <span className="font-bold text-white">{rateLimit.remaining} / {rateLimit.limit} req/hr</span>
          </div>
          <div className="w-full bg-[#20212b] h-1.5 rounded-full overflow-hidden mt-1.5">
            <div 
              className="bg-amber-brand h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (rateLimit.remaining / rateLimit.limit) * 100)}%` }}
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-3 mb-5">
          <div className="flex items-start gap-2 text-xs text-charcoal-300 font-sans">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p>
              Your token is stored <strong className="text-white">only in local storage on this computer</strong>. It is never transmitted anywhere other than GitHub.
            </p>
          </div>

          <div className="flex items-start gap-2 text-xs text-charcoal-300 font-sans">
            <Info className="w-4 h-4 text-amber-brand flex-shrink-0 mt-0.5" />
            <p>
              Use a fine-grained token with zero scopes (public repo read only).
            </p>
          </div>

          <a
            href="https://github.com/settings/tokens?type=beta"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-amber-brand hover:text-amber-glow underline"
          >
            <span>Create a GitHub Personal Access Token</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Token Input */}
        <div className="mb-5">
          <label className="block text-xs font-mono text-charcoal-300 mb-1.5">
            Personal Access Token (PAT)
          </label>
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            className="w-full px-3.5 py-2.5 text-xs bg-[#161720] text-charcoal-100 placeholder-charcoal-400 rounded-xl border border-[#242634] focus:border-amber-brand/60 focus:ring-2 focus:ring-amber-500/15 focus:outline-none font-mono"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between gap-3">
          {tokenInput && (
            <button
              onClick={handleClear}
              className="px-3 py-2 text-xs font-mono text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors"
            >
              Clear Token
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono text-charcoal-300 hover:text-white hover:bg-[#1a1c26] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-bold text-[#0c0d10] bg-amber-brand hover:bg-amber-glow rounded-xl shadow-md transition-all"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-[#0c0d10]" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Token</span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
