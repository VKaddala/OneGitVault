import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings as SettingsIcon,
  Key,
  ShieldCheck,
  ExternalLink,
  Info,
  Check,
  RefreshCw,
  Palette,
  Sparkles,
  Sun,
  Moon,
  Flame,
  Globe,
  Clock,
  Laptop
} from 'lucide-react';
import { getStoredToken, setStoredToken, checkLiveRateLimit, RateLimitInfo } from '../services/githubApi';
import { useTheme } from '../context/ThemeContext';
import { CURRENT_APP_VERSION, UpdateInfo } from '../services/updateService';
import { OneGitVaultLogo } from './OneGitVaultLogo';

interface SettingsViewProps {
  rateLimit: RateLimitInfo;
  onTokenUpdated: () => void;
  onCheckUpdates?: () => void;
  isCheckingUpdates?: boolean;
  updateInfo?: UpdateInfo | null;
  onOpenUpdateModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  rateLimit,
  onTokenUpdated,
  onCheckUpdates,
  isCheckingUpdates = false,
  updateInfo,
  onOpenUpdateModal,
}) => {
  const { currentTheme, themeId, setTheme, availableThemes } = useTheme();

  // GitHub Token State
  const [tokenInput, setTokenInput] = useState(getStoredToken());
  const [showToken, setShowToken] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshingQuota, setIsRefreshingQuota] = useState(false);
  const [liveRateLimit, setLiveRateLimit] = useState<RateLimitInfo>(rateLimit);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setTokenInput(getStoredToken());
  }, []);

  // Poll live rate limit while on settings page
  useEffect(() => {
    let mounted = true;
    const fetchLive = async () => {
      try {
        const latest = await checkLiveRateLimit();
        if (mounted) setLiveRateLimit({ ...latest });
      } catch {}
    };

    fetchLive();
    const pollInterval = setInterval(fetchLive, 3000);
    const tickInterval = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
      clearInterval(tickInterval);
    };
  }, []);

  const handleManualRefreshQuota = useCallback(async () => {
    setIsRefreshingQuota(true);
    try {
      const latest = await checkLiveRateLimit();
      setLiveRateLimit({ ...latest });
      onTokenUpdated();
    } finally {
      setTimeout(() => setIsRefreshingQuota(false), 400);
    }
  }, [onTokenUpdated]);

  const handleSaveToken = async () => {
    setIsSaving(true);
    try {
      await setStoredToken(tokenInput.trim());
      const latest = await checkLiveRateLimit();
      setLiveRateLimit({ ...latest });
      setSavedSuccess(true);
      onTokenUpdated();
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearToken = async () => {
    setTokenInput('');
    await setStoredToken('');
    const latest = await checkLiveRateLimit();
    setLiveRateLimit({ ...latest });
    onTokenUpdated();
  };

  // Search reset countdown
  const searchSecLeft = liveRateLimit.searchResetTime
    ? Math.max(0, Math.ceil((liveRateLimit.searchResetTime.getTime() - now) / 1000))
    : 0;

  // Core reset minutes
  const coreMinutesLeft = liveRateLimit.resetTime
    ? Math.max(0, Math.ceil((liveRateLimit.resetTime.getTime() - now) / 60000))
    : 0;

  const effectiveSearchRemaining =
    searchSecLeft === 0
      ? liveRateLimit.searchLimit || 30
      : (liveRateLimit.searchRemaining ?? liveRateLimit.searchLimit ?? 30);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fadeIn pb-24">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between p-5 rounded-2xl bg-surface border border-themeline shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-action-soft border border-action-border text-action shadow-sm">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg sm:text-xl text-txt-primary">
              Application Settings & Preferences
            </h1>
            <p className="text-xs font-mono text-txt-muted mt-0.5">
              Manage GitHub API authentication, rate limit quotas, visual theme palettes, and system options.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-txt-muted bg-surface-active px-2.5 py-1 rounded-lg border border-themeline">
            v{CURRENT_APP_VERSION}
          </span>
        </div>
      </div>

      {/* ── Section 1: Visual Theme Appearance (Combobox Selection) ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-themeline shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-themeline">
          <div className="flex items-center gap-2 text-txt-primary font-display font-bold text-sm sm:text-base">
            <Palette className="w-4 h-4 text-action" />
            <span>Theme & Visual Appearance</span>
          </div>
          <span className="text-xs font-mono text-txt-muted bg-surface-active px-2.5 py-0.5 rounded-md border border-themeline">
            {currentTheme.name}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div>
            <label htmlFor="theme-select" className="text-xs font-medium text-txt-primary block">
              Color Theme
            </label>
            <p className="text-[11px] font-sans text-txt-muted">
              Select an interface color scheme for the application canvas and cards.
            </p>
          </div>

          <div className="w-full sm:w-72">
            <select
              id="theme-select"
              value={themeId}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full bg-surface-active hover:bg-surface border border-themeline hover:border-action-border text-txt-primary rounded-xl px-3 py-2 text-xs font-sans focus:outline-none focus:border-action cursor-pointer transition-colors shadow-sm"
            >
              {availableThemes.map((theme) => (
                <option key={theme.id} value={theme.id} className="bg-surface text-txt-primary">
                  {theme.name} ({theme.isDark ? 'Dark Mode' : 'Light Mode'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Section 2: GitHub API Key & Rate Limits ── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-themeline shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-themeline flex-wrap gap-2">
          <div className="flex items-center gap-2 text-txt-primary font-display font-bold text-sm sm:text-base">
            <Key className="w-4 h-4 text-action" />
            <span>GitHub Personal Access Token (PAT) & API Quotas</span>
          </div>
          <button
            onClick={handleManualRefreshQuota}
            disabled={isRefreshingQuota}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-active hover:bg-surface border border-themeline text-xs font-mono text-action transition-all disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingQuota ? 'animate-spin' : ''}`} />
            <span>{isRefreshingQuota ? 'Refreshing...' : 'Refresh Quota Live'}</span>
          </button>
        </div>

        {/* Live Quota Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Core API Quota */}
          <div className="p-4 rounded-xl bg-surface-active border border-themeline space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-semibold text-txt-primary flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-action animate-pulse" />
                <span>Core API Quota</span>
              </span>
              <span className="font-bold text-action">
                {liveRateLimit.remaining.toLocaleString()} / {liveRateLimit.limit.toLocaleString()} req/hr
              </span>
            </div>

            <div className="w-full bg-surface h-2 rounded-full overflow-hidden border border-themeline">
              <div
                className="bg-action h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (liveRateLimit.remaining / Math.max(1, liveRateLimit.limit)) * 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-txt-muted">
              <span>Powers Releases, Stars, READMEs & Gists</span>
              <span>{coreMinutesLeft > 0 ? `Resets in ${coreMinutesLeft}m` : 'Active'}</span>
            </div>
          </div>

          {/* Search API Quota */}
          <div className="p-4 rounded-xl bg-surface-active border border-themeline space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-semibold text-txt-primary flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Search API Quota</span>
              </span>
              <span className="font-bold text-txt-primary">
                {effectiveSearchRemaining} / {liveRateLimit.searchLimit || 30} req/min
              </span>
            </div>

            <div className="w-full bg-surface h-2 rounded-full overflow-hidden border border-themeline">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (effectiveSearchRemaining / Math.max(1, liveRateLimit.searchLimit || 30)) * 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-txt-muted">
              <span>Powers Stream Queries & Keyword Search</span>
              <span className={searchSecLeft > 0 ? 'text-amber-500 font-bold' : 'text-emerald-500 font-bold'}>
                {searchSecLeft > 0 ? `Resets in ${searchSecLeft}s` : '✓ Ready (30/30)'}
              </span>
            </div>
          </div>
        </div>

        {/* Token Input Field & Instructions */}
        <div className="space-y-3 pt-2">
          <div className="p-3.5 rounded-xl bg-surface-active border border-themeline text-xs space-y-2">
            <div className="flex items-center gap-2 text-txt-primary font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Secure Local Token Storage</span>
            </div>
            <p className="text-txt-muted leading-relaxed">
              Adding a token increases your rate limit from <strong>60 calls/hour</strong> to <strong>5,000 calls/hour</strong> and enables repository starring and private cloud Gist backup. Tokens are stored locally on your device and are sent only to GitHub.
            </p>
            <div className="pt-1">
              <a
                href="https://github.com/settings/tokens/new?description=OneGitVault&scopes=public_repo,gist"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-action hover:underline font-mono text-xs font-semibold"
              >
                <span>Generate a new GitHub Token (with public_repo and gist scopes)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-txt-muted font-semibold block">
              Personal Access Token
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxx or github_pat_xxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 text-xs font-mono bg-surface-active border border-themeline rounded-xl text-txt-primary placeholder-txt-muted/50 focus:outline-none focus:border-action transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="px-3 py-2 text-xs font-mono bg-surface-active hover:bg-surface border border-themeline text-txt-muted hover:text-txt-primary rounded-xl transition-colors"
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {savedSuccess && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-mono animate-fadeIn">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>GitHub Token saved successfully! Live quota updated.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleClearToken}
              className="text-xs font-mono text-txt-muted hover:text-rose-500 transition-colors"
            >
              Clear & Remove Token
            </button>

            <button
              type="button"
              onClick={handleSaveToken}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 text-xs font-mono font-bold text-txt-inverse bg-action hover:opacity-90 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Verifying Token...' : 'Save Token'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Section 3: About OneGitVault & Software Updates ── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-themeline shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-themeline">
          <div className="flex items-center gap-2 text-txt-primary font-display font-bold text-sm sm:text-base">
            <Sparkles className="w-4 h-4 text-action" />
            <span>About OneGitVault & Software Updates</span>
          </div>
        </div>

        <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-surface-active border border-themeline flex-shrink-0 shadow-sm">
              <OneGitVaultLogo className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base text-txt-primary">
                  OneGit<span className="text-action">Vault</span>
                </h3>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-surface-active border border-themeline text-txt-muted">
                  v{CURRENT_APP_VERSION}
                </span>
              </div>
              <p className="text-xs font-sans text-txt-secondary mt-0.5">
                Open-Source Repository Observatory & Sync Vault • Created by VKaddala
              </p>
            </div>
          </div>

          {onCheckUpdates && (
            <button
              onClick={onCheckUpdates}
              disabled={isCheckingUpdates}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-active hover:bg-surface border border-themeline text-xs font-mono text-txt-primary hover:text-action transition-all shadow-sm flex-shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdates ? 'animate-spin text-action' : 'text-action'}`} />
              <span>{isCheckingUpdates ? 'Checking GitHub...' : 'Check for Updates'}</span>
            </button>
          )}
        </div>

        {updateInfo?.hasUpdate && onOpenUpdateModal && (
          <div className="p-3 rounded-xl bg-action-soft border border-action-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-action text-xs font-bold font-sans">
              <Sparkles className="w-4 h-4 fill-current flex-shrink-0" />
              <span>New version v{updateInfo.latestVersion} is available to install!</span>
            </div>
            <button
              onClick={onOpenUpdateModal}
              className="px-3 py-1 text-xs font-mono font-bold bg-action text-txt-inverse rounded-lg hover:opacity-90 transition-opacity"
            >
              View Release Notes
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
