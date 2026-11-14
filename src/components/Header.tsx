import React from 'react';
import { 
  Bookmark, 
  Key, 
  Search,
  ShieldAlert,
  Sun,
  Moon
} from 'lucide-react';
import { OneGitVaultLogo } from './OneGitVaultLogo';
import { GithubIcon } from './GithubIcon';
import { RateLimitInfo } from '../services/githubApi';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  bookmarksCount: number;
  onOpenBookmarks: () => void;
  onOpenTokenModal: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  rateLimit: RateLimitInfo;
  isOfflineFallback: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  bookmarksCount,
  onOpenBookmarks,
  onOpenTokenModal,
  isDarkMode,
  onToggleTheme,
  rateLimit,
  isOfflineFallback,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b backdrop-blur-xl bg-white dark:bg-[#0c0d10] border-[#e8e8e2] dark:border-[#20212b] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div 
            className="flex items-center gap-3 flex-shrink-0 cursor-pointer select-none group" 
            onClick={() => onSearchChange('')}
          >
            <div className="transition-transform duration-300 group-hover:scale-105">
              <OneGitVaultLogo className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-lg sm:text-xl tracking-tight text-neutral-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-glow transition-colors">
                  OneGit<span className="text-amber-600 dark:text-amber-brand">Vault</span>
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-brand border border-amber-500/25 font-semibold">
                  Desktop
                </span>
              </div>
              <p className="text-[11px] font-mono text-neutral-500 dark:text-charcoal-400 hidden sm:block tracking-wide">
                Unified Open-Source Observatory
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl mx-2">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-charcoal-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search across open source repositories (e.g. pytorch, rust, llm, vite)..."
                className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-neutral-100 hover:bg-neutral-50 focus:bg-white text-neutral-900 border-neutral-300 dark:bg-[#131419] dark:hover:bg-[#181921] dark:focus:bg-[#181921] dark:text-charcoal-100 dark:border-[#242531] placeholder-neutral-400 dark:placeholder-charcoal-400 rounded-xl border focus:border-amber-600 dark:focus:border-amber-brand/60 focus:outline-none focus:ring-2 focus:ring-amber-500/15 transition-all shadow-inner font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-700 dark:text-charcoal-400 dark:hover:text-white px-1.5 py-0.5 rounded-md hover:bg-neutral-200 dark:hover:bg-charcoal-750 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Actions & Utilities */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Rate limit status pill */}
            <button
              onClick={onOpenTokenModal}
              title={`API Quota: ${rateLimit.remaining} / ${rateLimit.limit} req/hr. Click to configure GitHub Token`}
              className={`hidden md:flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded-xl border transition-all ${
                isOfflineFallback 
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-brand border-amber-500/30 hover:bg-amber-500/20' 
                  : 'bg-neutral-100 dark:bg-[#131419] text-neutral-600 dark:text-charcoal-300 border-neutral-200 dark:border-[#242531] hover:border-amber-500/40 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {isOfflineFallback ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-brand" />
                  <span>Curated Mode</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-brand animate-pulse" />
                  <span>{rateLimit.remaining} calls</span>
                </>
              )}
              <Key className="w-3 h-3 ml-0.5 text-neutral-400 dark:text-charcoal-400" />
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-[#131419] dark:hover:bg-[#181921] text-neutral-600 hover:text-neutral-900 dark:text-charcoal-300 dark:hover:text-amber-brand border border-neutral-200 dark:border-[#242531] transition-all"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-brand" />
              ) : (
                <Moon className="w-4 h-4 text-neutral-700" />
              )}
            </button>

            {/* Bookmarks Vault Button */}
            <button
              onClick={onOpenBookmarks}
              className="relative p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-[#131419] dark:hover:bg-[#181921] text-neutral-600 hover:text-amber-700 dark:text-charcoal-300 dark:hover:text-amber-brand border border-neutral-200 dark:border-[#242531] hover:border-amber-500/40 transition-all"
              title="Saved Repositories"
            >
              <Bookmark className="w-4 h-4" />
              {bookmarksCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-mono font-bold text-white dark:text-[#0c0d10] bg-amber-600 dark:bg-amber-brand rounded-full border border-white dark:border-[#0c0d10]">
                  {bookmarksCount}
                </span>
              )}
            </button>

            {/* GitHub Trending */}
            <a
              href="https://github.com/trending"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-[#131419] dark:hover:bg-[#181921] text-neutral-600 hover:text-neutral-900 dark:text-charcoal-300 dark:hover:text-white border border-neutral-200 dark:border-[#242531] hover:border-neutral-400 dark:hover:border-charcoal-600 transition-all"
              title="GitHub Trending"
            >
              <GithubIcon className="w-4 h-4" />
            </a>
          </div>

        </div>
      </div>
    </header>
  );
};
