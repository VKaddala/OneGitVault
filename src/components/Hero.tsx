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
    <div className="relative overflow-hidden pt-8 pb-7 border-b border-[#e3d1ba] dark:border-[#1e343e] bg-gradient-to-b from-[#f7e4cd] via-[#FBE9D0] to-[#FBE9D0] dark:from-[#0c1519] dark:via-[#101b20] dark:to-[#101b20] transition-colors duration-200">
      {/* Subtle cinematic ambient glows from Prometheus palette */}
      <div className="absolute top-0 right-1/4 w-[450px] h-[300px] bg-[#E64833]/10 dark:bg-[#E64833]/10 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute -top-10 left-10 w-[300px] h-[250px] bg-[#874F41]/15 dark:bg-[#244855]/20 rounded-full blur-[80px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div className="max-w-2xl">
            {/* Small tactile pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E64833]/10 border border-[#E64833]/25 text-[#E64833] text-xs font-mono font-medium mb-3">
              <Flame className="w-3.5 h-3.5 text-[#E64833]" />
              <span>OneGitVault Live Discovery</span>
            </div>

            {/* Bricolage Grotesque Title */}
            <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-[#244855] dark:text-[#FBE9D0] mb-2 leading-tight">
              The Unified Gateway to <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E64833] via-[#874F41] to-[#244855] dark:from-[#ff5c47] dark:via-[#E64833] dark:to-[#90AEAD]">
                Open-Source Excellence
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-[#874F41] dark:text-[#90AEAD] leading-relaxed font-sans max-w-xl">
              Continuously explore, stream, and bookmark high-impact open source repositories, 
              ranked by community traction and verified popularity.
            </p>

            {/* Tactile Topic Tags */}
            <div className="flex items-center gap-1.5 flex-wrap mt-4">
              <span className="text-xs font-mono text-[#874F41] dark:text-[#90AEAD] flex items-center gap-1 mr-1">
                <Compass className="w-3.5 h-3.5 text-[#E64833]" /> explore:
              </span>
              {quickTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onSelectTopic(tag)}
                  className="text-xs font-mono px-2.5 py-0.5 rounded-lg bg-[#FFF9F0] hover:bg-[#F2DFCA] dark:bg-[#16272f] dark:hover:bg-[#1c323c] hover:text-[#E64833] dark:hover:text-[#ff5c47] hover:border-[#E64833]/40 text-[#244855] dark:text-[#FBE9D0] border border-[#e3d1ba] dark:border-[#244855] transition-all"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Precision Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 self-stretch md:self-auto">
            <div className="p-3.5 rounded-xl bg-[#FFF9F0]/90 dark:bg-[#16272f]/90 border border-[#e3d1ba] dark:border-[#244855] backdrop-blur-sm hover:border-[#874F41]/40 dark:hover:border-[#90AEAD]/40 transition-colors">
              <div className="flex items-center gap-1.5 text-[#E64833] mb-1">
                <Star className="w-3.5 h-3.5 fill-[#E64833]" />
                <span className="text-[11px] font-mono text-[#874F41] dark:text-[#90AEAD]">Indexed Repos</span>
              </div>
              <div className="text-xl font-mono font-bold text-[#244855] dark:text-[#FBE9D0] tracking-tight">
                {totalReposCount > 0 ? totalReposCount.toLocaleString() : '50,000+'}
              </div>
              <div className="text-[10px] font-mono text-[#874F41]/70 dark:text-[#90AEAD]/70">Live Global Sync</div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FFF9F0]/90 dark:bg-[#16272f]/90 border border-[#e3d1ba] dark:border-[#244855] backdrop-blur-sm hover:border-[#874F41]/40 dark:hover:border-[#90AEAD]/40 transition-colors">
              <div className="flex items-center gap-1.5 text-[#E64833] mb-1">
                <Layers className="w-3.5 h-3.5" />
                <span className="text-[11px] font-mono text-[#874F41] dark:text-[#90AEAD]">Active Sector</span>
              </div>
              <div className="text-sm font-display font-bold text-[#E64833] truncate max-w-[130px]">
                {activeCategoryName}
              </div>
              <div className="text-[10px] font-mono text-[#874F41]/70 dark:text-[#90AEAD]/70">Ranked by Stars</div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FFF9F0]/90 dark:bg-[#16272f]/90 border border-[#e3d1ba] dark:border-[#244855] backdrop-blur-sm hover:border-[#874F41]/40 dark:hover:border-[#90AEAD]/40 transition-colors col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 text-[#E64833] mb-1">
                <Radio className="w-3.5 h-3.5 text-[#E64833] animate-pulse" />
                <span className="text-[11px] font-mono text-[#874F41] dark:text-[#90AEAD]">Stream Status</span>
              </div>
              <div className="text-sm font-mono font-bold text-[#244855] dark:text-[#FBE9D0] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Online
              </div>
              <div className="text-[10px] font-mono text-[#874F41]/70 dark:text-[#90AEAD]/70">GitHub REST v3</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
