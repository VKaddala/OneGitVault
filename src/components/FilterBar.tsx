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
  Video,
  ChevronDown,
  Check,
  GitFork,
  Calendar,
  Search
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

  // ── Custom Star Count State ──
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customInput, setCustomInput] = useState(minStars > 0 && isCustom ? minStars.toString() : '');
  const customTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  // ── Custom Themed Category Menu State ──
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [categoryPos, setCategoryPos] = useState<{ top: number; left: number } | null>(null);

  // ── Custom Themed Sort Menu State ──
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [sortPos, setSortPos] = useState<{ top: number; left: number } | null>(null);

  // ── Custom Themed Language Menu State ──
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [langSearch, setLangSearch] = useState('');
  const langTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [langPos, setLangPos] = useState<{ top: number; left: number } | null>(null);

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

  // Helper to compute dropdown screen position
  const computePos = (trigger: HTMLElement | null, width: number) => {
    if (!trigger) return null;
    const rect = trigger.getBoundingClientRect();
    let left = rect.left;
    if (left + width > window.innerWidth - 12) {
      left = window.innerWidth - width - 12;
    }
    return {
      top: rect.bottom + 6,
      left: Math.max(12, left),
    };
  };

  const updateAllPositions = useCallback(() => {
    if (categoryTriggerRef.current) setCategoryPos(computePos(categoryTriggerRef.current, 270));
    if (sortTriggerRef.current) setSortPos(computePos(sortTriggerRef.current, 200));
    if (langTriggerRef.current) setLangPos(computePos(langTriggerRef.current, 220));
    if (customTriggerRef.current) setPopoverPos(computePos(customTriggerRef.current, 240));
  }, []);

  const handleToggleCategory = () => {
    if (!isCategoryOpen) {
      setCategoryPos(computePos(categoryTriggerRef.current, 270));
      setIsCategoryOpen(true);
      setIsSortOpen(false);
      setIsLangOpen(false);
      setIsCustomOpen(false);
    } else {
      setIsCategoryOpen(false);
    }
  };

  const handleToggleSort = () => {
    if (!isSortOpen) {
      setSortPos(computePos(sortTriggerRef.current, 200));
      setIsSortOpen(true);
      setIsCategoryOpen(false);
      setIsLangOpen(false);
      setIsCustomOpen(false);
    } else {
      setIsSortOpen(false);
    }
  };

  const handleToggleLang = () => {
    if (!isLangOpen) {
      setLangPos(computePos(langTriggerRef.current, 220));
      setLangSearch('');
      setIsLangOpen(true);
      setIsCategoryOpen(false);
      setIsSortOpen(false);
      setIsCustomOpen(false);
    } else {
      setIsLangOpen(false);
    }
  };

  const handleToggleCustom = () => {
    if (!isCustomOpen) {
      setPopoverPos(computePos(customTriggerRef.current, 240));
      setCustomInput(minStars > 0 ? minStars.toString() : '');
      setIsCustomOpen(true);
      setIsCategoryOpen(false);
      setIsSortOpen(false);
      setIsLangOpen(false);
    } else {
      setIsCustomOpen(false);
    }
  };

  // Close menus when clicking outside or resizing
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      
      const insideCatTrigger = categoryTriggerRef.current?.contains(target);
      const insideCatPortal = document.getElementById('category-dropdown-portal')?.contains(target);
      if (!insideCatTrigger && !insideCatPortal) setIsCategoryOpen(false);

      const insideSortTrigger = sortTriggerRef.current?.contains(target);
      const insideSortPortal = document.getElementById('sort-dropdown-portal')?.contains(target);
      if (!insideSortTrigger && !insideSortPortal) setIsSortOpen(false);

      const insideLangTrigger = langTriggerRef.current?.contains(target);
      const insideLangPortal = document.getElementById('lang-dropdown-portal')?.contains(target);
      if (!insideLangTrigger && !insideLangPortal) setIsLangOpen(false);

      const insideStarTrigger = customTriggerRef.current?.contains(target);
      const insideStarPortal = document.getElementById('custom-stars-portal')?.contains(target);
      if (!insideStarTrigger && !insideStarPortal) setIsCustomOpen(false);
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', updateAllPositions);
    window.addEventListener('scroll', updateAllPositions, true);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', updateAllPositions);
      window.removeEventListener('scroll', updateAllPositions, true);
    };
  }, [updateAllPositions]);

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

  const filteredLanguages = useMemo(() => {
    if (!langSearch.trim()) return availableLanguages;
    const q = langSearch.toLowerCase();
    return availableLanguages.filter((l) => l.toLowerCase().includes(q));
  }, [availableLanguages, langSearch]);

  const sortOptions: { value: SortOption; label: string; icon: React.ReactNode }[] = [
    { value: 'stars', label: 'Most Stars', icon: <Star className="w-3.5 h-3.5 text-amber-500 fill-current" /> },
    { value: 'forks', label: 'Most Forks', icon: <GitFork className="w-3.5 h-3.5 text-action" /> },
    { value: 'updated', label: 'Recently Updated', icon: <Calendar className="w-3.5 h-3.5 text-emerald-500" /> },
  ];

  return (
    <div className="w-full bg-surface border border-themeline rounded-2xl p-2.5 sm:p-3 my-3 sm:my-4 shadow-sm transition-colors duration-200">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* Left Side: Summary & Custom Themed Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          
          <div className="text-xs font-sans font-medium text-txt-muted whitespace-nowrap mr-1 flex items-center gap-1">
            <span className="text-action font-bold text-xs sm:text-[13px] font-sans tracking-tight">{totalResults.toLocaleString()}</span>
            <span>repos</span>
          </div>

          {/* 1. Custom Themed Category Dropdown */}
          <div className="relative">
            <button
              ref={categoryTriggerRef}
              onClick={handleToggleCategory}
              type="button"
              className={`flex items-center gap-1.5 bg-surface-active hover:bg-surface border rounded-lg px-2.5 py-1 text-xs font-sans text-txt-primary shadow-sm transition-all group ${
                isCategoryOpen ? 'border-action ring-1 ring-action/30 bg-surface' : 'border-themeline hover:border-action-border'
              }`}
              title="Select technology sector"
            >
              <span className="text-action flex-shrink-0">
                {getCategoryIcon(selectedCategoryObj?.icon || 'Sparkles')}
              </span>
              <span className="text-txt-muted font-sans font-medium text-[11px] hidden sm:inline">Category:</span>
              <span className="font-semibold text-txt-primary truncate max-w-[140px]">
                {selectedCategoryObj.name}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-txt-muted transition-transform duration-200 ${
                  isCategoryOpen ? 'rotate-180 text-action' : 'group-hover:text-txt-primary'
                }`}
              />
            </button>

            {/* Themed Category Menu Portal */}
            {isCategoryOpen && categoryPos && ReactDOM.createPortal(
              <div
                id="category-dropdown-portal"
                style={{
                  position: 'fixed',
                  top: categoryPos.top,
                  left: categoryPos.left,
                  width: '270px',
                  zIndex: 99999,
                }}
                className="bg-surface border border-themeline rounded-2xl shadow-2xl p-1.5 animate-fadeIn backdrop-blur-2xl max-h-[420px] overflow-y-auto no-scrollbar"
              >
                <div className="flex items-center justify-between px-2.5 py-1.5 mb-1 border-b border-themeline/60">
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-txt-muted flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-action" />
                    <span>Technology Sectors</span>
                  </span>
                  <span className="text-[9px] font-sans font-semibold px-1.5 py-0.5 rounded-full bg-surface-active border border-themeline text-txt-muted">
                    {categories.length} Sectors
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  {categories.map((cat) => {
                    const isSelected = cat.id === selectedCategory;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          onSelectCategory(cat.id);
                          setIsCategoryOpen(false);
                        }}
                        className={`flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-xs text-left transition-all group ${
                          isSelected
                            ? 'bg-action-soft text-action border border-action-border font-bold'
                            : 'text-txt-primary hover:bg-surface-hover hover:text-action border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`p-1 rounded-lg ${isSelected ? 'bg-action text-white' : 'bg-surface-active text-txt-muted group-hover:text-action'}`}>
                            {getCategoryIcon(cat.icon)}
                          </span>
                          <span className="truncate block font-medium">
                            {cat.name}
                          </span>
                        </div>

                        {isSelected && (
                          <Check className="w-4 h-4 text-action flex-shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>,
              document.body
            )}
          </div>

          {/* 2. Custom Themed Sort Dropdown */}
          <div className="relative">
            <button
              ref={sortTriggerRef}
              onClick={handleToggleSort}
              type="button"
              className={`flex items-center gap-1.5 bg-surface-active hover:bg-surface border rounded-lg px-2.5 py-1 text-xs font-sans text-txt-primary shadow-sm transition-all group ${
                isSortOpen ? 'border-action ring-1 ring-action/30 bg-surface' : 'border-themeline hover:border-action-border'
              }`}
              title="Sort repositories"
            >
              <ArrowUpDown className="w-3 h-3 text-action flex-shrink-0" />
              <span className="text-txt-muted font-sans font-medium text-[11px] hidden sm:inline">Sort:</span>
              <span className="font-semibold text-txt-primary">
                {sortBy === 'stars' ? 'Most Stars' : sortBy === 'forks' ? 'Most Forks' : 'Recently Updated'}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-txt-muted transition-transform duration-200 ${
                  isSortOpen ? 'rotate-180 text-action' : 'group-hover:text-txt-primary'
                }`}
              />
            </button>

            {/* Themed Sort Menu Portal */}
            {isSortOpen && sortPos && ReactDOM.createPortal(
              <div
                id="sort-dropdown-portal"
                style={{
                  position: 'fixed',
                  top: sortPos.top,
                  left: sortPos.left,
                  width: '200px',
                  zIndex: 99999,
                }}
                className="bg-surface border border-themeline rounded-2xl shadow-2xl p-1.5 animate-fadeIn backdrop-blur-2xl"
              >
                <div className="px-2.5 py-1 mb-1 border-b border-themeline/60">
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-txt-muted">
                    Sort Criteria
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {sortOptions.map((opt) => {
                    const isSelected = opt.value === sortBy;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onSortChange(opt.value);
                          setIsSortOpen(false);
                        }}
                        className={`flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-xs text-left transition-all ${
                          isSelected
                            ? 'bg-action-soft text-action border border-action-border font-bold'
                            : 'text-txt-primary hover:bg-surface-hover hover:text-action border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {opt.icon}
                          <span>{opt.label}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-action flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>,
              document.body
            )}
          </div>

          {/* 3. Custom Themed Language Dropdown */}
          <div className="relative">
            <button
              ref={langTriggerRef}
              onClick={handleToggleLang}
              type="button"
              className={`flex items-center gap-1.5 bg-surface-active hover:bg-surface border rounded-lg px-2.5 py-1 text-xs font-sans text-txt-primary shadow-sm transition-all group ${
                isLangOpen ? 'border-action ring-1 ring-action/30 bg-surface' : 'border-themeline hover:border-action-border'
              }`}
              title="Filter by programming language"
            >
              <Code2 className="w-3 h-3 text-action flex-shrink-0" />
              <span className="text-txt-muted font-sans font-medium text-[11px] hidden sm:inline">Lang:</span>
              <span className="font-semibold text-txt-primary truncate max-w-[110px]">
                {selectedLanguage || 'All Languages'}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-txt-muted transition-transform duration-200 ${
                  isLangOpen ? 'rotate-180 text-action' : 'group-hover:text-txt-primary'
                }`}
              />
            </button>

            {/* Themed Language Menu Portal */}
            {isLangOpen && langPos && ReactDOM.createPortal(
              <div
                id="lang-dropdown-portal"
                style={{
                  position: 'fixed',
                  top: langPos.top,
                  left: langPos.left,
                  width: '230px',
                  zIndex: 99999,
                }}
                className="bg-surface border border-themeline rounded-2xl shadow-2xl p-2 animate-fadeIn backdrop-blur-2xl max-h-[380px] flex flex-col"
              >
                {/* Search input for languages */}
                <div className="relative mb-2">
                  <Search className="w-3 h-3 text-txt-muted absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={langSearch}
                    onChange={(e) => setLangSearch(e.target.value)}
                    placeholder="Search language..."
                    autoFocus
                    className="w-full pl-7 pr-2.5 py-1.5 bg-surface-active border border-themeline rounded-lg text-xs font-mono text-txt-primary placeholder-txt-muted/50 focus:outline-none focus:border-action"
                  />
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-0.5 max-h-[280px]">
                  {/* Option: All Languages */}
                  <button
                    type="button"
                    onClick={() => {
                      onLanguageChange('');
                      setIsLangOpen(false);
                    }}
                    className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs text-left transition-all ${
                      !selectedLanguage
                        ? 'bg-action-soft text-action border border-action-border font-bold'
                        : 'text-txt-primary hover:bg-surface-hover hover:text-action border border-transparent'
                    }`}
                  >
                    <span>All Languages</span>
                    {!selectedLanguage && <Check className="w-3.5 h-3.5 text-action" />}
                  </button>

                  {/* Filtered available languages */}
                  {filteredLanguages.map((lang) => {
                    const isSelected = selectedLanguage.toLowerCase() === lang.toLowerCase();
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => {
                          onLanguageChange(lang);
                          setIsLangOpen(false);
                        }}
                        className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs text-left transition-all ${
                          isSelected
                            ? 'bg-action-soft text-action border border-action-border font-bold'
                            : 'text-txt-primary hover:bg-surface-hover hover:text-action border border-transparent'
                        }`}
                      >
                        <span className="truncate">{lang}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-action" />}
                      </button>
                    );
                  })}
                </div>
              </div>,
              document.body
            )}
          </div>

          {/* 4. Star Threshold Filter with Presets & Custom Star Count */}
          <div className="flex items-center gap-0.5 bg-surface-active p-0.5 rounded-lg border border-themeline shadow-sm relative">
            {presetTiers.map((tier) => (
              <button
                key={tier.value}
                onClick={() => {
                  setIsCustomOpen(false);
                  onMinStarsChange(tier.value);
                }}
                className={`text-[11px] font-sans font-medium px-2 py-0.5 rounded-md transition-all ${
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
              className={`flex items-center gap-1 text-[11px] font-sans font-medium px-2 py-0.5 rounded-md transition-all ${
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
                className="bg-surface border border-themeline rounded-2xl shadow-2xl p-2.5 animate-fadeIn backdrop-blur-2xl"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-sans font-semibold text-txt-primary flex items-center gap-1">
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
                    className="w-full bg-surface-active border border-themeline rounded-lg px-2 py-1 text-xs font-sans text-txt-primary focus:outline-none focus:border-action"
                  />
                  <button
                    onClick={() => handleApplyCustom()}
                    className="px-2.5 py-1 rounded-lg bg-action hover:bg-action-hover text-txt-inverse text-xs font-sans font-bold transition-all shadow-sm"
                  >
                    Apply
                  </button>
                </div>

                {/* Quick Shortcuts */}
                <div className="flex items-center gap-1 flex-wrap pt-1.5 border-t border-themeline/60">
                  <span className="text-[10px] font-sans text-txt-muted mr-0.5">Quick:</span>
                  {[500, 1000, 2500, 5000, 25000].map((val) => (
                    <button
                      key={val}
                      onClick={() => handleApplyCustom(val)}
                      className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-surface-active hover:bg-surface-hover text-txt-secondary hover:text-action border border-themeline transition-colors"
                    >
                      {val >= 1000 ? `${val / 1000}k` : val}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      onMinStarsChange(0);
                      setIsCustomOpen(false);
                    }}
                    className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-surface-active hover:bg-surface-hover text-txt-muted hover:text-rose-500 border border-themeline transition-colors ml-auto"
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
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-sans font-medium border transition-all ${
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
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-sans text-txt-muted hover:text-txt-primary bg-surface-active hover:bg-surface-hover border border-themeline transition-all"
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
