export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  language: string | null;
  topics: string[];
  updated_at: string;
  created_at: string;
  pushed_at: string;
  clone_url: string;
  default_branch: string;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  license?: {
    key: string;
    name: string;
    spdx_id: string;
  } | null;
  has_apks?: boolean;
  apk_count?: number;
  latest_release?: {
    tag_name: string;
    name: string;
    published_at: string;
    assets: ReleaseAsset[];
  };
}

export interface ReleaseAsset {
  id: number;
  name: string;
  size: number;
  download_count: number;
  browser_download_url: string;
  content_type: string;
  is_apk?: boolean;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  query: string;
  description: string;
}

export type SortOption = 'stars' | 'forks' | 'updated' | 'newest';
export type TimeRange = 'daily' | 'weekly' | 'monthly';

export interface RateLimitState {
  coreRemaining: number;
  coreLimit: number;
  coreReset: number;
  searchRemaining: number;
  searchLimit: number;
  searchReset: number;
  isAuthenticated: boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date | null;
  searchLimit?: number;
  searchRemaining?: number;
  searchResetTime?: Date | null;
}
