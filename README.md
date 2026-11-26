# OneGitVault

<p align="center">
  <img src="assets/icons/onegitvault.png" alt="OneGitVault Logo" width="112" height="112" />
</p>

<p align="center">
  <strong>OneGitVault is a Spotlighter for Developers — Like Reels & Shorts Scroll for Open-Source Repositories.</strong><br>
  <em>Discover high-impact repositories in seconds, stay alive with your Vault, and build what you discover.</em>
</p>

<p align="center">
  <a href="SETUP_ANDROID.md"><img src="https://img.shields.io/badge/Android-v2.0.0--Release-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Android v2.0.0" /></a>
  <a href="https://github.com/VKaddala/OneGitVault"><img src="https://img.shields.io/badge/Windows-v2.3.0-0078D6?style=for-the-badge&logo=windows&logoColor=white" alt="Windows v2.3.0" /></a>
  <a href="https://github.com/VKaddala/OneGitVault/stargazers"><img src="https://img.shields.io/badge/GitHub-Stars-f59e0b?style=for-the-badge&logo=github" alt="Stars" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-PolyForm--Noncommercial-blue?style=for-the-badge" alt="License" /></a>
</p>

---

### 📥 Downloads & Releases

| Platform | Latest Version | Package | Download Link |
| :--- | :--- | :--- | :--- |
| **Android Mobile** | **v2.0.0** 🚀 *(Major Feature Launch)* | `OneGitVault-Android-2.0.0.apk` (~3.8 MB) | [**Download Android APK**](https://github.com/VKaddala/OneGitVault/releases/tag/v2.0.0) |
| **Windows Desktop** | **v2.3.0** | `OneGitVault-Setup-2.3.0.exe` (~98 MB) | [**Download Windows Installer**](https://github.com/VKaddala/OneGitVault/releases/tag/v2.3.0) |

---

## 🌟 The Narrative: Why OneGitVault?

> **The way developers discover open source is broken.**  
> We search GitHub, star five interesting libraries at midnight, and promptly forget them forever. We drown in 10,000-word README files just to find out whether a library actually solves our problem.  
> 
> **OneGitVault is a spotlighter for developers — something like an Instagram Reels and YouTube Shorts scroll for open-source repositories.**  
> Swipe up through the world's most exciting repositories, digest 5-second elevator pitches ("What It Is & Solves"), test-drive preview media, and save projects to a **Living Vault** that actually alerts you when new releases and breaking updates drop.

---

## 📱 OneGitVault for Android — Feature Launch v2.0.0

OneGitVault 2.0.0 transforms the mobile experience into a blazing-fast, swipeable developer sanctuary.

```
┌──────────────────────────────────────────────────────────┐
│  ⚡ SPOTLIGHT: TikTok & Reels for Developers            │
│  ──────────────────────────────────────────────────────  │
│  • Vertical snap-feed of curated open-source projects    │
│  • 5-second elevator pitch ("What It Is & Solves")       │
│  • 3 punchy Key Highlights extracted automatically       │
│  • High-res demo preview media with Pinch-to-Zoom (4x)   │
│  • Double-tap gesture with animated Heart Pop to Vault   │
│  • Floating Quick Dock: Star, Vault, Readme, Share, Card │
└──────────────────────────────────────────────────────────┘
```

### 🎬 1. Spotlight Feed — "Reels for Developers"
- **Infinite Vertical Discovery**: Effortlessly swipe through trending repositories like an Instagram or TikTok reel, optimized for 120Hz high-refresh mobile screens.
- **Smart Elevator Pitches**: Say goodbye to endless scrolling. OneGitVault parses complex READMEs and summarizes each project into a **"What It Is & Solves"** executive brief.
- **Key Highlights in 3 Bullets**: Instant triage of architectural pillars, performance traits, and core libraries.
- **Pinch-To-Zoom Media Viewer**: Tap any working demo screenshot, architectural diagram, or gif to trigger interactive pinch-to-zoom (up to 4x), pan tracking, and universal edge-swipe dismissal.
- **Double-Tap to Vault**: Double-tap any card on screen for an instant haptic tick and glowing animated Heart Pop bookmarking gesture.

### 🖼️ 2. Visual Social Cards — Pure OLED Black Shareable Engine
- **One-Tap "Share as Card"**: Generate a stunning, high-DPI social media card ready for WhatsApp, X (Twitter), LinkedIn, and Telegram.
- **Pure OLED Black Design**: Seamless `#000000` aesthetic with glowing language accent tags, star telemetry, elevator pitches, and subtle `OneGitVault Spotlight` branding.
- **Zero-Blink Headless Render**: Rendered entirely through off-screen DOM cloning (`html2canvas` `onclone`), eliminating screen layout shifts or flickers.
- **Instantaneous UI Responsiveness**: Features immediate haptic feedback, real-time spinner morphing, and non-blocking asynchronous event dispatch.

### 🛡️ 3. The Living Vault — "Never Forget What You Starred"
- **"What Changed" Changelog Radar**: Background WorkManager periodically scans your vaulted repositories for new GitHub releases, version tags, and major changelogs.
- **Unread Update Banner**: Live notification bar informing you when *"3 of your Vault repos shipped updates today"*.
- **Full-Screen Changelog Dashboard**: Browse rich release notes with direct repo navigation, one-tap "Dismiss All", and per-repo "Ignore Updates" radar controls.
- **Private Developer Notes & Tags**: Attach personal notes (e.g., *"Use this auth library for the billing microservice"*) and custom tags to any bookmarked repo.
- **Smart Reminders ("Revisit Later")**: Schedule weekend build reminders so discovered gems turn into real production software.

### 📲 4. Native Android Home Screen Widgets
- **Trending Repo Widget (4×2)**: Cycles through top daily and weekly trending repositories right on your Android home screen in your preferred language.
- **Vault Release Tracker Widget**: Glances the freshest release tags and changelogs from your starred projects without even opening the app.

### 📳 5. Universal Tactile Haptics & GitHub Themes
- **Native Micro-Haptics**: Subtle, crisp haptic vibrations on every tab change, vault bookmark, zoom gesture, and action click (with a toggle in Settings).
- **GitHub Dark & Light Default Themes**: Pixel-perfect GitHub Dark (pure OLED contrast) and GitHub Light modes with automatic system night-mode tracking.
- **Zero-Latency Tab Architecture**: Independent view hydration across Spotlight, Trending, Vault, and Explore with zero UI-thread freeze.

---

## 💻 OneGitVault for Windows — Standalone Desktop Observatory

For desktop workstations, OneGitVault delivers an ultra-fast, native command center engineered with **Electron**, **React**, **TypeScript**, and **Tailwind CSS** that eliminates dozens of open browser tabs.

```
┌──────────────────────────────────────────────────────────┐
│  🖥️ DESKTOP OBSERVATORY: Workstation Command Center      │
│  ──────────────────────────────────────────────────────  │
│  • Instant Ctrl+K Search Flyout with live repo streaming │
│  • In-app GitHub Trending Explorer (Daily / Weekly / Mo) │
│  • Full GFM Markdown Reader with DOMPurify sanitization  │
│  • Direct Release Binaries (.exe, .zip, .apk) Downloader │
│  • Private GitHub Gist Cloud Sync across all machines    │
│  • Silent automated background updater                   │
└──────────────────────────────────────────────────────────┘
```

### 🚀 1. Real-Time Repository Streaming & Live Telemetry
- **Infinite Auto-Streaming**: Search and stream through hundreds of millions of open-source projects across GitHub with zero pagination friction or lag.
- **Instant `git clone` Copy**: Single-click clone URL copy with animated visual checkmark feedback.
- **Live Metadata Telemetry**: Color-coded language dots, official SPDX license tags (`MIT`, `Apache-2.0`, `GPLv3`, `PolyForm`), real-time calendar update timestamps, and compact Star/Fork telemetry (`14.2k`, `1.5M`).

### 🔥 2. In-App GitHub Trending Explorer & Navigation Preservation
- **Native In-App Modal**: Explore GitHub's trending open-source projects without leaving the desktop workspace or opening an external browser.
- **Time Ranges**: Toggle instantly between **Daily**, **Weekly**, and **Monthly** trending repositories across all programming languages.
- **State-Preserving Back Navigation**: Click any trending repository to preview its live documentation and release assets. Press `Esc` or click the back button to return to your exact trending list, preserving your scroll position, selected time period, and language filters.

### 🔍 3. Global Command Palette (`Ctrl+K` / `Cmd+K`) Search Flyout
- **Instant Hotkey Access**: Press `Ctrl+K` / `Cmd+K` anywhere to reveal a floating, frosted search flyout with instant `Esc` dismissal.
- **Topic & Entity Search**: Search across keywords, curated topics, `owner/repo` identifiers, and `@user` developer handles.

### 📑 4. Markdown Documentation & README Inspector
- **GitHub Flavored Markdown (GFM) Engine**: Renders complete project documentation with code syntax highlighting, responsive tables, callout blocks, and directory trees.
- **DOMPurify Security Sanitization**: Every README is strictly sanitized through DOMPurify to neutralize script injection and malicious payloads in external repositories.
- **Quick Action Bar**: Dedicated buttons to copy `git clone`, download repository ZIP archives, launch project homepages, or open directly on GitHub.

### 📦 5. Official Release Binaries Downloader
- **Direct Asset Inspection**: Dedicated inspector tab to browse official GitHub release tags, version notes, and attached artifacts.
- **One-Click Downloads**: Download executable binaries and release archives (`.exe`, `.zip`, `.tar.gz`, `.apk`) directly to your machine.

### ⭐ 6. Direct In-App GitHub Starring
- **Authenticated Starring**: Star or unstar any repository directly within the application with live counter updates and visual pulse animations.

### 🔒 7. Vault Bookmarks & GitHub Gist Cloud Sync
- **Local Vault Storage**: Instant local-first bookmarking stored securely on your machine.
- **Encrypted Gist Cloud Sync**: Back up and restore your bookmarks across multiple workstations using a private, secure GitHub Gist (`onegitvault-bookmarks.json`).
- **Vault-Only Filter**: Single-click toolbar toggle to isolate and browse only your bookmarked repositories.

### 🗂️ 8. Curated Technology Sectors & Granular Multi-Filtering
- **Curated Technology Sectors**: Instant filtering across **AI & Machine Learning**, **Web & Frameworks**, **Cloud & DevOps**, **Developer Tools**, **Databases & Storage**, **Mobile & Desktop**, **Security & Privacy**, **Android APK Releases**, and **Videography & Media Tools**.
- **Multi-Sort Engine**: Sort repositories live by **Most Stars**, **Most Forks**, or **Recently Updated**.
- **Dynamic Star Thresholds**: Filter from `All (0+)` stars up to preset tiers (`10k+`, `50k+`, `100k+`) or any custom threshold (`500`, `2,500`, `25,000+`).

### ⚡ 9. Rate Limit Quota Manager & Zero-Downtime Offline Fallback
- **Decoupled Quota Tracking**: Independent real-time tracking for Core (5,000 req/hr with token) and Search (30 req/min) GitHub API limits.
- **Curated Offline Vault**: Zero-downtime offline fallback providing curated project sets when network connectivity is lost or rate limits are reached.

### 🌐 10. Persistent Regional Time & Geo-Location Footer
- **Real-Time Clock**: 12-hour ticking digital clock in the persistent bottom footer.
- **Automatic Geo/Country Detection**: Displays your country and GMT offset (e.g. `🌐 India (GMT+5:30)`).

### 🔄 11. Automated Silent Background Updates
- **GitHub Release Monitoring**: Periodically checks for new releases on GitHub.
- **Silent Background Updates**: Downloads and applies updates silently in the background, automatically restarting the app with zero manual wizard steps.

---

## 🏗️ Architecture & Technology Stack

OneGitVault is engineered as a unified dual-platform ecosystem: an ultra-responsive native **Android Mobile Companion** paired with a heavy-duty **Windows Desktop Workstation Observatory**.

```
OneGitVault/
├── android/                 # Android Native Companion (Capacitor 6 + React + TypeScript + Java 17)
│   ├── android/app/src/     # Android Native Shell
│   │   ├── java/.../app/    # MainActivity, TrendingWidgetProvider, VaultReleaseWidgetProvider, VaultReleaseWorker
│   │   └── res/layout/      # Native Widget XML RemoteViews Layouts & Drawables
│   └── src/                 # Mobile Touch Components
│       ├── components/      # ReelCard, ReelsView (Spotlight), VaultView (Living Dashboard), RepoDetailSheet
│       ├── services/        # bookmarkStore (Radar & Notes), visualCardGenerator, widgetSync
│       └── utils/           # haptics, sanitizeMarkdown, shareHelper
├── assets/                  # Multi-resolution icons (.ico, .png, vector xml)
├── electron/                # Desktop Shell (IPC, Window Lifecycle, Silent Updater)
│   ├── main.js              # Main Process: Window lifecycle, native menu, shell IPC, silent updater
│   └── preload.js           # Preload Bridge: Context-isolated electronAPI bridge
├── src/                     # Desktop React + Tailwind Architecture
│   ├── components/          # TitleBar, CategoryNav, FilterBar, ProjectCard, TrendingModal, BookmarksModal
│   ├── hooks/               # useRepositories, useBookmarks, useGitHubStars
│   └── services/            # githubApi, rateLimit, gistSync, updateService
└── SETUP_ANDROID.md         # Comprehensive Android Build & Run Guide
```

### 🖥️ Desktop Application Tech Stack (Windows)
- **Runtime & Desktop Shell**: **Electron 31** (Node.js 20 LTS + Chromium)
- **Frontend Architecture**: **React 18** with **TypeScript 5**
- **Styling & Design System**: **Tailwind CSS 3** with custom GitHub Dark / Light high-contrast tokens
- **Build System & Bundler**: **Vite 5** (Lightning-fast HMR and tree-shaken production bundles)
- **Process & IPC Architecture**:
  - **Main Process (`electron/main.js`)**: Manages BrowserWindow lifecycle, hardware acceleration flags, secure deep linking, and silent automated background updates via GitHub Releases API.
  - **Context-Isolated Preload Bridge (`electron/preload.js`)**: Exposes a zero-leak, type-safe `window.electronAPI` interface with `contextIsolation: true` and `nodeIntegration: false`.
  - **Renderer Process (`src/`)**: Virtualized live repository streaming, non-blocking DOMPurify sanitized GitHub Flavored Markdown (GFM) reader, and dynamic API rate-limit quota managers.
- **Packaging & Distribution**: **electron-builder** with **Inno Setup 6** (Generates production `.exe` installer with `/VERYSILENT` automated background upgrade support).

### 📱 Android Mobile Tech Stack (Mobile Companion)
- **Native Runtime Bridge**: **Capacitor 6** with **Java 17** / **Gradle 8.2**
- **Frontend Architecture**: **React 18** with **TypeScript 5**
- **UI Components & Touch Engine**: **Material UI 5 (Emotion)** + **Tailwind CSS** + Custom CSS Snap-Scroll Engine
- **Visual Card Export Engine**: Headless **`html2canvas`** off-screen DOM cloning engine rendering zero-blink `#000000` pure OLED cards
- **Android Native Services**:
  - **Home Screen Widgets**: `AppWidgetProvider` (`TrendingWidgetProvider` 4×2 trending feed & `VaultReleaseWidgetProvider` release tracker)
  - **Background WorkManager**: `VaultReleaseWorker` periodic background tasks scanning bookmarked repositories for release updates
  - **Native Device Features**: `@capacitor/haptics` (micro-vibrations), `@capacitor/share`, `@capacitor/filesystem`, and custom `AndroidThemeBridge` status bar integration

---

## 🚀 Quick Setup & Installation

### Option 1: Android Native APK (Recommended for Mobile)
1. Download **`OneGitVault-Android-2.0.0.apk`** from [GitHub Releases](https://github.com/VKaddala/OneGitVault/releases/tag/v2.0.0).
2. Install the `.apk` on any device running **Android 8.0 or higher**.
3. Add the **Trending Repo** or **Vault Release Tracker** widget to your home screen!

### Option 2: Windows Installer (Recommended for Desktop)
1. Download **`OneGitVault-Setup-2.3.0.exe`** from [GitHub Releases](https://github.com/VKaddala/OneGitVault/releases/tag/v2.3.0).
2. Run the setup wizard to install with automatic desktop shortcuts.

### Option 3: Run from Source (Development)
```bash
# Clone the repository
git clone https://github.com/VKaddala/OneGitVault.git
cd OneGitVault

# Install Desktop Dependencies
npm install

# Start Desktop App (Electron + Vite)
npm start

# Build & Run Android Companion
cd android
npm install
npm run build
npx cap copy android
# Open in Android Studio or run directly:
npx cap run android
```

---

## 🔑 GitHub Personal Access Token (Optional)

OneGitVault functions out-of-the-box with unauthenticated public API access (60 requests/hr). To unlock **5,000 requests/hour**, direct **Starring**, and **Cloud Gist Sync**:

1. Generate a [GitHub Personal Access Token (Classic)](https://github.com/settings/tokens/new?description=OneGitVault&scopes=public_repo,gist) with `public_repo` and `gist` scopes.
2. In OneGitVault, tap the **Key / Token** icon in the header or drawer.
3. Paste your token and save. Your token is stored securely in encrypted local storage and communicated strictly with official `api.github.com` endpoints.

---

## 📜 License
Copyright (c) 2026 VKaddala.

This project is licensed under the **PolyForm Noncommercial License 1.0.0** — see the [LICENSE](LICENSE) file for details.

- ✅ **Allowed**: Viewing the source code, opening issues/discussions, and using or modifying the code for personal, educational, or non-commercial purposes.
- ❌ **Not Allowed**: Commercial use, monetization, or publishing compiled builds/clones on the Google Play Store or other app stores without explicit written permission from the author.

Designed and engineered with passion for open source by [VKaddala](https://github.com/VKaddala).
