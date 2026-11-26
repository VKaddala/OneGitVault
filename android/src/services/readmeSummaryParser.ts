/**
 * ReadmeSummaryParser
 * Pure client-side heuristic engine that distills GitHub repository READMEs
 * into clean, eye-catching summaries, extracting screenshots, demo GIFs,
 * and high-impact highlights without API quota penalties.
 */

import { Repository } from '../types';
import { registerMemoryCacheCleaner, setBoundedMapEntry } from './cacheManager';

export interface ReadmeSummary {
  headline: string;
  highlights: string[];
  heroMediaUrl?: string;
  isTranslated?: boolean;
}

const summaryCache = new Map<string, ReadmeSummary>();

registerMemoryCacheCleaner((clearAll) => {
  if (clearAll) {
    summaryCache.clear();
  } else if (summaryCache.size > 60) {
    while (summaryCache.size > 60) {
      const oldestKey = summaryCache.keys().next().value;
      if (oldestKey === undefined) break;
      summaryCache.delete(oldestKey);
    }
  }
});

/**
 * Strips markdown and HTML formatting into clean plain text
 */
function cleanMarkdown(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, '') // HTML comments
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link](url) -> link
    .replace(/<[^>]+>/g, '') // HTML tags
    .replace(/[*_~`#]/g, '') // formatting symbols
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolves relative image paths to raw.githubusercontent.com URLs
 */
function resolveMediaUrl(rawUrl: string, repoFullName: string, defaultBranch: string = 'main'): string | undefined {
  if (!rawUrl) return undefined;
  
  // Ignore shields, badges, icons, and analytics trackers
  const lower = rawUrl.toLowerCase();
  if (
    lower.includes('img.shields.io') ||
    lower.includes('badge.fury.io') ||
    lower.includes('github.com/workflows') ||
    lower.includes('actions/workflows') ||
    lower.includes('codecov.io') ||
    lower.includes('sonarcloud.io') ||
    lower.includes('travis-ci') ||
    lower.includes('opencollective.com') ||
    lower.includes('patreon') ||
    lower.includes('visitor-badge') ||
    lower.includes('license') ||
    lower.includes('badge') ||
    lower.includes('stars.svg') ||
    lower.includes('forks.svg') ||
    lower.includes('buymeacoffee') ||
    lower.includes('ko-fi.com') ||
    lower.includes('gitter.im') ||
    lower.includes('discordapp.com/api/guilds')
  ) {
    return undefined;
  }

  // Already absolute http/https
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    return rawUrl;
  }

  // Relative path in repository
  const cleanPath = rawUrl.replace(/^\.?\//, '');
  return `https://raw.githubusercontent.com/${repoFullName}/${defaultBranch}/${cleanPath}`;
}

/**
 * Extracts a working screenshot, demo GIF, or preview image from README
 */
function extractHeroMedia(markdown: string, repoFullName: string, defaultBranch: string): string | undefined {
  // 1. Markdown image syntax: ![alt](url)
  const mdImgRegex = /!\[.*?\]\(([^)\s]+?(?:\.png|\.jpg|\.jpeg|\.gif|\.webp|\.svg|user-attachments\/assets\/[^)\s]+)[^)\s]*)\)/gi;
  let match: RegExpExecArray | null;
  while ((match = mdImgRegex.exec(markdown)) !== null) {
    const resolved = resolveMediaUrl(match[1], repoFullName, defaultBranch);
    if (resolved) return resolved;
  }

  // 2. HTML img / video tag syntax: <img src="url"> or <video src="url">
  const htmlImgRegex = /<(?:img|video|source)[^>]+src=["']([^"']+(?:\.png|\.jpg|\.jpeg|\.gif|\.webp|\.svg|user-attachments\/assets\/[^"']+|assets\/[^"']+)[^"']*)["']/gi;
  while ((match = htmlImgRegex.exec(markdown)) !== null) {
    const resolved = resolveMediaUrl(match[1], repoFullName, defaultBranch);
    if (resolved) return resolved;
  }

  return undefined;
}

/**
 * Checks if a paragraph is boilerplate scrap (translation links, shields, table of contents, sponsor notices)
 */
function isNoiseParagraph(text: string): boolean {
  const lower = text.toLowerCase().trim();
  
  // Exclude empty or very short strings
  if (lower.length < 20) return true;

  // Exclude pipe-separated lists or markdown tables
  if (lower.startsWith('|') || lower.split('|').length > 2) return true;

  // Exclude link-only lists like [English](...) [中文](...)
  if (/^\[.*?\]\(.*?\)(\s*\|\s*\[.*?\]\(.*?\))+/i.test(text)) return true;

  // Exclude boilerplate keywords
  return (
    lower.startsWith('---') ||
    lower.startsWith('===') ||
    lower.includes('read this in') ||
    lower.includes('other language') ||
    lower.includes('other languages') ||
    lower.includes('translations') ||
    lower.includes('translation') ||
    lower.includes('table of contents') ||
    lower.includes('table of content') ||
    lower.includes('licensed under') ||
    lower.includes('license:') ||
    lower.includes('apache license') ||
    lower.includes('mit license') ||
    lower.includes('gnu general') ||
    lower.includes('donate') ||
    lower.includes('sponsor') ||
    lower.includes('patreon') ||
    lower.includes('paypal') ||
    lower.includes('discord.gg') ||
    lower.includes('twitter.com') ||
    lower.includes('x.com/') ||
    lower.includes('badge') ||
    lower.includes('build status') ||
    lower.includes('pull request') ||
    lower.includes('code of conduct') ||
    lower.includes('contributing.md') ||
    lower.includes('all rights reserved')
  );
}

/**
 * Extracts a high-impact elevator pitch, prioritizing the repo description when clear
 */
function extractElevatorPitch(markdown: string, repoDescription?: string): string {
  if (repoDescription && repoDescription.trim().length >= 20) {
    return repoDescription.trim();
  }

  const lines = markdown.split('\n');
  const cleanParagraphs: string[] = [];
  let currentPara: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed.startsWith('===') || trimmed.startsWith('---')) {
      if (currentPara.length > 0) {
        cleanParagraphs.push(currentPara.join(' '));
        currentPara = [];
      }
      continue;
    }

    if (
      trimmed.startsWith('[![') ||
      trimmed.startsWith('![') ||
      trimmed.startsWith('<p align') ||
      trimmed.startsWith('<div') ||
      trimmed.startsWith('<img')
    ) {
      continue;
    }

    if (trimmed === '') {
      if (currentPara.length > 0) {
        cleanParagraphs.push(currentPara.join(' '));
        currentPara = [];
      }
    } else {
      currentPara.push(trimmed);
    }
  }

  if (currentPara.length > 0) {
    cleanParagraphs.push(currentPara.join(' '));
  }

  for (const para of cleanParagraphs) {
    const cleaned = cleanMarkdown(para);
    if (cleaned.length > 30 && !isNoiseParagraph(cleaned)) {
      return cleaned.length > 250 ? cleaned.slice(0, 247) + '...' : cleaned;
    }
  }

  return repoDescription || 'An innovative open-source repository on GitHub.';
}

/**
 * Extracts 3-4 key capabilities or features from the README
 */
function extractHighlights(markdown: string, repo: Repository): string[] {
  const highlights: string[] = [];

  const featureSectionRegex = /##+\s*(?:Features|Highlights|Why|Capabilities|What it does|Core Features)[\s\S]*?(?=\n##+|$)/i;
  const sectionMatch = markdown.match(featureSectionRegex);

  if (sectionMatch) {
    const sectionText = sectionMatch[0];
    const bulletRegex = /^[*\-•+]\s+(.+)$/gm;
    let bMatch: RegExpExecArray | null;
    while ((bMatch = bulletRegex.exec(sectionText)) !== null) {
      const cleanBullet = cleanMarkdown(bMatch[1]);
      if (cleanBullet.length > 12 && cleanBullet.length < 150 && !isNoiseParagraph(cleanBullet)) {
        highlights.push(cleanBullet);
        if (highlights.length >= 4) break;
      }
    }
  }

  if (highlights.length < 2) {
    const topLines = markdown.split('\n').slice(0, 120).join('\n');
    const genericBulletRegex = /^[*\-•]\s+(.+)$/gm;
    let gMatch: RegExpExecArray | null;
    while ((gMatch = genericBulletRegex.exec(topLines)) !== null) {
      const cleanBullet = cleanMarkdown(gMatch[1]);
      if (
        cleanBullet.length > 15 &&
        cleanBullet.length < 140 &&
        !isNoiseParagraph(cleanBullet) &&
        !highlights.includes(cleanBullet)
      ) {
        highlights.push(cleanBullet);
        if (highlights.length >= 3) break;
      }
    }
  }

  if (highlights.length === 0) {
    if (repo.language) {
      highlights.push(`Engineered in ${repo.language} for high-performance execution.`);
    }
    highlights.push(`Starred by ${(repo.stargazers_count || 0).toLocaleString()} developers worldwide.`);
    highlights.push('Completely open source and community driven.');
  }

  return highlights.slice(0, 4);
}

/**
 * Parses raw README markdown into clean, eye-catching summary with media support
 */
export function parseReadmeToSummary(markdown: string, repo: Repository): ReadmeSummary {
  const cacheKey = repo.full_name;
  if (summaryCache.has(cacheKey)) {
    return summaryCache.get(cacheKey)!;
  }

  const defaultBranch = repo.default_branch || 'main';
  const headline = extractElevatorPitch(markdown, repo.description || '');
  const highlights = extractHighlights(markdown, repo);
  const heroMediaUrl = extractHeroMedia(markdown, repo.full_name, defaultBranch);

  const summary: ReadmeSummary = {
    headline,
    highlights,
    heroMediaUrl
  };

  setBoundedMapEntry(summaryCache, cacheKey, summary, 60);
  return summary;
}

/**
 * Fallback synthesizer when README is loading or unavailable
 */
export function createSyntheticSummary(repo: Repository): ReadmeSummary {
  const cacheKey = repo.full_name;
  if (summaryCache.has(cacheKey)) {
    return summaryCache.get(cacheKey)!;
  }

  const highlights: string[] = [];
  if (repo.language) {
    highlights.push(`Engineered in ${repo.language} with modern developer-first design.`);
  }
  highlights.push(`Backed by a global community of ${(repo.stargazers_count || 0).toLocaleString()} stargazers.`);
  highlights.push('Open source and built for collaborative development.');

  return {
    headline: repo.description || 'Open source project on GitHub.',
    highlights
  };
}
