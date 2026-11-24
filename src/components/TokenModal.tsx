import React, { useState, useEffect, useCallback } from 'react';
import { Key, ShieldCheck, ExternalLink, X, Info, Check, RefreshCw, Clock } from 'lucide-react';
import { getStoredToken, setStoredToken, checkLiveRateLimit, RateLimitInfo } from '../services/githubApi';

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
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [liveRateLimit, setLiveRateLimit] = useState<RateLimitInfo>(rateLimit);
  const [now, setNow] = useState(Date.now());

  // Sync token input only when modal opens
  useEffect(() => {
    if (isOpen) {
      setTokenInput(getStoredToken());
      setLiveRateLimit(rateLimit);
    }
  }, [isOpen]);

  // Real-time live polling & second ticker while modal is open
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    const fetchLive = async () => {
      try {
        const latest = await checkLiveRateLimit();
        if (mounted) setLiveRateLimit({ ...latest });
      } catch {}
    };

    // Immediate fetch on open
    fetchLive();

    // Poll live GitHub quota every 2 seconds while modal is open
    const pollInterval = setInterval(fetchLive, 2000);

    // 1-second clock ticker for countdown calculation
    const tickInterval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
      clearInterval(tickInterval);
    };
  }, [isOpen]);

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const latest = await checkLiveRateLimit();
      setLiveRateLimit({ ...latest });
      onTokenUpdated();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  }, [onTokenUpdated]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setStoredToken(tokenInput.trim());
      const latest = await checkLiveRateLimit();
      setLiveRateLimit({ ...latest });
      setSavedSuccess(true);
      onTokenUpdated();
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setTokenInput('');
    await setStoredToken('');
    const latest = await checkLiveRateLimit();
    setLiveRateLimit({ ...latest });
    onTokenUpdated();
  };

  if (!isOpen) return null;

  // Real-time Search reset calculation
  const searchSecLeft = liveRateLimit.searchResetTime
    ? Math.max(0, Math.ceil((liveRateLimit.searchResetTime.getTime() - now) / 1000))
    : 0;
  
  // Real-time Core reset calculation (minutes left)
  const coreMinutesLeft = liveRateLimit.resetTime
    ? Math.max(0, Math.ceil((liveRateLimit.resetTime.getTime() - now) / 60000))
    : 0;

  // Effective search remaining: if reset time has passed, it has already replenished to full capacity!
  const effectiveSearchRemaining =
    searchSecLeft === 0
      ? liveRateLimit.searchLimit || 30
      : (liveRateLimit.searchRemaining ?? liveRateLimit.searchLimit ?? 30);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-surface border border-themeline rounded-2xl shadow-2xl p-6 text-txt-primary transition-colors duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-txt-muted hover:text-txt-primary rounded-lg hover:bg-surface-active transition-colors"
          title="Close"
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
            <p className="text-xs font-mono text-txt-muted">Real-Time Quota & Authentication</p>
          </div>
        </div>

        {/* Live Quota Status Banner */}
        <div className="mb-4 p-3.5 bg-surface-active rounded-xl border border-themeline text-xs font-mono space-y-2.5 shadow-inner">
          <div className="flex items-center justify-between pb-1.5 border-b border-themeline/60">
            <span className="font-semibold text-txt-primary flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live GitHub API Quota
            </span>
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1 text-[11px] text-action hover:opacity-80 transition-opacity disabled:opacity-50"
              title="Query GitHub /rate_limit endpoint right now"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing…' : 'Refresh Live'}</span>
            </button>
          </div>

          {/* Core API Quota */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-txt-muted">Core API Quota:</span>
              <span className="font-bold text-txt-primary">
                {liveRateLimit.remaining} / {liveRateLimit.limit} req/hr
              </span>
            </div>
            <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden border border-themeline">
              <div 
                className="bg-action h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (liveRateLimit.remaining / liveRateLimit.limit) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-txt-muted/80 mt-1">
              <span>Repos, Stars, READMEs & Gists</span>
              <span>{coreMinutesLeft > 0 ? `Resets in ${coreMinutesLeft}m` : 'Active'}</span>
            </div>
          </div>

          {/* Search API Quota */}
          <div className="pt-2 border-t border-themeline/50">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-txt-muted">Search API Quota:</span>
              <span className="font-semibold text-txt-primary">
                {effectiveSearchRemaining} / {liveRateLimit.searchLimit || 30} req/min
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-txt-muted/80 mt-0.5">
              <span>Streaming & Filter Queries</span>
              <span className={searchSecLeft > 0 ? 'text-amber-500 font-bold' : 'text-emerald-500'}>
                {searchSecLeft > 0 ? `Resets in ${searchSecLeft}s` : '✓ Ready (30/30)'}
              </span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-3 mb-5">
          <div className="flex items-start gap-2 text-xs text-txt-secondary font-sans">
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <p>
              Your token is stored <strong>locally only</strong> in your computer's storage. It is never transmitted anywhere other than direct queries to <code className="text-action font-mono text-[11px]">api.github.com</code>.
            </p>
          </div>

          <div className="p-3 bg-surface-active rounded-xl border border-themeline text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-txt-primary mb-1">
              <Info className="w-3.5 h-3.5 text-action" />
              <span>Recommended Permissions:</span>
            </div>
            <p className="text-txt-muted text-[11px] leading-relaxed">
              Create a <strong>Fine-grained</strong> or <strong>Classic</strong> token with <code className="text-action font-mono">public_repo</code> (starring repositories) and <code className="text-action font-mono">gist</code> (cloud bookmark backup).
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
              <span>Token saved & live quota verified!</span>
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
                disabled={isSaving}
                type="button"
                className="px-4 py-1.5 text-xs font-mono font-bold text-txt-inverse bg-action hover:opacity-90 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? 'Verifying…' : 'Save Token'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
