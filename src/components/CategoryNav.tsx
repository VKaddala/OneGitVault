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
    <div className="w-full bg-[#FBE9D0]/95 dark:bg-[#101b20]/95 border-b border-[#e3d1ba] dark:border-[#1e343e] sticky top-16 z-30 backdrop-blur-xl transition-colors duration-200">
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
                    ? 'bg-[#E64833] text-white dark:bg-[#16272f] dark:text-[#ff5c47] border border-[#E64833] shadow-sm font-semibold'
                    : 'bg-[#FFF9F0] hover:bg-[#F2DFCA] text-[#244855] border-[#e3d1ba] dark:bg-[#132229] dark:hover:bg-[#16272f] dark:text-[#90AEAD] dark:hover:text-[#FBE9D0] dark:border-[#203943]'
                }`}
              >
                <span className={isActive ? 'text-white dark:text-[#ff5c47]' : 'text-[#874F41] dark:text-[#90AEAD]'}>
                  {getIcon(cat.icon)}
                </span>
                <span>{cat.name}</span>
                {counts && counts[cat.id] !== undefined && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                    isActive ? 'bg-white/20 text-white dark:bg-[#E64833]/20 dark:text-[#ff5c47] font-bold' : 'bg-[#e8d5be] text-[#874F41] dark:bg-[#203943] dark:text-[#90AEAD]'
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
