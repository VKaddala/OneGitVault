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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface border border-themeline rounded-2xl p-3.5 backdrop-blur-sm transition-colors duration-200">
        
        {/* Left Side: Summary & Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          <div className="text-xs font-mono text-txt-muted mr-1">
            Displaying <span className="text-action font-bold">{totalResults}</span> repos
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 bg-surface-active border border-themeline rounded-xl px-2.5 py-1.5 text-xs text-txt-primary shadow-sm">
            <ArrowUpDown className="w-3.5 h-3.5 text-action" />
            <span className="text-txt-muted font-mono text-[11px]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="bg-transparent text-txt-primary font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="stars" className="bg-surface text-txt-primary">Most Stars</option>
              <option value="forks" className="bg-surface text-txt-primary">Most Forks</option>
              <option value="updated" className="bg-surface text-txt-primary">Recently Updated</option>
            </select>
          </div>

          {/* Language Filter */}
          <div className="flex items-center gap-1.5 bg-surface-active border border-themeline rounded-xl px-2.5 py-1.5 text-xs text-txt-primary shadow-sm">
            <Code2 className="w-3.5 h-3.5 text-action" />
            <span className="text-txt-muted font-mono text-[11px]">Lang:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="bg-transparent text-txt-primary font-medium focus:outline-none cursor-pointer max-w-[130px] text-xs"
            >
              <option value="" className="bg-surface text-txt-primary">All Languages</option>
              {availableLanguages.map((lang) => (
                <option key={lang} value={lang} className="bg-surface text-txt-primary">
                  {lang}
                </option>
              ))}
            </select>
          </div>

          {/* Star Threshold Pills */}
          <div className="flex items-center gap-1 bg-surface-active p-0.5 rounded-xl border border-themeline shadow-sm">
            {starTiers.map((tier) => (
              <button
                key={tier.value}
                onClick={() => onMinStarsChange(tier.value)}
                className={`text-[11px] font-mono px-2.5 py-1 rounded-lg transition-all ${
                  minStars === tier.value
                    ? 'bg-action text-txt-inverse font-bold shadow-sm'
                    : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
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
                ? 'bg-action text-txt-inverse border-action font-bold shadow-sm'
                : 'bg-surface-active hover:bg-surface-hover text-txt-secondary hover:text-txt-primary border-themeline'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${onlyBookmarked ? 'fill-current text-txt-inverse' : 'text-action'}`} />
            <span>Vault Only</span>
          </button>

          {/* Reset Filters */}
          {isFiltered && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono text-txt-muted hover:text-txt-primary bg-surface-active hover:bg-surface-hover border border-themeline transition-all"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center bg-surface-active p-0.5 rounded-xl border border-themeline shadow-sm">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-action text-txt-inverse font-bold' : 'text-txt-muted hover:text-txt-primary'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-action text-txt-inverse font-bold' : 'text-txt-muted hover:text-txt-primary'
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
