export interface Repository {
  id: number | string;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  topics: string[];
  updated_at: string;
  created_at?: string;
  category: CategoryId;
  license?: {
    key: string;
    name: string;
    spdx_id: string;
  } | null;
}

export type CategoryId = 
  | 'all'
  | 'ai-ml'
  | 'web-frameworks'
  | 'devops-cloud'
  | 'developer-tools'
  | 'databases'
  | 'mobile-crossplatform'
  | 'cybersecurity';

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  icon: string;
  queryTopic: string;
  count?: number;
}

export type SortOption = 'stars' | 'forks' | 'updated';
export type ViewMode = 'grid' | 'list';
export type ThemeMode = 'dark' | 'light' | 'ambient';

export interface ReleaseAsset {
  id: number;
  name: string;
  size: number;
  download_count: number;
  browser_download_url: string;
  content_type: string;
  created_at: string;
}

export interface Release {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  published_at: string;
  html_url: string;
  assets: ReleaseAsset[];
  zipball_url?: string;
  tarball_url?: string;
}

export interface FilterState {
  searchQuery: string;
  category: CategoryId;
  selectedLanguage: string;
  sortBy: SortOption;
  minStars: number;
  viewMode: ViewMode;
  onlyBookmarked: boolean;
}

export interface ElectronAPI {
  platform: string;
  isElectron: boolean;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  isMaximized: () => Promise<boolean>;
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void;
  openExternal: (url: string) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
