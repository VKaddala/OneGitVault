import React, { useState, useCallback, useMemo } from 'react';
import {
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
  GitFork,
  Calendar,
  Search,
  Zap,
  Settings,
  Home,
} from 'lucide-react';
import { CategoryId, Category, SortOption, ViewMode } from '../types';

interface SideNavProps {
  categories: Category[];
  selectedCategory: CategoryId;
  onSelectCategory: (id: CategoryId) => void;
  bookmarksCount: number;
  onOpenBookmarks: () => void;
  onOpenTrending: () => void;
}

const getCategoryIcon = (iconName: string, size: string = 'w-5 h-5') => {
  const cls = size;
  switch (iconName) {
    case 'Brain': return <Brain className={cls} />;
    case 'Globe': return <Globe className={cls} />;
    case 'Cloud': return <Cloud className={cls} />;
    case 'Wrench': return <Wrench className={cls} />;
    case 'Database': return <Database className={cls} />;
    case 'Smartphone': return <Smartphone className={cls} />;
    case 'Shield': return <Shield className={cls} />;
    case 'Package': return <Package className={cls} />;
    case 'Video': return <Video className={cls} />;
    case 'Sparkles':
    default:
      return <Sparkles className={cls} />;
  }
};

export const SideNav: React.FC<SideNavProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  bookmarksCount,
  onOpenBookmarks,
  onOpenTrending,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <nav
      className={`h-full flex flex-col bg-header border-r border-themeline flex-shrink-0 transition-all duration-200 select-none z-40 ${
        isExpanded ? 'w-56' : 'w-14'
      }`}
    >
      {/* Toggle Collapse Button */}
      <div className="flex items-center justify-center py-2 px-1 border-b border-themeline/60">
        <button
          onClick={toggleExpanded}
          className="p-2 rounded-lg text-txt-muted hover:text-action hover:bg-surface-hover transition-all"
          title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isExpanded ? (
            <PanelLeftClose className="w-4 h-4" />
          ) : (
            <PanelLeftOpen className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Category Navigation Items */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-1.5 space-y-0.5 no-scrollbar">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`w-full flex items-center gap-3 rounded-xl transition-all duration-150 group relative ${
                isExpanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'
              } ${
                isActive
                  ? 'bg-action text-txt-inverse shadow-md font-bold'
                  : 'text-txt-secondary hover:bg-surface-hover hover:text-txt-primary'
              }`}
              title={!isExpanded ? cat.name : undefined}
            >
              <span className={`flex-shrink-0 ${isActive ? 'text-txt-inverse' : 'text-action'}`}>
                {getCategoryIcon(cat.icon, 'w-[18px] h-[18px]')}
              </span>
              {isExpanded && (
                <span className="text-xs font-sans font-medium truncate">
                  {cat.name}
                </span>
              )}

              {/* Active indicator bar (collapsed mode) */}
              {isActive && !isExpanded && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-action rounded-r-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="border-t border-themeline/60 py-2 px-1.5 space-y-0.5">
        {/* Trending */}
        <button
          onClick={onOpenTrending}
          className={`w-full flex items-center gap-3 rounded-xl transition-all duration-150 text-txt-secondary hover:bg-surface-hover hover:text-txt-primary ${
            isExpanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'
          }`}
          title="GitHub Trending Repositories"
        >
          <Flame className="w-[18px] h-[18px] text-action flex-shrink-0" />
          {isExpanded && (
            <span className="text-xs font-sans font-medium">Trending</span>
          )}
        </button>

        {/* Vault / Bookmarks */}
        <button
          onClick={onOpenBookmarks}
          className={`w-full flex items-center gap-3 rounded-xl transition-all duration-150 text-txt-secondary hover:bg-surface-hover hover:text-txt-primary relative ${
            isExpanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'
          }`}
          title="Saved Vault Repositories"
        >
          <Bookmark className="w-[18px] h-[18px] flex-shrink-0" />
          {isExpanded && (
            <span className="text-xs font-sans font-medium">Vault</span>
          )}
          {bookmarksCount > 0 && (
            <span
              className={`flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[9px] font-mono font-bold text-white bg-action rounded-full ${
                isExpanded ? 'ml-auto' : 'absolute -top-0.5 -right-0.5'
              }`}
            >
              {bookmarksCount}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
};
