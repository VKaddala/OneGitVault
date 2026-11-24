import React, { useEffect } from 'react';
import { 
  X, 
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
  Check
} from 'lucide-react';
import { Category, CategoryId } from '../types';

interface CategoryChooserModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  selectedCategory: CategoryId;
  onSelectCategory: (id: CategoryId) => void;
}

export const getCategoryIcon = (iconName: string, className: string = 'w-5 h-5') => {
  switch (iconName) {
    case 'Brain': return <Brain className={className} />;
    case 'Globe': return <Globe className={className} />;
    case 'Cloud': return <Cloud className={className} />;
    case 'Wrench': return <Wrench className={className} />;
    case 'Database': return <Database className={className} />;
    case 'Smartphone': return <Smartphone className={className} />;
    case 'Shield': return <Shield className={className} />;
    case 'Package': return <Package className={className} />;
    case 'Video': return <Video className={className} />;
    case 'Sparkles':
    default:
      return <Sparkles className={className} />;
  }
};

export const CategoryChooserModal: React.FC<CategoryChooserModalProps> = ({
  isOpen,
  onClose,
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-surface border border-themeline rounded-2xl shadow-2xl flex flex-col text-txt-primary overflow-hidden transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-themeline bg-surface-active">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-action-soft border border-action-border text-action shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-txt-primary">
                Choose Repository Category
              </h3>
              <p className="text-xs font-mono text-txt-muted">
                Select a technology sector to filter and stream repositories
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-txt-muted hover:text-txt-primary hover:bg-surface rounded-xl border border-transparent transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories Grid */}
        <div className="p-4 sm:p-5 max-h-[70vh] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {categories.map((cat) => {
            const isSelected = cat.id === selectedCategory;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  onSelectCategory(cat.id);
                  onClose();
                }}
                className={`flex items-start gap-3 p-3.5 rounded-xl text-left border transition-all duration-150 group relative ${
                  isSelected
                    ? 'bg-action-soft border-action shadow-md ring-1 ring-action/40'
                    : 'bg-surface-active/60 hover:bg-surface-active border-themeline hover:border-action-border'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl flex-shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-action text-txt-inverse shadow-sm'
                      : 'bg-surface text-action group-hover:bg-action-soft group-hover:text-action'
                  }`}
                >
                  {getCategoryIcon(cat.icon, 'w-5 h-5')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-xs sm:text-sm font-display font-bold truncate ${
                        isSelected ? 'text-action' : 'text-txt-primary group-hover:text-action'
                      }`}
                    >
                      {cat.name}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-action flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] font-sans text-txt-muted line-clamp-2 mt-0.5 leading-relaxed">
                    {cat.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3.5 px-5 bg-surface-active border-t border-themeline flex items-center justify-between text-xs font-mono text-txt-muted">
          <span>{categories.length} technology sectors available</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-surface hover:bg-surface-hover text-txt-primary border border-themeline transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
