import { Repository, ReleaseAsset } from '../types';
import { pruneExpiredAndOversizedCache, safeSetLocalCache } from './cacheManager';
import { getStoredToken, isCoreQuotaExhausted } from './githubApi';
import { compareSemver } from './updateService';

const VAULT_STORAGE_KEY = 'onegitvault_android_vault';
const LEGACY_STORAGE_KEY = 'onegitvault_bookmarks_v1';
const VAULT_FOLDERS_KEY = 'ogv_vault_folders_v1';
const USER_INTERESTS_KEY = 'ogv_user_interests_v1';
const ONBOARDING_DONE_KEY = 'ogv_onboarding_completed_v1';
const VAULT_RADAR_CACHE_KEY = 'ogv_vault_release_radar_v1';

export type VaultFoldersMap = Record<string, number[]>;

export interface VaultRadarEntry {
  fullName: string;
  savedTag: string;
  latestTag: string;
  hasUpdate: boolean;
  releaseUrl: string;
  apkAsset?: ReleaseAsset;
  checkedAt: number;
}

export function sanitizeRepository(raw: any): Repository | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = Number(raw.id);
  const fullName = typeof raw.full_name === 'string' ? raw.full_name.trim() : '';
  const name = typeof raw.name === 'string' && raw.name.trim()
    ? raw.name.trim()
    : (fullName.includes('/') ? fullName.split('/')[1] : '');
  if (!Number.isFinite(id) || id <= 0 || !fullName || !name) return null;

  const ownerLogin =
    typeof raw.owner?.login === 'string' && raw.owner.login.trim()
      ? raw.owner.login.trim()
      : (fullName.split('/')[0] || 'unknown');

  return {
    ...raw,
    id,
    name,
    full_name: fullName,
    description: typeof raw.description === 'string' ? raw.description : null,
    html_url: typeof raw.html_url === 'string' ? raw.html_url : `https://github.com/${fullName}`,
    clone_url: typeof raw.clone_url === 'string' ? raw.clone_url : `https://github.com/${fullName}.git`,
    stargazers_count: Number(raw.stargazers_count) || 0,
    forks_count: Number(raw.forks_count) || 0,
    open_issues_count: Number(raw.open_issues_count) || 0,
    language: typeof raw.language === 'string' ? raw.language : null,
    topics: Array.isArray(raw.topics) ? raw.topics.filter((t: any) => typeof t === 'string') : [],
    owner: {
      login: ownerLogin,
      avatar_url: typeof raw.owner?.avatar_url === 'string' ? raw.owner.avatar_url : '',
      html_url: typeof raw.owner?.html_url === 'string' ? raw.owner.html_url : `https://github.com/${ownerLogin}`,
    },
  };
}

export function sanitizeRepositoryList(list: any): Repository[] {
  if (!Array.isArray(list)) return [];
  const out: Repository[] = [];
  for (const item of list) {
    const clean = sanitizeRepository(item);
    if (clean) out.push(clean);
  }
  return out;
}

let cachedBookmarks: Repository[] | null = null;
let cachedBookmarkIds: Set<number> = new Set();
let cachedBookmarkNames: Set<string> = new Set();
let cachedVaultFolders: VaultFoldersMap | null = null;
let cachedVaultRadar: Record<string, VaultRadarEntry> | null = null;

function syncBookmarkLookupSets(list: Repository[]): void {
  cachedBookmarkIds = new Set(list.map((r) => Number(r.id)).filter((id) => Number.isFinite(id)));
  cachedBookmarkNames = new Set(
    list.map((r) => r.full_name?.toLowerCase()).filter(Boolean) as string[]
  );
}

export function getBookmarks(): Repository[] {
  if (cachedBookmarks !== null) {
    return cachedBookmarks.slice();
  }
  try {
    let raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        try {
          localStorage.setItem(VAULT_STORAGE_KEY, raw);
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch {}
      }
    }
    const parsed = raw ? sanitizeRepositoryList(JSON.parse(raw)) : [];
    cachedBookmarks = parsed;
    syncBookmarkLookupSets(parsed);
    return parsed.slice();
  } catch {
    cachedBookmarks = [];
    syncBookmarkLookupSets([]);
    return [];
  }
}

export function saveBookmarks(repos: Repository[]): void {
  try {
    const sanitized = sanitizeRepositoryList(repos);
    cachedBookmarks = sanitized;
    syncBookmarkLookupSets(sanitized);

    const serialized = JSON.stringify(sanitized);
    try {
      localStorage.setItem(VAULT_STORAGE_KEY, serialized);
    } catch {
      pruneExpiredAndOversizedCache(256 * 1024);
      localStorage.setItem(VAULT_STORAGE_KEY, serialized);
    }
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ogv_bookmarks_changed', { detail: sanitized }));
    }
  } catch (err) {
    console.error('Failed to save bookmarks:', err);
  }
}

export function toggleBookmark(repo: Repository): boolean {
  if (!repo) return false;
  const current = getBookmarks();
  const repoFullNameLower = repo.full_name?.toLowerCase();

  const exists = current.some(
    (r) =>
      (r.id && repo.id && Number(r.id) === Number(repo.id)) ||
      (repoFullNameLower && r.full_name && r.full_name.toLowerCase() === repoFullNameLower)
  );

  let updated: Repository[];
  if (exists) {
    updated = current.filter(
      (r) =>
        !(
          (r.id && repo.id && Number(r.id) === Number(repo.id)) ||
          (repoFullNameLower && r.full_name && r.full_name.toLowerCase() === repoFullNameLower)
        )
    );
  } else {
    updated = [repo, ...current];
  }

  saveBookmarks(updated);
  return !exists;
}

export function isBookmarked(repoOrId: number | string | Repository): boolean {
  if (repoOrId === null || repoOrId === undefined) return false;
  if (cachedBookmarks === null) {
    getBookmarks();
  }

  if (typeof repoOrId === 'number') {
    return cachedBookmarkIds.has(repoOrId);
  }

  if (typeof repoOrId === 'string') {
    const searchLower = repoOrId.toLowerCase();
    const num = Number(repoOrId);
    return (!isNaN(num) && cachedBookmarkIds.has(num)) || cachedBookmarkNames.has(searchLower);
  }

  const numId = Number(repoOrId.id);
  const fullNameLower = repoOrId.full_name?.toLowerCase();
  return Boolean(
    (!isNaN(numId) && cachedBookmarkIds.has(numId)) ||
    (fullNameLower && cachedBookmarkNames.has(fullNameLower))
  );
}

// ── Vault Custom Folders / Collections ──

export function getVaultFolders(): VaultFoldersMap {
  if (cachedVaultFolders !== null) {
    return { ...cachedVaultFolders };
  }
  try {
    const raw = localStorage.getItem(VAULT_FOLDERS_KEY);
    if (!raw) {
      cachedVaultFolders = {};
      return {};
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const normalized: VaultFoldersMap = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof k === 'string' && Array.isArray(v)) {
          normalized[k] = v.map((id) => Number(id)).filter((id) => Number.isFinite(id));
        }
      }
      cachedVaultFolders = normalized;
      return { ...normalized };
    }
  } catch {}
  cachedVaultFolders = {};
  return {};
}

export function saveVaultFolders(folders: VaultFoldersMap): void {
  try {
    const normalized: VaultFoldersMap = {};
    if (folders && typeof folders === 'object' && !Array.isArray(folders)) {
      for (const [k, v] of Object.entries(folders)) {
        if (typeof k === 'string' && Array.isArray(v)) {
          normalized[k] = v.map((id) => Number(id)).filter((id) => Number.isFinite(id));
        }
      }
    }
    cachedVaultFolders = normalized;
    localStorage.setItem(VAULT_FOLDERS_KEY, JSON.stringify(normalized));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ogv_vault_folders_changed', { detail: normalized }));
    }
  } catch {}
}

export function createVaultFolder(name: string): VaultFoldersMap {
  const clean = name.trim().slice(0, 28);
  const current = getVaultFolders();
  if (!clean) return current;
  if (!current[clean]) {
    const next = { ...current, [clean]: [] };
    saveVaultFolders(next);
    return next;
  }
  return current;
}

export function deleteVaultFolder(name: string): VaultFoldersMap {
  const current = getVaultFolders();
  const next = { ...current };
  delete next[name];
  saveVaultFolders(next);
  return next;
}

export function assignReposToFolder(repoIds: number[], folderName: string): VaultFoldersMap {
  const current = getVaultFolders();
  const existing = current[folderName] || [];
  const nextSet = new Set([...existing, ...repoIds]);
  const next = { ...current, [folderName]: Array.from(nextSet) };
  saveVaultFolders(next);
  return next;
}

export function removeRepoFromFolder(repoId: number, folderName: string): VaultFoldersMap {
  const current = getVaultFolders();
  const existing = current[folderName] || [];
  const next = { ...current, [folderName]: existing.filter((id) => id !== repoId) };
  saveVaultFolders(next);
  return next;
}

// ── First-Launch Topic Interests ──

export function getUserInterests(): string[] {
  try {
    const raw = localStorage.getItem(USER_INTERESTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function saveUserInterests(topics: string[]): void {
  try {
    localStorage.setItem(USER_INTERESTS_KEY, JSON.stringify(topics.slice(0, 8)));
    localStorage.setItem(ONBOARDING_DONE_KEY, 'true');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ogv_interests_changed', { detail: topics }));
    }
  } catch {}
}

export function hasCompletedOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_DONE_KEY) === 'true';
  } catch {
    return true;
  }
}

export function markOnboardingCompleted(): void {
  try {
    localStorage.setItem(ONBOARDING_DONE_KEY, 'true');
  } catch {}
}

// ── Vault APK Release Radar Background Diffing ──

export function getVaultRadarResults(): Record<string, VaultRadarEntry> {
  if (cachedVaultRadar !== null) {
    return { ...cachedVaultRadar };
  }
  try {
    const raw = localStorage.getItem(VAULT_RADAR_CACHE_KEY);
    if (!raw) {
      const empty: Record<string, VaultRadarEntry> = {};
      cachedVaultRadar = empty;
      return empty;
    }
    const parsed = JSON.parse(raw);
    const next: Record<string, VaultRadarEntry> = parsed && typeof parsed === 'object' ? parsed : {};
    cachedVaultRadar = next;
    return { ...next };
  } catch {
    const empty: Record<string, VaultRadarEntry> = {};
    cachedVaultRadar = empty;
    return empty;
  }
}

function saveVaultRadarResults(results: Record<string, VaultRadarEntry>): void {
  cachedVaultRadar = results;
  safeSetLocalCache(VAULT_RADAR_CACHE_KEY, JSON.stringify(results));
}

function normalizeTagToSemver(tag?: string): string {
  if (!tag) return '';
  const match = tag.match(/(\d+(?:\.\d+){1,2})/);
  return match ? match[1] : tag.replace(/^v/i, '').trim();
}

function isReleaseTagNewer(liveTag: string, savedTag?: string): boolean {
  if (!liveTag) return false;
  if (!savedTag) return true;
  if (liveTag.trim() === savedTag.trim()) return false;
  const sLive = normalizeTagToSemver(liveTag);
  const sSaved = normalizeTagToSemver(savedTag);
  if (/^\d/.test(sLive) && /^\d/.test(sSaved)) {
    return compareSemver(sLive, sSaved) > 0;
  }
  return liveTag.trim() !== savedTag.trim();
}

function isApkLikeRepo(r: Repository): boolean {
  return Boolean(
    r.has_apks ||
      r.latest_release?.tag_name ||
      r.topics?.some((t) => /android|apk/i.test(t))
  );
}

const RADAR_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Checks latest release tags across saved Vault APK repositories.
 * Uses a single batched GraphQL query when authenticated (1 API call),
 * or lightweight REST release checks with 6h caching when unauthenticated.
 */
export async function checkVaultReleaseRadar(
  repos: Repository[],
  forceRefresh: boolean = false
): Promise<Record<string, VaultRadarEntry>> {
  const existing = getVaultRadarResults();
  const apkRepos = repos.filter(isApkLikeRepo).slice(0, 20);
  if (apkRepos.length === 0) return existing;

  const now = Date.now();
  const staleRepos = forceRefresh
    ? apkRepos
    : apkRepos.filter((r) => {
        const entry = existing[r.full_name.toLowerCase()];
        return !entry || now - entry.checkedAt >= RADAR_TTL_MS;
      });

  if (staleRepos.length === 0 || isCoreQuotaExhausted()) {
    return existing;
  }

  const nextResults: Record<string, VaultRadarEntry> = { ...existing };
  const token = getStoredToken();

  // Batched GraphQL single-request path when authenticated
  if (token) {
    try {
      const cleanToken = token.trim().replace(/^(Bearer|token)\s+/i, '');
      const fragments = staleRepos
        .map((r, idx) => {
          const [owner, name] = r.full_name.split('/');
          if (!owner || !name) return '';
          return `r${idx}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) {
            releases(first: 1, orderBy: { field: CREATED_AT, direction: DESC }) {
              nodes {
                tagName
                url
                releaseAssets(first: 5) {
                  nodes { id name size downloadCount downloadUrl contentType }
                }
              }
            }
          }`;
        })
        .filter(Boolean)
        .join('\n');

      const res = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: `query { ${fragments} }` }),
      });

      if (res.ok) {
        const body = await res.json();
        const data = body?.data || {};
        staleRepos.forEach((repo, idx) => {
          const node = data[`r${idx}`]?.releases?.nodes?.[0];
          if (!node?.tagName) return;
          const assets: ReleaseAsset[] = (node.releaseAssets?.nodes || []).map((a: any) => ({
            id: Number(a.id) || 0,
            name: a.name || '',
            size: a.size || 0,
            download_count: a.downloadCount || 0,
            browser_download_url: a.downloadUrl || '',
            content_type: a.contentType || '',
            is_apk: String(a.name || '').toLowerCase().endsWith('.apk'),
          }));
          const apkAsset = assets.find((a) => a.is_apk);
          const savedTag = repo.latest_release?.tag_name || '';
          const key = repo.full_name.toLowerCase();
          nextResults[key] = {
            fullName: repo.full_name,
            savedTag,
            latestTag: node.tagName,
            hasUpdate: isReleaseTagNewer(node.tagName, savedTag),
            releaseUrl: node.url || `${repo.html_url}/releases`,
            apkAsset,
            checkedAt: now,
          };
        });
        saveVaultRadarResults(nextResults);
        return nextResults;
      }
    } catch {}
  }

  // Unauthenticated / fallback lightweight REST check (limited to 6 stale repos per sweep)
  const batch = staleRepos.slice(0, 6);
  await Promise.all(
    batch.map(async (repo) => {
      try {
        const res = await fetch(`https://api.github.com/repos/${repo.full_name}/releases/latest`, {
          headers: { Accept: 'application/vnd.github.v3+json' },
        });
        if (!res.ok) return;
        const rel = await res.json();
        if (!rel?.tag_name) return;
        const assets: ReleaseAsset[] = (rel.assets || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          size: a.size || 0,
          download_count: a.download_count || 0,
          browser_download_url: a.browser_download_url,
          content_type: a.content_type || '',
          is_apk: String(a.name || '').toLowerCase().endsWith('.apk'),
        }));
        const savedTag = repo.latest_release?.tag_name || '';
        const key = repo.full_name.toLowerCase();
        nextResults[key] = {
          fullName: repo.full_name,
          savedTag,
          latestTag: rel.tag_name,
          hasUpdate: isReleaseTagNewer(rel.tag_name, savedTag),
          releaseUrl: rel.html_url || `${repo.html_url}/releases`,
          apkAsset: assets.find((a) => a.is_apk),
          checkedAt: now,
        };
      } catch {}
    })
  );

  saveVaultRadarResults(nextResults);
  return nextResults;
}
