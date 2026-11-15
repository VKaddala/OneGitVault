import React from 'react';
import { Star, Compass, Flame, Radio, Layers } from 'lucide-react';

interface HeroProps {
  totalReposCount: number;
  activeCategoryName: string;
  onSelectTopic: (topic: string) => void;
}

export const Hero: React.FC<HeroProps> = ({
  totalReposCount,
  activeCategoryName,
  onSelectTopic
}) => {
  const quickTags = [
    'llm', 'rust', 'react', 'kubernetes', 'deep-learning', 
    'developer-tools', 'vector-database', 'typescript', 'cli'
  ];

  return (
    <div className="relative overflow-hidden pt-8 pb-7 border-b border-themeline bg-canvas transition-colors duration-200">
      {/* Subtle cinematic ambient glows driven by active theme accent & secondary */}
      <div className="absolute top-0 right-1/4 w-[450px] h-[300px] bg-action-soft rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute -top-10 left-10 w-[300px] h-[250px] bg-secondary-soft rounded-full blur-[80px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div className="max-w-2xl">
            {/* Small tactile pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-action-soft border border-action-border text-action text-xs font-mono font-medium mb-3">
              <Flame className="w-3.5 h-3.5 text-action" />
              <span>OneGitVault Live Discovery</span>
            </div>

            {/* Bricolage Grotesque Title */}
            <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-txt-primary mb-2 leading-tight">
              The Unified Gateway to <br className="hidden sm:inline" />
              <span 
                className="text-transparent bg-clip-text font-extrabold"
                style={{ backgroundImage: 'var(--hero-gradient)' }}
              >
                Open-Source Excellence
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-txt-secondary leading-relaxed font-sans max-w-xl">
              Continuously explore, stream, and bookmark high-impact open source repositories, 
              ranked by community traction and verified popularity.
            </p>

            {/* Tactile Topic Tags */}
            <div className="flex items-center gap-1.5 flex-wrap mt-4">
              <span className="text-xs font-mono text-txt-muted flex items-center gap-1 mr-1">
                <Compass className="w-3.5 h-3.5 text-action" /> explore:
              </span>
              {quickTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onSelectTopic(tag)}
                  className="text-xs font-mono px-2.5 py-0.5 rounded-lg bg-tag-bg text-tag-txt hover:text-tag-hoverTxt border border-tag-border hover:border-action transition-all shadow-sm"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Precision Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 self-stretch md:self-auto">
            <div className="p-3.5 rounded-xl bg-surface border border-themeline backdrop-blur-sm hover:border-action-border transition-colors shadow-sm">
              <div className="flex items-center gap-1.5 text-star mb-1">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span className="text-[11px] font-mono text-txt-muted">Indexed Repos</span>
              </div>
              <div className="text-xl font-mono font-bold text-txt-primary tracking-tight">
                {totalReposCount > 0 ? totalReposCount.toLocaleString() : '50,000+'}
              </div>
              <div className="text-[10px] font-mono text-txt-muted opacity-75">Live Global Sync</div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface border border-themeline backdrop-blur-sm hover:border-action-border transition-colors shadow-sm">
              <div className="flex items-center gap-1.5 text-action mb-1">
                <Layers className="w-3.5 h-3.5" />
                <span className="text-[11px] font-mono text-txt-muted">Active Sector</span>
              </div>
              <div className="text-sm font-display font-bold text-action truncate max-w-[130px]">
                {activeCategoryName}
              </div>
              <div className="text-[10px] font-mono text-txt-muted opacity-75">Ranked by Stars</div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface border border-themeline backdrop-blur-sm hover:border-action-border transition-colors col-span-2 sm:col-span-1 shadow-sm">
              <div className="flex items-center gap-1.5 text-action mb-1">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span className="text-[11px] font-mono text-txt-muted">Stream Status</span>
              </div>
              <div className="text-sm font-mono font-bold text-txt-primary flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Online
              </div>
              <div className="text-[10px] font-mono text-txt-muted opacity-75">GitHub REST v3</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
