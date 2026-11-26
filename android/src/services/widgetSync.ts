import { Repository } from '../types';
import { getBookmarks, getVaultRadarResults } from './bookmarkStore';

/**
 * Synchronizes top trending repos and vault release radar data
 * to native Android Home Screen widgets via the AndroidThemeBridge.
 */
export function syncNativeWidgets(trendingRepos?: Repository[]): void {
  if (typeof window === 'undefined') return;

  try {
    const bridge = (window as any).AndroidThemeBridge;
    if (!bridge?.updateNativeWidgets) return;

    // 1. Prepare Trending Data
    let trendingJson: string | null = null;
    if (Array.isArray(trendingRepos) && trendingRepos.length > 0) {
      const topItems = trendingRepos.slice(0, 5).map((r) => ({
        name: r.name,
        full_name: r.full_name,
        description: r.description,
        language: r.language,
        stargazers_count: r.stargazers_count,
      }));
      trendingJson = JSON.stringify(topItems);
    }

    // 2. Prepare Vault Data
    const bookmarks = getBookmarks();
    const radarMap = getVaultRadarResults();
    const updatedEntries = bookmarks.filter((r) => radarMap[(r.full_name || '').toLowerCase()]?.hasUpdate);

    const vaultPayload = {
      totalSaved: bookmarks.length,
      updatesCount: updatedEntries.length,
      latestUpdatedRepo: updatedEntries[0]?.name || (bookmarks[0]?.name ?? 'Vault'),
      latestReleaseTag: updatedEntries[0]
        ? radarMap[(updatedEntries[0].full_name || '').toLowerCase()]?.latestTag || 'New'
        : '',
      reposToCheck: bookmarks.slice(0, 10).map((b) => b.full_name).filter(Boolean),
    };
    const vaultJson = JSON.stringify(vaultPayload);

    bridge.updateNativeWidgets(trendingJson, vaultJson);
  } catch {}
}
