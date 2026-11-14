import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X, Star, GitFork, ExternalLink, Copy, Check,
  Bookmark, Download, Terminal, Globe, Scale,
  Calendar, FileText, Loader2, AlertCircle, ChevronDown
} from 'lucide-react';
import { marked } from 'marked';
import { Repository } from '../types';
import { getStoredToken } from '../services/githubApi';
import { LANGUAGE_COLORS } from '../data/curatedProjects';

interface RepoDetailPanelProps {
  repo: Repository | null;
  isBookmarked: boolean;
  onClose: () => void;
  onToggleBookmark: (repo: Repository) => void;
}

type ReadmeState = 'idle' | 'loading' | 'success' | 'error' | 'not_found';

// Configure marked with GFM (tables, code blocks, lists)
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Decodes base64 string handling UTF-8 properly (handles box-drawing chars, emojis, CJK, etc.)
 */
function decodeBase64Utf8(base64: string): string {
  try {
    const cleanB64 = base64.replace(/\s/g, '');
    const binaryString = atob(cleanB64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
    console.error('Failed to decode UTF-8 base64', e);
    try {
      return atob(base64.replace(/\s/g, ''));
    } catch {
      return '';
    }
  }
}

export const RepoDetailPanel: React.FC<RepoDetailPanelProps> = ({
  repo,
  isBookmarked,
  onClose,
  onToggleBookmark,
}) => {
  const [readmeContent, setReadmeContent] = useState<string>('');
  const [readmeState, setReadmeState] = useState<ReadmeState>('idle');
  const [cloneCopied, setCloneCopied] = useState(false);
  const [showFullReadme, setShowFullReadme] = useState(false);

  const fetchReadme = useCallback(async (r: Repository) => {
    setReadmeState('loading');
    setReadmeContent('');
    setShowFullReadme(false);

    const token = getStoredToken();
    const authHeader: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      // 1. Try requesting raw markdown directly (GitHub returns clean UTF-8 text)
      const resRaw = await fetch(
        `https://api.github.com/repos/${r.full_name}/readme`,
        {
          headers: {
            Accept: 'application/vnd.github.raw',
            ...authHeader,
          },
        }
      );

      if (resRaw.status === 404) {
        setReadmeState('not_found');
        return;
      }

      if (resRaw.ok) {
        const text = await resRaw.text();
        setReadmeContent(text);
        setReadmeState('success');
        return;
      }

      // 2. Fallback to standard v3 JSON API with base64 content
      const resJson = await fetch(
        `https://api.github.com/repos/${r.full_name}/readme`,
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
            ...authHeader,
          },
        }
      );

      if (resJson.status === 404) {
        setReadmeState('not_found');
        return;
      }

      if (!resJson.ok) {
        setReadmeState('error');
        return;
      }

      const data = await resJson.json();
      const decoded = decodeBase64Utf8(data.content || '');
      setReadmeContent(decoded);
      setReadmeState('success');
    } catch {
      setReadmeState('error');
    }
  }, []);

  useEffect(() => {
    if (repo) {
      fetchReadme(repo);
    } else {
      setReadmeState('idle');
      setReadmeContent('');
    }
  }, [repo, fetchReadme]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleReadmeLinkClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest('a');
    if (anchor && anchor.href) {
      e.preventDefault();
      e.stopPropagation();
      window.open(anchor.href, '_blank', 'noopener,noreferrer');
    }
  };

  const renderedHtml = useMemo(() => {
    if (!readmeContent) return '';
    try {
      return marked.parse(readmeContent) as string;
    } catch (e) {
      console.error('Markdown parse error', e);
      return `<pre><code>${readmeContent}</code></pre>`;
    }
  }, [readmeContent]);

  if (!repo) return null;

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
    return n.toString();
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return 'Recently'; }
  };

  const langColor = repo.language ? (LANGUAGE_COLORS[repo.language] || '#a7abbf') : '#a7abbf';
  const cloneUrl = `git clone ${repo.html_url}.git`;
  const zipUrl = `${repo.html_url}/archive/refs/heads/main.zip`;

  const handleCopyClone = () => {
    navigator.clipboard.writeText(cloneUrl);
    setCloneCopied(true);
    setTimeout(() => setCloneCopied(false), 2000);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl flex flex-col bg-white dark:bg-[#0e0f13] border-l border-neutral-200 dark:border-[#20212b] shadow-2xl animate-slideInRight overflow-hidden">

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-neutral-200 dark:border-[#20212b] bg-white dark:bg-[#111217] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={repo.owner.avatar_url}
              alt={repo.owner.login}
              className="w-10 h-10 rounded-xl ring-1 ring-neutral-200 dark:ring-[#262836] flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-mono text-neutral-500 dark:text-charcoal-400 truncate">{repo.owner.login}</p>
              <h2 className="font-display font-bold text-lg text-neutral-900 dark:text-white truncate leading-tight">
                {repo.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => onToggleBookmark(repo)}
              className={`p-2 rounded-xl transition-all ${
                isBookmarked
                  ? 'text-amber-600 dark:text-amber-brand bg-amber-500/10 border border-amber-500/20'
                  : 'text-neutral-400 hover:text-amber-600 hover:bg-neutral-100 dark:text-charcoal-400 dark:hover:text-amber-brand dark:hover:bg-[#1a1c26] border border-transparent'
              }`}
              title={isBookmarked ? 'Remove from Vault' : 'Save to Vault'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-600 dark:fill-amber-brand' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 dark:text-charcoal-400 dark:hover:text-white dark:hover:bg-[#1a1c26] rounded-xl border border-transparent transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── REPO META ── */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-[#1e202a] bg-neutral-50 dark:bg-[#0c0d10] flex-shrink-0 space-y-3">
          {/* Description */}
          {repo.description && (
            <p className="text-sm font-sans text-neutral-600 dark:text-charcoal-300 leading-relaxed">
              {repo.description}
            </p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-3 flex-wrap text-xs font-mono">
            <span className="flex items-center gap-1 font-bold text-amber-700 dark:text-amber-brand bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-lg">
              <Star className="w-3.5 h-3.5 fill-amber-600 dark:fill-amber-brand" />
              {formatNumber(repo.stargazers_count)}
            </span>
            <span className="flex items-center gap-1 text-neutral-600 dark:text-charcoal-300 bg-neutral-100 dark:bg-[#161720] border border-neutral-200 dark:border-[#242634] px-2.5 py-1 rounded-lg">
              <GitFork className="w-3.5 h-3.5" />
              {formatNumber(repo.forks_count)}
            </span>
            {repo.language && (
              <span className="flex items-center gap-1.5 text-neutral-700 dark:text-charcoal-300">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: langColor }} />
                {repo.language}
              </span>
            )}
            {repo.license && (
              <span className="flex items-center gap-1 text-neutral-500 dark:text-charcoal-400">
                <Scale className="w-3 h-3" />
                {repo.license.spdx_id || repo.license.name}
              </span>
            )}
            <span className="flex items-center gap-1 text-neutral-500 dark:text-charcoal-400">
              <Calendar className="w-3 h-3" />
              Updated {formatDate(repo.updated_at)}
            </span>
          </div>

          {/* Topics */}
          {repo.topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {repo.topics.map(t => (
                <span key={t} className="text-[11px] font-mono text-neutral-600 dark:text-charcoal-300 bg-neutral-100 dark:bg-[#161720] border border-neutral-200 dark:border-[#242634] px-2 py-0.5 rounded-md">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── README ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-neutral-400 dark:text-charcoal-400" />
            <span className="text-xs font-mono font-semibold text-neutral-500 dark:text-charcoal-400 uppercase tracking-wide">README</span>
          </div>

          {readmeState === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-7 h-7 text-amber-600 dark:text-amber-brand animate-spin" />
              <p className="text-xs font-mono text-neutral-500 dark:text-charcoal-400">Fetching README from GitHub…</p>
            </div>
          )}

          {readmeState === 'not_found' && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <FileText className="w-10 h-10 text-neutral-300 dark:text-charcoal-500 opacity-50" />
              <p className="text-sm font-display font-semibold text-neutral-500 dark:text-charcoal-400">No README found</p>
              <p className="text-xs font-sans text-neutral-400 dark:text-charcoal-500">This repository doesn't have a README.md file.</p>
            </div>
          )}

          {readmeState === 'error' && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <AlertCircle className="w-10 h-10 text-rose-400 opacity-60" />
              <p className="text-sm font-display font-semibold text-neutral-500 dark:text-charcoal-300">Failed to load README</p>
              <button
                onClick={() => fetchReadme(repo)}
                className="text-xs font-mono text-amber-700 dark:text-amber-brand hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {readmeState === 'success' && (
            <div className="relative">
              <div
                className={`readme-body ${!showFullReadme && readmeContent.length > 6000 ? 'max-h-[600px] overflow-hidden' : ''}`}
                onClick={handleReadmeLinkClick}
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
              {!showFullReadme && readmeContent.length > 6000 && (
                <div className="sticky bottom-0 pt-16 pb-2 bg-gradient-to-t from-white dark:from-[#0e0f13] via-white/80 dark:via-[#0e0f13]/80 to-transparent flex justify-center">
                  <button
                    onClick={() => setShowFullReadme(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-[#161720] dark:hover:bg-[#1e202c] dark:text-charcoal-200 border border-neutral-300 dark:border-[#242634] shadow-lg transition-all"
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-brand" />
                    <span>Expand full README</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── FOOTER — Download / Clone / Open ── */}
        <div className="flex-shrink-0 border-t border-neutral-200 dark:border-[#20212b] bg-white dark:bg-[#111217] p-4">
          <div className="flex items-center gap-2 flex-wrap">

            {/* Clone command pill */}
            <div className="flex items-center flex-1 min-w-0 bg-neutral-100 dark:bg-[#0c0d10] border border-neutral-200 dark:border-[#242634] rounded-xl px-3 py-2 gap-2 text-xs font-mono text-neutral-600 dark:text-charcoal-400 overflow-hidden">
              <Terminal className="w-3.5 h-3.5 flex-shrink-0 text-neutral-400 dark:text-charcoal-500" />
              <span className="truncate">git clone {repo.html_url}.git</span>
            </div>

            {/* Copy Clone button */}
            <button
              onClick={handleCopyClone}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold border transition-all flex-shrink-0 ${
                cloneCopied
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-neutral-100 dark:bg-[#161720] border-neutral-200 dark:border-[#242634] text-neutral-700 dark:text-charcoal-200 hover:border-amber-500/40 hover:text-amber-700 dark:hover:text-amber-brand'
              }`}
              title="Copy git clone command"
            >
              {cloneCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{cloneCopied ? 'Copied!' : 'Clone'}</span>
            </button>

            {/* Download ZIP */}
            <a
              href={zipUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold bg-neutral-100 dark:bg-[#161720] border border-neutral-200 dark:border-[#242634] text-neutral-700 dark:text-charcoal-200 hover:border-amber-500/40 hover:text-amber-700 dark:hover:text-amber-brand transition-all flex-shrink-0"
              title="Download ZIP archive"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ZIP</span>
            </a>

            {/* Homepage */}
            {repo.homepage && (
              <a
                href={repo.homepage}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold bg-neutral-100 dark:bg-[#161720] border border-neutral-200 dark:border-[#242634] text-neutral-700 dark:text-charcoal-200 hover:border-amber-500/40 hover:text-amber-700 dark:hover:text-amber-brand transition-all flex-shrink-0"
                title="Open project homepage"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Website</span>
              </a>
            )}

            {/* Open on GitHub */}
            <a
              href={repo.html_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold bg-amber-500 hover:bg-amber-400 dark:bg-amber-brand dark:hover:bg-amber-glow text-white dark:text-[#0c0d10] border border-amber-600/50 dark:border-amber-500/50 transition-all flex-shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>

          </div>
        </div>
      </div>
    </>
  );
};
