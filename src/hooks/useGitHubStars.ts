import { useState, useCallback, useEffect } from 'react';
import { Repository } from '../types';
import { 
  getStoredToken, 
  checkIsRepoStarred, 
  starRepository, 
  unstarRepository 
} from '../services/githubApi';

const STARRED_CACHE_KEY = 'onegitvault_starred_repos_v1';

function getStoredStarredSet(): Set<string> {
  try {
    const raw = localStorage.getItem(STARRED_CACHE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr);
      }
    }
  } catch (e) {
    console.error('Failed to load starred repos from localStorage', e);
  }
  return new Set();
}

function saveStoredStarredSet(set: Set<string>): void {
  try {
    localStorage.setItem(STARRED_CACHE_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error('Failed to save starred repos to localStorage', e);
  }
}

export function useGitHubStars() {
  const [starredSet, setStarredSet] = useState<Set<string>>(() => getStoredStarredSet());
  const [starDeltas, setStarDeltas] = useState<Record<string, number>>({});
  const [token, setToken] = useState<string>(() => getStoredToken());

  // Periodically keep token state synced in case TokenModal modifies it
  useEffect(() => {
    const interval = setInterval(() => {
      const currentToken = getStoredToken();
      setToken((prev) => (prev !== currentToken ? currentToken : prev));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hasToken = Boolean(token && token.trim().length > 0);

  const isStarred = useCallback(
    (fullName: string) => starredSet.has(fullName),
    [starredSet]
  );

  const getRepoStarCount = useCallback(
    (repo: Repository) => {
      const delta = starDeltas[repo.full_name] || 0;
      return Math.max(0, repo.stargazers_count + delta);
    },
    [starDeltas]
  );

  // Checks live GitHub API starred status for a specific repository if authenticated
  const checkLiveStatus = useCallback(async (fullName: string) => {
    if (!hasToken || !fullName) return false;
    try {
      const liveStarred = await checkIsRepoStarred(fullName);
      setStarredSet((prev) => {
        const currentlyHas = prev.has(fullName);
        if (currentlyHas !== liveStarred) {
          const next = new Set(prev);
          if (liveStarred) next.add(fullName);
          else next.delete(fullName);
          saveStoredStarredSet(next);
          return next;
        }
        return prev;
      });
      return liveStarred;
    } catch {
      return false;
    }
  }, [hasToken]);

  const toggleStar = useCallback(
    async (repo: Repository): Promise<{ success: boolean; needToken?: boolean; isStarred: boolean; newCount: number }> => {
      const currentToken = getStoredToken();
      if (!currentToken) {
        return {
          success: false,
          needToken: true,
          isStarred: starredSet.has(repo.full_name),
          newCount: repo.stargazers_count,
        };
      }

      const alreadyStarred = starredSet.has(repo.full_name);
      const newStarred = !alreadyStarred;

      // 1. Optimistic UI update
      setStarredSet((prev) => {
        const next = new Set(prev);
        if (newStarred) next.add(repo.full_name);
        else next.delete(repo.full_name);
        saveStoredStarredSet(next);
        return next;
      });

      setStarDeltas((prev) => ({
        ...prev,
        [repo.full_name]: (prev[repo.full_name] || 0) + (newStarred ? 1 : -1),
      }));

      // 2. Perform API call to GitHub
      try {
        const ok = newStarred
          ? await starRepository(repo.full_name)
          : await unstarRepository(repo.full_name);

        if (!ok) {
          // Revert optimistic update on failure
          setStarredSet((prev) => {
            const next = new Set(prev);
            if (alreadyStarred) next.add(repo.full_name);
            else next.delete(repo.full_name);
            saveStoredStarredSet(next);
            return next;
          });
          setStarDeltas((prev) => ({
            ...prev,
            [repo.full_name]: (prev[repo.full_name] || 0) + (newStarred ? -1 : 1),
          }));
          return {
            success: false,
            isStarred: alreadyStarred,
            newCount: repo.stargazers_count,
          };
        }

        const delta = (starDeltas[repo.full_name] || 0) + (newStarred ? 1 : -1);
        return {
          success: true,
          isStarred: newStarred,
          newCount: Math.max(0, repo.stargazers_count + delta),
        };
      } catch (e) {
        console.error('Error toggling star on GitHub', e);
        return {
          success: false,
          isStarred: alreadyStarred,
          newCount: repo.stargazers_count,
        };
      }
    },
    [starredSet, starDeltas]
  );

  return {
    hasToken,
    isStarred,
    getRepoStarCount,
    toggleStar,
    checkLiveStatus,
  };
}
