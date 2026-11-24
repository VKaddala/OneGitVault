import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Star, GitFork, ExternalLink, Copy, Check,
  Bookmark, Download, Terminal, Globe, Scale,
  Calendar, FileText, Loader2, AlertCircle, ChevronDown,
  Package, Tag, ArrowDownToLine, Clock, FolderArchive, ArrowLeft,
  Languages, User, CircleDot, GitBranch, Hash, Sparkles,
  PanelRightClose, PanelRightOpen, Info
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

interface RepoDetailViewProps {
  repo: Repository;
  onBack: () => void;
  backLabel?: string;
  isBookmarked: boolean;
  onToggleBookmark: (repo: Repository) => void;
  isStarred?: boolean;
  starCount?: number;
  hasToken?: boolean;
  onToggleStar?: (repo: Repository) => void;
}

type ReadmeState = 'idle' | 'loading' | 'success' | 'error' | 'not_found';
type ActiveTab = 'readme' | 'releases' | 'info';

marked.setOptions({
  gfm: true,
  breaks: true,
});

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

export const RepoDetailView: React.FC<RepoDetailViewProps> = ({
  repo,
  onBack,
  backLabel = 'Back',
  isBookmarked,
  onToggleBookmark,
  isStarred = false,
  starCount,
  hasToken = false,
  onToggleStar,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('info');
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
      // 0. Public Fastly CDN first (fast & unmetered)
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

      // 1. Fallback to API raw markdown
      const resRaw = await fetch(
        `https://api.github.com/repos/${r.full_name}/readme`,
        { headers: { Accept: 'application/vnd.github.raw', ...authHeader } }
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

      // 2. Fallback to JSON endpoint and decode UTF-8 base64
      const resJson = await fetch(`https://api.github.com/repos/${r.full_name}/readme`, { headers: authHeader });
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
      const complete = await fetchRepoCompleteDetails(r.full_name);
      if (complete && complete.releases && complete.releases.length > 0) {
        setReleases(complete.releases);
        setSelectedReleaseIndex(0);
        return;
      }

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
    fetchReadme(repo);
    fetchReleases(repo);
    setActiveTab('info');
    setIsTranslated(false);
    setTranslatedHtml('');
    setIsDescTranslated(false);
    setTranslatedDesc('');
  }, [repo, fetchReadme, fetchReleases]);

  // Handle ESC key to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

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
      const sanitized = DOMPurify.sanitize(parsed, { ADD_ATTR: ['target', 'rel'] });
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

  const handleReadmeLinkClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    if (href.startsWith('#')) {
      e.preventDefault();
      const el = document.getElementById(href.slice(1));
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('mailto:')) {
      e.preventDefault();
      const fullUrl = `https://github.com/${repo.full_name}/blob/main/${href.replace(/^\.?\//, '')}`;
      window.open(fullUrl, '_blank', 'noreferrer,noopener');
      return;
    }

    if (href.startsWith('http://') || href.startsWith('https://')) {
      e.preventDefault();
      window.open(href, '_blank', 'noreferrer,noopener');
    }
  };

  const renderedHtml = useMemo(() => {
    if (!readmeContent) return '';
    try {
      const parsed = marked.parse(readmeContent) as string;
      return DOMPurify.sanitize(parsed, { ADD_ATTR: ['target', 'rel'] });
    } catch {
      return '<p>Error rendering markdown.</p>';
    }
  }, [readmeContent]);

  const formatDate = (d?: string) => {
    if (!d) return 'Recently';
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
    <div className="w-full max-w-[2400px] mx-auto px-3 sm:px-5 lg:px-6 py-4 flex flex-col gap-4 animate-fadeIn">
      {/* ── Top Navigation Bar: Back & Quick Actions (Sticky so it stays visible while reading) ── */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-surface/95 backdrop-blur-md border border-themeline shadow-sm flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-active hover:bg-surface text-txt-primary hover:text-action border border-themeline hover:border-action-border text-xs sm:text-sm font-display font-bold transition-all shadow-sm group"
        >
          <ArrowLeft className="w-4 h-4 text-action group-hover:-translate-x-1 transition-transform" />
          <span>{backLabel}</span>
        </button>

        {/* Quick External Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Star button */}
          <button
            onClick={() => onToggleStar?.(repo)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all shadow-sm ${
              isStarred
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-surface-active hover:bg-surface text-star border-themeline hover:border-star-border'
            }`}
            title={hasToken ? (isStarred ? 'Starred! (Click to unstar)' : 'Star repo on GitHub') : 'Connect token in settings to star'}
          >
            <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-current text-white animate-pulse' : 'fill-current text-star'}`} />
            <span>{(starCount !== undefined ? starCount : repo.stargazers_count).toLocaleString()}</span>
          </button>

          {/* Bookmark / Vault button */}
          <button
            onClick={() => onToggleBookmark(repo)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all shadow-sm ${
              isBookmarked
                ? 'bg-action text-txt-inverse border-action'
                : 'bg-surface-active hover:bg-surface text-txt-primary border-themeline hover:text-action'
            }`}
            title={isBookmarked ? 'Remove from Vault' : 'Save to Vault'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
            <span>{isBookmarked ? 'Saved' : 'Save'}</span>
          </button>

          {/* Download ZIP */}
          <a
            href={zipUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-surface-active hover:bg-surface border border-themeline text-txt-primary hover:text-action transition-all"
            title="Download ZIP"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ZIP</span>
          </a>

          {/* Website */}
          {repo.homepage && (
            <a
              href={repo.homepage}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-surface-active hover:bg-surface border border-themeline text-txt-primary hover:text-action transition-all"
              title="Open Website"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Website</span>
            </a>
          )}

          {/* GitHub Link */}
          <a
            href={repo.html_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-action hover:opacity-90 text-txt-inverse border border-action transition-all shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>
        </div>
      </div>

      {/* ── Main Content Container (Full Width) ── */}
      <div className="w-full space-y-4 pb-16">
          
          {/* Header Card */}
          <div className="p-5 rounded-2xl bg-surface border border-themeline shadow-sm space-y-3">
            <div className="flex items-start gap-4">
              <img
                src={repo.owner.avatar_url}
                alt={repo.owner.login}
                className="w-12 h-12 rounded-2xl ring-1 ring-themeline bg-surface-active flex-shrink-0 shadow-sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-txt-muted">{repo.owner.login}</span>
                  {repo.license && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-txt-muted bg-surface-active px-2 py-0.5 rounded-md border border-themeline">
                      <Scale className="w-3 h-3" />
                      {repo.license.spdx_id || repo.license.name}
                    </span>
                  )}
                </div>

                <h1 className="font-display font-bold text-xl sm:text-2xl text-txt-primary leading-tight mt-0.5 truncate">
                  {repo.name}
                </h1>

                {/* Description with Translation button */}
                {repo.description && (
                  <div className="flex items-start justify-between gap-3 mt-2 flex-wrap sm:flex-nowrap">
                    <p className="text-xs sm:text-sm font-sans text-txt-secondary leading-relaxed">
                      {isDescTranslated ? translatedDesc : repo.description}
                    </p>
                    {needsTranslation(repo.description) && (
                      <button
                        onClick={handleToggleDescTranslate}
                        disabled={isTranslatingDesc}
                        className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-surface-active hover:bg-surface border border-themeline text-txt-muted hover:text-action transition-all shadow-sm"
                        title="Translate description to English"
                      >
                        {isTranslatingDesc ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Languages className="w-3.5 h-3.5" />
                        )}
                        <span>{isDescTranslated ? 'Show Original' : 'Translate'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tabs Header: Info, README & Releases */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-themeline flex-wrap">
              <div className="flex items-center gap-1 bg-surface-active p-1 rounded-xl border border-themeline">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                    activeTab === 'info'
                      ? 'bg-action text-txt-inverse font-bold shadow-sm'
                      : 'text-txt-muted hover:text-txt-primary'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Info</span>
                </button>

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
                      activeTab === 'releases' ? 'bg-white/20 text-white' : 'bg-action-soft text-action'
                    }`}>
                      {releases.length}
                    </span>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {activeTab === 'readme' && readmeState === 'success' && (
                  <button
                    onClick={handleToggleTranslate}
                    disabled={isTranslating}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all shadow-sm ${
                      isTranslated
                        ? 'bg-action text-txt-inverse'
                        : 'bg-surface-active hover:bg-surface text-txt-primary border border-themeline'
                    }`}
                  >
                    {isTranslating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Languages className="w-3.5 h-3.5" />
                    )}
                    <span>{isTranslated ? 'Original' : 'Translate README'}</span>
                  </button>
                )}
              </div>
            </div>

          {/* Main Tab Content */}
          <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-themeline shadow-sm">
            {activeTab === 'readme' ? (
              <div>
                {readmeState === 'loading' && (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="w-8 h-8 text-action animate-spin" />
                    <p className="text-xs font-mono text-txt-muted">Fetching README from GitHub…</p>
                  </div>
                )}

                {readmeState === 'not_found' && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <FileText className="w-12 h-12 text-txt-muted/30 opacity-60" />
                    <p className="text-sm font-display font-semibold text-txt-muted">No README found</p>
                    <p className="text-xs font-sans text-txt-muted/70">
                      This repository does not have a README.md file in its primary branch.
                    </p>
                  </div>
                )}

                {readmeState === 'error' && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <AlertCircle className="w-12 h-12 text-rose-500 opacity-60" />
                    <p className="text-sm font-display font-semibold text-txt-muted">Failed to load README</p>
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
                    <div
                      className={`readme-body ${!showFullReadme && (isTranslated ? (translatedHtml || renderedHtml) : readmeContent).length > 7000 ? 'max-h-[700px] overflow-hidden' : ''}`}
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
            ) : (
              /* Releases Tab */
              <div>
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
                    <h4 className="text-base font-display font-bold text-txt-primary">No Releases Published</h4>
                    <p className="text-xs font-sans text-txt-muted max-w-md">
                      This repository has not published formal GitHub Releases yet. You can still download the source archive directly.
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
                  <div className="space-y-4">
                    {/* Release Selector Tabs */}
                    {releases.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        <span className="text-xs font-mono text-txt-muted flex-shrink-0">Version:</span>
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

                    {/* Selected Release Card */}
                    {currentRelease && (
                      <div className="p-4 rounded-xl bg-surface-active border border-themeline space-y-3">
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

                        {/* Downloadable Assets */}
                        <div className="pt-1">
                          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-txt-muted mb-2 uppercase tracking-wide">
                            <ArrowDownToLine className="w-4 h-4 text-action" />
                            <span>Available Downloads ({currentRelease.assets.length})</span>
                          </div>

                          {currentRelease.assets.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2">
                              {currentRelease.assets.map((asset) => (
                                <div
                                  key={asset.id}
                                  className="flex items-center justify-between p-2.5 rounded-xl bg-surface hover:bg-surface-hover border border-themeline transition-all gap-3"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Package className="w-4 h-4 text-action flex-shrink-0" />
                                    <div className="min-w-0">
                                      <span className="font-mono text-xs font-bold text-txt-primary block truncate">
                                        {asset.name}
                                      </span>
                                      <span className="text-[10px] font-mono text-txt-muted">
                                        {formatBytes(asset.size)} {asset.download_count > 0 ? `• ${asset.download_count.toLocaleString()} downloads` : ''}
                                      </span>
                                    </div>
                                  </div>

                                  <a
                                    href={asset.browser_download_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold bg-action text-txt-inverse hover:opacity-90 transition-all flex-shrink-0 shadow-sm"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                  </a>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs font-sans text-txt-muted">
                              No binary artifacts attached to this release. You can download the source archives below.
                            </p>
                          )}

                          {/* Source Code Archives */}
                          <div className="mt-3 pt-2 border-t border-themeline flex items-center gap-2 flex-wrap text-xs font-mono">
                            <span className="text-txt-muted flex items-center gap-1">
                              <FolderArchive className="w-3.5 h-3.5" /> Source:
                            </span>
                            <a
                              href={`${repo.html_url}/archive/refs/tags/${currentRelease.tag_name}.zip`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 rounded-md bg-surface border border-themeline text-txt-primary hover:text-action transition-colors"
                            >
                              zip
                            </a>
                            <a
                              href={`${repo.html_url}/archive/refs/tags/${currentRelease.tag_name}.tar.gz`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 rounded-md bg-surface border border-themeline text-txt-primary hover:text-action transition-colors"
                            >
                              tar.gz
                            </a>
                          </div>
                        </div>

                        {/* Changelog / Notes */}
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

            {/* 3. Info Tab */}
            {activeTab === 'info' && (
              <div className="space-y-4 animate-fadeIn">
                {/* Repository Specifications Grid */}
                <div className="p-4 sm:p-5 rounded-xl bg-surface-active border border-themeline space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-themeline">
                    <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-txt-primary flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-action" />
                      <span>Repository Specifications & Metadata</span>
                    </h3>
                    <span className="text-[11px] font-mono text-txt-muted">
                      Branch: <span className="text-action font-semibold">main</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs font-mono pt-1">
                    <div className="p-3 rounded-lg bg-surface border border-themeline space-y-1">
                      <span className="text-[10px] text-txt-muted block uppercase">Stars</span>
                      <span className="font-bold text-sm text-star flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{(starCount !== undefined ? starCount : repo.stargazers_count).toLocaleString()}</span>
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-surface border border-themeline space-y-1">
                      <span className="text-[10px] text-txt-muted block uppercase">Forks</span>
                      <span className="font-bold text-sm text-txt-primary flex items-center gap-1.5">
                        <GitFork className="w-3.5 h-3.5 text-action" />
                        <span>{repo.forks_count.toLocaleString()}</span>
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-surface border border-themeline space-y-1">
                      <span className="text-[10px] text-txt-muted block uppercase">Open Issues</span>
                      <span className="font-bold text-sm text-txt-primary flex items-center gap-1.5">
                        <CircleDot className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{repo.open_issues_count.toLocaleString()}</span>
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-surface border border-themeline space-y-1">
                      <span className="text-[10px] text-txt-muted block uppercase">Language</span>
                      <span className="font-bold text-sm text-txt-primary flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: langColor }} />
                        <span>{repo.language || 'Plain Text'}</span>
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-surface border border-themeline space-y-1">
                      <span className="text-[10px] text-txt-muted block uppercase">License</span>
                      <span className="font-bold text-sm text-txt-primary flex items-center gap-1.5 truncate">
                        <Scale className="w-3.5 h-3.5 text-txt-muted flex-shrink-0" />
                        <span className="truncate">{repo.license?.spdx_id || repo.license?.name || 'None Specified'}</span>
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-surface border border-themeline space-y-1">
                      <span className="text-[10px] text-txt-muted block uppercase">Created</span>
                      <span className="font-medium text-xs text-txt-secondary flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-txt-muted flex-shrink-0" />
                        <span>{formatDate(repo.created_at)}</span>
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-surface border border-themeline space-y-1">
                      <span className="text-[10px] text-txt-muted block uppercase">Last Updated</span>
                      <span className="font-medium text-xs text-txt-secondary flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-txt-muted flex-shrink-0" />
                        <span>{formatDate(repo.updated_at)}</span>
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-surface border border-themeline space-y-1">
                      <span className="text-[10px] text-txt-muted block uppercase">Default Branch</span>
                      <span className="font-semibold text-xs text-txt-primary flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5 text-action flex-shrink-0" />
                        <span>main</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Author Card & Git Clone Command Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Author / Organization Card */}
                  <div className="p-4 rounded-xl bg-surface-active border border-themeline space-y-2.5">
                    <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-txt-muted flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-action" />
                      <span>Author / Organization</span>
                    </h3>
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={repo.owner.avatar_url}
                          alt={repo.owner.login}
                          className="w-10 h-10 rounded-xl ring-1 ring-themeline bg-surface shadow-sm"
                        />
                        <div className="min-w-0">
                          <span className="text-sm font-display font-bold text-txt-primary block truncate">
                            {repo.owner.login}
                          </span>
                          <span className="text-[10px] font-mono text-txt-muted">Repository Maintainer</span>
                        </div>
                      </div>
                      <a
                        href={repo.owner.html_url || `https://github.com/${repo.owner.login}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-themeline text-xs font-mono font-medium text-txt-primary hover:text-action transition-all shadow-sm flex-shrink-0"
                      >
                        <span>Profile</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Git Clone Command */}
                  <div className="p-4 rounded-xl bg-surface-active border border-themeline space-y-2.5">
                    <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-txt-muted flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-action" />
                      <span>Clone Command</span>
                    </h3>
                    <div className="flex items-center justify-between bg-surface border border-themeline rounded-xl px-3 py-2 text-xs font-mono text-txt-primary gap-2">
                      <span className="truncate text-xs text-action">{cloneUrl}</span>
                      <button
                        onClick={handleCopyClone}
                        className="p-1 rounded text-txt-muted hover:text-action hover:bg-surface-active transition-colors flex-shrink-0"
                        title="Copy git clone"
                      >
                        {cloneCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Topics & Keywords */}
                {repo.topics && repo.topics.length > 0 && (
                  <div className="p-4 rounded-xl bg-surface-active border border-themeline space-y-2.5">
                    <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-txt-muted flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-action" />
                      <span>Topics & Keywords ({repo.topics.length})</span>
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      {repo.topics.map((t) => (
                        <span
                          key={t}
                          className="text-xs font-mono px-2.5 py-1 rounded-lg bg-surface border border-themeline text-txt-secondary hover:text-action transition-colors"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
