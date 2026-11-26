import { getStoredToken } from './githubApi';
import { isTrustedReleaseAssetUrl } from '../utils/sanitizeMarkdown';

export const CURRENT_ANDROID_VERSION = '2.0.0';
const REPO_OWNER = 'VKaddala';
const REPO_NAME = 'OneGitVault';

export const BUNDLED_RELEASE_NOTES = `## OneGitVault Android v${CURRENT_ANDROID_VERSION} — Feature Launch

### ⚡ Spotlight: Reels for Developers
- Vertical swipe-up discovery feed featuring instant 5-second elevator pitches (**What It Is & Solves**) and 3 key architectural highlights.
- Interactive pinch-to-zoom (up to 4×) media viewer with smooth pan and edge-swipe dismissal.
- Double-tap gesture bookmarking with haptic vibration and animated heart pop.

### 🖼️ Pure OLED Black Visual Social Cards
- One-tap "Share as Card" generates a high-DPI, pure black OLED card for WhatsApp, X (Twitter), and LinkedIn.
- Zero-blink offscreen headless rendering with immediate UI feedback and native Android FileProvider sharing.

### 🛡️ The Living Vault & Changelog Radar
- Background WorkManager scans for releases, tags, and major updates on bookmarked repos with an unread badge counter.
- Full-screen Changelog Dashboard with dismiss-all and per-repo update radar filtering.
- Private developer notes and custom tags on bookmarked repositories.

### 📲 Home Screen Widgets & Native Haptics
- 4×2 Trending Repository Widget and Vault Release Tracker Widget for your Android home screen.
- Universal haptic engine with Settings toggle and refined GitHub Dark/Light default themes.
`;

export interface AndroidUpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseBody: string;
  publishedAt: string;
  releaseUrl: string;
  apkDownloadUrl?: string;
  apkName?: string;
  apkSize?: number;
  apkDigest?: string;
}

export function parseSemver(v: string): number[] {
  const clean = v.replace(/^v/i, '').trim();
  const parts = clean.split('.').map((n) => parseInt(n, 10));
  while (parts.length < 3) parts.push(0);
  return parts.map((n) => (isNaN(n) ? 0 : n));
}

export function compareSemver(v1: string, v2: string): number {
  const [maj1, min1, pat1] = parseSemver(v1);
  const [maj2, min2, pat2] = parseSemver(v2);

  if (maj1 !== maj2) return maj1 > maj2 ? 1 : -1;
  if (min1 !== min2) return min1 > min2 ? 1 : -1;
  if (pat1 !== pat2) return pat1 > pat2 ? 1 : -1;
  return 0;
}

export async function checkForAndroidUpdates(): Promise<AndroidUpdateInfo> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers['Authorization'] = `token ${token.trim().replace(/^(Bearer|token)\s+/i, '')}`;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases?per_page=10`, {
      headers,
    });

    if (!res.ok) {
      throw new Error(`GitHub API returned ${res.status}`);
    }

    const releases = await res.json();
    if (!Array.isArray(releases) || releases.length === 0) {
      return {
        hasUpdate: false,
        currentVersion: CURRENT_ANDROID_VERSION,
        latestVersion: CURRENT_ANDROID_VERSION,
        releaseName: 'Latest Version',
        releaseBody: '',
        publishedAt: '',
        releaseUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases`,
      };
    }

    // Look for releases with APK assets
    let targetRelease: any = null;
    let apkAsset: any = null;

    for (const r of releases) {
      if (Array.isArray(r.assets)) {
        const found = r.assets.find(
          (a: any) =>
            a.name &&
            a.name.toLowerCase().endsWith('.apk') &&
            isTrustedReleaseAssetUrl(a.browser_download_url, `${REPO_OWNER}/${REPO_NAME}`)
        );
        if (found) {
          targetRelease = r;
          apkAsset = found;
          break;
        }
      }
    }

    if (!targetRelease || !apkAsset) {
      return {
        hasUpdate: false,
        currentVersion: CURRENT_ANDROID_VERSION,
        latestVersion: CURRENT_ANDROID_VERSION,
        releaseName: 'No APK release found',
        releaseBody: '',
        publishedAt: '',
        releaseUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases`,
      };
    }

    // Extract version from tag_name or asset name
    let latestVersion = targetRelease.tag_name || '';
    const apkMatch = apkAsset.name.match(/(\d+\.\d+\.\d+)/);
    if (apkMatch) {
      latestVersion = apkMatch[1];
    } else {
      latestVersion = latestVersion.replace(/^v/i, '');
    }

    const hasUpdate = compareSemver(latestVersion, CURRENT_ANDROID_VERSION) > 0;

    return {
      hasUpdate,
      currentVersion: CURRENT_ANDROID_VERSION,
      latestVersion,
      releaseName: targetRelease.name || `Release ${latestVersion}`,
      releaseBody: targetRelease.body || '',
      publishedAt: targetRelease.published_at || '',
      releaseUrl: targetRelease.html_url || `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases`,
      apkDownloadUrl: apkAsset.browser_download_url,
      apkName: apkAsset.name,
      apkSize: apkAsset.size,
      apkDigest: typeof apkAsset.digest === 'string' ? apkAsset.digest : undefined,
    };
  } catch (err) {
    console.warn('Android update check failed:', err);
    return {
      hasUpdate: false,
      currentVersion: CURRENT_ANDROID_VERSION,
      latestVersion: CURRENT_ANDROID_VERSION,
      releaseName: 'Offline / Could not check',
      releaseBody: '',
      publishedAt: '',
      releaseUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases`,
    };
  }
}

/**
 * Starts background download of the APK and launches the system installer when done.
 */
export function startAndroidUpdate(
  apkUrl: string,
  versionName: string,
  onProgress?: (progress: number, status: string) => void,
  onError?: (err: string) => void,
  expectedDigest?: string
): void {
  if (!isTrustedReleaseAssetUrl(apkUrl, `${REPO_OWNER}/${REPO_NAME}`)) {
    onError?.('Blocked unverified update URL.');
    return;
  }

  const win = window as any;

  if (win.AndroidThemeBridge && typeof win.AndroidThemeBridge.downloadAndInstallUpdate === 'function') {
    win.__onAndroidUpdateProgress = (progress: number, status: string) => {
      if (onProgress) onProgress(progress, status);
    };

    win.__onAndroidUpdateError = (errMsg: string) => {
      if (onError) onError(errMsg);
    };

    win.AndroidThemeBridge.downloadAndInstallUpdate(apkUrl, versionName, expectedDigest || '');
  } else {
    // Fallback: browser / web preview
    window.open(apkUrl, '_blank', 'noopener,noreferrer');
    if (onProgress) onProgress(100, 'Download started in browser');
  }
}

/**
 * Fetches release notes for the currently installed Android version (with 30-day local cache & bundled fallback).
 */
export async function fetchInstalledVersionReleaseNotes(): Promise<{
  title: string;
  body: string;
  publishedAt?: string;
  releaseUrl: string;
}> {
  const tag = `v${CURRENT_ANDROID_VERSION}`;
  const cacheKey = `ogv_release_notes_${tag}`;
  const fallback = {
    title: `OneGitVault Android ${tag}`,
    body: BUNDLED_RELEASE_NOTES,
    releaseUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/tag/${tag}`,
  };

  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.body && Date.now() - (parsed.timestamp || 0) < 30 * 24 * 60 * 60 * 1000) {
        return {
          title: parsed.title || fallback.title,
          body: parsed.body,
          publishedAt: parsed.publishedAt,
          releaseUrl: parsed.releaseUrl || fallback.releaseUrl,
        };
      }
    }
  } catch {}

  try {
    const token = getStoredToken();
    const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
    if (token) {
      headers['Authorization'] = `token ${token.trim().replace(/^(Bearer|token)\s+/i, '')}`;
    }
    const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/${tag}`, {
      headers,
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.body) {
        const result = {
          title: data.name || fallback.title,
          body: data.body,
          publishedAt: data.published_at || '',
          releaseUrl: data.html_url || fallback.releaseUrl,
        };
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ ...result, timestamp: Date.now() }));
        } catch {}
        return result;
      }
    }
  } catch {}

  return fallback;
}
