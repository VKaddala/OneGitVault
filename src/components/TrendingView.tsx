import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Star, 
  GitFork, 
  ExternalLink, 
  Bookmark, 
  Loader2, 
  Filter,
  RefreshCw,
  BookOpen
} from 'lucide-react';
import { Repository } from '../types';
import { fetchTrendingRepositories } from '../services/githubApi';
import { LANGUAGE_COLORS } from '../data/curatedProjects';

interface TrendingViewProps {
  onSelectRepo: (repo: Repository) => void;
  isBookmarked: (id: number | string) => boolean;
  onToggleBookmark: (repo: Repository) => void;
  isStarred?: (fullName: string) => boolean;
  getStarCount?: (repo: Repository) => number;
  hasToken?: boolean;
  onToggleStar?: (repo: Repository) => void;
}

type Period = 'daily' | 'weekly' | 'monthly';

export const TrendingView: React.FC<TrendingViewProps> = ({
  onSelectRepo,
  isBookmarked,
  onToggleBookmark,
  isStarred,
  getStarCount,
  hasToken = false,
  onToggleStar,
}) => {
  const [period, setPeriod] = useState<Period>('daily');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [trendingRepos, setTrendingRepos] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastFetchedKey, setLastFetchedKey] = useState<string>('');

  const loadTrending = (force = false) => {
    const currentKey = `${period}:${selectedLanguage}`;
    if (!force && lastFetchedKey === currentKey && trendingRepos.length > 0) {
      return;
    }

    setIsLoading(true);
    fetchTrendingRepositories(period, selectedLanguage)
      .then((repos) => {
        setTrendingRepos(repos);
        setLastFetchedKey(currentKey);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadTrending();
  }, [period, selectedLanguage]);

  const popularLanguages = ['JavaScript', 'TypeScript', 'Python', 'Rust', 'Go', 'C++', 'Java', 'HTML', 'Ruby'];

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  return (
    <div className="w-full max-w-[2400px] mx-auto px-3 sm:px-5 lg:px-6 py-4 flex flex-col gap-4 animate-fadeIn">
      {/* ── Banner Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-surface border border-themeline shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-action-soft border border-action-border text-action shadow-sm flex-shrink-0">
            <Flame className="w-6 h-6 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-base sm:text-lg md:text-xl text-txt-primary">
                GitHub Trending Repositories
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-action text-txt-inverse font-bold shadow-sm">
                LIVE
              </span>
            </div>
            <p className="text-xs font-mono text-txt-muted mt-0.5">
              Explore what the GitHub developer community is building and starring today
            </p>
          </div>
        </div>

        {/* Refresh button */}
        <button
          onClick={() => loadTrending(true)}
          disabled={isLoading}
          className="flex items-center gap-1.5 self-start sm:self-center px-3 py-1.5 rounded-xl bg-surface-active hover:bg-surface text-txt-primary border border-themeline hover:border-action-border text-xs font-mono transition-all disabled:opacity-50 shadow-sm"
          title="Refresh Trending"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-action' : 'text-action'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Filters & Period Controls ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-surface border border-themeline rounded-xl text-xs font-mono shadow-sm">
        {/* Period selector */}
        <div className="flex items-center gap-1 bg-surface-active p-1 rounded-xl border border-themeline">
          {(
            [
              { id: 'daily', label: 'Today' },
              { id: 'weekly', label: 'This Week' },
              { id: 'monthly', label: 'This Month' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1 rounded-lg transition-all font-medium ${
                period === p.id
                  ? 'bg-action text-txt-inverse font-bold shadow-sm'
                  : 'text-txt-muted hover:text-txt-primary hover:bg-surface'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Language filter dropdown */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-action" />
          <span className="text-txt-muted text-[11px]">Language:</span>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="bg-surface-active border border-themeline rounded-lg px-2.5 py-1 text-xs text-txt-primary focus:outline-none cursor-pointer"
          >
            <option value="">All Languages</option>
            {popularLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Trending List Content ── */}
      <div className="space-y-3 pb-16">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-action animate-spin" />
            <p className="text-xs font-mono text-txt-muted">
              Fetching trending repositories from GitHub...
            </p>
          </div>
        ) : trendingRepos.length === 0 ? (
          <div className="py-20 text-center bg-surface border border-themeline rounded-2xl p-8 my-6">
            <Flame className="w-12 h-12 text-txt-muted/30 mx-auto mb-3" />
            <h3 className="text-base font-display font-bold text-txt-primary">No trending repositories found</h3>
            <p className="text-xs font-mono text-txt-muted max-w-sm mx-auto mt-1">
              Try choosing another period or language filter above.
            </p>
          </div>
        ) : (
          trendingRepos.map((repo, idx) => {
            const langColor = repo.language ? (LANGUAGE_COLORS[repo.language] || '#a7abbf') : '#a7abbf';
            const bookmarked = isBookmarked(repo.id);

            return (
              <div
                key={repo.id}
                onClick={() => onSelectRepo(repo)}
                className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-surface hover:bg-surface-hover border border-themeline hover:border-action-border transition-all duration-150 gap-3.5 cursor-pointer shadow-sm"
              >
                {/* Left: Rank & Repo Info */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Rank Badge */}
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg font-mono text-xs font-bold flex-shrink-0 mt-0.5 bg-surface-active border border-themeline text-txt-muted group-hover:text-action group-hover:border-action-border transition-colors">
                    {idx + 1}
                  </div>

                  {/* Owner avatar */}
                  <img
                    src={repo.owner.avatar_url}
                    alt={repo.owner.login}
                    className="w-10 h-10 rounded-xl ring-1 ring-themeline bg-surface flex-shrink-0 shadow-sm mt-0.5"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold text-sm sm:text-base text-txt-primary group-hover:text-action transition-colors truncate">
                        {repo.name}
                      </span>
                      <span className="text-xs font-mono text-txt-muted">
                        /{repo.owner.login}
                      </span>
                    </div>

                    <p className="text-xs text-txt-secondary line-clamp-2 mt-1 font-sans">
                      {repo.description || 'No description provided.'}
                    </p>

                    {/* Meta chips */}
                    <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-txt-muted flex-wrap">
                      {repo.language && (
                        <span className="flex items-center gap-1.5 font-medium text-txt-primary">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: langColor }}
                          />
                          {repo.language}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStar?.(repo);
                        }}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs border transition-all ${
                          isStarred?.(repo.full_name)
                            ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                            : 'text-txt-muted hover:text-amber-500 hover:border-amber-500/50 border-themeline bg-surface-active'
                        }`}
                        title={
                          hasToken
                            ? (isStarred?.(repo.full_name) ? 'Starred on GitHub! (Click to Unstar)' : 'Star this repository on GitHub')
                            : 'Click to star on GitHub (connect token in header)'
                        }
                      >
                        <Star className={`w-3.5 h-3.5 ${isStarred?.(repo.full_name) ? 'text-white fill-current animate-pulse' : 'text-amber-500 fill-current'}`} />
                        <span>{formatNumber(getStarCount ? getStarCount(repo) : repo.stargazers_count)}</span>
                      </button>

                      <span className="flex items-center gap-1">
                        <GitFork className="w-3.5 h-3.5" />
                        <span>{formatNumber(repo.forks_count)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRepo(repo);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-active hover:bg-surface border border-themeline hover:border-action-border text-xs font-mono text-txt-primary hover:text-action transition-all shadow-sm"
                    title="Inspect full repository README & details"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-action" />
                    <span>README & Releases</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBookmark(repo);
                    }}
                    className={`p-2 rounded-xl border transition-all ${
                      bookmarked
                        ? 'bg-action text-txt-inverse border-action font-bold shadow-sm'
                        : 'bg-surface-active hover:bg-surface text-txt-muted hover:text-action border-themeline'
                    }`}
                    title={bookmarked ? 'Remove from Vault' : 'Save to Vault'}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
                  </button>

                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 rounded-xl bg-surface-active hover:bg-surface text-txt-muted hover:text-txt-primary border border-themeline transition-colors"
                    title="Open on GitHub"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
