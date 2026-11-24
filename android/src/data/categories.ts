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
    query: 'topic:android-app',
    description: 'Standalone Android applications, tools, and direct APK download releases'
  },
  {
    id: 'android-media',
    label: 'Media & Streaming',
    icon: 'VideoLibrary',
    query: 'topic:android topic:video',
    description: 'Video players, audio streams, YouTube clients, and media downloader APKs'
  },
  {
    id: 'android-tools',
    label: 'Tools & System',
    icon: 'Build',
    query: 'topic:android topic:tools',
    description: 'Terminal emulators, file managers, debuggers, and system utility APKs'
  },
  {
    id: 'android-security',
    label: 'Privacy & Security',
    icon: 'Security',
    query: 'topic:android topic:security',
    description: 'VPNs, firewalls, encrypted notes, and security tool APKs'
  },
  {
    id: 'android-custom',
    label: 'Launchers & UI',
    icon: 'PhoneAndroid',
    query: 'topic:android topic:launcher',
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
    query: 'topic:machine-learning',
    description: 'Deep learning models, LLM frameworks, agentic workflows, and neural tools'
  },
  {
    id: 'videography-media',
    label: 'Videography & Media',
    icon: 'VideoLibrary',
    query: 'topic:video',
    description: 'Video editors, media converters, ffmpeg pipelines, and streaming engines'
  },
  {
    id: 'web-frameworks',
    label: 'Web & Frameworks',
    icon: 'Language',
    query: 'topic:react',
    description: 'Frontend frameworks, fullstack runtimes, reactive state engines, and bundlers'
  },
  {
    id: 'developer-tools',
    label: 'Developer Tools',
    icon: 'Build',
    query: 'topic:developer-tools',
    description: 'Compilers, package managers, CLIs, debuggers, and terminal utilities'
  },
  {
    id: 'security-privacy',
    label: 'Security & Privacy',
    icon: 'Security',
    query: 'topic:security',
    description: 'Auditing tools, encrypted communications, zero-knowledge, and defense suites'
  },
  {
    id: 'cloud-devops',
    label: 'Cloud & DevOps',
    icon: 'CloudQueue',
    query: 'topic:devops',
    description: 'Container runtimes, infrastructure as code, orchestration, and service meshes'
  },
  {
    id: 'databases-storage',
    label: 'Databases & Storage',
    icon: 'Storage',
    query: 'topic:database',
    description: 'Distributed databases, in-memory caches, graph stores, and vector indices'
  },
  {
    id: 'mobile-desktop',
    label: 'Mobile & Desktop',
    icon: 'PhoneAndroid',
    query: 'topic:mobile',
    description: 'Cross-platform applications, native clients, and mobile toolchains'
  }
];

export const CATEGORIES: Category[] = EXPLORE_CATEGORIES;

export const DEFAULT_CATEGORY_ID = 'android-apks';
