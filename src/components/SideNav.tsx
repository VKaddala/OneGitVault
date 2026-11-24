import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
  Compass,
  Flame,
  Bookmark,
  PanelLeftClose,
  PanelLeftOpen,
  Star,
  ArrowUpDown,
  Code2,
  LayoutGrid,
  List,
  RotateCcw,
  ChevronDown,
  Check,
  Search,
  Filter,
  Sparkles
} from 'lucide-react';
import { CategoryId, Category, SortOption, ViewMode } from '../types';
import { CategoryChooserModal, getCategoryIcon } from './CategoryChooserModal';

export type ActiveView = 'explore' | 'trending' | 'vault' | 'detail';

interface SideNavProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
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
  bookmarksCount: number;
}

export const SideNav: React.FC<SideNavProps> = ({
  activeView,
  onSelectView,
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
  isFiltered,
  bookmarksCount,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isCategoryChooserOpen, setIsCategoryChooserOpen] = useState<boolean>(false);

  // Dropdown states for Sort, Language, and Custom Stars
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isCustomStarsOpen, setIsCustomStarsOpen] = useState(false);
  const [customStarsInput, setCustomStarsInput] = useState(minStars > 0 ? minStars.toString() : '');
  const [langSearch, setLangSearch] = useState('');

  const sortTriggerRef = useRef<HTMLButtonElement | null>(null);
  const langTriggerRef = useRef<HTMLButtonElement | null>(null);
  const customStarsTriggerRef = useRef<HTMLButtonElement | null>(null);

  const [sortPos, setSortPos] = useState<{ top: number; left: number } | null>(null);
  const [langPos, setLangPos] = useState<{ top: number; left: number } | null>(null);
  const [customStarsPos, setCustomStarsPos] = useState<{ top: number; left: number } | null>(null);

  const activeCategoryObj = useMemo(() => {
    return categories.find((c) => c.id === selectedCategory) || categories[0];
  }, [categories, selectedCategory]);

  const presetTiers = [
    { label: 'All', value: 0 },
    { label: '10k+ ★', value: 10000 },
    { label: '50k+ ★', value: 50000 },
    { label: '100k+ ★', value: 100000 },
  ];
  const isCustomStarValue = !presetTiers.some((t) => t.value === minStars);

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

  const updatePositions = useCallback(() => {
    if (sortTriggerRef.current) setSortPos(computePos(sortTriggerRef.current, 200));
    if (langTriggerRef.current) setLangPos(computePos(langTriggerRef.current, 220));
    if (customStarsTriggerRef.current) setCustomStarsPos(computePos(customStarsTriggerRef.current, 230));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideSortTrigger = sortTriggerRef.current?.contains(target);
      const insideSortPortal = document.getElementById('sidenav-sort-portal')?.contains(target);
      if (!insideSortTrigger && !insideSortPortal) setIsSortOpen(false);

      const insideLangTrigger = langTriggerRef.current?.contains(target);
      const insideLangPortal = document.getElementById('sidenav-lang-portal')?.contains(target);
      if (!insideLangTrigger && !insideLangPortal) setIsLangOpen(false);

      const insideStarTrigger = customStarsTriggerRef.current?.contains(target);
      const insideStarPortal = document.getElementById('sidenav-stars-portal')?.contains(target);
      if (!insideStarTrigger && !insideStarPortal) setIsCustomStarsOpen(false);
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', updatePositions);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', updatePositions);
    };
  }, [updatePositions]);

  const filteredLanguages = useMemo(() => {
    if (!langSearch.trim()) return availableLanguages;
    const q = langSearch.toLowerCase();
    return availableLanguages.filter((l) => l.toLowerCase().includes(q));
  }, [availableLanguages, langSearch]);

  const handleApplyCustomStars = (val?: number) => {
    const stars = val !== undefined ? val : parseInt(customStarsInput, 10);
    if (!isNaN(stars) && stars >= 0) {
      onMinStarsChange(stars);
      setIsCustomStarsOpen(false);
    }
  };

  const formatStarsLabel = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M+ ★`;
    if (count >= 1000) return `${Math.floor(count / 1000)}k+ ★`;
    return `${count}+ ★`;
  };

  return (
    <>
      <nav
        className={`h-full flex flex-col bg-header border-r border-themeline flex-shrink-0 transition-all duration-200 select-none z-30 ${
          isExpanded ? 'w-64 sm:w-72' : 'w-14'
        }`}
      >
        {/* ── Top Header: Toggle Expand / Collapse ── */}
        <div className="flex items-center justify-between py-2 px-2.5 border-b border-themeline/60">
          {isExpanded ? (
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-txt-muted flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-action" />
                <span>Navigation</span>
              </span>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded-lg text-txt-muted hover:text-action hover:bg-surface-hover transition-colors"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsExpanded(true)}
              className="w-full flex items-center justify-center p-1.5 rounded-lg text-txt-muted hover:text-action hover:bg-surface-hover transition-colors"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Section 1: Main View Navigation (Teams-style) ── */}
        <div className="py-2 px-1.5 space-y-1">
          {/* Explore Button */}
          <button
            onClick={() => onSelectView('explore')}
            className={`w-full flex items-center gap-3 rounded-xl transition-all duration-150 relative ${
              isExpanded ? 'px-3 py-2 text-left' : 'px-0 py-2.5 justify-center'
            } ${
              activeView === 'explore'
                ? 'bg-action text-txt-inverse font-bold shadow-md'
                : 'text-txt-secondary hover:bg-surface-hover hover:text-txt-primary'
            }`}
            title="Explore Repositories"
          >
            <Compass className={`w-4 h-4 flex-shrink-0 ${activeView === 'explore' ? 'text-txt-inverse' : 'text-action'}`} />
            {isExpanded && (
              <span className="text-xs font-sans font-medium flex-1 truncate">
                Explore
              </span>
            )}
            {activeView === 'explore' && !isExpanded && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-action rounded-r-full" />
            )}
          </button>

          {/* Trending Button */}
          <button
            onClick={() => onSelectView('trending')}
            className={`w-full flex items-center gap-3 rounded-xl transition-all duration-150 relative ${
              isExpanded ? 'px-3 py-2 text-left' : 'px-0 py-2.5 justify-center'
            } ${
              activeView === 'trending'
                ? 'bg-action text-txt-inverse font-bold shadow-md'
                : 'text-txt-secondary hover:bg-surface-hover hover:text-txt-primary'
            }`}
            title="GitHub Trending Repositories"
          >
            <Flame className={`w-4 h-4 flex-shrink-0 ${activeView === 'trending' ? 'text-txt-inverse fill-current' : 'text-action'}`} />
            {isExpanded && (
              <div className="flex items-center justify-between flex-1 min-w-0">
                <span className="text-xs font-sans font-medium truncate">Trending</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                  activeView === 'trending' ? 'bg-black/20 text-white' : 'bg-action/20 text-action'
                }`}>
                  LIVE
                </span>
              </div>
            )}
            {activeView === 'trending' && !isExpanded && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-action rounded-r-full" />
            )}
          </button>

          {/* Vault Button */}
          <button
            onClick={() => onSelectView('vault')}
            className={`w-full flex items-center gap-3 rounded-xl transition-all duration-150 relative ${
              isExpanded ? 'px-3 py-2 text-left' : 'px-0 py-2.5 justify-center'
            } ${
              activeView === 'vault'
                ? 'bg-action text-txt-inverse font-bold shadow-md'
                : 'text-txt-secondary hover:bg-surface-hover hover:text-txt-primary'
            }`}
            title="Vault (Saved & Starred)"
          >
            <Bookmark className={`w-4 h-4 flex-shrink-0 ${activeView === 'vault' ? 'text-txt-inverse fill-current' : 'text-action'}`} />
            {isExpanded && (
              <div className="flex items-center justify-between flex-1 min-w-0">
                <span className="text-xs font-sans font-medium truncate">Vault</span>
                {bookmarksCount > 0 && (
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                    activeView === 'vault' ? 'bg-black/20 text-white' : 'bg-surface-active text-txt-muted'
                  }`}>
                    {bookmarksCount}
                  </span>
                )}
              </div>
            )}
            {bookmarksCount > 0 && !isExpanded && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 text-[9px] font-mono font-bold text-white bg-action rounded-full flex items-center justify-center">
                {bookmarksCount}
              </span>
            )}
            {activeView === 'vault' && !isExpanded && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-action rounded-r-full" />
            )}
          </button>
        </div>

        {/* ── Divider ── */}
        <div className="border-t border-themeline/60 my-1" />

        {/* ── Section 2: Filters (All in Left Panel) ── */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3.5 no-scrollbar">
          {isExpanded ? (
            <>
              {/* Filter Section Header with Count & Reset */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-txt-muted">
                  <Filter className="w-3.5 h-3.5 text-action" />
                  <span className="text-[11px] font-mono uppercase font-bold tracking-wider">
                    Filters
                  </span>
                  <span className="text-[10px] font-mono text-txt-secondary bg-surface-active px-1.5 py-0.2 rounded border border-themeline">
                    {totalResults.toLocaleString()}
                  </span>
                </div>

                {isFiltered && (
                  <button
                    onClick={onResetFilters}
                    className="flex items-center gap-1 text-[11px] font-mono text-txt-muted hover:text-rose-500 transition-colors"
                    title="Reset all filters"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* 1. Category Chooser Option (One button that opens chooser) */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-txt-muted font-semibold px-1">
                  Category
                </label>
                <button
                  type="button"
                  onClick={() => setIsCategoryChooserOpen(true)}
                  className="w-full flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-active hover:bg-surface border border-themeline hover:border-action-border text-xs font-sans text-txt-primary shadow-sm transition-all group text-left"
                  title="Click to choose repository category"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="p-1 rounded-lg bg-surface text-action group-hover:bg-action-soft flex-shrink-0 transition-colors">
                      {getCategoryIcon(activeCategoryObj.icon, 'w-4 h-4')}
                    </span>
                    <div className="min-w-0">
                      <span className="font-semibold text-txt-primary block truncate text-xs">
                        {activeCategoryObj.name}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-txt-muted group-hover:text-action flex-shrink-0 transition-transform" />
                </button>
              </div>

              {/* 2. Sort Dropdown */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-txt-muted font-semibold px-1">
                  Sort By
                </label>
                <div className="relative">
                  <button
                    ref={sortTriggerRef}
                    onClick={() => {
                      setSortPos(computePos(sortTriggerRef.current, 200));
                      setIsSortOpen(!isSortOpen);
                    }}
                    type="button"
                    className="w-full flex items-center justify-between gap-2 p-2 rounded-xl bg-surface-active hover:bg-surface border border-themeline hover:border-action-border text-xs font-sans text-txt-primary shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <ArrowUpDown className="w-3.5 h-3.5 text-action flex-shrink-0" />
                      <span className="font-medium truncate text-xs">
                        {sortBy === 'stars' ? 'Most Stars' : sortBy === 'forks' ? 'Most Forks' : 'Recently Updated'}
                      </span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-txt-muted transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Sort Portal */}
                  {isSortOpen && sortPos && ReactDOM.createPortal(
                    <div
                      id="sidenav-sort-portal"
                      style={{ position: 'fixed', top: sortPos.top, left: sortPos.left, width: '200px', zIndex: 99999 }}
                      className="bg-surface border border-themeline rounded-2xl shadow-2xl p-1.5 animate-fadeIn backdrop-blur-2xl"
                    >
                      {[
                        { value: 'stars' as SortOption, label: 'Most Stars' },
                        { value: 'forks' as SortOption, label: 'Most Forks' },
                        { value: 'updated' as SortOption, label: 'Recently Updated' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            onSortChange(opt.value);
                            setIsSortOpen(false);
                          }}
                          className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs text-left transition-all ${
                            sortBy === opt.value
                              ? 'bg-action-soft text-action font-bold'
                              : 'text-txt-primary hover:bg-surface-hover hover:text-action'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {sortBy === opt.value && <Check className="w-3.5 h-3.5 text-action" />}
                        </button>
                      ))}
                    </div>,
                    document.body
                  )}
                </div>
              </div>

              {/* 3. Language Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-txt-muted font-semibold px-1">
                  Language
                </label>
                <div className="relative">
                  <button
                    ref={langTriggerRef}
                    onClick={() => {
                      setLangPos(computePos(langTriggerRef.current, 220));
                      setLangSearch('');
                      setIsLangOpen(!isLangOpen);
                    }}
                    type="button"
                    className="w-full flex items-center justify-between gap-2 p-2 rounded-xl bg-surface-active hover:bg-surface border border-themeline hover:border-action-border text-xs font-sans text-txt-primary shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Code2 className="w-3.5 h-3.5 text-action flex-shrink-0" />
                      <span className="font-medium truncate text-xs">
                        {selectedLanguage || 'All Languages'}
                      </span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-txt-muted transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Language Portal */}
                  {isLangOpen && langPos && ReactDOM.createPortal(
                    <div
                      id="sidenav-lang-portal"
                      style={{ position: 'fixed', top: langPos.top, left: langPos.left, width: '220px', zIndex: 99999 }}
                      className="bg-surface border border-themeline rounded-2xl shadow-2xl p-2 animate-fadeIn backdrop-blur-2xl max-h-[380px] flex flex-col"
                    >
                      <div className="relative mb-2">
                        <Search className="w-3 h-3 text-txt-muted absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          value={langSearch}
                          onChange={(e) => setLangSearch(e.target.value)}
                          placeholder="Search language..."
                          autoFocus
                          className="w-full pl-7 pr-2.5 py-1 bg-surface-active border border-themeline rounded-lg text-xs font-mono text-txt-primary placeholder-txt-muted/50 focus:outline-none focus:border-action"
                        />
                      </div>
                      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-0.5 max-h-[250px]">
                        <button
                          type="button"
                          onClick={() => {
                            onLanguageChange('');
                            setIsLangOpen(false);
                          }}
                          className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs text-left transition-all ${
                            !selectedLanguage
                              ? 'bg-action-soft text-action font-bold'
                              : 'text-txt-primary hover:bg-surface-hover hover:text-action'
                          }`}
                        >
                          <span>All Languages</span>
                          {!selectedLanguage && <Check className="w-3.5 h-3.5 text-action" />}
                        </button>
                        {filteredLanguages.map((lang) => (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => {
                              onLanguageChange(lang);
                              setIsLangOpen(false);
                            }}
                            className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs text-left transition-all ${
                              selectedLanguage.toLowerCase() === lang.toLowerCase()
                                ? 'bg-action-soft text-action font-bold'
                                : 'text-txt-primary hover:bg-surface-hover hover:text-action'
                            }`}
                          >
                            <span className="truncate">{lang}</span>
                            {selectedLanguage.toLowerCase() === lang.toLowerCase() && (
                              <Check className="w-3.5 h-3.5 text-action" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>,
                    document.body
                  )}
                </div>
              </div>

              {/* 4. Minimum Stars Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-txt-muted font-semibold px-1">
                  Minimum Stars
                </label>
                <div className="grid grid-cols-2 gap-1 bg-surface-active p-1 rounded-xl border border-themeline">
                  {presetTiers.map((tier) => (
                    <button
                      key={tier.value}
                      type="button"
                      onClick={() => onMinStarsChange(tier.value)}
                      className={`text-[11px] font-sans font-medium py-1 px-1.5 rounded-lg transition-all text-center ${
                        !isCustomStarValue && minStars === tier.value
                          ? 'bg-action text-txt-inverse font-bold shadow-sm'
                          : 'text-txt-muted hover:text-txt-primary hover:bg-surface'
                      }`}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>

                {/* Custom Stars Trigger */}
                <div className="relative mt-1">
                  <button
                    ref={customStarsTriggerRef}
                    onClick={() => {
                      setCustomStarsPos(computePos(customStarsTriggerRef.current, 230));
                      setCustomStarsInput(minStars > 0 ? minStars.toString() : '');
                      setIsCustomStarsOpen(!isCustomStarsOpen);
                    }}
                    type="button"
                    className={`w-full flex items-center justify-between px-2.5 py-1 rounded-lg text-[11px] font-sans border transition-all ${
                      isCustomStarValue
                        ? 'bg-action text-txt-inverse font-bold border-action'
                        : 'bg-surface-active hover:bg-surface text-txt-muted hover:text-txt-primary border-themeline'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <Star className={`w-3 h-3 ${isCustomStarValue ? 'fill-current' : ''}`} />
                      <span>{isCustomStarValue ? formatStarsLabel(minStars) : 'Custom Stars...'}</span>
                    </span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {/* Custom Stars Portal */}
                  {isCustomStarsOpen && customStarsPos && ReactDOM.createPortal(
                    <div
                      id="sidenav-stars-portal"
                      style={{ position: 'fixed', top: customStarsPos.top, left: customStarsPos.left, width: '230px', zIndex: 99999 }}
                      className="bg-surface border border-themeline rounded-2xl shadow-2xl p-2.5 animate-fadeIn backdrop-blur-2xl"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-sans font-semibold text-txt-primary flex items-center gap-1">
                          <Star className="w-3 h-3 text-action fill-current" />
                          <span>Custom Min Stars</span>
                        </span>
                        <button
                          onClick={() => setIsCustomStarsOpen(false)}
                          className="p-0.5 rounded text-txt-muted hover:text-txt-primary text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={customStarsInput}
                          onChange={(e) => setCustomStarsInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleApplyCustomStars();
                          }}
                          placeholder="e.g. 2500"
                          autoFocus
                          className="w-full bg-surface-active border border-themeline rounded-lg px-2 py-1 text-xs font-sans text-txt-primary focus:outline-none focus:border-action"
                        />
                        <button
                          onClick={() => handleApplyCustomStars()}
                          className="px-2.5 py-1 rounded-lg bg-action hover:opacity-90 text-txt-inverse text-xs font-sans font-bold shadow-sm"
                        >
                          Apply
                        </button>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap pt-1.5 border-t border-themeline/60 text-[10px] font-sans">
                        {[500, 1000, 5000, 25000].map((val) => (
                          <button
                            key={val}
                            onClick={() => handleApplyCustomStars(val)}
                            className="px-1.5 py-0.5 rounded bg-surface-active hover:bg-surface text-txt-secondary hover:text-action border border-themeline"
                          >
                            {val >= 1000 ? `${val / 1000}k` : val}
                          </button>
                        ))}
                      </div>
                    </div>,
                    document.body
                  )}
                </div>
              </div>

              {/* 5. View Mode Toggle */}
              <div className="space-y-1 pt-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-txt-muted font-semibold px-1">
                  Card Layout
                </label>
                <div className="flex items-center gap-1 bg-surface-active p-1 rounded-xl border border-themeline">
                  <button
                    onClick={() => onViewModeChange('grid')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-sans transition-all ${
                      viewMode === 'grid'
                        ? 'bg-action text-txt-inverse font-bold shadow-sm'
                        : 'text-txt-muted hover:text-txt-primary'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Grid</span>
                  </button>
                  <button
                    onClick={() => onViewModeChange('list')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-sans transition-all ${
                      viewMode === 'list'
                        ? 'bg-action text-txt-inverse font-bold shadow-sm'
                        : 'text-txt-muted hover:text-txt-primary'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>List</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Collapsed Mode Icons */
            <div className="flex flex-col items-center space-y-2">
              {/* Category Chooser trigger icon */}
              <button
                onClick={() => setIsCategoryChooserOpen(true)}
                className="p-2.5 rounded-xl bg-surface-active hover:bg-surface text-action border border-themeline hover:border-action-border transition-all shadow-sm"
                title={`Category: ${activeCategoryObj.name} (Click to choose)`}
              >
                {getCategoryIcon(activeCategoryObj.icon, 'w-4 h-4')}
              </button>

              {/* Sort cycle icon */}
              <button
                onClick={() => {
                  const nextSort: SortOption = sortBy === 'stars' ? 'forks' : sortBy === 'forks' ? 'updated' : 'stars';
                  onSortChange(nextSort);
                }}
                className="p-2.5 rounded-xl bg-surface-active hover:bg-surface text-txt-muted hover:text-action border border-themeline hover:border-action-border transition-all"
                title={`Sort: ${sortBy} (Click to switch)`}
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>

              {/* View mode toggle icon */}
              <button
                onClick={() => onViewModeChange(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2.5 rounded-xl bg-surface-active hover:bg-surface text-txt-muted hover:text-action border border-themeline hover:border-action-border transition-all"
                title={`View: ${viewMode} (Click to toggle)`}
              >
                {viewMode === 'grid' ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ── Category Chooser Modal ── */}
      <CategoryChooserModal
        isOpen={isCategoryChooserOpen}
        onClose={() => setIsCategoryChooserOpen(false)}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
      />
    </>
  );
};
