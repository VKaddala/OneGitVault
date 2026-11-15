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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#FFF9F0] dark:bg-[#16272f] ambient:bg-[#161b22] border border-[#e3d1ba] dark:border-[#244855] ambient:border-[#30363d] rounded-2xl shadow-2xl p-6 text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc] transition-colors duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-[#874F41] hover:text-[#244855] rounded-lg hover:bg-[#F2DFCA] dark:text-[#90AEAD] dark:hover:text-white dark:hover:bg-[#1c323c] ambient:text-[#94a3b8] ambient:hover:text-white ambient:hover:bg-[#1f2937] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-[#E64833]/10 ambient:bg-[#38bdf8]/15 border border-[#E64833]/25 ambient:border-[#38bdf8]/30 text-[#E64833] ambient:text-[#38bdf8]">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display text-base sm:text-lg font-bold text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc]">GitHub API Access</h3>
            <p className="text-xs font-mono text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8]">Boost search rate limit from 60 to 5,000 req/hr</p>
          </div>
        </div>

        {/* Current status */}
        <div className="mb-4 p-3 bg-[#FAF0E4] dark:bg-[#101b20] ambient:bg-[#0f141c] rounded-xl border border-[#e3d1ba] dark:border-[#203943] ambient:border-[#273548] text-xs font-mono">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8]">Current Quota:</span>
            <span className="font-bold text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc]">{rateLimit.remaining} / {rateLimit.limit} req/hr</span>
          </div>
          <div className="w-full bg-[#ebd7be] dark:bg-[#203943] ambient:bg-[#273548] h-1.5 rounded-full overflow-hidden mt-1.5">
            <div 
              className="bg-[#E64833] ambient:bg-[#38bdf8] h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (rateLimit.remaining / rateLimit.limit) * 100)}%` }}
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-3 mb-5">
          <div className="flex items-start gap-2 text-xs text-[#244855]/90 dark:text-[#90AEAD] ambient:text-[#94a3b8] font-sans">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <p>
              Your token is stored <strong>locally only</strong> in your computer's browser storage. It is never transmitted anywhere other than direct queries to <code className="text-[#E64833] ambient:text-[#38bdf8] font-mono text-[11px]">api.github.com</code>.
            </p>
          </div>

          <div className="p-3 bg-[#FAF0E4]/80 dark:bg-[#101b20] ambient:bg-[#0f141c] rounded-xl border border-[#e3d1ba] dark:border-[#203943] ambient:border-[#273548] text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc] mb-1">
              <Info className="w-3.5 h-3.5 text-[#E64833] ambient:text-[#38bdf8]" />
              <span>Recommended Permissions:</span>
            </div>
            <p className="text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8] text-[11px] leading-relaxed">
              Create a <strong>Fine-grained</strong> or <strong>Classic</strong> token with <code className="text-[#E64833] ambient:text-[#38bdf8] font-mono">public_repo</code> (read-only) and <code className="text-[#E64833] ambient:text-[#38bdf8] font-mono">gist</code> (for bookmark sync) scopes.
            </p>
            <a
              href="https://github.com/settings/tokens/new?description=OneGitVault&scopes=public_repo,gist"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-mono text-[#E64833] ambient:text-[#38bdf8] hover:opacity-80 font-medium mt-2 underline"
            >
              <span>Generate token on GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Input Form */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-mono text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8] mb-1.5">
              Personal Access Token (PAT)
            </label>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx or github_pat_xxxx"
              className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-[#101b20] ambient:bg-[#0f141c] border border-[#e3d1ba] dark:border-[#244855] ambient:border-[#273548] rounded-xl text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc] placeholder-[#874F41]/50 dark:placeholder-[#90AEAD]/50 ambient:placeholder-[#94a3b8]/50 focus:outline-none focus:border-[#E64833] ambient:focus:border-[#38bdf8] transition-colors"
            />
          </div>

          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 animate-fadeIn">
              <Check className="w-4 h-4" />
              <span>Token saved successfully!</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleClear}
              type="button"
              className="text-xs font-mono text-[#874F41] hover:text-rose-600 dark:text-[#90AEAD] dark:hover:text-rose-400 ambient:text-[#94a3b8] ambient:hover:text-rose-400 transition-colors"
            >
              Clear Token
            </button>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                type="button"
                className="px-3 py-1.5 text-xs font-mono text-[#874F41] hover:text-[#244855] dark:text-[#90AEAD] dark:hover:text-white ambient:text-[#94a3b8] ambient:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                type="button"
                className="px-4 py-1.5 text-xs font-mono font-bold text-white ambient:text-[#0f141c] bg-[#E64833] hover:bg-[#c73a27] ambient:bg-[#38bdf8] ambient:hover:bg-[#7dd3fc] rounded-xl shadow-md transition-all active:scale-95"
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
