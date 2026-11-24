import { Repository } from '../types';

export const CURATED_ANDROID_APKS: Repository[] = [
  {
    id: 111001,
    name: 'NewPipe',
    full_name: 'TeamNewPipe/NewPipe',
    description: 'A libre lightweight streaming front-end for Android without proprietary Google Play Services.',
    html_url: 'https://github.com/TeamNewPipe/NewPipe',
    stargazers_count: 31200,
    forks_count: 2900,
    open_issues_count: 1420,
    watchers_count: 31200,
    language: 'Java',
    topics: ['android', 'apk', 'youtube', 'streaming', 'foss', 'privacy'],
    updated_at: new Date().toISOString(),
    created_at: '2015-09-04T12:00:00Z',
    pushed_at: new Date().toISOString(),
    clone_url: 'https://github.com/TeamNewPipe/NewPipe.git',
    default_branch: 'dev',
    owner: {
      login: 'TeamNewPipe',
      avatar_url: 'https://avatars.githubusercontent.com/u/19208000?v=4',
      html_url: 'https://github.com/TeamNewPipe'
    },
    license: { key: 'gpl-3.0', name: 'GNU General Public License v3.0', spdx_id: 'GPL-3.0' },
    has_apks: true,
    apk_count: 2,
    latest_release: {
      tag_name: 'v0.27.2',
      name: 'NewPipe v0.27.2',
      published_at: '2024-10-15T14:30:00Z',
      assets: [
        {
          id: 501,
          name: 'NewPipe_v0.27.2.apk',
          size: 13800000,
          download_count: 420000,
          browser_download_url: 'https://github.com/TeamNewPipe/NewPipe/releases/download/v0.27.2/NewPipe_v0.27.2.apk',
          content_type: 'application/vnd.android.package-archive',
          is_apk: true
        }
      ]
    }
  },
  {
    id: 111002,
    name: 'revanced-manager',
    full_name: 'ReVanced/revanced-manager',
    description: 'The official Android application to use ReVanced on Android. Patch your favorite Android apps on-device.',
    html_url: 'https://github.com/ReVanced/revanced-manager',
    stargazers_count: 18400,
    forks_count: 1250,
    open_issues_count: 180,
    watchers_count: 18400,
    language: 'Flutter',
    topics: ['android', 'apk', 'revanced', 'patcher', 'flutter', 'mod'],
    updated_at: new Date().toISOString(),
    created_at: '2022-04-18T10:00:00Z',
    pushed_at: new Date().toISOString(),
    clone_url: 'https://github.com/ReVanced/revanced-manager.git',
    default_branch: 'main',
    owner: {
      login: 'ReVanced',
      avatar_url: 'https://avatars.githubusercontent.com/u/100788647?v=4',
      html_url: 'https://github.com/ReVanced'
    },
    license: { key: 'gpl-3.0', name: 'GNU General Public License v3.0', spdx_id: 'GPL-3.0' },
    has_apks: true,
    apk_count: 1,
    latest_release: {
      tag_name: 'v1.20.1',
      name: 'ReVanced Manager v1.20.1',
      published_at: '2024-11-02T18:00:00Z',
      assets: [
        {
          id: 502,
          name: 'revanced-manager-v1.20.1.apk',
          size: 26500000,
          download_count: 650000,
          browser_download_url: 'https://github.com/ReVanced/revanced-manager/releases/download/v1.20.1/revanced-manager-v1.20.1.apk',
          content_type: 'application/vnd.android.package-archive',
          is_apk: true
        }
      ]
    }
  },
  {
    id: 111003,
    name: 'Seal',
    full_name: 'JunkFood02/Seal',
    description: '🦭 Video/Audio downloader for Android, based on yt-dlp, designed with Material You.',
    html_url: 'https://github.com/JunkFood02/Seal',
    stargazers_count: 16800,
    forks_count: 780,
    open_issues_count: 85,
    watchers_count: 16800,
    language: 'Kotlin',
    topics: ['android', 'apk', 'material-you', 'yt-dlp', 'downloader', 'kotlin'],
    updated_at: new Date().toISOString(),
    created_at: '2022-04-20T11:20:00Z',
    pushed_at: new Date().toISOString(),
    clone_url: 'https://github.com/JunkFood02/Seal.git',
    default_branch: 'main',
    owner: {
      login: 'JunkFood02',
      avatar_url: 'https://avatars.githubusercontent.com/u/51933454?v=4',
      html_url: 'https://github.com/JunkFood02'
    },
    license: { key: 'gpl-3.0', name: 'GNU General Public License v3.0', spdx_id: 'GPL-3.0' },
    has_apks: true,
    apk_count: 2,
    latest_release: {
      tag_name: 'v1.12.4',
      name: 'Seal 1.12.4',
      published_at: '2024-09-18T10:00:00Z',
      assets: [
        {
          id: 503,
          name: 'Seal-1.12.4-arm64-v8a-release.apk',
          size: 38400000,
          download_count: 320000,
          browser_download_url: 'https://github.com/JunkFood02/Seal/releases/download/v1.12.4/Seal-1.12.4-arm64-v8a-release.apk',
          content_type: 'application/vnd.android.package-archive',
          is_apk: true
        }
      ]
    }
  },
  {
    id: 111004,
    name: 'termux-app',
    full_name: 'termux/termux-app',
    description: 'Termux - a terminal emulator application for Android OS extendible by variety of packages.',
    html_url: 'https://github.com/termux/termux-app',
    stargazers_count: 34100,
    forks_count: 4200,
    open_issues_count: 610,
    watchers_count: 34100,
    language: 'Java',
    topics: ['android', 'apk', 'terminal', 'linux', 'bash', 'cli'],
    updated_at: new Date().toISOString(),
    created_at: '2015-06-30T16:00:00Z',
    pushed_at: new Date().toISOString(),
    clone_url: 'https://github.com/termux/termux-app.git',
    default_branch: 'master',
    owner: {
      login: 'termux',
      avatar_url: 'https://avatars.githubusercontent.com/u/13210343?v=4',
      html_url: 'https://github.com/termux'
    },
    license: { key: 'gpl-3.0', name: 'GNU General Public License v3.0', spdx_id: 'GPL-3.0' },
    has_apks: true,
    apk_count: 4,
    latest_release: {
      tag_name: 'v0.118.1',
      name: 'Termux v0.118.1',
      published_at: '2024-08-10T12:00:00Z',
      assets: [
        {
          id: 504,
          name: 'termux-app_v0.118.1+github-debug_arm64-v8a.apk',
          size: 97800000,
          download_count: 850000,
          browser_download_url: 'https://github.com/termux/termux-app/releases/download/v0.118.1/termux-app_v0.118.1+github-debug_arm64-v8a.apk',
          content_type: 'application/vnd.android.package-archive',
          is_apk: true
        }
      ]
    }
  },
  {
    id: 111005,
    name: 'ViMusic',
    full_name: 'vfsfitvnm/ViMusic',
    description: 'An Android application for streaming music from YouTube Music without account or ads.',
    html_url: 'https://github.com/vfsfitvnm/ViMusic',
    stargazers_count: 14500,
    forks_count: 980,
    open_issues_count: 110,
    watchers_count: 14500,
    language: 'Kotlin',
    topics: ['android', 'apk', 'music', 'streaming', 'material-you', 'kotlin'],
    updated_at: new Date().toISOString(),
    created_at: '2021-12-05T09:00:00Z',
    pushed_at: new Date().toISOString(),
    clone_url: 'https://github.com/vfsfitvnm/ViMusic.git',
    default_branch: 'master',
    owner: {
      login: 'vfsfitvnm',
      avatar_url: 'https://avatars.githubusercontent.com/u/25123961?v=4',
      html_url: 'https://github.com/vfsfitvnm'
    },
    license: { key: 'gpl-3.0', name: 'GNU General Public License v3.0', spdx_id: 'GPL-3.0' },
    has_apks: true,
    apk_count: 1,
    latest_release: {
      tag_name: 'v0.5.4',
      name: 'ViMusic v0.5.4',
      published_at: '2023-10-12T16:00:00Z',
      assets: [
        {
          id: 505,
          name: 'app-release.apk',
          size: 5800000,
          download_count: 490000,
          browser_download_url: 'https://github.com/vfsfitvnm/ViMusic/releases/download/v0.5.4/app-release.apk',
          content_type: 'application/vnd.android.package-archive',
          is_apk: true
        }
      ]
    }
  },
  {
    id: 111006,
    name: 'lawnchair',
    full_name: 'LawnchairLauncher/lawnchair',
    description: 'No clever tagline needed. Free, open-source, customizable launcher for Android based on Launcher3.',
    html_url: 'https://github.com/LawnchairLauncher/lawnchair',
    stargazers_count: 13200,
    forks_count: 1800,
    open_issues_count: 320,
    watchers_count: 13200,
    language: 'Kotlin',
    topics: ['android', 'apk', 'launcher', 'pixel', 'customization', 'kotlin'],
    updated_at: new Date().toISOString(),
    created_at: '2017-06-21T04:00:00Z',
    pushed_at: new Date().toISOString(),
    clone_url: 'https://github.com/LawnchairLauncher/lawnchair.git',
    default_branch: 'develop',
    owner: {
      login: 'LawnchairLauncher',
      avatar_url: 'https://avatars.githubusercontent.com/u/32790695?v=4',
      html_url: 'https://github.com/LawnchairLauncher'
    },
    license: { key: 'gpl-3.0', name: 'GNU General Public License v3.0', spdx_id: 'GPL-3.0' },
    has_apks: true,
    apk_count: 1,
    latest_release: {
      tag_name: '14-beta2',
      name: 'Lawnchair 14 Beta 2',
      published_at: '2024-07-25T11:00:00Z',
      assets: [
        {
          id: 506,
          name: 'Lawnchair.14.Beta.2.apk',
          size: 21400000,
          download_count: 190000,
          browser_download_url: 'https://github.com/LawnchairLauncher/lawnchair/releases/download/14-beta2/Lawnchair.14.Beta.2.apk',
          content_type: 'application/vnd.android.package-archive',
          is_apk: true
        }
      ]
    }
  },
  {
    id: 111007,
    name: 'AuroraStore',
    full_name: 'whyorean/AuroraStore',
    description: 'Aurora Store is an unofficial, FOSS client to Google Play store with an elegant Material design.',
    html_url: 'https://github.com/whyorean/AuroraStore',
    stargazers_count: 9800,
    forks_count: 890,
    open_issues_count: 140,
    watchers_count: 9800,
    language: 'Kotlin',
    topics: ['android', 'apk', 'play-store', 'privacy', 'f-droid', 'foss'],
    updated_at: new Date().toISOString(),
    created_at: '2019-01-10T12:00:00Z',
    pushed_at: new Date().toISOString(),
    clone_url: 'https://github.com/whyorean/AuroraStore.git',
    default_branch: 'master',
    owner: {
      login: 'whyorean',
      avatar_url: 'https://avatars.githubusercontent.com/u/15264022?v=4',
      html_url: 'https://github.com/whyorean'
    },
    license: { key: 'gpl-3.0', name: 'GNU General Public License v3.0', spdx_id: 'GPL-3.0' },
    has_apks: true,
    apk_count: 1,
    latest_release: {
      tag_name: '4.5.1',
      name: 'Aurora Store 4.5.1',
      published_at: '2024-05-19T10:00:00Z',
      assets: [
        {
          id: 507,
          name: 'AuroraStore_4.5.1.apk',
          size: 7900000,
          download_count: 310000,
          browser_download_url: 'https://github.com/whyorean/AuroraStore/releases/download/4.5.1/AuroraStore_4.5.1.apk',
          content_type: 'application/vnd.android.package-archive',
          is_apk: true
        }
      ]
    }
  },
  {
    id: 111008,
    name: 'NetGuard',
    full_name: 'M66B/NetGuard',
    description: 'A simple way to block access to the internet per application on Android without rooting.',
    html_url: 'https://github.com/M66B/NetGuard',
    stargazers_count: 11400,
    forks_count: 1300,
    open_issues_count: 90,
    watchers_count: 11400,
    language: 'Java',
    topics: ['android', 'apk', 'firewall', 'security', 'privacy', 'vpn'],
    updated_at: new Date().toISOString(),
    created_at: '2015-10-25T14:00:00Z',
    pushed_at: new Date().toISOString(),
    clone_url: 'https://github.com/M66B/NetGuard.git',
    default_branch: 'master',
    owner: {
      login: 'M66B',
      avatar_url: 'https://avatars.githubusercontent.com/u/2552790?v=4',
      html_url: 'https://github.com/M66B'
    },
    license: { key: 'gpl-3.0', name: 'GNU General Public License v3.0', spdx_id: 'GPL-3.0' },
    has_apks: true,
    apk_count: 1,
    latest_release: {
      tag_name: '2.316',
      name: 'NetGuard 2.316',
      published_at: '2024-03-14T08:00:00Z',
      assets: [
        {
          id: 508,
          name: 'NetGuard-v2.316-release.apk',
          size: 3800000,
          download_count: 145000,
          browser_download_url: 'https://github.com/M66B/NetGuard/releases/download/2.316/NetGuard-v2.316-release.apk',
          content_type: 'application/vnd.android.package-archive',
          is_apk: true
        }
      ]
    }
  }
];
