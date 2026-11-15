import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X, Star, GitFork, ExternalLink, Copy, Check,
  Bookmark, Download, Terminal, Globe, Scale,
  Calendar, FileText, Loader2, AlertCircle, ChevronDown,
  Package, Tag, ArrowDownToLine, Clock, FolderArchive
} from 'lucide-react';
import { marked } from 'marked';
import { Repository, Release, ReleaseAsset } from '../types';
import { getStoredToken, fetchRepositoryReleases } from '../services/githubApi';
import { LANGUAGE_COLORS } from '../data/curatedProjects';

interface RepoDetailPanelProps {
  repo: Repository | null;
  isBookmarked: boolean;
  onClose: () => void;
  onToggleBookmark: (repo: Repository) => void;
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

  const loadReleases = useCallback(async (r: Repository) => {
    setReleasesLoading(true);
    try {
      const data = await fetchRepositoryReleases(r.full_name);
      setReleases(data);
      setSelectedReleaseIndex(0);
    } catch (e) {
      console.error('Failed to load releases', e);
      setReleases([]);
    } finally {
      setReleasesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (repo) {
      setActiveTab('readme');
      fetchReadme(repo);
      loadReleases(repo);
    } else {
      setReadmeState('idle');
      setReadmeContent('');
      setReleases([]);
    }
  }, [repo, fetchReadme, loadReleases]);

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

  const currentRelease = releases[selectedReleaseIndex] || null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      {/* ── Centered Modal Container with Padding from Edges ── */}
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#FFF9F0] dark:bg-[#101b20] ambient:bg-[#161b22] border border-[#e3d1ba] dark:border-[#244855] ambient:border-[#30363d] text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc] rounded-2xl shadow-2xl overflow-hidden transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── HEADER (like BookmarksModal) ── */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-[#e3d1ba] dark:border-[#244855] ambient:border-[#30363d] bg-[#FAF0E4] dark:bg-[#16272f] ambient:bg-[#0f141c] flex-shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <img
              src={repo.owner.avatar_url}
              alt={repo.owner.login}
              className="w-11 h-11 rounded-xl ring-1 ring-[#e3d1ba] dark:ring-[#244855] ambient:ring-[#30363d] flex-shrink-0 shadow-sm"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8] truncate">
                  {repo.owner.login}
                </span>
                {repo.license && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8] bg-[#FAF0E4] dark:bg-[#101b20] ambient:bg-[#1f2937] px-2 py-0.5 rounded-md border border-[#e3d1ba] dark:border-[#244855] ambient:border-[#374151]">
                    <Scale className="w-3 h-3" />
                    {repo.license.spdx_id || repo.license.name}
                  </span>
                )}
              </div>
              <h2 className="font-display font-bold text-lg sm:text-xl text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc] truncate leading-tight mt-0.5">
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
                  ? 'text-[#E64833] ambient:text-[#38bdf8] bg-[#E64833]/10 ambient:bg-[#38bdf8]/15 border border-[#E64833]/25 ambient:border-[#38bdf8]/35'
                  : 'text-[#874F41] hover:text-[#E64833] hover:bg-[#F2DFCA] dark:text-[#90AEAD] dark:hover:text-[#ff5c47] dark:hover:bg-[#1c323c] ambient:text-[#94a3b8] ambient:hover:text-[#38bdf8] ambient:hover:bg-[#1f2937] border border-transparent'
              }`}
              title={isBookmarked ? 'Remove from Vault' : 'Save to Vault'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#874F41] hover:text-[#244855] hover:bg-[#F2DFCA] dark:text-[#90AEAD] dark:hover:text-white dark:hover:bg-[#1c323c] ambient:text-[#94a3b8] ambient:hover:text-white ambient:hover:bg-[#1f2937] rounded-xl border border-transparent transition-all"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── REPO META & TAB SWITCHER ── */}
        <div className="px-5 py-3.5 border-b border-[#e3d1ba] dark:border-[#203943] ambient:border-[#21262d] bg-[#FAF0E4]/70 dark:bg-[#132229] ambient:bg-[#131b26] flex-shrink-0 space-y-3">
          {/* Description */}
          {repo.description && (
            <p className="text-xs sm:text-sm font-sans text-[#244855]/90 dark:text-[#90AEAD] ambient:text-[#cbd5e1] leading-relaxed">
              {repo.description}
            </p>
          )}

          {/* Stats row & Navigation Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2.5 flex-wrap text-xs font-mono">
              <span className="flex items-center gap-1 font-bold text-[#E64833] ambient:text-[#38bdf8] bg-[#E64833]/10 ambient:bg-[#38bdf8]/15 border border-[#E64833]/25 ambient:border-[#38bdf8]/30 px-2.5 py-1 rounded-lg">
                <Star className="w-3.5 h-3.5 fill-current" />
                {formatNumber(repo.stargazers_count)}
              </span>
              <span className="flex items-center gap-1 text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8] bg-[#FAF0E4] dark:bg-[#101b20] ambient:bg-[#17202c] border border-[#e3d1ba] dark:border-[#244855] ambient:border-[#30363d] px-2.5 py-1 rounded-lg">
                <GitFork className="w-3.5 h-3.5" />
                {formatNumber(repo.forks_count)}
              </span>
              {repo.language && (
                <span className="flex items-center gap-1.5 text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: langColor }} />
                  {repo.language}
                </span>
              )}
              <span className="flex items-center gap-1 text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8]">
                <Calendar className="w-3 h-3" />
                Updated {formatDate(repo.updated_at)}
              </span>
            </div>

            {/* Content Tabs: README vs Releases */}
            <div className="flex items-center gap-1 bg-[#FFF9F0] dark:bg-[#101b20] ambient:bg-[#0f141c] p-1 rounded-xl border border-[#e3d1ba] dark:border-[#244855] ambient:border-[#30363d] self-start sm:self-auto shadow-sm">
              <button
                onClick={() => setActiveTab('readme')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  activeTab === 'readme'
                    ? 'bg-[#E64833] ambient:bg-[#38bdf8] text-white ambient:text-[#0f141c] font-bold shadow-sm'
                    : 'text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8] hover:text-[#244855] dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>README</span>
              </button>

              <button
                onClick={() => setActiveTab('releases')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  activeTab === 'releases'
                    ? 'bg-[#E64833] ambient:bg-[#38bdf8] text-white ambient:text-[#0f141c] font-bold shadow-sm'
                    : 'text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8] hover:text-[#244855] dark:hover:text-white'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Releases</span>
                {releases.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === 'releases'
                      ? 'bg-black/20 text-white ambient:text-[#0f141c]'
                      : 'bg-[#E64833]/15 ambient:bg-[#38bdf8]/20 text-[#E64833] ambient:text-[#38bdf8]'
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
                <Loader2 className="w-8 h-8 text-[#E64833] ambient:text-[#38bdf8] animate-spin" />
                <p className="text-xs font-mono text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8]">
                  Fetching README from GitHub…
                </p>
              </div>
            )}

            {readmeState === 'not_found' && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <FileText className="w-12 h-12 text-[#874F41]/30 dark:text-[#90AEAD]/30 ambient:text-[#94a3b8]/30 opacity-60" />
                <p className="text-base font-display font-semibold text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8]">
                  No README found
                </p>
                <p className="text-xs font-sans text-[#874F41]/70 dark:text-[#90AEAD]/70 ambient:text-[#94a3b8]/70">
                  This repository does not have a README.md file in its primary branch.
                </p>
              </div>
            )}

            {readmeState === 'error' && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <AlertCircle className="w-12 h-12 text-rose-400 opacity-60" />
                <p className="text-base font-display font-semibold text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8]">
                  Failed to load README
                </p>
                <button
                  onClick={() => fetchReadme(repo)}
                  className="text-xs font-mono text-[#E64833] ambient:text-[#38bdf8] hover:underline"
                >
                  Try again
                </button>
              </div>
            )}

            {readmeState === 'success' && (
              <div className="relative">
                <div
                  className={`readme-body ${!showFullReadme && readmeContent.length > 7000 ? 'max-h-[620px] overflow-hidden' : ''}`}
                  onClick={handleReadmeLinkClick}
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
                {!showFullReadme && readmeContent.length > 7000 && (
                  <div className="sticky bottom-0 pt-20 pb-2 bg-gradient-to-t from-[#FFF9F0] dark:from-[#101b20] ambient:from-[#161b22] via-[#FFF9F0]/90 dark:via-[#101b20]/90 ambient:via-[#161b22]/90 to-transparent flex justify-center">
                    <button
                      onClick={() => setShowFullReadme(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-[#FAF0E4] hover:bg-[#F2DFCA] text-[#244855] dark:bg-[#16272f] dark:hover:bg-[#1c323c] dark:text-[#FBE9D0] ambient:bg-[#1f2937] ambient:hover:bg-[#374151] ambient:text-[#f0f6fc] border border-[#e3d1ba] dark:border-[#244855] ambient:border-[#374151] shadow-lg transition-all"
                    >
                      <ChevronDown className="w-3.5 h-3.5 text-[#E64833] ambient:text-[#38bdf8]" />
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
                <Loader2 className="w-8 h-8 text-[#E64833] ambient:text-[#38bdf8] animate-spin" />
                <p className="text-xs font-mono text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8]">
                  Querying GitHub for official releases & binary assets…
                </p>
              </div>
            ) : releases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Package className="w-12 h-12 text-[#874F41]/30 dark:text-[#90AEAD]/30 ambient:text-[#94a3b8]/30" />
                <h4 className="text-base font-display font-bold text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc]">
                  No Releases Published
                </h4>
                <p className="text-xs font-sans text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8] max-w-md">
                  This repository has not published formal GitHub Releases yet. You can still download the complete source code archive directly.
                </p>
                <a
                  href={zipUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold bg-[#E64833] ambient:bg-[#38bdf8] text-white ambient:text-[#0f141c] hover:opacity-90 shadow-sm transition-all"
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
                    <span className="text-xs font-mono text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8] flex-shrink-0">
                      Version:
                    </span>
                    {releases.map((rel, idx) => (
                      <button
                        key={rel.id}
                        onClick={() => setSelectedReleaseIndex(idx)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono whitespace-nowrap transition-all ${
                          selectedReleaseIndex === idx
                            ? 'bg-[#E64833] ambient:bg-[#38bdf8] text-white ambient:text-[#0f141c] font-bold shadow-sm'
                            : 'bg-[#FAF0E4] hover:bg-[#F2DFCA] dark:bg-[#16272f] dark:hover:bg-[#1c323c] ambient:bg-[#1f2937] ambient:hover:bg-[#374151] text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc] border border-[#e3d1ba] dark:border-[#244855] ambient:border-[#374151]'
                        }`}
                      >
                        {rel.tag_name} {idx === 0 ? '(Latest)' : ''}
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Release Card Banner */}
                {currentRelease && (
                  <div className="p-4 rounded-2xl bg-[#FAF0E4] dark:bg-[#132229] ambient:bg-[#0f141c] border border-[#e3d1ba] dark:border-[#244855] ambient:border-[#30363d] space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-[#E64833]/15 ambient:bg-[#38bdf8]/20 text-[#E64833] ambient:text-[#38bdf8] border border-[#E64833]/30 ambient:border-[#38bdf8]/40">
                            <Tag className="w-3.5 h-3.5" />
                            {currentRelease.tag_name}
                          </span>
                          {selectedReleaseIndex === 0 && (
                            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                              Latest Release
                            </span>
                          )}
                          {currentRelease.prerelease && (
                            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-brand font-bold border border-amber-500/30">
                              Pre-release
                            </span>
                          )}
                        </div>
                        <h3 className="font-display font-bold text-base sm:text-lg text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc] mt-1.5">
                          {currentRelease.name || currentRelease.tag_name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Published {formatDate(currentRelease.published_at)}</span>
                      </div>
                    </div>

                    {/* Direct Downloadable Assets Header */}
                    <div className="pt-2">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8] mb-2 uppercase tracking-wide">
                        <ArrowDownToLine className="w-4 h-4 text-[#E64833] ambient:text-[#38bdf8]" />
                        <span>Available Downloads & Executables ({currentRelease.assets.length})</span>
                      </div>

                      {/* Assets List */}
                      {currentRelease.assets.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                          {currentRelease.assets.map((asset) => (
                            <div
                              key={asset.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-[#FFF9F0] hover:bg-white dark:bg-[#16272f] dark:hover:bg-[#1a2f3a] ambient:bg-[#161b22] ambient:hover:bg-[#1f2937] border border-[#e3d1ba] dark:border-[#244855] ambient:border-[#30363d] transition-all gap-3"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Package className="w-4 h-4 text-[#E64833] ambient:text-[#38bdf8] flex-shrink-0" />
                                <div className="min-w-0">
                                  <span className="font-mono text-xs sm:text-[13px] font-bold text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc] block truncate">
                                    {asset.name}
                                  </span>
                                  <div className="flex items-center gap-2 text-[11px] font-mono text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8]">
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
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#E64833] ambient:bg-[#38bdf8] text-white ambient:text-[#0f141c] hover:opacity-90 transition-all flex-shrink-0 shadow-sm"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download</span>
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs font-sans text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8]">
                          No binary artifacts attached to this tag. You can download the source archives below.
                        </p>
                      )}

                      {/* Source Code Downloads */}
                      <div className="mt-3 pt-3 border-t border-[#e3d1ba] dark:border-[#244855] ambient:border-[#30363d] flex items-center gap-2 flex-wrap text-xs font-mono">
                        <span className="text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8] flex items-center gap-1">
                          <FolderArchive className="w-3.5 h-3.5" /> Source Code:
                        </span>
                        <a
                          href={`${repo.html_url}/archive/refs/tags/${currentRelease.tag_name}.zip`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-md bg-[#FFF9F0] dark:bg-[#16272f] ambient:bg-[#161b22] border border-[#e3d1ba] dark:border-[#244855] ambient:border-[#30363d] text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc] hover:text-[#E64833] ambient:hover:text-[#38bdf8] transition-colors"
                        >
                          zip
                        </a>
                        <a
                          href={`${repo.html_url}/archive/refs/tags/${currentRelease.tag_name}.tar.gz`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-md bg-[#FFF9F0] dark:bg-[#16272f] ambient:bg-[#161b22] border border-[#e3d1ba] dark:border-[#244855] ambient:border-[#30363d] text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc] hover:text-[#E64833] ambient:hover:text-[#38bdf8] transition-colors"
                        >
                          tar.gz
                        </a>
                      </div>
                    </div>

                    {/* Release Notes / Description */}
                    {currentRelease.body && (
                      <div className="pt-2">
                        <details className="text-xs font-sans text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8] cursor-pointer">
                          <summary className="font-mono font-semibold text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc] hover:underline mb-2">
                            View Release Notes / Changelog
                          </summary>
                          <div
                            className="readme-body max-h-60 overflow-y-auto p-3 rounded-xl bg-[#FFF9F0] dark:bg-[#101b20] ambient:bg-[#161b22] border border-[#e3d1ba] dark:border-[#244855] ambient:border-[#30363d]"
                            dangerouslySetInnerHTML={{ __html: marked.parse(currentRelease.body) as string }}
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
        <div className="flex-shrink-0 border-t border-[#e3d1ba] dark:border-[#244855] ambient:border-[#30363d] bg-[#FAF0E4] dark:bg-[#16272f] ambient:bg-[#0f141c] p-4">
          <div className="flex items-center gap-2 flex-wrap">

            {/* Clone command pill */}
            <div className="flex items-center flex-1 min-w-0 bg-[#FFF9F0] dark:bg-[#101b20] ambient:bg-[#161b22] border border-[#e3d1ba] dark:border-[#203943] ambient:border-[#30363d] rounded-xl px-3 py-2 gap-2 text-xs font-mono text-[#244855] dark:text-[#90AEAD] ambient:text-[#94a3b8] overflow-hidden">
              <Terminal className="w-3.5 h-3.5 flex-shrink-0 text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8]" />
              <span className="truncate">git clone {repo.html_url}.git</span>
            </div>

            {/* Copy Clone button */}
            <button
              onClick={handleCopyClone}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold border transition-all flex-shrink-0 ${
                cloneCopied
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-[#FFF9F0] dark:bg-[#101b20] ambient:bg-[#161b22] border-[#e3d1ba] dark:border-[#244855] ambient:border-[#30363d] text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc] hover:border-[#E64833]/40 ambient:hover:border-[#38bdf8]/40 hover:text-[#E64833] ambient:hover:text-[#38bdf8]'
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold bg-[#FFF9F0] dark:bg-[#101b20] ambient:bg-[#161b22] border border-[#e3d1ba] dark:border-[#244855] ambient:border-[#30363d] text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc] hover:border-[#E64833]/40 ambient:hover:border-[#38bdf8]/40 hover:text-[#E64833] ambient:hover:text-[#38bdf8] transition-all flex-shrink-0"
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold bg-[#FFF9F0] dark:bg-[#101b20] ambient:bg-[#161b22] border border-[#e3d1ba] dark:border-[#244855] ambient:border-[#30363d] text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc] hover:border-[#E64833]/40 ambient:hover:border-[#38bdf8]/40 hover:text-[#E64833] ambient:hover:text-[#38bdf8] transition-all flex-shrink-0"
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold bg-[#E64833] ambient:bg-[#38bdf8] hover:opacity-90 text-white ambient:text-[#0f141c] border border-[#E64833] ambient:border-[#38bdf8] transition-all flex-shrink-0 shadow-md font-bold"
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
