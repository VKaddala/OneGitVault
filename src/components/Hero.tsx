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
    <div className="relative overflow-hidden pt-8 pb-7 border-b border-neutral-200 dark:border-[#20212b] bg-gradient-to-b from-neutral-50 via-white to-white dark:from-[#13141a] dark:via-[#0c0d10] dark:to-[#0c0d10] transition-colors duration-200">
      {/* Subtle warm amber ambient warmth */}
      <div className="absolute top-0 right-1/4 w-[450px] h-[300px] bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute -top-10 left-10 w-[300px] h-[250px] bg-amber-600/10 dark:bg-amber-600/5 rounded-full blur-[80px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div className="max-w-2xl">
            {/* Small tactile pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-brand text-xs font-mono font-medium mb-3">
              <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-brand" />
              <span>OneGitVault Live Discovery</span>
            </div>

            {/* Bricolage Grotesque Title */}
            <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-neutral-900 dark:text-white mb-2 leading-tight">
              The Unified Gateway to <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-amber-700 to-amber-900 dark:from-amber-glow dark:via-amber-brand dark:to-amber-deep">
                Open-Source Excellence
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-neutral-600 dark:text-charcoal-400 leading-relaxed font-sans max-w-xl">
              Continuously explore, stream, and bookmark high-impact open source repositories, 
              ranked by community traction and verified popularity.
            </p>

            {/* Tactile Topic Tags */}
            <div className="flex items-center gap-1.5 flex-wrap mt-4">
              <span className="text-xs font-mono text-neutral-500 dark:text-charcoal-400 flex items-center gap-1 mr-1">
                <Compass className="w-3.5 h-3.5 text-amber-600 dark:text-amber-brand" /> explore:
              </span>
              {quickTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onSelectTopic(tag)}
                  className="text-xs font-mono px-2.5 py-0.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-[#14151b] dark:hover:bg-[#1c1d26] hover:text-amber-700 dark:hover:text-amber-glow hover:border-amber-500/40 text-neutral-700 dark:text-charcoal-300 border border-neutral-200 dark:border-[#242531] transition-all"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Precision Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 self-stretch md:self-auto">
            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-[#13141a]/90 border border-neutral-200 dark:border-[#222430] backdrop-blur-sm hover:border-neutral-300 dark:hover:border-[#2f3142] transition-colors">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-brand mb-1">
                <Star className="w-3.5 h-3.5 fill-amber-600 dark:fill-amber-brand" />
                <span className="text-[11px] font-mono text-neutral-500 dark:text-charcoal-400">Indexed Repos</span>
              </div>
              <div className="text-xl font-mono font-bold text-neutral-900 dark:text-white tracking-tight">
                {totalReposCount > 0 ? totalReposCount.toLocaleString() : '50,000+'}
              </div>
              <div className="text-[10px] font-mono text-neutral-500 dark:text-charcoal-400">Live Global Sync</div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-[#13141a]/90 border border-neutral-200 dark:border-[#222430] backdrop-blur-sm hover:border-neutral-300 dark:hover:border-[#2f3142] transition-colors">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-brand mb-1">
                <Layers className="w-3.5 h-3.5" />
                <span className="text-[11px] font-mono text-neutral-500 dark:text-charcoal-400">Active Sector</span>
              </div>
              <div className="text-sm font-display font-bold text-amber-700 dark:text-amber-brand truncate max-w-[130px]">
                {activeCategoryName}
              </div>
              <div className="text-[10px] font-mono text-neutral-500 dark:text-charcoal-400">Ranked by Stars</div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-[#13141a]/90 border border-neutral-200 dark:border-[#222430] backdrop-blur-sm hover:border-neutral-300 dark:hover:border-[#2f3142] transition-colors col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-brand mb-1">
                <Radio className="w-3.5 h-3.5 text-amber-600 dark:text-amber-brand animate-pulse" />
                <span className="text-[11px] font-mono text-neutral-500 dark:text-charcoal-400">Stream Status</span>
              </div>
              <div className="text-sm font-mono font-bold text-neutral-900 dark:text-charcoal-100 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Online
              </div>
              <div className="text-[10px] font-mono text-neutral-500 dark:text-charcoal-400">GitHub REST v3</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
