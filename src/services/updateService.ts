import { getStoredToken } from './githubApi';

export const CURRENT_APP_VERSION = '2.2.0';
const REPO_OWNER = 'VKaddala';
const REPO_NAME = 'OneGitVault';

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseBody: string;
  publishedAt: string;
  releaseUrl: string;
  downloadUrl?: string;
  assetName?: string;
  assetSize?: number;
}

export function parseSemver(v: string): number[] {
  const clean = v.replace(/^v/i, '').trim();
  const parts = clean.split('.').map(n => parseInt(n, 10));
  while (parts.length < 3) parts.push(0);
  return parts.map(n => isNaN(n) ? 0 : n);
}

export function compareSemver(v1: string, v2: string): number {
  const [maj1, min1, pat1] = parseSemver(v1);
  const [maj2, min2, pat2] = parseSemver(v2);

  if (maj1 !== maj2) return maj1 > maj2 ? 1 : -1;
  if (min1 !== min2) return min1 > min2 ? 1 : -1;
  if (pat1 !== pat2) return pat1 > pat2 ? 1 : -1;
  return 0;
}

export async function checkForAppUpdates(): Promise<UpdateInfo> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`, {
      headers
    });

    if (!res.ok) {
      // Fallback: fetch all releases if /latest fails
      const allRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases?per_page=5`, {
        headers
      });
      if (!allRes.ok) {
        throw new Error(`GitHub API returned ${allRes.status}`);
      }
      const allReleases = await allRes.json();
      const validRelease = allReleases.find((r: any) => !r.draft && !r.prerelease) || allReleases[0];
      if (!validRelease) {
        return {
          hasUpdate: false,
          currentVersion: CURRENT_APP_VERSION,
          latestVersion: CURRENT_APP_VERSION,
          releaseName: 'Latest Version',
          releaseBody: '',
          publishedAt: '',
          releaseUrl: `https://github.com/VKaddala/OneGitVault/releases`,
        };
      }
      return processReleaseData(validRelease);
    }

    const release = await res.json();
    return processReleaseData(release);
  } catch (err) {
    console.warn('Update check failed:', err);
    return {
      hasUpdate: false,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: CURRENT_APP_VERSION,
      releaseName: 'Offline / Could not check',
      releaseBody: '',
      publishedAt: '',
      releaseUrl: `https://github.com/VKaddala/OneGitVault/releases`,
    };
  }
}

function processReleaseData(release: any): UpdateInfo {
  const latestTag = release.tag_name || '';
  const hasUpdate = compareSemver(latestTag, CURRENT_APP_VERSION) > 0;
  
  const exeAsset = Array.isArray(release.assets) 
    ? release.assets.find((a: any) => a.name && a.name.toLowerCase().endsWith('.exe'))
    : null;

  return {
    hasUpdate,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: latestTag.replace(/^v/i, ''),
    releaseName: release.name || latestTag,
    releaseBody: release.body || 'No release description provided.',
    publishedAt: release.published_at || '',
    releaseUrl: release.html_url || `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases`,
    downloadUrl: exeAsset ? exeAsset.browser_download_url : undefined,
    assetName: exeAsset ? exeAsset.name : undefined,
    assetSize: exeAsset ? exeAsset.size : undefined,
  };
}
