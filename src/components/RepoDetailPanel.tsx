import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X, Star, GitFork, ExternalLink, Copy, Check,
  Bookmark, Download, Terminal, Globe, Scale,
  Calendar, FileText, Loader2, AlertCircle, ChevronDown,
  Package, Tag, ArrowDownToLine, Clock, FolderArchive, ArrowLeft, Flame,
  Languages
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Repository, Release } from '../types';
import { getStoredToken, fetchRepositoryReleases, fetchRepoCompleteDetails } from '../services/githubApi';
import { LANGUAGE_COLORS } from '../data/curatedProjects';
import {
  translateMarkdownToEnglish,
  translateTextToEnglish,
  needsTranslation
} from '../services/translateService';

interface RepoDetailPanelProps {
  repo: Repository | null;
  isBookmarked: boolean;
  onClose: () => void;
  onToggleBookmark: (repo: Repository) => void;
  onBack?: () => void;
  backLabel?: string;
  isStarred?: boolean;
  starCount?: number;
  hasToken?: boolean;
  onToggleStar?: (repo: Repository) => void;
}

type ReadmeState = 'idle' | 'loading' | 'success' | 'error' | 'not_found';
type ActiveTab = 'readme' | 'releases';

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

function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export const RepoDetailPanel: React.FC<RepoDetailPanelProps> = ({
  repo,
  isBookmarked,
  onClose,
  onToggleBookmark,
  onBack,
  backLabel,
  isStarred = false,
  starCount,
  hasToken = false,
  onToggleStar,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('readme');
  const [readmeContent, setReadmeContent] = useState<string>('');
  const [readmeState, setReadmeState] = useState<ReadmeState>('idle');
  const [cloneCopied, setCloneCopied] = useState(false);
  const [showFullReadme, setShowFullReadme] = useState(false);

  // Releases state
  const [releases, setReleases] = useState<Release[]>([]);
  const [releasesLoading, setReleasesLoading] = useState<boolean>(false);
  const [selectedReleaseIndex, setSelectedReleaseIndex] = useState<number>(0);

  // Translation state
  const [isTranslated, setIsTranslated] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translatedHtml, setTranslatedHtml] = useState<string>('');

  const [isDescTranslated, setIsDescTranslated] = useState<boolean>(false);
  const [isTranslatingDesc, setIsTranslatingDesc] = useState<boolean>(false);
  const [translatedDesc, setTranslatedDesc] = useState<string>('');

  const fetchReadme = useCallback(async (r: Repository) => {
    setReadmeState('loading');
    setReadmeContent('');
    setShowFullReadme(false);

    const token = getStoredToken();
    const authHeader: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      // 0. Try public raw GitHub Fastly CDN first (FAST and NO API RATE LIMIT!)
      const branches = ['HEAD', 'main', 'master'];
      for (const branch of branches) {
        try {
          const rawCdnRes = await fetch(`https://raw.githubusercontent.com/${r.full_name}/${branch}/README.md`);
          if (rawCdnRes.ok) {
            const cdnText = await rawCdnRes.text();
            if (cdnText && cdnText.length > 20) {
              setReadmeContent(cdnText);
              setReadmeState('success');
              return;
            }
          }
        } catch {}
      }

      // 1. Fallback to requesting raw markdown directly via API
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

      // 2. Fallback to standard JSON endpoint and decode UTF-8 base64
      const resJson = await fetch(
        `https://api.github.com/repos/${r.full_name}/readme`,
        { headers: authHeader }
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
      if (data.content && data.encoding === 'base64') {
        const decoded = decodeBase64Utf8(data.content);
        setReadmeContent(decoded);
        setReadmeState('success');
      } else {
        setReadmeState('error');
      }
    } catch {
      setReadmeState('error');
    }
  }, []);

  const fetchReleases = useCallback(async (r: Repository) => {
    setReleasesLoading(true);
    try {
      // 1. Grouped GraphQL Query: Try single-request aggregator first when token is connected
      const complete = await fetchRepoCompleteDetails(r.full_name);
      if (complete && complete.releases && complete.releases.length > 0) {
        setReleases(complete.releases);
        setSelectedReleaseIndex(0);
        return;
      }

      // 2. Fall back to cached REST release loader
      const data = await fetchRepositoryReleases(r.full_name);
      setReleases(data);
      setSelectedReleaseIndex(0);
    } catch (e) {
      console.warn('Failed to fetch releases', e);
      setReleases([]);
    } finally {
      setReleasesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (repo) {
      fetchReadme(repo);
      fetchReleases(repo);
      setActiveTab('readme');
      setIsTranslated(false);
      setTranslatedHtml('');
      setIsDescTranslated(false);
      setTranslatedDesc('');
    }
  }, [repo, fetchReadme, fetchReleases]);

  const handleToggleTranslate = async () => {
    if (isTranslated) {
      setIsTranslated(false);
      return;
    }

    if (translatedHtml) {
      setIsTranslated(true);
      return;
    }

    if (!readmeContent) return;
    setIsTranslating(true);
    try {
      const translatedMd = await translateMarkdownToEnglish(readmeContent);
      const parsed = marked.parse(translatedMd) as string;
      const sanitized = DOMPurify.sanitize(parsed, {
        ADD_ATTR: ['target', 'rel'],
      });
      setTranslatedHtml(sanitized);
      setIsTranslated(true);
    } catch (e) {
      console.warn('Desktop README translation failed:', e);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleToggleDescTranslate = async () => {
    if (isDescTranslated) {
      setIsDescTranslated(false);
      return;
    }

    if (translatedDesc) {
      setIsDescTranslated(true);
      return;
    }

    if (!repo?.description) return;
    setIsTranslatingDesc(true);
    try {
      const res = await translateTextToEnglish(repo.description);
      setTranslatedDesc(res);
      setIsDescTranslated(true);
    } catch (e) {
      console.warn('Desktop description translation failed:', e);
    } finally {
      setIsTranslatingDesc(false);
    }
  };

  // Handle ESC key to close modal or go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onBack) {
          onBack();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onBack]);

  // Intercept anchor link clicks inside rendered markdown so app navigation is protected
  const handleReadmeLinkClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    // Anchor hash links within page
    if (href.startsWith('#')) {
      e.preventDefault();
      const el = document.getElementById(href.slice(1));
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Relative links pointing to files in repo -> redirect to github.com
    if (repo && !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('mailto:')) {
      e.preventDefault();
      const fullUrl = `https://github.com/${repo.full_name}/blob/main/${href.replace(/^\.?\//, '')}`;
      window.open(fullUrl, '_blank', 'noreferrer,noopener');
      return;
    }

    // Absolute URLs -> open in user's external default browser
    if (href.startsWith('http://') || href.startsWith('https://')) {
      e.preventDefault();
      window.open(href, '_blank', 'noreferrer,noopener');
    }
  };

  const renderedHtml = useMemo(() => {
    if (!readmeContent) return '';
    try {
      const parsed = marked.parse(readmeContent) as string;
      return DOMPurify.sanitize(parsed, {
        ADD_ATTR: ['target', 'rel'],
      });
    } catch {
      return '<p>Error rendering markdown.</p>';
    }
  }, [readmeContent]);

  if (!repo) return null;

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

  const currentRelease = releases[selectedReleaseIndex] || null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/60 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      {/* ── Centered Modal Container with Padding from Edges ── */}
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-surface border border-themeline text-txt-primary rounded-2xl shadow-2xl overflow-hidden transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between gap-4 p-4 sm:p-5 border-b border-themeline bg-surface-active flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-surface hover:bg-surface-hover text-txt-primary hover:text-action border border-themeline hover:border-action-border transition-all mr-1 shadow-sm group flex items-center justify-center flex-shrink-0"
                title={backLabel || "Back to Trending"}
              >
                <ArrowLeft className="w-4 h-4 text-action group-hover:-translate-x-0.5 transition-transform" />
              </button>
            )}
            <img
              src={repo.owner.avatar_url}
              alt={repo.owner.login}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl ring-1 ring-themeline flex-shrink-0 shadow-sm"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-txt-muted truncate">
                  {repo.owner.login}
                </span>
                {repo.license && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-txt-muted bg-surface px-2 py-0.5 rounded-md border border-themeline">
                    <Scale className="w-3 h-3" />
                    {repo.license.spdx_id || repo.license.name}
                  </span>
                )}
              </div>
              <h2 className="font-display font-bold text-base sm:text-lg md:text-xl text-txt-primary truncate leading-tight mt-0.5">
                {repo.name}
              </h2>
            </div>
          </div>

          {/* Quick Actions & Cross Close Button */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => onToggleBookmark(repo)}
              className={`p-2 rounded-xl transition-all ${
                isBookmarked
                  ? 'text-action bg-action-soft border border-action-border'
                  : 'text-txt-muted hover:text-action hover:bg-surface border border-transparent'
              }`}
              title={isBookmarked ? 'Remove from Vault' : 'Save to Vault'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-txt-muted hover:text-txt-primary hover:bg-surface rounded-xl border border-transparent transition-all"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── REPO META & TAB SWITCHER ── */}
        <div className="px-5 py-3.5 border-b border-themeline bg-surface-active/70 flex-shrink-0 space-y-3">
          {/* Description */}
          {repo.description && (
            <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
              <p className="text-xs sm:text-sm font-sans text-txt-secondary leading-relaxed">
                {isDescTranslated ? translatedDesc : repo.description}
              </p>
              {needsTranslation(repo.description) && (
                <button
                  onClick={handleToggleDescTranslate}
                  disabled={isTranslatingDesc}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-surface hover:bg-surface-active border border-themeline hover:border-action text-txt-muted hover:text-action transition-all shadow-sm"
                  title="Translate repository description to English"
                >
                  {isTranslatingDesc ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Languages className="w-3.5 h-3.5" />
                  )}
                  <span>{isDescTranslated ? 'Show Original' : 'Translate to English'}</span>
                </button>
              )}
            </div>
          )}

          {/* Quick Meta Row */}
          <div className="flex items-center justify-between gap-4 flex-wrap text-xs font-mono">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => onToggleStar?.(repo)}
                className={`flex items-center gap-1.5 font-bold px-3 py-1 rounded-lg border shadow-sm transition-all hover:scale-105 active:scale-95 ${
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
                <span>{(starCount !== undefined ? starCount : repo.stargazers_count).toLocaleString()} {isStarred ? 'Starred' : 'stars'}</span>
              </button>
              <span className="flex items-center gap-1 text-txt-muted bg-surface px-2.5 py-1 rounded-lg border border-themeline">
                <GitFork className="w-3.5 h-3.5" />
                {repo.forks_count.toLocaleString()} forks
              </span>
              {repo.language && (
                <span className="flex items-center gap-1.5 text-txt-primary">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: langColor }} />
                  {repo.language}
                </span>
              )}
              <span className="flex items-center gap-1 text-txt-muted">
                <Calendar className="w-3 h-3" />
                Updated {formatDate(repo.updated_at)}
              </span>
            </div>

            {/* Content Tabs: README vs Releases */}
            <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-themeline self-start sm:self-auto shadow-sm">
              <button
                onClick={() => setActiveTab('readme')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  activeTab === 'readme'
                    ? 'bg-action text-txt-inverse font-bold shadow-sm'
                    : 'text-txt-muted hover:text-txt-primary'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>README</span>
              </button>

              <button
                onClick={() => setActiveTab('releases')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  activeTab === 'releases'
                    ? 'bg-action text-txt-inverse font-bold shadow-sm'
                    : 'text-txt-muted hover:text-txt-primary'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Releases</span>
                {releases.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === 'releases'
                      ? 'bg-white/20 text-txt-inverse'
                      : 'bg-action-soft text-action'
                  }`}>
                    {releases.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── TAB 1: README VIEW ── */}
        {activeTab === 'readme' && (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {readmeState === 'loading' && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 text-action animate-spin" />
                <p className="text-xs font-mono text-txt-muted">
                  Fetching README from GitHub…
                </p>
              </div>
            )}

            {readmeState === 'not_found' && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <FileText className="w-12 h-12 text-txt-muted/30 opacity-60" />
                <p className="text-base font-display font-semibold text-txt-muted">
                  No README found
                </p>
                <p className="text-xs font-sans text-txt-muted/70">
                  This repository does not have a README.md file in its primary branch.
                </p>
              </div>
            )}

            {readmeState === 'error' && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <AlertCircle className="w-12 h-12 text-rose-500 opacity-60" />
                <p className="text-base font-display font-semibold text-txt-muted">
                  Failed to load README
                </p>
                <button
                  onClick={() => fetchReadme(repo)}
                  className="text-xs font-mono text-action hover:underline"
                >
                  Try again
                </button>
              </div>
            )}

            {readmeState === 'success' && (
              <div className="relative">
                {/* Translation Controls Bar */}
                <div className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-themeline flex-wrap">
                  <span className="text-xs font-mono text-txt-muted">
                    {isTranslated ? 'Translated into English (Google Edge CDN)' : 'Original repository documentation'}
                  </span>
                  <button
                    onClick={handleToggleTranslate}
                    disabled={isTranslating}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shadow-sm ${
                      isTranslated
                        ? 'bg-action text-txt-inverse'
                        : 'bg-surface-active hover:bg-surface text-txt-primary border border-themeline hover:border-action-border'
                    }`}
                  >
                    {isTranslating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Languages className="w-3.5 h-3.5" />
                    )}
                    <span>{isTranslated ? 'Show Original' : 'Translate to English'}</span>
                  </button>
                </div>

                <div
                  className={`readme-body ${!showFullReadme && (isTranslated ? (translatedHtml || renderedHtml) : readmeContent).length > 7000 ? 'max-h-[620px] overflow-hidden' : ''}`}
                  onClick={handleReadmeLinkClick}
                  dangerouslySetInnerHTML={{ __html: isTranslated ? (translatedHtml || renderedHtml) : renderedHtml }}
                />
                {!showFullReadme && readmeContent.length > 7000 && (
                  <div className="sticky bottom-0 pt-20 pb-2 bg-gradient-to-t from-surface via-surface to-transparent flex justify-center">
                    <button
                      onClick={() => setShowFullReadme(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-surface-active hover:bg-surface text-txt-primary border border-themeline shadow-lg transition-all"
                    >
                      <ChevronDown className="w-3.5 h-3.5 text-action" />
                      <span>Expand full README</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: RELEASES & DIRECT DOWNLOADS ── */}
        {activeTab === 'releases' && (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {releasesLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 text-action animate-spin" />
                <p className="text-xs font-mono text-txt-muted">
                  Querying GitHub for official releases & binary assets…
                </p>
              </div>
            ) : releases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Package className="w-12 h-12 text-txt-muted/30" />
                <h4 className="text-base font-display font-bold text-txt-primary">
                  No Releases Published
                </h4>
                <p className="text-xs font-sans text-txt-muted max-w-md">
                  This repository has not published formal GitHub Releases yet. You can still download the complete source code archive directly.
                </p>
                <a
                  href={zipUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold bg-action text-txt-inverse hover:opacity-90 shadow-sm transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Source Code (main.zip)</span>
                </a>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Release Selector Tabs (if multiple releases) */}
                {releases.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    <span className="text-xs font-mono text-txt-muted flex-shrink-0">
                      Version:
                    </span>
                    {releases.map((rel, idx) => (
                      <button
                        key={rel.id}
                        onClick={() => setSelectedReleaseIndex(idx)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono whitespace-nowrap transition-all ${
                          selectedReleaseIndex === idx
                            ? 'bg-action text-txt-inverse font-bold shadow-sm'
                            : 'bg-surface-active hover:bg-surface text-txt-primary border border-themeline'
                        }`}
                      >
                        {rel.tag_name} {idx === 0 ? '(Latest)' : ''}
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Release Card Banner */}
                {currentRelease && (
                  <div className="p-4 rounded-2xl bg-surface-active border border-themeline space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-action-soft text-action border border-action-border">
                            <Tag className="w-3.5 h-3.5" />
                            {currentRelease.tag_name}
                          </span>
                          {selectedReleaseIndex === 0 && (
                            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-bold border border-emerald-500/30">
                              Latest Release
                            </span>
                          )}
                          {currentRelease.prerelease && (
                            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 font-bold border border-amber-500/30">
                              Pre-release
                            </span>
                          )}
                        </div>
                        <h3 className="font-display font-bold text-base sm:text-lg text-txt-primary mt-1.5">
                          {currentRelease.name || currentRelease.tag_name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono text-txt-muted">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Published {formatDate(currentRelease.published_at)}</span>
                      </div>
                    </div>

                    {/* Direct Downloadable Assets Header */}
                    <div className="pt-2">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-txt-muted mb-2 uppercase tracking-wide">
                        <ArrowDownToLine className="w-4 h-4 text-action" />
                        <span>Available Downloads & Executables ({currentRelease.assets.length})</span>
                      </div>

                      {/* Assets List */}
                      {currentRelease.assets.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                          {currentRelease.assets.map((asset) => (
                            <div
                              key={asset.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-surface hover:bg-surface-hover border border-themeline transition-all gap-3"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Package className="w-4 h-4 text-action flex-shrink-0" />
                                <div className="min-w-0">
                                  <span className="font-mono text-xs sm:text-[13px] font-bold text-txt-primary block truncate">
                                    {asset.name}
                                  </span>
                                  <div className="flex items-center gap-2 text-[11px] font-mono text-txt-muted">
                                    <span>{formatBytes(asset.size)}</span>
                                    {asset.download_count > 0 && (
                                      <span>• {asset.download_count.toLocaleString()} downloads</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <a
                                href={asset.browser_download_url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-action text-txt-inverse hover:opacity-90 transition-all flex-shrink-0 shadow-sm"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download</span>
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs font-sans text-txt-muted">
                          No binary artifacts attached to this tag. You can download the source archives below.
                        </p>
                      )}

                      {/* Source Code Downloads */}
                      <div className="mt-3 pt-3 border-t border-themeline flex items-center gap-2 flex-wrap text-xs font-mono">
                        <span className="text-txt-muted flex items-center gap-1">
                          <FolderArchive className="w-3.5 h-3.5" /> Source Code:
                        </span>
                        <a
                          href={`${repo.html_url}/archive/refs/tags/${currentRelease.tag_name}.zip`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-md bg-surface border border-themeline text-txt-primary hover:text-action transition-colors"
                        >
                          zip
                        </a>
                        <a
                          href={`${repo.html_url}/archive/refs/tags/${currentRelease.tag_name}.tar.gz`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-md bg-surface border border-themeline text-txt-primary hover:text-action transition-colors"
                        >
                          tar.gz
                        </a>
                      </div>
                    </div>

                    {/* Release Notes / Description */}
                    {currentRelease.body && (
                      <div className="pt-2">
                        <details className="text-xs font-sans text-txt-muted cursor-pointer">
                          <summary className="font-mono font-semibold text-txt-primary hover:underline mb-2">
                            View Release Notes / Changelog
                          </summary>
                          <div
                            className="readme-body max-h-60 overflow-y-auto p-3 rounded-xl bg-surface border border-themeline"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(currentRelease.body) as string) }}
                          />
                        </details>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── FOOTER — Download / Clone / Open ── */}
        <div className="flex-shrink-0 border-t border-themeline bg-surface-active p-4">
          <div className="flex items-center gap-2 flex-wrap">

            {/* Clone command pill */}
            <div className="flex items-center flex-1 min-w-0 bg-surface border border-themeline rounded-xl px-3 py-2 gap-2 text-xs font-mono text-txt-primary overflow-hidden">
              <Terminal className="w-3.5 h-3.5 flex-shrink-0 text-txt-muted" />
              <span className="truncate">git clone {repo.html_url}.git</span>
            </div>

            {/* Copy Clone button */}
            <button
              onClick={handleCopyClone}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold border transition-all flex-shrink-0 ${
                cloneCopied
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                  : 'bg-surface border-themeline text-txt-primary hover:border-action-border hover:text-action'
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold bg-surface border border-themeline text-txt-primary hover:border-action-border hover:text-action transition-all flex-shrink-0"
              title="Download main branch ZIP archive"
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold bg-surface border border-themeline text-txt-primary hover:border-action-border hover:text-action transition-all flex-shrink-0"
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold bg-action hover:opacity-90 text-txt-inverse border border-action transition-all flex-shrink-0 shadow-md font-bold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>

          </div>
        </div>

      </div>
    </div>
  );
};
