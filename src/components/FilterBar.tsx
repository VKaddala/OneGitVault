import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowUpDown, 
  Code2, 
  LayoutGrid, 
  List, 
  RotateCcw,
  Bookmark,
  Star
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
  const presetTiers = [
    { label: 'All', value: 0 },
    { label: '10k+ ★', value: 10000 },
    { label: '50k+ ★', value: 50000 },
    { label: '100k+ ★', value: 100000 },
  ];

  const isCustom = !presetTiers.some((t) => t.value === minStars);

  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customInput, setCustomInput] = useState(minStars > 0 && isCustom ? minStars.toString() : '');
  const customRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customRef.current && !customRef.current.contains(e.target as Node)) {
        setIsCustomOpen(false);
      }
    };
    if (isCustomOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCustomOpen]);

  const formatStarsLabel = (stars: number) => {
    if (stars >= 1000000) return `${(stars / 1000000).toFixed(stars % 1000000 === 0 ? 0 : 1)}M+ ★`;
    if (stars >= 1000) return `${(stars / 1000).toFixed(stars % 1000 === 0 ? 0 : 1)}k+ ★`;
    return `${stars.toLocaleString()}+ ★`;
  };

  const handleApplyCustom = (val?: number) => {
    const num = val !== undefined ? val : parseInt(customInput.replace(/[^0-9]/g, ''), 10);
    const target = isNaN(num) || num < 0 ? 0 : num;
    onMinStarsChange(target);
    setIsCustomOpen(false);
  };

  return (
    <div className="pt-2.5 pb-1.5 relative z-30">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-surface border border-themeline rounded-xl px-3 py-1.5 backdrop-blur-sm transition-colors duration-200 shadow-sm relative z-30">
        
        {/* Left Side: Summary & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          
          <div className="text-xs font-mono text-txt-muted whitespace-nowrap mr-1">
            <span className="text-action font-bold">{totalResults.toLocaleString()}</span> repos
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1 bg-surface-active border border-themeline rounded-lg px-2 py-1 text-xs text-txt-primary shadow-sm">
            <ArrowUpDown className="w-3 h-3 text-action" />
            <span className="text-txt-muted font-mono text-[11px] hidden sm:inline">Sort:</span>
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
          <div className="flex items-center gap-1 bg-surface-active border border-themeline rounded-lg px-2 py-1 text-xs text-txt-primary shadow-sm">
            <Code2 className="w-3 h-3 text-action" />
            <span className="text-txt-muted font-mono text-[11px] hidden sm:inline">Lang:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="bg-transparent text-txt-primary font-medium focus:outline-none cursor-pointer max-w-[115px] text-xs"
            >
              <option value="" className="bg-surface text-txt-primary">All Languages</option>
              {availableLanguages.map((lang) => (
                <option key={lang} value={lang} className="bg-surface text-txt-primary">
                  {lang}
                </option>
              ))}
            </select>
          </div>

          {/* Star Threshold Filter with Presets & Custom Star Count */}
          <div className="flex items-center gap-0.5 bg-surface-active p-0.5 rounded-lg border border-themeline shadow-sm relative" ref={customRef}>
            {presetTiers.map((tier) => (
              <button
                key={tier.value}
                onClick={() => {
                  setIsCustomOpen(false);
                  onMinStarsChange(tier.value);
                }}
                className={`text-[11px] font-mono px-2 py-0.5 rounded-md transition-all ${
                  !isCustom && minStars === tier.value
                    ? 'bg-action text-txt-inverse font-bold shadow-sm'
                    : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
                }`}
                title={tier.value === 0 ? 'Show all repositories (0+ stars)' : `Filter repos with ≥ ${tier.value.toLocaleString()} stars`}
              >
                {tier.label}
              </button>
            ))}

            {/* Custom Star Trigger Button */}
            <button
              onClick={() => {
                setCustomInput(minStars > 0 ? minStars.toString() : '');
                setIsCustomOpen((prev) => !prev);
              }}
              className={`flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md transition-all ${
                isCustom
                  ? 'bg-action text-txt-inverse font-bold shadow-sm'
                  : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
              }`}
              title="Set custom minimum star count"
            >
              <Star className={`w-3 h-3 ${isCustom ? 'fill-current' : ''}`} />
              <span>{isCustom ? formatStarsLabel(minStars) : 'Custom...'}</span>
            </button>

            {/* Custom Star Count Popover */}
            {isCustomOpen && (
              <div className="absolute top-8 left-0 sm:left-auto sm:right-0 w-60 bg-surface border border-themeline rounded-xl shadow-2xl p-2.5 z-50 animate-fadeIn backdrop-blur-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-mono font-semibold text-txt-primary flex items-center gap-1">
                    <Star className="w-3 h-3 text-action fill-current" />
                    <span>Min Stars Filter</span>
                  </span>
                  <button
                    onClick={() => setIsCustomOpen(false)}
                    className="p-0.5 rounded text-txt-muted hover:text-txt-primary hover:bg-surface-active transition-colors text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center gap-1.5 mb-2">
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleApplyCustom();
                      }
                    }}
                    placeholder="e.g. 500, 2500"
                    autoFocus
                    className="w-full bg-surface-active border border-themeline rounded-lg px-2 py-1 text-xs font-mono text-txt-primary focus:outline-none focus:border-action"
                  />
                  <button
                    onClick={() => handleApplyCustom()}
                    className="px-2.5 py-1 rounded-lg bg-action hover:bg-action-hover text-txt-inverse text-xs font-mono font-bold transition-all shadow-sm"
                  >
                    Apply
                  </button>
                </div>

                {/* Quick Shortcuts */}
                <div className="flex items-center gap-1 flex-wrap pt-1.5 border-t border-themeline/60">
                  <span className="text-[10px] font-mono text-txt-muted mr-0.5">Quick:</span>
                  {[500, 1000, 2500, 5000, 25000].map((val) => (
                    <button
                      key={val}
                      onClick={() => handleApplyCustom(val)}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-active hover:bg-surface-hover text-txt-secondary hover:text-action border border-themeline transition-colors"
                    >
                      {val >= 1000 ? `${val / 1000}k` : val}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      onMinStarsChange(0);
                      setIsCustomOpen(false);
                    }}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-active hover:bg-surface-hover text-txt-muted hover:text-rose-500 border border-themeline transition-colors ml-auto"
                    title="Reset to 0 stars (All)"
                  >
                    Reset (0)
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Side: View Mode & Bookmarks & Reset */}
        <div className="flex items-center gap-1.5">
          
          {/* Only Bookmarked Toggle */}
          <button
            onClick={onToggleBookmarked}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
              onlyBookmarked
                ? 'bg-action text-txt-inverse border-action font-bold shadow-sm'
                : 'bg-surface-active hover:bg-surface-hover text-txt-secondary hover:text-txt-primary border-themeline'
            }`}
          >
            <Bookmark className={`w-3 h-3 ${onlyBookmarked ? 'fill-current text-txt-inverse' : 'text-action'}`} />
            <span>Vault Only</span>
          </button>

          {/* Reset Filters */}
          {isFiltered && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono text-txt-muted hover:text-txt-primary bg-surface-active hover:bg-surface-hover border border-themeline transition-all"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center bg-surface-active p-0.5 rounded-lg border border-themeline shadow-sm">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1 rounded-md transition-all ${
                viewMode === 'grid' ? 'bg-action text-txt-inverse font-bold' : 'text-txt-muted hover:text-txt-primary'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-1 rounded-md transition-all ${
                viewMode === 'list' ? 'bg-action text-txt-inverse font-bold' : 'text-txt-muted hover:text-txt-primary'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
