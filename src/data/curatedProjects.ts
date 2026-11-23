import { Repository, Category } from '../types';

export const CATEGORIES: Category[] = [
  {
    id: 'all',
    name: 'All Projects',
    description: 'Explore the highest starred and most influential open source software worldwide.',
    icon: 'Sparkles',
    queryTopic: 'stars:>50000',
  },
  {
    id: 'ai-ml',
    name: 'AI & Machine Learning',
    description: 'Large language models, generative AI, deep learning frameworks, and neural tooling.',
    icon: 'Brain',
    queryTopic: 'topic:machine-learning OR topic:deep-learning OR topic:llm',
  },
  {
    id: 'web-frameworks',
    name: 'Web & Frameworks',
    description: 'Next-gen reactive frontends, full-stack frameworks, runtime engines, and UI systems.',
    icon: 'Globe',
    queryTopic: 'topic:frontend OR topic:web-framework OR topic:react',
  },
  {
    id: 'devops-cloud',
    name: 'Cloud & DevOps',
    description: 'Containers, orchestration, infrastructure-as-code, and cloud-native observability.',
    icon: 'Cloud',
    queryTopic: 'topic:devops OR topic:kubernetes OR topic:docker',
  },
  {
    id: 'developer-tools',
    name: 'Developer Tools',
    description: 'Modern editors, build tools, package managers, and productivity accelerators.',
    icon: 'Wrench',
    queryTopic: 'topic:developer-tools OR topic:cli OR topic:compiler',
  },
  {
    id: 'databases',
    name: 'Databases & Storage',
    description: 'Relational, vector, key-value, distributed, and analytical database engines.',
    icon: 'Database',
    queryTopic: 'topic:database OR topic:sql OR topic:vector-database',
  },
  {
    id: 'mobile-crossplatform',
    name: 'Mobile & Desktop',
    description: 'Cross-platform app development kits, mobile SDKs, and desktop UI runtimes.',
    icon: 'Smartphone',
    queryTopic: 'topic:mobile OR topic:flutter OR topic:react-native',
  },
  {
    id: 'cybersecurity',
    name: 'Security & Privacy',
    description: 'Penetration testing, encryption, vulnerability analysis, and zero-trust security.',
    icon: 'Shield',
    queryTopic: 'topic:security OR topic:infosec OR topic:cryptography',
  },
  {
    id: 'android-apks',
    name: 'Android & APKs',
    description: 'Open-source Android applications, standalone APK releases, and mobile utilities.',
    icon: 'Package',
    queryTopic: 'topic:android-app',
  },
  {
    id: 'videography-media',
    name: 'Videography & Media',
    description: 'Video editors, streaming tools, encoders, converters, and multimedia engines.',
    icon: 'Video',
    queryTopic: 'topic:video',
  },
];

export const CURATED_PROJECTS: Repository[] = [
  // AI & ML
  {
    id: 'ai-1',
    name: 'transformers',
    full_name: 'huggingface/transformers',
    owner: {
      login: 'huggingface',
      avatar_url: 'https://avatars.githubusercontent.com/u/25720743?v=4',
      html_url: 'https://github.com/huggingface'
    },
    description: 'State-of-the-art Machine Learning for Pytorch, TensorFlow, and JAX with thousands of pre-trained models.',
    html_url: 'https://github.com/huggingface/transformers',
    homepage: 'https://huggingface.co/docs/transformers',
    stargazers_count: 135400,
    forks_count: 26800,
    open_issues_count: 920,
    language: 'Python',
    topics: ['deep-learning', 'nlp', 'pytorch', 'machine-learning', 'transformers', 'llm'],
    updated_at: '2026-11-13T12:00:00Z',
    category: 'ai-ml',
    license: { key: 'apache-2.0', name: 'Apache License 2.0', spdx_id: 'Apache-2.0' }
  },
  {
    id: 'ai-2',
    name: 'ollama',
    full_name: 'ollama/ollama',
    owner: {
      login: 'ollama',
      avatar_url: 'https://avatars.githubusercontent.com/u/148788950?v=4',
      html_url: 'https://github.com/ollama'
    },
    description: 'Get up and running with Llama 3.3, Mistral, Gemma 2, and other large language models locally.',
    html_url: 'https://github.com/ollama/ollama',
    homepage: 'https://ollama.com',
    stargazers_count: 114200,
    forks_count: 9800,
    open_issues_count: 430,
    language: 'Go',
    topics: ['llm', 'ai', 'llama', 'local-ai', 'machine-learning'],
    updated_at: '2026-11-14T08:30:00Z',
    category: 'ai-ml',
    license: { key: 'mit', name: 'MIT License', spdx_id: 'MIT' }
  },
  {
    id: 'ai-3',
    name: 'vllm',
    full_name: 'vllm-project/vllm',
    owner: {
      login: 'vllm-project',
      avatar_url: 'https://avatars.githubusercontent.com/u/137785897?v=4',
      html_url: 'https://github.com/vllm-project'
    },
    description: 'A high-throughput and memory-efficient inference and serving engine for LLMs.',
    html_url: 'https://github.com/vllm-project/vllm',
    homepage: 'https://vllm.ai',
    stargazers_count: 42300,
    forks_count: 5800,
    open_issues_count: 810,
    language: 'Python',
    topics: ['llm', 'inference', 'cuda', 'paged-attention', 'serving'],
    updated_at: '2026-11-14T06:15:00Z',
    category: 'ai-ml',
    license: { key: 'apache-2.0', name: 'Apache License 2.0', spdx_id: 'Apache-2.0' }
  },
  {
    id: 'ai-4',
    name: 'langchain',
    full_name: 'langchain-ai/langchain',
    owner: {
      login: 'langchain-ai',
      avatar_url: 'https://avatars.githubusercontent.com/u/126733545?v=4',
      html_url: 'https://github.com/langchain-ai'
    },
    description: 'Build context-aware reasoning applications with flexible abstractions and extensive ecosystem integrations.',
    html_url: 'https://github.com/langchain-ai/langchain',
    homepage: 'https://langchain.com',
    stargazers_count: 98500,
    forks_count: 15900,
    open_issues_count: 650,
    language: 'Python',
    topics: ['llm', 'agent', 'langchain', 'generative-ai', 'prompt-engineering'],
    updated_at: '2026-11-14T10:10:00Z',
    category: 'ai-ml',
    license: { key: 'mit', name: 'MIT License', spdx_id: 'MIT' }
  },
  {
    id: 'ai-5',
    name: 'llama.cpp',
    full_name: 'ggerganov/llama.cpp',
    owner: {
      login: 'ggerganov',
      avatar_url: 'https://avatars.githubusercontent.com/u/1991296?v=4',
      html_url: 'https://github.com/ggerganov'
    },
    description: 'LLM inference in C/C++ with minimal setup, supporting Apple Silicon, AVX, CUDA, and Vulkan.',
    html_url: 'https://github.com/ggerganov/llama.cpp',
    homepage: null,
    stargazers_count: 73800,
    forks_count: 10400,
    open_issues_count: 380,
    language: 'C++',
    topics: ['llm', 'c-plus-plus', 'quantization', 'ggml', 'cpu-inference'],
    updated_at: '2026-11-14T09:40:00Z',
    category: 'ai-ml',
    license: { key: 'mit', name: 'MIT License', spdx_id: 'MIT' }
  },

  // Web & Frameworks
  {
    id: 'web-1',
    name: 'react',
    full_name: 'facebook/react',
    owner: {
      login: 'facebook',
      avatar_url: 'https://avatars.githubusercontent.com/u/69631?v=4',
      html_url: 'https://github.com/facebook'
    },
    description: 'The library for web and native user interfaces, maintained by Meta and the open source community.',
    html_url: 'https://github.com/facebook/react',
    homepage: 'https://react.dev',
    stargazers_count: 229100,
    forks_count: 46200,
    open_issues_count: 1200,
    language: 'JavaScript',
    topics: ['javascript', 'frontend', 'ui', 'declarative', 'react'],
    updated_at: '2026-11-14T07:20:00Z',
    category: 'web-frameworks',
    license: { key: 'mit', name: 'MIT License', spdx_id: 'MIT' }
  },
  {
    id: 'web-2',
    name: 'next.js',
    full_name: 'vercel/next.js',
    owner: {
      login: 'vercel',
      avatar_url: 'https://avatars.githubusercontent.com/u/14985020?v=4',
      html_url: 'https://github.com/vercel'
    },
    description: 'The React Framework for the Web. Enables hybrid static & server rendering, TypeScript, route handlers, and more.',
    html_url: 'https://github.com/vercel/next.js',
    homepage: 'https://nextjs.org',
    stargazers_count: 128500,
    forks_count: 27100,
    open_issues_count: 2400,
    language: 'JavaScript',
    topics: ['nextjs', 'react', 'ssr', 'typescript', 'vercel'],
    updated_at: '2026-11-14T11:00:00Z',
    category: 'web-frameworks',
    license: { key: 'mit', name: 'MIT License', spdx_id: 'MIT' }
  },
  {
    id: 'web-3',
    name: 'vue',
    full_name: 'vuejs/core',
    owner: {
      login: 'vuejs',
      avatar_url: 'https://avatars.githubusercontent.com/u/6128107?v=4',
      html_url: 'https://github.com/vuejs'
    },
    description: 'An approachable, performant and versatile framework for building web user interfaces.',
    html_url: 'https://github.com/vuejs/core',
    homepage: 'https://vuejs.org',
    stargazers_count: 46800,
    forks_count: 8100,
    open_issues_count: 450,
    language: 'TypeScript',
    topics: ['vue', 'frontend', 'reactive', 'typescript', 'web'],
    updated_at: '2026-11-13T19:30:00Z',
    category: 'web-frameworks',
    license: { key: 'mit', name: 'MIT License', spdx_id: 'MIT' }
  },
  {
    id: 'web-4',
    name: 'tailwindcss',
    full_name: 'tailwindlabs/tailwindcss',
    owner: {
      login: 'tailwindlabs',
      avatar_url: 'https://avatars.githubusercontent.com/u/67104417?v=4',
      html_url: 'https://github.com/tailwindlabs'
    },
    description: 'A utility-first CSS framework for rapid UI development, designed to be composed directly in your markup.',
    html_url: 'https://github.com/tailwindlabs/tailwindcss',
    homepage: 'https://tailwindcss.com',
    stargazers_count: 83200,
    forks_count: 4300,
    open_issues_count: 40,
    language: 'TypeScript',
    topics: ['css', 'utility-first', 'design-system', 'postcss'],
    updated_at: '2026-11-14T05:00:00Z',
    category: 'web-frameworks',
    license: { key: 'mit', name: 'MIT License', spdx_id: 'MIT' }
  },
  {
    id: 'web-5',
    name: 'astro',
    full_name: 'withastro/astro',
    owner: {
      login: 'withastro',
      avatar_url: 'https://avatars.githubusercontent.com/u/74640103?v=4',
      html_url: 'https://github.com/withastro'
    },
    description: 'The web framework for content-driven websites. Zero JS by default, island architecture, and markdown-native.',
    html_url: 'https://github.com/withastro/astro',
    homepage: 'https://astro.build',
    stargazers_count: 49200,
    forks_count: 2600,
    open_issues_count: 190,
    language: 'TypeScript',
    topics: ['astro', 'ssg', 'static-site-generator', 'islands-architecture'],
    updated_at: '2026-11-14T09:25:00Z',
    category: 'web-frameworks',
    license: { key: 'mit', name: 'MIT License', spdx_id: 'MIT' }
  },

  // Cloud & DevOps
  {
    id: 'cloud-1',
    name: 'kubernetes',
    full_name: 'kubernetes/kubernetes',
    owner: {
      login: 'kubernetes',
      avatar_url: 'https://avatars.githubusercontent.com/u/13629408?v=4',
      html_url: 'https://github.com/kubernetes'
    },
    description: 'Production-Grade Container Orchestration system for automated deployment, scaling, and operations.',
    html_url: 'https://github.com/kubernetes/kubernetes',
    homepage: 'https://kubernetes.io',
    stargazers_count: 112000,
    forks_count: 39800,
    open_issues_count: 2300,
    language: 'Go',
    topics: ['containers', 'orchestration', 'cloud-native', 'kubernetes', 'cncf'],
    updated_at: '2026-11-14T11:45:00Z',
    category: 'devops-cloud',
    license: { key: 'apache-2.0', name: 'Apache License 2.0', spdx_id: 'Apache-2.0' }
  },
  {
    id: 'cloud-2',
    name: 'docker-compose',
    full_name: 'docker/compose',
    owner: {
      login: 'docker',
      avatar_url: 'https://avatars.githubusercontent.com/u/5429470?v=4',
      html_url: 'https://github.com/docker'
    },
    description: 'Define and run multi-container Docker applications with declarative YAML configs.',
    html_url: 'https://github.com/docker/compose',
    homepage: 'https://docs.docker.com/compose/',
    stargazers_count: 34100,
    forks_count: 5300,
    open_issues_count: 310,
    language: 'Go',
    topics: ['docker', 'containers', 'devops', 'orchestration'],
    updated_at: '2026-11-13T14:10:00Z',
    category: 'devops-cloud',
    license: { key: 'apache-2.0', name: 'Apache License 2.0', spdx_id: 'Apache-2.0' }
  },
  {
    id: 'cloud-3',
    name: 'terraform',
    full_name: 'hashicorp/terraform',
    owner: {
      login: 'hashicorp',
      avatar_url: 'https://avatars.githubusercontent.com/u/761456?v=4',
      html_url: 'https://github.com/hashicorp'
    },
    description: 'Terraform enables you to safely and predictably create, change, and improve cloud infrastructure as code.',
    html_url: 'https://github.com/hashicorp/terraform',
    homepage: 'https://www.terraform.io',
    stargazers_count: 43200,
    forks_count: 9400,
    open_issues_count: 1800,
    language: 'Go',
    topics: ['iac', 'infrastructure-as-code', 'cloud', 'aws', 'gcp', 'azure'],
    updated_at: '2026-11-14T02:00:00Z',
    category: 'devops-cloud',
    license: { key: 'bsl-1.1', name: 'Business Source License 1.1', spdx_id: 'BUSL-1.1' }
  },
  {
    id: 'cloud-4',
    name: 'ansible',
    full_name: 'ansible/ansible',
    owner: {
      login: 'ansible',
      avatar_url: 'https://avatars.githubusercontent.com/u/1507452?v=4',
      html_url: 'https://github.com/ansible'
    },
    description: 'Ansible is a radically simple IT automation platform that makes your applications and systems easier to deploy.',
    html_url: 'https://github.com/ansible/ansible',
    homepage: 'https://www.ansible.com',
    stargazers_count: 62400,
    forks_count: 24300,
    open_issues_count: 1100,
    language: 'Python',
    topics: ['automation', 'devops', 'configuration-management', 'python'],
    updated_at: '2026-11-14T04:20:00Z',
    category: 'devops-cloud',
    license: { key: 'gpl-3.0', name: 'GNU General Public License v3.0', spdx_id: 'GPL-3.0' }
  },

  // Developer Tools
  {
    id: 'tools-1',
    name: 'vscode',
    full_name: 'microsoft/vscode',
    owner: {
      login: 'microsoft',
      avatar_url: 'https://avatars.githubusercontent.com/u/6154722?v=4',
      html_url: 'https://github.com/microsoft'
    },
    description: 'Visual Studio Code is a code editor redefined and optimized for building and debugging modern web and cloud applications.',
    html_url: 'https://github.com/microsoft/vscode',
    homepage: 'https://code.visualstudio.com',
    stargazers_count: 164200,
    forks_count: 30100,
    open_issues_count: 4800,
    language: 'TypeScript',
    topics: ['editor', 'electron', 'typescript', 'developer-tools'],
    updated_at: '2026-11-14T11:50:00Z',
    category: 'developer-tools',
    license: { key: 'mit', name: 'MIT License', spdx_id: 'MIT' }
  },
  {
    id: 'tools-2',
    name: 'uv',
    full_name: 'astral-sh/uv',
    owner: {
      login: 'astral-sh',
      avatar_url: 'https://avatars.githubusercontent.com/u/115962839?v=4',
      html_url: 'https://github.com/astral-sh'
    },
    description: 'An extremely fast Python package and project manager, written in Rust. 10-100x faster than pip.',
    html_url: 'https://github.com/astral-sh/uv',
    homepage: 'https://docs.astral.sh/uv/',
    stargazers_count: 45200,
    forks_count: 1500,
    open_issues_count: 320,
    language: 'Rust',
    topics: ['python', 'packaging', 'rust', 'cli', 'speed'],
    updated_at: '2026-11-14T10:05:00Z',
    category: 'developer-tools',
    license: { key: 'apache-2.0', name: 'Apache License 2.0', spdx_id: 'Apache-2.0' }
  },
  {
    id: 'tools-3',
    name: 'neovim',
    full_name: 'neovim/neovim',
    owner: {
      login: 'neovim',
      avatar_url: 'https://avatars.githubusercontent.com/u/6471485?v=4',
      html_url: 'https://github.com/neovim'
    },
    description: 'Vim-fork focused on extensibility and usability, featuring first-class Lua scripting and built-in LSP.',
    html_url: 'https://github.com/neovim/neovim',
    homepage: 'https://neovim.io',
    stargazers_count: 85300,
    forks_count: 5700,
    open_issues_count: 1900,
    language: 'Vim Script',
    topics: ['editor', 'vim', 'lua', 'terminal', 'lsp'],
    updated_at: '2026-11-14T08:12:00Z',
    category: 'developer-tools',
    license: { key: 'apache-2.0', name: 'Apache License 2.0', spdx_id: 'Apache-2.0' }
  },
  {
    id: 'tools-4',
    name: 'vite',
    full_name: 'vitejs/vite',
    owner: {
      login: 'vitejs',
      avatar_url: 'https://avatars.githubusercontent.com/u/65625612?v=4',
      html_url: 'https://github.com/vitejs'
    },
    description: 'Next Generation Frontend Tooling with instant server start and lightning fast Hot Module Replacement.',
    html_url: 'https://github.com/vitejs/vite',
    homepage: 'https://vitejs.dev',
    stargazers_count: 70800,
    forks_count: 6200,
    open_issues_count: 680,
    language: 'TypeScript',
    topics: ['bundler', 'frontend', 'esbuild', 'rollup', 'hmr'],
    updated_at: '2026-11-14T06:50:00Z',
    category: 'developer-tools',
    license: { key: 'mit', name: 'MIT License', spdx_id: 'MIT' }
  },

  // Databases & Storage
  {
    id: 'db-1',
    name: 'supabase',
    full_name: 'supabase/supabase',
    owner: {
      login: 'supabase',
      avatar_url: 'https://avatars.githubusercontent.com/u/54469796?v=4',
      html_url: 'https://github.com/supabase'
    },
    description: 'The open source Firebase alternative. Supabase gives you a dedicated Postgres database, Auth, realtime, and storage.',
    html_url: 'https://github.com/supabase/supabase',
    homepage: 'https://supabase.com',
    stargazers_count: 76400,
    forks_count: 6400,
    open_issues_count: 650,
    language: 'TypeScript',
    topics: ['postgres', 'database', 'realtime', 'auth', 'storage'],
    updated_at: '2026-11-14T09:10:00Z',
    category: 'databases',
    license: { key: 'apache-2.0', name: 'Apache License 2.0', spdx_id: 'Apache-2.0' }
  },
  {
    id: 'db-2',
    name: 'redis',
    full_name: 'redis/redis',
    owner: {
      login: 'redis',
      avatar_url: 'https://avatars.githubusercontent.com/u/1529926?v=4',
      html_url: 'https://github.com/redis'
    },
    description: 'In-memory database that persists on disk. The data model is key-value, but many different kind of values are supported.',
    html_url: 'https://github.com/redis/redis',
    homepage: 'https://redis.io',
    stargazers_count: 66900,
    forks_count: 23800,
    open_issues_count: 1400,
    language: 'C',
    topics: ['redis', 'key-value', 'in-memory', 'cache', 'database'],
    updated_at: '2026-11-13T18:00:00Z',
    category: 'databases',
    license: { key: 'bsd-3-clause', name: 'BSD 3-Clause License', spdx_id: 'BSD-3-Clause' }
  },
  {
    id: 'db-3',
    name: 'milvus',
    full_name: 'milvus-io/milvus',
    owner: {
      login: 'milvus-io',
      avatar_url: 'https://avatars.githubusercontent.com/u/53073998?v=4',
      html_url: 'https://github.com/milvus-io'
    },
    description: 'A cloud-native vector database, built for scalable similarity search and AI embedding retrieval.',
    html_url: 'https://github.com/milvus-io/milvus',
    homepage: 'https://milvus.io',
    stargazers_count: 32400,
    forks_count: 3100,
    open_issues_count: 290,
    language: 'Go',
    topics: ['vector-database', 'similarity-search', 'ai', 'embedding', 'rag'],
    updated_at: '2026-11-14T03:30:00Z',
    category: 'databases',
    license: { key: 'apache-2.0', name: 'Apache License 2.0', spdx_id: 'Apache-2.0' }
  },

  // Mobile & Desktop
  {
    id: 'mobile-1',
    name: 'flutter',
    full_name: 'flutter/flutter',
    owner: {
      login: 'flutter',
      avatar_url: 'https://avatars.githubusercontent.com/u/14101776?v=4',
      html_url: 'https://github.com/flutter'
    },
    description: 'Flutter makes it easy and fast to build beautiful apps for mobile and beyond from a single codebase.',
    html_url: 'https://github.com/flutter/flutter',
    homepage: 'https://flutter.dev',
    stargazers_count: 165800,
    forks_count: 27100,
    open_issues_count: 5100,
    language: 'Dart',
    topics: ['flutter', 'dart', 'cross-platform', 'mobile', 'ios', 'android'],
    updated_at: '2026-11-14T11:15:00Z',
    category: 'mobile-crossplatform',
    license: { key: 'bsd-3-clause', name: 'BSD 3-Clause License', spdx_id: 'BSD-3-Clause' }
  },
  {
    id: 'mobile-2',
    name: 'react-native',
    full_name: 'facebook/react-native',
    owner: {
      login: 'facebook',
      avatar_url: 'https://avatars.githubusercontent.com/u/69631?v=4',
      html_url: 'https://github.com/facebook'
    },
    description: 'A framework for building native applications using React and platform-standard native primitives.',
    html_url: 'https://github.com/facebook/react-native',
    homepage: 'https://reactnative.dev',
    stargazers_count: 118400,
    forks_count: 24200,
    open_issues_count: 1800,
    language: 'C++',
    topics: ['react-native', 'mobile', 'ios', 'android', 'cross-platform'],
    updated_at: '2026-11-14T07:45:00Z',
    category: 'mobile-crossplatform',
    license: { key: 'mit', name: 'MIT License', spdx_id: 'MIT' }
  },
  {
    id: 'mobile-3',
    name: 'tauri',
    full_name: 'tauri-apps/tauri',
    owner: {
      login: 'tauri-apps',
      avatar_url: 'https://avatars.githubusercontent.com/u/54508935?v=4',
      html_url: 'https://github.com/tauri-apps'
    },
    description: 'Build smaller, faster, and more secure desktop and mobile applications with a web frontend and Rust backend.',
    html_url: 'https://github.com/tauri-apps/tauri',
    homepage: 'https://tauri.app',
    stargazers_count: 85900,
    forks_count: 2700,
    open_issues_count: 220,
    language: 'Rust',
    topics: ['tauri', 'rust', 'desktop', 'gui', 'webview', 'security'],
    updated_at: '2026-11-14T08:50:00Z',
    category: 'mobile-crossplatform',
    license: { key: 'apache-2.0', name: 'Apache License 2.0', spdx_id: 'Apache-2.0' }
  },

  // Cybersecurity
  {
    id: 'sec-1',
    name: 'metasploit-framework',
    full_name: 'rapid7/metasploit-framework',
    owner: {
      login: 'rapid7',
      avatar_url: 'https://avatars.githubusercontent.com/u/278144?v=4',
      html_url: 'https://github.com/rapid7'
    },
    description: 'Metasploit Framework is the world’s most used penetration testing platform.',
    html_url: 'https://github.com/rapid7/metasploit-framework',
    homepage: 'https://www.metasploit.com',
    stargazers_count: 35100,
    forks_count: 14200,
    open_issues_count: 700,
    language: 'Ruby',
    topics: ['security', 'penetration-testing', 'exploit', 'ruby'],
    updated_at: '2026-11-13T16:00:00Z',
    category: 'cybersecurity',
    license: { key: 'bsd-3-clause', name: 'BSD 3-Clause License', spdx_id: 'BSD-3-Clause' }
  },
  {
    id: 'sec-2',
    name: 'nmap',
    full_name: 'nmap/nmap',
    owner: {
      login: 'nmap',
      avatar_url: 'https://avatars.githubusercontent.com/u/1042780?v=4',
      html_url: 'https://github.com/nmap'
    },
    description: 'Nmap - the Network Mapper. Free and open source utility for network discovery and security auditing.',
    html_url: 'https://github.com/nmap/nmap',
    homepage: 'https://nmap.org',
    stargazers_count: 31200,
    forks_count: 4800,
    open_issues_count: 420,
    language: 'C',
    topics: ['security', 'network', 'scanner', 'infosec'],
    updated_at: '2026-11-13T21:10:00Z',
    category: 'cybersecurity',
    license: { key: 'other', name: 'Custom Open Source', spdx_id: 'Nmap' }
  },
  {
    id: 'sec-3',
    name: 'trivy',
    full_name: 'aquasecurity/trivy',
    owner: {
      login: 'aquasecurity',
      avatar_url: 'https://avatars.githubusercontent.com/u/12782755?v=4',
      html_url: 'https://github.com/aquasecurity'
    },
    description: 'Comprehensive security scanner for containers, Kubernetes, code repositories, clouds, and SBOMs.',
    html_url: 'https://github.com/aquasecurity/trivy',
    homepage: 'https://trivy.dev',
    stargazers_count: 24700,
    forks_count: 2200,
    open_issues_count: 180,
    language: 'Go',
    topics: ['security', 'vulnerability-scanner', 'containers', 'sbom'],
    updated_at: '2026-11-14T05:40:00Z',
    category: 'cybersecurity',
    license: { key: 'apache-2.0', name: 'Apache License 2.0', spdx_id: 'Apache-2.0' }
  },

  // Android Releases & APKs
  {
    id: 'apk-1',
    name: 'NewPipe',
    full_name: 'TeamNewPipe/NewPipe',
    owner: {
      login: 'TeamNewPipe',
      avatar_url: 'https://avatars.githubusercontent.com/u/16053351?v=4',
      html_url: 'https://github.com/TeamNewPipe'
    },
    description: 'A libre lightweight streaming frontend for Android with APK releases and no Google Play Services dependency.',
    html_url: 'https://github.com/TeamNewPipe/NewPipe',
    homepage: 'https://newpipe.net',
    stargazers_count: 32400,
    forks_count: 3100,
    open_issues_count: 850,
    language: 'Java',
    topics: ['android-app', 'apk', 'streaming', 'media-player', 'f-droid'],
    updated_at: '2026-11-20T10:00:00Z',
    category: 'android-apks',
    license: { key: 'gpl-3.0', name: 'GNU General Public License v3.0', spdx_id: 'GPL-3.0' }
  },
  {
    id: 'apk-2',
    name: 'revanced-manager',
    full_name: 'ReVanced/revanced-manager',
    owner: {
      login: 'ReVanced',
      avatar_url: 'https://avatars.githubusercontent.com/u/98959966?v=4',
      html_url: 'https://github.com/ReVanced'
    },
    description: 'The official Android application to use ReVanced and manage patched APK packages.',
    html_url: 'https://github.com/ReVanced/revanced-manager',
    homepage: 'https://revanced.app',
    stargazers_count: 22800,
    forks_count: 1400,
    open_issues_count: 190,
    language: 'Dart',
    topics: ['android-app', 'apk', 'flutter', 'patcher'],
    updated_at: '2026-11-21T14:30:00Z',
    category: 'android-apks',
    license: { key: 'gpl-3.0', name: 'GNU General Public License v3.0', spdx_id: 'GPL-3.0' }
  },
  {
    id: 'apk-3',
    name: 'Seal',
    full_name: 'JunkFood02/Seal',
    owner: {
      login: 'JunkFood02',
      avatar_url: 'https://avatars.githubusercontent.com/u/69201948?v=4',
      html_url: 'https://github.com/JunkFood02'
    },
    description: 'Video/Audio downloader for Android, based on yt-dlp, designed with Material You and direct APK releases.',
    html_url: 'https://github.com/JunkFood02/Seal',
    homepage: 'https://github.com/JunkFood02/Seal',
    stargazers_count: 19200,
    forks_count: 890,
    open_issues_count: 120,
    language: 'Kotlin',
    topics: ['android-app', 'apk', 'yt-dlp', 'downloader', 'material-you'],
    updated_at: '2026-11-22T08:15:00Z',
    category: 'android-apks',
    license: { key: 'gpl-3.0', name: 'GNU General Public License v3.0', spdx_id: 'GPL-3.0' }
  },

  // Videography & Media Tools
  {
    id: 'vid-1',
    name: 'FFmpeg',
    full_name: 'FFmpeg/FFmpeg',
    owner: {
      login: 'FFmpeg',
      avatar_url: 'https://avatars.githubusercontent.com/u/3294165?v=4',
      html_url: 'https://github.com/FFmpeg'
    },
    description: 'A complete, cross-platform solution to record, convert, transcode, and stream audio and video.',
    html_url: 'https://github.com/FFmpeg/FFmpeg',
    homepage: 'https://ffmpeg.org',
    stargazers_count: 68100,
    forks_count: 15400,
    open_issues_count: 0,
    language: 'C',
    topics: ['video', 'ffmpeg', 'audio', 'streaming', 'converter', 'multimedia'],
    updated_at: '2026-11-23T18:00:00Z',
    category: 'videography-media',
    license: { key: 'lgpl-2.1', name: 'GNU Lesser General Public License v2.1', spdx_id: 'LGPL-2.1' }
  },
  {
    id: 'vid-2',
    name: 'obs-studio',
    full_name: 'obsproject/obs-studio',
    owner: {
      login: 'obsproject',
      avatar_url: 'https://avatars.githubusercontent.com/u/10292723?v=4',
      html_url: 'https://github.com/obsproject'
    },
    description: 'Free and open source software for live video recording and live streaming to YouTube, Twitch, and more.',
    html_url: 'https://github.com/obsproject/obs-studio',
    homepage: 'https://obsproject.com',
    stargazers_count: 63200,
    forks_count: 8300,
    open_issues_count: 420,
    language: 'C++',
    topics: ['video', 'streaming', 'recording', 'broadcasting', 'obs'],
    updated_at: '2026-11-23T12:00:00Z',
    category: 'videography-media',
    license: { key: 'gpl-2.0', name: 'GNU General Public License v2.0', spdx_id: 'GPL-2.0' }
  },
  {
    id: 'vid-3',
    name: 'lossless-cut',
    full_name: 'mifi/lossless-cut',
    owner: {
      login: 'mifi',
      avatar_url: 'https://avatars.githubusercontent.com/u/403155?v=4',
      html_url: 'https://github.com/mifi'
    },
    description: 'The Swiss Army knife of lossless video/audio editing. Trim, cut, merge, and export video files without re-encoding.',
    html_url: 'https://github.com/mifi/lossless-cut',
    homepage: 'https://github.com/mifi/lossless-cut',
    stargazers_count: 46400,
    forks_count: 2400,
    open_issues_count: 310,
    language: 'JavaScript',
    topics: ['video', 'video-editor', 'ffmpeg', 'lossless', 'electron'],
    updated_at: '2026-11-22T20:10:00Z',
    category: 'videography-media',
    license: { key: 'gpl-2.0', name: 'GNU General Public License v2.0', spdx_id: 'GPL-2.0' }
  }
];

export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  'C++': '#f34b7d',
  C: '#555555',
  Dart: '#00B4AB',
  Ruby: '#701516',
  Java: '#b07219',
  PHP: '#4F5D95',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Shell: '#89e051',
  'Vim Script': '#199f4b',
  Other: '#94a3b8'
};
