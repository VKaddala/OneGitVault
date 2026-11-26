import { marked } from 'marked';
import DOMPurify from 'dompurify';

export interface MarkdownRenderOptions {
  repoFullName?: string;
  defaultBranch?: string;
}

const ALLOWED_EXTERNAL_HOSTS = new Set([
  'github.com',
  'api.github.com',
  'raw.githubusercontent.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
  'avatars.githubusercontent.com',
]);

/**
 * Validates that a URL uses an allowed web scheme (HTTPS only by default).
 */
export function isSafeHttpUrl(rawUrl: string | undefined | null, requireHttps: boolean = true): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    if (requireHttps) return parsed.protocol === 'https:';
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Checks whether a release/update asset URL belongs to a trusted GitHub repository release host.
 */
export function isTrustedReleaseAssetUrl(rawUrl: string | undefined | null, repoPrefix?: string): boolean {
  if (!isSafeHttpUrl(rawUrl, true)) return false;
  try {
    const parsed = new URL(rawUrl!.trim());
    const host = parsed.hostname.toLowerCase();
    const isGitHubHost =
      ALLOWED_EXTERNAL_HOSTS.has(host) ||
      host.endsWith('.github.com') ||
      host.endsWith('.githubusercontent.com');
    if (!isGitHubHost) return false;
    if (repoPrefix && host === 'github.com') {
      return parsed.pathname.toLowerCase().startsWith(`/${repoPrefix.toLowerCase()}/`);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves relative repository image paths and /blob/ URLs to raw.githubusercontent.com.
 */
export function resolveGitHubMediaUrl(rawSrc: string, repoFullName: string, defaultBranch: string): string {
  const src = rawSrc.trim();
  if (!src || src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('#')) {
    return src;
  }

  if (src.startsWith('//')) {
    return `https:${src}`;
  }

  const blobMatch = src.match(/^https?:\/\/github\.com\/([^/]+\/[^/]+)\/(?:blob|raw)\/([^/]+)\/(.+)$/i);
  if (blobMatch) {
    const cleanPath = blobMatch[3].replace(/\?raw=true$/i, '');
    return `https://raw.githubusercontent.com/${blobMatch[1]}/${blobMatch[2]}/${cleanPath}`;
  }

  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  const branch = defaultBranch || 'HEAD';
  const cleanRel = src.replace(/^(\.\.?\/)+/, '').replace(/^\/+/, '');
  return `https://raw.githubusercontent.com/${repoFullName}/${branch}/${cleanRel}`;
}

/**
 * Renders markdown to tightly sanitized HTML with DOM Clobbering protection,
 * safe external link enforcement, and optional GitHub README media URL resolution.
 */
export function renderMarkdownToSafeHtml(
  markdown: string,
  options?: MarkdownRenderOptions
): string {
  if (!markdown) return '';

  const parsed = marked.parse(markdown, { async: false });
  const sanitized = DOMPurify.sanitize(typeof parsed === 'string' ? parsed : '', {
    SANITIZE_NAMED_PROPS: true,
    FORBID_TAGS: ['style', 'form', 'input', 'textarea', 'select', 'button', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus'],
    ADD_TAGS: ['picture', 'source'],
    ADD_ATTR: ['id', 'name', 'target', 'rel', 'srcset', 'media', 'referrerpolicy', 'loading', 'align'],
  });

  try {
    const template = document.createElement('template');
    template.innerHTML = sanitized;

    // Enforce noopener noreferrer and safe URI schemes on links
    const anchors = template.content.querySelectorAll('a[href]');
    anchors.forEach((a) => {
      const href = (a.getAttribute('href') || '').trim();
      const lower = href.toLowerCase();
      if (lower.startsWith('javascript:') || lower.startsWith('vbscript:') || lower.startsWith('data:')) {
        a.removeAttribute('href');
        return;
      }
      if (href.startsWith('http://') || href.startsWith('https://')) {
        a.setAttribute('rel', 'noopener noreferrer');
        a.setAttribute('target', '_blank');
      }
    });

    if (options?.repoFullName) {
      const branch = options.defaultBranch || 'HEAD';
      const sources = template.content.querySelectorAll('source[srcset]');
      sources.forEach((source) => {
        const srcset = source.getAttribute('srcset');
        if (srcset) {
          const firstCandidate = srcset.split(',')[0].trim().split(/\s+/)[0];
          if (firstCandidate) {
            source.setAttribute('srcset', resolveGitHubMediaUrl(firstCandidate, options.repoFullName!, branch));
          }
        }
      });

      const imgs = template.content.querySelectorAll('img');
      imgs.forEach((img) => {
        const src = img.getAttribute('src');
        if (src) {
          img.setAttribute('src', resolveGitHubMediaUrl(src, options.repoFullName!, branch));
        }
        img.setAttribute('referrerpolicy', 'no-referrer');
        img.setAttribute('loading', 'lazy');
        img.setAttribute('decoding', 'async');
      });
    }

    return template.innerHTML;
  } catch {
    return sanitized;
  }
}
