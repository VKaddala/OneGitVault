import React from 'react';
import { 
  ArrowUpDown, 
  Code2, 
  LayoutGrid, 
  List, 
  RotateCcw,
  Bookmark
} from 'lucide-react';
import { SortOption, ViewMode } from '../types';

interface FilterBarProps {
  totalResults: number;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  availableLanguages: string[];
  minStars: number;
  onMinStarsChange: (stars: number) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onlyBookmarked: boolean;
  onToggleBookmarked: () => void;
  onResetFilters: () => void;
  isFiltered: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  totalResults,
  sortBy,
  onSortChange,
  selectedLanguage,
  onLanguageChange,
  availableLanguages,
  minStars,
  onMinStarsChange,
  viewMode,
  onViewModeChange,
  onlyBookmarked,
  onToggleBookmarked,
  onResetFilters,
  isFiltered
}) => {
  const starTiers = [
    { label: 'All', value: 0 },
    { label: '10k+ ★', value: 10000 },
    { label: '50k+ ★', value: 50000 },
    { label: '100k+ ★', value: 100000 },
  ];

  return (
    <div className="py-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-neutral-100 dark:bg-[#111217] border border-neutral-200 dark:border-[#20212b] rounded-2xl p-3.5 backdrop-blur-sm transition-colors duration-200">
        
        {/* Left Side: Summary & Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          <div className="text-xs font-mono text-neutral-500 dark:text-charcoal-400 mr-1">
            Displaying <span className="text-amber-600 dark:text-amber-brand font-bold">{totalResults}</span> repos
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#16171f] border border-neutral-300 dark:border-[#262836] rounded-xl px-2.5 py-1.5 text-xs text-neutral-800 dark:text-charcoal-200 shadow-sm">
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-brand" />
            <span className="text-neutral-500 dark:text-charcoal-400 font-mono text-[11px]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="bg-transparent text-neutral-900 dark:text-charcoal-100 font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="stars" className="bg-white dark:bg-[#16171f]">Most Stars</option>
              <option value="forks" className="bg-white dark:bg-[#16171f]">Most Forks</option>
              <option value="updated" className="bg-white dark:bg-[#16171f]">Recently Updated</option>
            </select>
          </div>

          {/* Language Filter */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#16171f] border border-neutral-300 dark:border-[#262836] rounded-xl px-2.5 py-1.5 text-xs text-neutral-800 dark:text-charcoal-200 shadow-sm">
            <Code2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-brand" />
            <span className="text-neutral-500 dark:text-charcoal-400 font-mono text-[11px]">Lang:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="bg-transparent text-neutral-900 dark:text-charcoal-100 font-medium focus:outline-none cursor-pointer max-w-[130px] text-xs"
            >
              <option value="" className="bg-white dark:bg-[#16171f]">All Languages</option>
              {availableLanguages.map((lang) => (
                <option key={lang} value={lang} className="bg-white dark:bg-[#16171f]">
                  {lang}
                </option>
              ))}
            </select>
          </div>

          {/* Star Threshold Pills */}
          <div className="flex items-center gap-1 bg-white dark:bg-[#16171f] p-0.5 rounded-xl border border-neutral-300 dark:border-[#262836] shadow-sm">
            {starTiers.map((tier) => (
              <button
                key={tier.value}
                onClick={() => onMinStarsChange(tier.value)}
                className={`text-[11px] font-mono px-2.5 py-1 rounded-lg transition-all ${
                  minStars === tier.value
                    ? 'bg-amber-600 dark:bg-amber-brand text-white dark:text-[#0c0d10] font-bold shadow-sm'
                    : 'text-neutral-500 dark:text-charcoal-400 hover:text-neutral-800 dark:hover:text-charcoal-200 hover:bg-neutral-100 dark:hover:bg-[#20212b]'
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>

        </div>

        {/* Right Side: View Mode & Bookmarks & Reset */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          
          {/* Only Bookmarked Toggle */}
          <button
            onClick={onToggleBookmarked}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border transition-all ${
              onlyBookmarked
                ? 'bg-amber-500/20 text-amber-800 dark:text-amber-brand border-amber-500/40 font-bold'
                : 'bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-300 dark:bg-[#16171f] dark:hover:bg-[#1d1e28] dark:text-charcoal-300 dark:border-[#262836]'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${onlyBookmarked ? 'fill-amber-600 dark:fill-amber-brand text-amber-600 dark:text-amber-brand' : ''}`} />
            <span>Vault Only</span>
          </button>

          {/* Reset Filters */}
          {isFiltered && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono text-neutral-500 hover:text-neutral-900 bg-white hover:bg-neutral-50 border border-neutral-300 dark:text-charcoal-400 dark:hover:text-white dark:bg-[#16171f] dark:hover:bg-[#20212b] dark:border-[#262836] transition-all"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center bg-white dark:bg-[#16171f] p-0.5 rounded-xl border border-neutral-300 dark:border-[#262836] shadow-sm">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-neutral-200 dark:bg-[#262836] text-amber-700 dark:text-amber-brand' : 'text-neutral-400 dark:text-charcoal-400 hover:text-neutral-800 dark:hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-neutral-200 dark:bg-[#262836] text-amber-700 dark:text-amber-brand' : 'text-neutral-400 dark:text-charcoal-400 hover:text-neutral-800 dark:hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
