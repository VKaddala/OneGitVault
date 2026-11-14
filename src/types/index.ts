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

export interface FilterState {
  searchQuery: string;
  category: CategoryId;
  selectedLanguage: string;
  sortBy: SortOption;
  minStars: number;
  viewMode: ViewMode;
  onlyBookmarked: boolean;
}
