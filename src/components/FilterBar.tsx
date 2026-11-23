import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { 
  ArrowUpDown, 
  Code2, 
  LayoutGrid, 
  List, 
  RotateCcw,
  Bookmark,
  Star,
  Sparkles,
  Brain,
  Globe,
  Cloud,
  Wrench,
  Database,
  Smartphone,
  Shield,
  Package,
  Video
} from 'lucide-react';
import { SortOption, ViewMode, Category, CategoryId } from '../types';

interface FilterBarProps {
  categories: Category[];
  selectedCategory: CategoryId;
  onSelectCategory: (id: CategoryId) => void;
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
  categories,
  selectedCategory,
  onSelectCategory,
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
  const customTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  const selectedCategoryObj = useMemo(() => {
    return categories.find((c) => c.id === selectedCategory) || categories[0];
  }, [categories, selectedCategory]);

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Brain': return <Brain className="w-3.5 h-3.5" />;
      case 'Globe': return <Globe className="w-3.5 h-3.5" />;
      case 'Cloud': return <Cloud className="w-3.5 h-3.5" />;
      case 'Wrench': return <Wrench className="w-3.5 h-3.5" />;
      case 'Database': return <Database className="w-3.5 h-3.5" />;
      case 'Smartphone': return <Smartphone className="w-3.5 h-3.5" />;
      case 'Shield': return <Shield className="w-3.5 h-3.5" />;
      case 'Package': return <Package className="w-3.5 h-3.5" />;
      case 'Video': return <Video className="w-3.5 h-3.5" />;
      case 'Sparkles':
      default:
        return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  const updatePopoverPos = useCallback(() => {
    if (customTriggerRef.current) {
      const rect = customTriggerRef.current.getBoundingClientRect();
      const popoverWidth = 240;
      let left = rect.left;
      if (left + popoverWidth > window.innerWidth - 12) {
        left = window.innerWidth - popoverWidth - 12;
      }
      setPopoverPos({
        top: rect.bottom + 6,
        left: Math.max(12, left),
      });
    }
  }, []);

  const handleToggleCustom = () => {
    if (!isCustomOpen) {
      updatePopoverPos();
      setCustomInput(minStars > 0 ? minStars.toString() : '');
      setIsCustomOpen(true);
    } else {
      setIsCustomOpen(false);
    }
  };

  useEffect(() => {
    if (!isCustomOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTrigger = customTriggerRef.current?.contains(target);
      const insidePopover = document.getElementById('custom-stars-portal')?.contains(target);
      if (!insideTrigger && !insidePopover) {
        setIsCustomOpen(false);
      }
    };

    const handleWindowResize = () => {
      updatePopoverPos();
    };

    const handleWindowScroll = () => {
      updatePopoverPos();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('scroll', handleWindowScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('scroll', handleWindowScroll, true);
    };
  }, [isCustomOpen, updatePopoverPos]);

  const handleApplyCustom = (val?: number) => {
    const stars = val !== undefined ? val : parseInt(customInput, 10);
    if (!isNaN(stars) && stars >= 0) {
      onMinStarsChange(stars);
      setIsCustomOpen(false);
    }
  };

  const formatStarsLabel = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M+ ★`;
    if (count >= 1000) return `${Math.floor(count / 1000)}k+ ★`;
    return `${count}+ ★`;
  };

  return (
    <div className="w-full bg-surface border border-themeline rounded-2xl p-2.5 sm:p-3 my-3 sm:my-4 shadow-sm transition-colors duration-200">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* Left Side: Summary & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          
          <div className="text-xs font-mono text-txt-muted whitespace-nowrap mr-1">
            <span className="text-action font-bold">{totalResults.toLocaleString()}</span> repos
          </div>

          {/* Category Dropdown Filter */}
          <div className="flex items-center gap-1.5 bg-surface-active hover:bg-surface border border-themeline hover:border-action-border rounded-lg px-2.5 py-1 text-xs text-txt-primary shadow-sm transition-all group">
            <span className="text-action flex-shrink-0">
              {getCategoryIcon(selectedCategoryObj?.icon || 'Sparkles')}
            </span>
            <span className="text-txt-muted font-mono text-[11px] hidden sm:inline">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => onSelectCategory(e.target.value as CategoryId)}
              className="bg-transparent text-txt-primary font-semibold focus:outline-none cursor-pointer text-xs pr-1"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-surface text-txt-primary py-1">
                  {cat.name}
                </option>
              ))}
            </select>
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
          <div className="flex items-center gap-0.5 bg-surface-active p-0.5 rounded-lg border border-themeline shadow-sm relative">
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
              ref={customTriggerRef}
              onClick={handleToggleCustom}
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

            {/* Custom Star Count Popover Rendered Via Portal */}
            {isCustomOpen && popoverPos && ReactDOM.createPortal(
              <div 
                id="custom-stars-portal"
                style={{
                  position: 'fixed',
                  top: popoverPos.top,
                  left: popoverPos.left,
                  width: '240px',
                  zIndex: 99999,
                }}
                className="bg-surface border border-themeline rounded-xl shadow-2xl p-2.5 animate-fadeIn backdrop-blur-xl"
              >
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
              </div>,
              document.body
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
