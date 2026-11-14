import React from 'react';
import { 
  Sparkles, 
  Brain, 
  Globe, 
  Cloud, 
  Wrench, 
  Database, 
  Smartphone, 
  Shield 
} from 'lucide-react';
import { Category, CategoryId } from '../types';

interface CategoryNavProps {
  categories: Category[];
  selectedCategory: CategoryId;
  onSelectCategory: (id: CategoryId) => void;
  counts?: Record<CategoryId, number>;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  counts
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Brain': return <Brain className="w-3.5 h-3.5" />;
      case 'Globe': return <Globe className="w-3.5 h-3.5" />;
      case 'Cloud': return <Cloud className="w-3.5 h-3.5" />;
      case 'Wrench': return <Wrench className="w-3.5 h-3.5" />;
      case 'Database': return <Database className="w-3.5 h-3.5" />;
      case 'Smartphone': return <Smartphone className="w-3.5 h-3.5" />;
      case 'Shield': return <Shield className="w-3.5 h-3.5" />;
      case 'Sparkles':
      default:
        return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="w-full bg-white dark:bg-[#0c0d10] border-b border-neutral-200 dark:border-[#20212b] sticky top-16 z-30 backdrop-blur-xl transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto py-3 no-scrollbar scroll-smooth">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-[13px] font-sans font-medium whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-700 dark:bg-[#1b1c24] dark:text-amber-brand border border-amber-500/40 shadow-sm'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 border-neutral-200 dark:bg-[#121318] dark:hover:bg-[#181921] dark:text-charcoal-300 dark:hover:text-white dark:border-[#222430]'
                }`}
              >
                <span className={isActive ? 'text-amber-600 dark:text-amber-brand' : 'text-neutral-500 dark:text-charcoal-400'}>
                  {getIcon(cat.icon)}
                </span>
                <span>{cat.name}</span>
                {counts && counts[cat.id] !== undefined && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                    isActive ? 'bg-amber-500/25 text-amber-800 dark:bg-amber-500/20 dark:text-amber-brand font-bold' : 'bg-neutral-200 text-neutral-600 dark:bg-charcoal-750 dark:text-charcoal-400'
                  }`}>
                    {counts[cat.id]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
