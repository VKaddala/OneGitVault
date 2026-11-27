import React, { useMemo } from 'react';
import {
  Compass,
  Flame,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  RotateCcw,
  Settings as SettingsIcon,
  Layers,
  Filter,
  Smartphone
} from 'lucide-react';
import { CategoryId, Category, SortOption, ViewMode } from '../types';

export type ActiveView = 'explore' | 'trending' | 'vault' | 'settings' | 'detail';

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
  onResetFilters,
  isFiltered,
  bookmarksCount,
}) => {
  const [isExpanded, setIsExpanded] = React.useState<boolean>(true);

  const starPresets = useMemo(() => [
    { label: 'All Stars (0+)', value: 0 },
    { label: '1,000+ ★', value: 1000 },
    { label: '5,000+ ★', value: 5000 },
    { label: '10,000+ ★', value: 10000 },
    { label: '50,000+ ★', value: 50000 },
    { label: '100,000+ ★', value: 100000 },
  ], []);

  const hasCustomStar = useMemo(() => {
    return minStars > 0 && !starPresets.some((p) => p.value === minStars);
  }, [minStars, starPresets]);

  return (
    <nav
      className={`h-full flex flex-col bg-header border-r border-themeline flex-shrink-0 transition-all duration-200 select-none z-30 ${
        isExpanded ? 'w-52' : 'w-14'
      }`}
    >
      {/* ── SECTION 1: VIEWS / DISCOVER ── */}
      <div className="p-2.5 pb-2 border-b border-themeline flex-shrink-0">
        {isExpanded ? (
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-txt-muted px-1.5 flex items-center gap-1.5 mb-1.5">
              <Layers className="w-3 h-3 text-action" />
              <span>Views</span>
            </span>

            {/* Explore Button */}
            <button
              onClick={() => onSelectView('explore')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-sans font-medium transition-all ${
                activeView === 'explore'
                  ? 'bg-action text-txt-inverse font-bold shadow-sm'
                  : 'text-txt-secondary hover:bg-surface-hover hover:text-txt-primary'
              }`}
            >
              <Compass className={`w-4 h-4 flex-shrink-0 ${activeView === 'explore' ? 'text-txt-inverse' : 'text-action'}`} />
              <span className="truncate">Explore</span>
            </button>

            {/* Trending Button */}
            <button
              onClick={() => onSelectView('trending')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-sans font-medium transition-all ${
                activeView === 'trending'
                  ? 'bg-action text-txt-inverse font-bold shadow-sm'
                  : 'text-txt-secondary hover:bg-surface-hover hover:text-txt-primary'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Flame className={`w-4 h-4 flex-shrink-0 ${activeView === 'trending' ? 'text-txt-inverse fill-current' : 'text-action'}`} />
                <span className="truncate">Trending</span>
              </div>
              <span className={`text-[8px] font-mono font-bold px-1.5 py-0.2 rounded ${
                activeView === 'trending' ? 'bg-black/25 text-white' : 'bg-action/20 text-action'
              }`}>
                LIVE
              </span>
            </button>

            {/* Vault Button */}
            <button
              onClick={() => onSelectView('vault')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-sans font-medium transition-all ${
                activeView === 'vault'
                  ? 'bg-action text-txt-inverse font-bold shadow-sm'
                  : 'text-txt-secondary hover:bg-surface-hover hover:text-txt-primary'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Bookmark className={`w-4 h-4 flex-shrink-0 ${activeView === 'vault' ? 'text-txt-inverse fill-current' : 'text-action'}`} />
                <span className="truncate">Vault</span>
              </div>
              {bookmarksCount > 0 && (
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                  activeView === 'vault' ? 'bg-black/25 text-white' : 'bg-surface-active text-txt-muted'
                }`}>
                  {bookmarksCount}
                </span>
              )}
            </button>
          </div>
        ) : (
          /* Collapsed View Icons */
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => onSelectView('explore')}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
                activeView === 'explore'
                  ? 'bg-action text-txt-inverse shadow-sm'
                  : 'text-txt-muted hover:text-txt-primary hover:bg-surface-active'
              }`}
              title="Explore Repositories"
            >
              <Compass className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectView('trending')}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all relative ${
                activeView === 'trending'
                  ? 'bg-action text-txt-inverse shadow-sm'
                  : 'text-txt-muted hover:text-txt-primary hover:bg-surface-active'
              }`}
              title="GitHub Trending"
            >
              <Flame className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={() => onSelectView('vault')}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all relative ${
                activeView === 'vault'
                  ? 'bg-action text-txt-inverse shadow-sm'
                  : 'text-txt-muted hover:text-txt-primary hover:bg-surface-active'
              }`}
              title="Vault"
            >
              <Bookmark className="w-4 h-4 fill-current" />
              {bookmarksCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 text-[8px] font-mono font-bold text-white bg-action rounded-full flex items-center justify-center border border-header">
                  {bookmarksCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── SECTION 2: FILTERS (Combobox Values) ── */}
      {isExpanded ? (
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 no-scrollbar text-xs">
          {/* Header Row */}
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-txt-muted flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-action" />
              <span>Filters</span>
            </span>
            {isFiltered && (
              <button
                onClick={onResetFilters}
                className="flex items-center gap-1 text-[10px] font-mono text-txt-muted hover:text-rose-500 transition-colors"
                title="Reset all filters"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* 1. Category Combobox */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase text-txt-muted block">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => onSelectCategory(e.target.value as CategoryId)}
              className="w-full bg-surface-active hover:bg-surface border border-themeline hover:border-action-border text-txt-primary rounded-lg px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-action cursor-pointer transition-colors shadow-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-surface text-txt-primary">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Sort Combobox */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase text-txt-muted block">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="w-full bg-surface-active hover:bg-surface border border-themeline hover:border-action-border text-txt-primary rounded-lg px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-action cursor-pointer transition-colors shadow-sm"
            >
              <option value="stars" className="bg-surface text-txt-primary">Most Stars</option>
              <option value="forks" className="bg-surface text-txt-primary">Most Forks</option>
              <option value="updated" className="bg-surface text-txt-primary">Recently Updated</option>
            </select>
          </div>

          {/* 3. Language Combobox */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase text-txt-muted block">
              Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="w-full bg-surface-active hover:bg-surface border border-themeline hover:border-action-border text-txt-primary rounded-lg px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-action cursor-pointer transition-colors shadow-sm"
            >
              <option value="" className="bg-surface text-txt-primary">All Languages</option>
              {availableLanguages.map((lang) => (
                <option key={lang} value={lang} className="bg-surface text-txt-primary">
                  {lang}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Minimum Stars Combobox */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase text-txt-muted block">
              Minimum Stars
            </label>
            <select
              value={minStars}
              onChange={(e) => onMinStarsChange(Number(e.target.value))}
              className="w-full bg-surface-active hover:bg-surface border border-themeline hover:border-action-border text-txt-primary rounded-lg px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-action cursor-pointer transition-colors shadow-sm"
            >
              {starPresets.map((p) => (
                <option key={p.value} value={p.value} className="bg-surface text-txt-primary">
                  {p.label}
                </option>
              ))}
              {hasCustomStar && (
                <option value={minStars} className="bg-surface text-txt-primary">
                  Custom: {minStars.toLocaleString()} ★
                </option>
              )}
            </select>
          </div>

          {/* 5. Card Layout Toggle */}
          <div className="space-y-1 pt-1">
            <label className="text-[10px] font-mono uppercase text-txt-muted block">
              Layout
            </label>
            <div className="flex items-center gap-1 bg-surface-active p-0.5 rounded-lg border border-themeline">
              <button
                onClick={() => onViewModeChange('grid')}
                className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[11px] font-sans transition-all ${
                  viewMode === 'grid'
                    ? 'bg-action text-txt-inverse font-semibold shadow-sm'
                    : 'text-txt-muted hover:text-txt-primary'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>
              <button
                onClick={() => onViewModeChange('list')}
                className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[11px] font-sans transition-all ${
                  viewMode === 'list'
                    ? 'bg-action text-txt-inverse font-semibold shadow-sm'
                    : 'text-txt-muted hover:text-txt-primary'
                }`}
                title="List view"
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
            </div>
          </div>

          {/* Total Counter pill */}
          <div className="pt-1.5 text-[10px] font-mono text-txt-muted text-center">
            <span>{totalResults.toLocaleString()} repositories</span>
          </div>
        </div>
      ) : (
        /* Collapsed Space Filler */
        <div className="flex-1" />
      )}

      {/* ── SECTION 3: BOTTOM / SETTINGS & COLLAPSE ARROW ── */}
      <div className="border-t border-themeline p-2 flex flex-col gap-1.5 flex-shrink-0 bg-header">
        {isExpanded ? (
          <>
            <a
              href="./mobile/"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-sans font-medium text-txt-secondary hover:bg-surface hover:text-action transition-all"
              title="Open Mobile Web App & PWA"
            >
              <Smartphone className="w-4 h-4 text-action flex-shrink-0" />
              <span className="truncate">Mobile / PWA</span>
            </a>
            <div className="flex items-center justify-between gap-1">
              {/* Settings Main Navigation Button */}
              <button
                onClick={() => onSelectView('settings')}
                className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-sans font-medium transition-all ${
                  activeView === 'settings'
                    ? 'bg-action text-txt-inverse font-bold shadow-sm'
                    : 'text-txt-secondary hover:bg-surface hover:text-txt-primary'
                }`}
                title="Settings (Theme & GitHub API Token)"
              >
                <SettingsIcon className={`w-4 h-4 flex-shrink-0 ${activeView === 'settings' ? 'text-txt-inverse animate-spin' : 'text-action'}`} />
                <span className="truncate">Settings</span>
              </button>

              {/* Edge Collapse Arrow */}
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 rounded-lg text-txt-muted hover:text-action hover:bg-surface transition-colors"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            {/* Collapsed Mobile Link */}
            <a
              href="./mobile/"
              className="w-9 h-9 flex items-center justify-center rounded-xl text-txt-muted hover:text-action hover:bg-surface-active transition-all"
              title="Open Mobile Web App & PWA"
            >
              <Smartphone className="w-4 h-4" />
            </a>

            {/* Collapsed Settings Icon */}
            <button
              onClick={() => onSelectView('settings')}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
                activeView === 'settings'
                  ? 'bg-action text-txt-inverse shadow-sm'
                  : 'text-txt-muted hover:text-txt-primary hover:bg-surface-active'
              }`}
              title="Settings (Theme & API Token)"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>

            {/* Edge Expand Arrow */}
            <button
              onClick={() => setIsExpanded(true)}
              className="p-1.5 rounded-lg text-txt-muted hover:text-action hover:bg-surface-active transition-colors"
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
