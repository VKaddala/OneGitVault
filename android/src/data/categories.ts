import { Category } from '../types';

/**
 * Filter categories strictly for the "APKs & Apps" tab.
 * Every sector here strictly streams repositories containing Android/APK applications and release binaries.
 */
export const APK_CATEGORIES: Category[] = [
  {
    id: 'android-apks',
    label: 'APK',
    icon: 'Android',
    query: 'android (app OR apk OR client OR android-app)',
    description: 'Standalone Android applications, tools, and direct APK download releases'
  },
  {
    id: 'android-media',
    label: 'Media & Streaming',
    icon: 'VideoLibrary',
    query: 'android topic:android (video OR audio OR music OR player OR media)',
    description: 'Video players, audio streams, YouTube clients, and media downloader APKs'
  },
  {
    id: 'android-tools',
    label: 'Tools & System',
    icon: 'Build',
    query: 'android topic:android (tools OR utility OR terminal OR manager)',
    description: 'Terminal emulators, file managers, debuggers, and system utility APKs'
  },
  {
    id: 'android-security',
    label: 'Privacy & Security',
    icon: 'Security',
    query: 'android topic:android (security OR privacy OR vpn OR encrypt)',
    description: 'VPNs, firewalls, encrypted notes, and security tool APKs'
  },
  {
    id: 'android-custom',
    label: 'Launchers & UI',
    icon: 'PhoneAndroid',
    query: 'android topic:android (launcher OR widget OR customization OR theme)',
    description: 'Custom home launchers, widgets, and user interface APKs'
  }
];

/**
 * Filter categories for the "Explore" observatory tab.
 * Covers all open-source domains across the entire global repository ecosystem.
 */
export const EXPLORE_CATEGORIES: Category[] = [
  {
    id: 'all',
    label: 'Explore',
    icon: 'AutoAwesome',
    query: 'stars:>1000',
    description: 'Global open source repositories across all technology sectors'
  },
  {
    id: 'newest',
    label: 'Newest',
    icon: 'AutoAwesome',
    query: 'created:>=2026-06-01',
    description: 'Fresh and newest open-source repositories'
  },
  {
    id: 'ai-ml',
    label: 'AI & Machine Learning',
    icon: 'Psychology',
    query: 'ai machine-learning OR deep-learning OR llm stars:>=100',
    description: 'Deep learning models, LLM frameworks, agentic workflows, and neural tools'
  },
  {
    id: 'videography-media',
    label: 'Videography & Media',
    icon: 'VideoLibrary',
    query: 'media video OR audio OR ffmpeg OR streaming stars:>=100',
    description: 'Video editors, media converters, ffmpeg pipelines, and streaming engines'
  },
  {
    id: 'web-frameworks',
    label: 'Web & Frameworks',
    icon: 'Language',
    query: 'web react OR vue OR svelte OR angular OR frontend stars:>=100',
    description: 'Frontend frameworks, fullstack runtimes, reactive state engines, and bundlers'
  },
  {
    id: 'developer-tools',
    label: 'Developer Tools',
    icon: 'Build',
    query: 'developer-tools OR cli OR compiler OR debugger stars:>=100',
    description: 'Compilers, package managers, CLIs, debuggers, and terminal utilities'
  },
  {
    id: 'security-privacy',
    label: 'Security & Privacy',
    icon: 'Security',
    query: 'security vpn OR privacy OR cryptography stars:>=100',
    description: 'Auditing tools, encrypted communications, zero-knowledge, and defense suites'
  },
  {
    id: 'cloud-devops',
    label: 'Cloud & DevOps',
    icon: 'CloudQueue',
    query: 'devops docker OR kubernetes OR cloud stars:>=100',
    description: 'Container runtimes, infrastructure as code, orchestration, and service meshes'
  },
  {
    id: 'databases-storage',
    label: 'Databases & Storage',
    icon: 'Storage',
    query: 'database sql OR nosql OR redis OR postgresql stars:>=100',
    description: 'Distributed databases, in-memory caches, graph stores, and vector indices'
  },
  {
    id: 'mobile-desktop',
    label: 'Mobile & Desktop',
    icon: 'PhoneAndroid',
    query: 'mobile flutter OR react-native OR desktop OR kotlin stars:>=100',
    description: 'Cross-platform applications, native clients, and mobile toolchains'
  }
];

export const CATEGORIES: Category[] = EXPLORE_CATEGORIES;

export const DEFAULT_CATEGORY_ID = 'android-apks';
