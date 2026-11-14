import React, { useState } from 'react';
import { 
  Star, 
  GitFork, 
  ExternalLink, 
  Copy, 
  Check, 
  Bookmark, 
  Globe, 
  Scale,
  Calendar
} from 'lucide-react';
import { Repository, ViewMode } from '../types';
import { LANGUAGE_COLORS } from '../data/curatedProjects';

interface ProjectCardProps {
  repo: Repository;
  viewMode: ViewMode;
  isBookmarked: boolean;
  onToggleBookmark: (repo: Repository) => void;
  onSelectTopic: (topic: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  repo,
  viewMode,
  isBookmarked,
  onToggleBookmark,
  onSelectTopic
}) => {
  const [copied, setCopied] = useState(false);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  const copyCloneCommand = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`git clone ${repo.html_url}.git`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const langColor = repo.language ? (LANGUAGE_COLORS[repo.language] || '#a7abbf') : '#a7abbf';

  if (viewMode === 'list') {
    return (
      <div className="group relative flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-white hover:bg-neutral-50/90 dark:bg-[#111217] dark:hover:bg-[#15161e] border border-neutral-200 dark:border-[#20212b] hover:border-neutral-300 dark:hover:border-[#2d2f3d] shadow-sm transition-all duration-150 gap-4">
        
        {/* Main Info */}
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <img
            src={repo.owner.avatar_url}
            alt={repo.owner.login}
            className="w-10 h-10 rounded-xl ring-1 ring-neutral-200 dark:ring-[#262836] bg-neutral-100 dark:bg-[#1a1b24] flex-shrink-0"
            loading="lazy"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={repo.html_url}
                target="_blank"
                rel="noreferrer"
                className="font-display font-bold text-neutral-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-brand text-base tracking-tight truncate transition-colors flex items-center gap-1.5"
              >
                <span>{repo.name}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 dark:text-charcoal-400" />
              </a>
              <span className="text-xs font-mono text-neutral-500 dark:text-charcoal-400">/{repo.owner.login}</span>

              {repo.license && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-neutral-600 dark:text-charcoal-400 bg-neutral-100 dark:bg-[#161720] px-2 py-0.5 rounded-md border border-neutral-200 dark:border-[#242634]">
                  <Scale className="w-3 h-3 text-neutral-500 dark:text-charcoal-400" />
                  {repo.license.spdx_id || repo.license.name}
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-neutral-600 dark:text-charcoal-300 line-clamp-1 mt-1 font-sans">
              {repo.description || 'No description provided.'}
            </p>

            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              {repo.topics.slice(0, 4).map((topic) => (
                <button
                  key={topic}
                  onClick={() => onSelectTopic(topic)}
                  className="text-[11px] font-mono text-neutral-700 hover:text-amber-700 bg-neutral-100 hover:bg-neutral-200 border-neutral-200 dark:text-charcoal-300 dark:hover:text-amber-brand dark:bg-[#161720] dark:hover:bg-[#1d1f2b] dark:border-[#242634] border px-2 py-0.5 rounded-md transition-colors"
                >
                  #{topic}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center gap-3.5 flex-shrink-0 self-end md:self-center border-t md:border-t-0 pt-3 md:pt-0 border-neutral-200 dark:border-[#20212b]">
          {/* Language */}
          {repo.language && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-charcoal-300 font-mono">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: langColor }} />
              <span>{repo.language}</span>
            </div>
          )}

          {/* Stars */}
          <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-700 dark:text-amber-brand bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-lg">
            <Star className="w-3.5 h-3.5 fill-amber-600 dark:fill-amber-brand text-amber-600 dark:text-amber-brand" />
            <span>{formatNumber(repo.stargazers_count)}</span>
          </div>

          {/* Forks */}
          <div className="flex items-center gap-1 text-xs font-mono text-neutral-600 dark:text-charcoal-300 bg-neutral-100 dark:bg-[#161720] border border-neutral-200 dark:border-[#242634] px-2 py-1 rounded-lg">
            <GitFork className="w-3.5 h-3.5 text-neutral-400 dark:text-charcoal-400" />
            <span>{formatNumber(repo.forks_count)}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={copyCloneCommand}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-charcoal-400 dark:hover:text-white dark:hover:bg-[#1a1c26] rounded-lg transition-colors"
              title={copied ? 'Copied clone command!' : 'Copy git clone command'}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onToggleBookmark(repo)}
              className={`p-1.5 rounded-lg transition-colors ${
                isBookmarked 
                  ? 'text-amber-600 dark:text-amber-brand bg-amber-500/10 border border-amber-500/20' 
                  : 'text-neutral-400 hover:text-amber-700 hover:bg-neutral-100 dark:text-charcoal-400 dark:hover:text-amber-brand dark:hover:bg-[#1a1c26]'
              }`}
              title={isBookmarked ? 'Remove from Vault' : 'Save in Vault'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-600 dark:fill-amber-brand' : ''}`} />
            </button>
          </div>
        </div>

      </div>
    );
  }

  // Grid View
  return (
    <div className="group relative flex flex-col justify-between p-5 rounded-2xl bg-white hover:bg-neutral-50/90 dark:bg-[#111217] dark:hover:bg-[#15161f] border border-neutral-200 dark:border-[#20212b] hover:border-neutral-300 dark:hover:border-[#2f3244] shadow-sm transition-all duration-150">
      
      {/* Top Bar: Owner & Actions */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={repo.owner.avatar_url}
              alt={repo.owner.login}
              className="w-9 h-9 rounded-xl ring-1 ring-neutral-200 dark:ring-[#262836] bg-neutral-100 dark:bg-[#1a1b24] flex-shrink-0"
              loading="lazy"
            />
            <div className="min-w-0">
              <span className="text-[11px] font-mono text-neutral-500 dark:text-charcoal-400 truncate block">
                {repo.owner.login}
              </span>
              <a
                href={repo.html_url}
                target="_blank"
                rel="noreferrer"
                className="font-display font-bold text-neutral-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-brand text-lg tracking-tight block truncate transition-colors"
              >
                {repo.name}
              </a>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={copyCloneCommand}
              className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 dark:text-charcoal-400 dark:hover:text-white dark:hover:bg-[#1c1e28] rounded-lg transition-all"
              title={copied ? 'Copied git clone command!' : 'Copy clone command'}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onToggleBookmark(repo)}
              className={`p-1.5 rounded-lg transition-all ${
                isBookmarked 
                  ? 'text-amber-600 dark:text-amber-brand bg-amber-500/10 border border-amber-500/20' 
                  : 'text-neutral-400 hover:text-amber-700 hover:bg-neutral-100 dark:text-charcoal-400 dark:hover:text-amber-brand dark:hover:bg-[#1c1e28]'
              }`}
              title={isBookmarked ? 'Remove from Vault' : 'Save in Vault'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-600 dark:fill-amber-brand' : ''}`} />
            </button>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs sm:text-[13px] text-neutral-600 dark:text-charcoal-300 line-clamp-3 mb-4 leading-relaxed min-h-[3.6rem] font-sans">
          {repo.description || 'No description provided for this repository.'}
        </p>

        {/* Topic Chips */}
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {repo.topics.slice(0, 3).map((topic) => (
            <button
              key={topic}
              onClick={() => onSelectTopic(topic)}
              className="text-[11px] font-mono text-neutral-700 hover:text-amber-700 bg-neutral-100 hover:bg-neutral-200 border-neutral-200 dark:text-charcoal-300 dark:hover:text-amber-brand dark:bg-[#161720] dark:hover:bg-[#1e202c] dark:border-[#242634] border px-2 py-0.5 rounded-md transition-colors"
            >
              #{topic}
            </button>
          ))}
          {repo.topics.length > 3 && (
            <span className="text-[10px] font-mono text-neutral-400 dark:text-charcoal-400 px-1 py-0.5">
              +{repo.topics.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Footer Info: Popularity, Language, Date */}
      <div className="pt-3 border-t border-neutral-200 dark:border-[#1e202a]">
        <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-charcoal-300 mb-2.5 font-mono">
          {/* Language Dot */}
          {repo.language ? (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: langColor }} />
              <span className="font-medium text-neutral-800 dark:text-charcoal-200 text-[11px]">{repo.language}</span>
            </div>
          ) : (
            <span className="text-neutral-500 dark:text-charcoal-400 text-[11px]">Software</span>
          )}

          {/* Last Updated */}
          <div className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-charcoal-400" title={`Updated ${repo.updated_at}`}>
            <Calendar className="w-3 h-3 text-neutral-400 dark:text-charcoal-400" />
            <span>{formatDate(repo.updated_at)}</span>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Stars */}
            <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-700 dark:text-amber-brand bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-lg">
              <Star className="w-3.5 h-3.5 fill-amber-600 dark:fill-amber-brand text-amber-600 dark:text-amber-brand" />
              <span>{formatNumber(repo.stargazers_count)}</span>
            </div>

            {/* Forks */}
            <div className="flex items-center gap-1 text-xs font-mono font-medium text-neutral-600 dark:text-charcoal-300 bg-neutral-100 dark:bg-[#161720] border border-neutral-200 dark:border-[#242634] px-2 py-1 rounded-lg">
              <GitFork className="w-3.5 h-3.5 text-neutral-400 dark:text-charcoal-400" />
              <span>{formatNumber(repo.forks_count)}</span>
            </div>
          </div>

          {/* External links */}
          <div className="flex items-center gap-1.5">
            {repo.homepage && (
              <a
                href={repo.homepage}
                target="_blank"
                rel="noreferrer"
                className="p-1 text-neutral-400 hover:text-amber-600 dark:text-charcoal-400 dark:hover:text-amber-brand transition-colors"
                title="Project Homepage"
              >
                <Globe className="w-3.5 h-3.5" />
              </a>
            )}
            <a
              href={repo.html_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-neutral-600 hover:text-amber-700 dark:text-charcoal-300 dark:hover:text-amber-brand transition-colors"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

    </div>
  );
};
