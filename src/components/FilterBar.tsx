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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#FFF9F0] dark:bg-[#16272f] ambient:bg-[#161b22] border border-[#e3d1ba] dark:border-[#244855] ambient:border-[#273548] rounded-2xl p-3.5 backdrop-blur-sm transition-colors duration-200">
        
        {/* Left Side: Summary & Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          <div className="text-xs font-mono text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8] mr-1">
            Displaying <span className="text-[#E64833] ambient:text-[#38bdf8] font-bold">{totalResults}</span> repos
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#FAF0E4] dark:bg-[#101b20] ambient:bg-[#0f141c] border border-[#e3d1ba] dark:border-[#203943] ambient:border-[#273548] rounded-xl px-2.5 py-1.5 text-xs text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc] shadow-sm">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#E64833] ambient:text-[#38bdf8]" />
            <span className="text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8] font-mono text-[11px]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="bg-transparent text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc] font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="stars" className="bg-[#FAF0E4] dark:bg-[#101b20] ambient:bg-[#0f141c]">Most Stars</option>
              <option value="forks" className="bg-[#FAF0E4] dark:bg-[#101b20] ambient:bg-[#0f141c]">Most Forks</option>
              <option value="updated" className="bg-[#FAF0E4] dark:bg-[#101b20] ambient:bg-[#0f141c]">Recently Updated</option>
            </select>
          </div>

          {/* Language Filter */}
          <div className="flex items-center gap-1.5 bg-[#FAF0E4] dark:bg-[#101b20] ambient:bg-[#0f141c] border border-[#e3d1ba] dark:border-[#203943] ambient:border-[#273548] rounded-xl px-2.5 py-1.5 text-xs text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc] shadow-sm">
            <Code2 className="w-3.5 h-3.5 text-[#E64833] ambient:text-[#38bdf8]" />
            <span className="text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8] font-mono text-[11px]">Lang:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="bg-transparent text-[#244855] dark:text-[#FBE9D0] ambient:text-[#f0f6fc] font-medium focus:outline-none cursor-pointer max-w-[130px] text-xs"
            >
              <option value="" className="bg-[#FAF0E4] dark:bg-[#101b20] ambient:bg-[#0f141c]">All Languages</option>
              {availableLanguages.map((lang) => (
                <option key={lang} value={lang} className="bg-[#FAF0E4] dark:bg-[#101b20] ambient:bg-[#0f141c]">
                  {lang}
                </option>
              ))}
            </select>
          </div>

          {/* Star Threshold Pills */}
          <div className="flex items-center gap-1 bg-[#FAF0E4] dark:bg-[#101b20] ambient:bg-[#0f141c] p-0.5 rounded-xl border border-[#e3d1ba] dark:border-[#203943] ambient:border-[#273548] shadow-sm">
            {starTiers.map((tier) => (
              <button
                key={tier.value}
                onClick={() => onMinStarsChange(tier.value)}
                className={`text-[11px] font-mono px-2.5 py-1 rounded-lg transition-all ${
                  minStars === tier.value
                    ? 'bg-[#E64833] ambient:bg-[#38bdf8] text-white ambient:text-[#0f141c] font-bold shadow-sm'
                    : 'text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8] hover:text-[#244855] dark:hover:text-[#FBE9D0] ambient:hover:text-white hover:bg-[#F2DFCA] dark:hover:bg-[#16272f] ambient:hover:bg-[#17202c]'
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
                ? 'bg-[#E64833] ambient:bg-[#38bdf8] text-white ambient:text-[#0f141c] border-[#E64833] ambient:border-[#38bdf8] font-bold shadow-sm'
                : 'bg-[#FAF0E4] hover:bg-[#F2DFCA] text-[#244855] border-[#e3d1ba] dark:bg-[#101b20] dark:hover:bg-[#16272f] dark:text-[#90AEAD] dark:hover:text-[#FBE9D0] dark:border-[#203943] ambient:bg-[#0f141c] ambient:hover:bg-[#17202c] ambient:text-[#94a3b8] ambient:hover:text-[#f0f6fc] ambient:border-[#273548]'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${onlyBookmarked ? 'fill-current text-white ambient:text-[#0f141c]' : 'text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8]'}`} />
            <span>Vault Only</span>
          </button>

          {/* Reset Filters */}
          {isFiltered && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono text-[#874F41] hover:text-[#244855] bg-[#FAF0E4] hover:bg-[#F2DFCA] border border-[#e3d1ba] dark:text-[#90AEAD] dark:hover:text-[#FBE9D0] dark:bg-[#101b20] dark:hover:bg-[#16272f] dark:border-[#203943] ambient:text-[#94a3b8] ambient:hover:text-white ambient:bg-[#0f141c] ambient:hover:bg-[#17202c] ambient:border-[#273548] transition-all"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#FAF0E4] dark:bg-[#101b20] ambient:bg-[#0f141c] p-0.5 rounded-xl border border-[#e3d1ba] dark:border-[#203943] ambient:border-[#273548] shadow-sm">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-[#244855] text-[#FBE9D0] dark:bg-[#E64833] dark:text-white ambient:bg-[#38bdf8] ambient:text-[#0f141c] font-bold' : 'text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8] hover:text-[#244855] dark:hover:text-[#FBE9D0] ambient:hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-[#244855] text-[#FBE9D0] dark:bg-[#E64833] dark:text-white ambient:bg-[#38bdf8] ambient:text-[#0f141c] font-bold' : 'text-[#874F41] dark:text-[#90AEAD] ambient:text-[#94a3b8] hover:text-[#244855] dark:hover:text-[#FBE9D0] ambient:hover:text-white'
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
