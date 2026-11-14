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
    <header className="sticky top-0 z-40 w-full border-b backdrop-blur-xl bg-[#FBE9D0]/95 dark:bg-[#101b20]/95 border-[#e3d1ba] dark:border-[#1e343e] transition-colors duration-200">
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
                <span className="font-display font-bold text-lg sm:text-xl tracking-tight text-[#244855] dark:text-[#FBE9D0] group-hover:text-[#E64833] dark:group-hover:text-[#ff5c47] transition-colors">
                  OneGit<span className="text-[#E64833]">Vault</span>
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-[#E64833]/10 text-[#E64833] border border-[#E64833]/30 font-semibold">
                  Desktop
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#874F41] dark:text-[#90AEAD] hidden sm:block tracking-wide">
                Unified Open-Source Observatory
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl mx-2">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#874F41]/60 dark:text-[#90AEAD]/70" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search across open source repositories (e.g. pytorch, rust, llm, vite)..."
                className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-[#FFF9F0] hover:bg-white focus:bg-white text-[#244855] border-[#e3d1ba] dark:bg-[#16272f] dark:hover:bg-[#1a2e37] dark:focus:bg-[#1c323c] dark:text-[#FBE9D0] dark:border-[#244855] placeholder-[#874F41]/50 dark:placeholder-[#90AEAD]/50 rounded-xl border focus:border-[#E64833] dark:focus:border-[#E64833] focus:outline-none focus:ring-2 focus:ring-[#E64833]/15 transition-all shadow-inner font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#874F41] hover:text-[#244855] dark:text-[#90AEAD] dark:hover:text-white px-1.5 py-0.5 rounded-md hover:bg-[#F2DFCA] dark:hover:bg-[#244855] transition-colors"
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
                  ? 'bg-[#E64833]/10 text-[#E64833] border-[#E64833]/30 hover:bg-[#E64833]/20' 
                  : 'bg-[#FFF9F0] dark:bg-[#16272f] text-[#244855] dark:text-[#90AEAD] border-[#e3d1ba] dark:border-[#244855] hover:border-[#E64833]/40 hover:text-[#E64833] dark:hover:text-[#FBE9D0]'
              }`}
            >
              {isOfflineFallback ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-[#E64833]" />
                  <span>Curated Mode</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#E64833] animate-pulse" />
                  <span>{rateLimit.remaining} calls</span>
                </>
              )}
              <Key className="w-3 h-3 ml-0.5 text-[#874F41] dark:text-[#90AEAD]" />
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-[#FFF9F0] hover:bg-[#F2DFCA] dark:bg-[#16272f] dark:hover:bg-[#1c323c] text-[#244855] hover:text-[#E64833] dark:text-[#90AEAD] dark:hover:text-[#FBE9D0] border border-[#e3d1ba] dark:border-[#244855] transition-all"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-[#ff5c47]" />
              ) : (
                <Moon className="w-4 h-4 text-[#244855]" />
              )}
            </button>

            {/* Bookmarks Vault Button */}
            <button
              onClick={onOpenBookmarks}
              className="relative p-2 rounded-xl bg-[#FFF9F0] hover:bg-[#F2DFCA] dark:bg-[#16272f] dark:hover:bg-[#1c323c] text-[#244855] hover:text-[#E64833] dark:text-[#90AEAD] dark:hover:text-[#ff5c47] border border-[#e3d1ba] dark:border-[#244855] hover:border-[#E64833]/40 transition-all"
              title="Saved Repositories"
            >
              <Bookmark className="w-4 h-4" />
              {bookmarksCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-mono font-bold text-white bg-[#E64833] rounded-full border border-[#FFF9F0] dark:border-[#101b20]">
                  {bookmarksCount}
                </span>
              )}
            </button>

            {/* GitHub Trending */}
            <a
              href="https://github.com/trending"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-[#FFF9F0] hover:bg-[#F2DFCA] dark:bg-[#16272f] dark:hover:bg-[#1c323c] text-[#244855] hover:text-[#E64833] dark:text-[#90AEAD] dark:hover:text-white border border-[#e3d1ba] dark:border-[#244855] hover:border-[#E64833]/40 transition-all"
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
