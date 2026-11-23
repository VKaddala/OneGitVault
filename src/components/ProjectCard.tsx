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
  onOpenDetail: (repo: Repository) => void;
  isStarred?: boolean;
  starCount?: number;
  hasToken?: boolean;
  onToggleStar?: (repo: Repository) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  repo,
  viewMode,
  isBookmarked,
  onToggleBookmark,
  onSelectTopic,
  onOpenDetail,
  isStarred = false,
  starCount,
  hasToken = false,
  onToggleStar,
}) => {
  const [copied, setCopied] = useState(false);
  const effectiveStarCount = starCount !== undefined ? starCount : repo.stargazers_count;

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
      <div 
        className="group relative flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-surface hover:bg-surface-hover border border-themeline hover:border-action-border shadow-sm transition-all duration-150 gap-4 cursor-pointer" 
        onClick={() => onOpenDetail(repo)}
      >
        {/* Main Info */}
        <div className="flex items-start gap-3.5 flex-1 min-w-0 cursor-pointer" onClick={() => onOpenDetail(repo)}>
          <img
            src={repo.owner.avatar_url}
            alt={repo.owner.login}
            className="w-10 h-10 rounded-xl ring-1 ring-themeline bg-surface-active flex-shrink-0 shadow-sm"
            loading="lazy"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={repo.html_url}
                target="_blank"
                rel="noreferrer"
                className="font-display font-bold text-txt-primary hover:text-action text-base tracking-tight truncate transition-colors flex items-center gap-1.5"
              >
                <span>{repo.name}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-txt-muted" />
              </a>
              <span className="text-xs font-mono text-txt-muted">/{repo.owner.login}</span>

              {repo.license && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-txt-muted bg-surface-active px-2 py-0.5 rounded-md border border-themeline">
                  <Scale className="w-3 h-3 text-txt-muted" />
                  {repo.license.spdx_id || repo.license.name}
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-txt-secondary line-clamp-1 mt-1 font-sans">
              {repo.description || 'No description provided.'}
            </p>

            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              {repo.topics.slice(0, 4).map((topic) => (
                <button
                  key={topic}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTopic(topic);
                  }}
                  className="text-[11px] font-mono bg-tag-bg text-tag-txt hover:text-tag-hoverTxt border border-tag-border hover:border-action px-2 py-0.5 rounded-md transition-colors"
                >
                  #{topic}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center gap-3.5 flex-shrink-0 self-end md:self-center border-t md:border-t-0 pt-3 md:pt-0 border-themeline">
          {/* Language */}
          {repo.language && (
            <div className="flex items-center gap-1.5 text-xs text-txt-primary font-mono">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: langColor }} />
              <span>{repo.language}</span>
            </div>
          )}

          {/* Stars / GitHub Starring Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar?.(repo);
            }}
            className={`flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-lg border shadow-sm transition-all hover:scale-105 active:scale-95 ${
              isStarred
                ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/20'
                : 'text-star bg-star-bg hover:bg-star-bg/80 border-star-border hover:border-star'
            }`}
            title={
              hasToken
                ? (isStarred ? 'Starred on GitHub! (Click to Unstar)' : 'Star this repository on GitHub')
                : 'Click to star on GitHub (connect token in header)'
            }
          >
            <Star className={`w-3.5 h-3.5 flex-shrink-0 ${isStarred ? 'fill-current text-white animate-pulse' : 'fill-current text-star'}`} />
            <span>{formatNumber(effectiveStarCount)}</span>
          </button>

          {/* Forks */}
          <div className="flex items-center gap-1 text-xs font-mono font-medium text-txt-muted bg-surface-active border border-themeline px-2 py-1 rounded-lg">
            <GitFork className="w-3.5 h-3.5" />
            <span>{formatNumber(repo.forks_count)}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={copyCloneCommand}
              className="p-1.5 text-txt-muted hover:text-txt-primary hover:bg-surface-active rounded-lg transition-colors"
              title={copied ? 'Copied clone command!' : 'Copy git clone command'}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleBookmark(repo);
              }}
              className={`p-1.5 rounded-lg transition-colors ${
                isBookmarked 
                  ? 'text-action bg-action-soft border border-action-border' 
                  : 'text-txt-muted hover:text-action hover:bg-surface-active'
              }`}
              title={isBookmarked ? 'Remove from Vault' : 'Save in Vault'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

      </div>
    );
  }

  // Grid View
  return (
    <div 
      className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-surface hover:bg-surface-hover border border-themeline hover:border-action-border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer" 
      onClick={() => onOpenDetail(repo)}
    >
      {/* Top Bar: Owner & Actions */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={repo.owner.avatar_url}
              alt={repo.owner.login}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl ring-1 ring-themeline bg-surface-active flex-shrink-0 shadow-sm"
              loading="lazy"
            />
            <div className="min-w-0">
              <span className="text-[11px] font-sans font-medium text-txt-muted truncate block leading-tight">
                {repo.owner.login}
              </span>
              <a
                href={repo.html_url}
                target="_blank"
                rel="noreferrer"
                className="font-display font-bold text-txt-primary hover:text-action text-base sm:text-lg tracking-tight block truncate transition-colors leading-snug"
              >
                {repo.name}
              </a>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={copyCloneCommand}
              className="p-1.5 text-txt-muted hover:text-txt-primary hover:bg-surface-active rounded-lg transition-all"
              title={copied ? 'Copied git clone command!' : 'Copy clone command'}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleBookmark(repo);
              }}
              className={`p-1.5 rounded-lg transition-all ${
                isBookmarked 
                  ? 'text-action bg-action-soft border border-action-border' 
                  : 'text-txt-muted hover:text-action hover:bg-surface-active'
              }`}
              title={isBookmarked ? 'Remove from Vault' : 'Save in Vault'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs sm:text-[13px] text-txt-secondary line-clamp-3 mb-3 leading-relaxed min-h-[3rem] font-sans">
          {repo.description || 'No description provided for this repository.'}
        </p>

        {/* Topic Chips */}
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          {repo.topics.slice(0, 3).map((topic) => (
            <button
              key={topic}
              onClick={(e) => {
                e.stopPropagation();
                onSelectTopic(topic);
              }}
              className="text-[11px] font-sans font-medium bg-tag-bg text-tag-txt hover:text-tag-hoverTxt border border-tag-border hover:border-action px-2 py-0.5 rounded-md transition-colors truncate max-w-[130px]"
            >
              #{topic}
            </button>
          ))}
          {repo.topics.length > 3 && (
            <span className="text-[10px] font-sans font-medium text-txt-muted px-1 py-0.5">
              +{repo.topics.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Footer Info: Popularity, Language, Date */}
      <div className="pt-3 border-t border-themeline">
        <div className="flex items-center justify-between text-xs text-txt-muted mb-2.5 font-sans">
          {/* Language Dot */}
          {repo.language ? (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full shadow-sm flex-shrink-0" style={{ backgroundColor: langColor }} />
              <span className="font-medium text-txt-primary text-xs truncate max-w-[110px]">{repo.language}</span>
            </div>
          ) : (
            <span className="text-txt-muted/70 text-xs">Software</span>
          )}

          {/* Last Updated */}
          <div className="flex items-center gap-1 text-[11px] text-txt-muted" title={`Updated ${repo.updated_at}`}>
            <Calendar className="w-3.5 h-3.5 text-txt-muted flex-shrink-0" />
            <span className="truncate">{formatDate(repo.updated_at)}</span>
          </div>
        </div>

        {/* Metric Badges & Links */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Stars - Interactive Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar?.(repo);
              }}
              className={`flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-lg border shadow-sm transition-all hover:scale-105 active:scale-95 ${
                isStarred
                  ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/20'
                  : 'text-star bg-star-bg border-star-border hover:border-star'
              }`}
              title={
                hasToken
                  ? (isStarred ? 'Starred on GitHub! (Click to Unstar)' : 'Star this repository on GitHub')
                  : 'Click to star on GitHub (connect token in header)'
              }
            >
              <Star className={`w-3.5 h-3.5 flex-shrink-0 ${isStarred ? 'fill-current text-white animate-pulse' : 'fill-current text-star'}`} />
              <span>{formatNumber(effectiveStarCount)}</span>
            </button>

            {/* Forks */}
            <div className="flex items-center gap-1 text-xs font-mono font-medium text-txt-muted bg-surface-active border border-themeline px-2 py-1 rounded-lg">
              <GitFork className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{formatNumber(repo.forks_count)}</span>
            </div>
          </div>

          {/* External links */}
          <div className="flex items-center gap-1">
            {repo.homepage && (
              <a
                href={repo.homepage}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-txt-muted hover:text-action hover:bg-surface-active rounded-md transition-colors"
                title="Project Homepage"
              >
                <Globe className="w-3.5 h-3.5" />
              </a>
            )}
            <a
              href={repo.html_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-txt-muted hover:text-action hover:bg-surface-active px-2 py-1 rounded-md transition-colors"
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
