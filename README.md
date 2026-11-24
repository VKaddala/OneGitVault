# OneGitVault

<p align="center">
  <img src="assets/icons/onegitvault.png" alt="OneGitVault Logo" width="96" height="96" />
</p>

<p align="center">
  <strong>Fast, Standalone Open-Source Repository Observatory & Vault for Windows & Android</strong>
</p>

<p align="center">
  <a href="https://github.com/VKaddala/OneGitVault"><img src="https://img.shields.io/badge/platform-Windows-blue?logo=windows&logoColor=white" alt="Windows" /></a>
  <a href="SETUP_ANDROID.md"><img src="https://img.shields.io/badge/platform-Android-3DDC84?logo=android&logoColor=white" alt="Android" /></a>
  <a href="https://github.com/VKaddala/OneGitVault/releases/latest"><img src="https://img.shields.io/badge/desktop-v2.3.0-blue?logo=github" alt="Desktop v2.3.0" /></a>
  <a href="https://github.com/VKaddala/OneGitVault/releases/latest"><img src="https://img.shields.io/badge/android-v1.2.0-3DDC84?logo=android" alt="Android v1.2.0" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-blue?logo=react&logoColor=white" alt="React" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-blue?logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://www.electronjs.org/"><img src="https://img.shields.io/badge/Electron-teal?logo=electron&logoColor=white" alt="Electron" /></a>
  <a href="https://capacitorjs.com/"><img src="https://img.shields.io/badge/Capacitor-119EFF?logo=capacitor&logoColor=white" alt="Capacitor" /></a>
  <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-purple?logo=vite&logoColor=white" alt="Vite" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/VKaddala/OneGitVault" alt="License" /></a>
</p>

---

### 📥 Official Downloads & Releases

| Platform | Latest Release | Binary | Direct Download |
| :--- | :--- | :--- | :--- |
| **Windows Desktop** | **v2.3.0** | `OneGitVault-Setup-2.3.0.exe` (~98 MB) | [Download Setup (.exe)](https://github.com/VKaddala/OneGitVault/releases/download/v2.3.0/OneGitVault-Setup-2.3.0.exe) |
| **Android** | **v1.2.0** | `OneGitVault-Android-1.2.0.apk` (~3.5 MB) | [Download APK (.apk)](https://github.com/VKaddala/OneGitVault/releases/download/v2.3.0/OneGitVault-Android-1.2.0.apk) |

---

## 📖 Overview

**OneGitVault** is a standalone native Windows desktop application and modern open-source observatory for discovering, inspecting, bookmarking, and synchronizing high-impact repositories from GitHub.

Built with **React**, **TypeScript**, **Tailwind CSS**, and **Electron**, OneGitVault eliminates browser tab clutter by packing real-time repository streaming, in-app GitHub trending discovery, instant markdown documentation rendering, release binary downloading, and cross-device cloud synchronization into a distraction-free native desktop environment.

Alongside the Windows desktop app, **OneGitVault for Android** brings the full observatory experience to mobile devices. Built with **Capacitor**, **React**, and **TypeScript**, the Android companion features an immersive edge-to-edge transparent system bar architecture, automatic dark/light status bar contrast adaptation, 120Hz smooth scrolling, cloud Gist bookmarks sync, a GitHub Starred repositories browser, translucent search flyout, on-demand README translation into English, and native Android share sheet integration.

---

## ✨ Features

### 🚀 1. Real-Time Repository Streaming & Discovery
- **Streamlined Discovery**: Search and stream through hundreds of millions of open-source projects across GitHub with infinite auto-streaming and zero pagination friction.
- **Instant `git clone` Copy**: Single-click clone URL copy with animated visual checkmark feedback.
- **One-Click Vault Bookmark**: Bookmark favorite repositories with live counter badge updates.
- **Interactive Topic Pills**: Direct-filter tags with a single click.
- **Telemetry & Language Badges**: Official color-coded language dot, license badge (`MIT`, `Apache-2.0`, `GPLv3`), and calendar update timestamps.
- **Star & Fork Badges**: Real-time metrics formatted compactly (`14.2k`, `1.5M`).

### 🔥 2. In-App GitHub Trending Explorer & Back Navigation
- **Native In-App Modal**: Explore GitHub's trending open-source projects without leaving the desktop app or switching to an external browser tab.
- **Time Ranges**: Toggle instantly between **Daily**, **Weekly**, and **Monthly** trending repositories across the global ecosystem.
- **Deep README Inspection & Seamless Back Navigation**: Click any trending repository to immediately preview its live documentation and release assets. Includes a dedicated back button (and `Esc` support) that takes you straight back to your exact trending list, preserving your selected time period and language filter without re-fetching lag.

### 🔍 3. Full-Width Search Flyout
- **Instant Access**: Press `Ctrl+K` / `Cmd+K` or click the search bar to reveal a quick-filter topic tag flyout with instant `Esc` dismissal.
- **Global Search**: Search across keywords, topics, and repository metadata across all of GitHub.

### 📑 4. Markdown Documentation & README Inspector
- **Markdown Documentation Viewer**: Renders GitHub Flavored Markdown (GFM) with syntax highlighting, tables, callout blocks, and directory trees.
- **DOMPurify Security Sanitization**: Every README is strictly sanitized through DOMPurify to neutralize script injection and malicious payloads in external repositories.
- **Quick Action Bar**: Quick buttons to copy `git clone`, download repository ZIP, open project homepage, or view directly on GitHub.

### 📦 5. Official Release Binaries Downloader
- **Direct Asset Inspection**: Dedicated inspector tab to browse official GitHub release tags and read release notes.
- **One-Click Downloads**: Download executable binaries and release archives (`.exe`, `.zip`, `.tar.gz`) directly to your machine.

### ⭐ 6. Direct In-App GitHub Starring
- **Direct Starring**: Authenticated users can star or unstar any repository directly within the application with live counter feedback and visual pulse animations.

### 🔒 7. Vault Bookmarks & GitHub Gist Cloud Sync
- **Local Vault Storage**: Instant bookmarking stored securely on your local device.
- **Cloud Backup & Restore**: Sync your vault across different computers using a private GitHub Gist (`onegitvault-bookmarks.json`).
- **Vault-Only Filter**: Single-click toggle in the toolbar to isolate and browse only your bookmarked repositories.

### 🗂️ 8. Curated Technology Sectors & Sorting
- **Curated Technology Sectors**: Instant filtering across **AI & Machine Learning**, **Web & Frameworks**, **Cloud & DevOps**, **Developer Tools**, **Databases & Storage**, **Mobile & Desktop**, **Security & Privacy**, **Android & APK Releases** (standalone Android applications and direct APK packages), and **Videography & Media Tools** (video editors, ffmpeg tools, encoders, screen recorders, and streaming engines).
- **Multi-Sort Engine**: Sort live by **Most Stars**, **Most Forks**, or **Recently Updated**.
- **Dynamic Language Filtering**: Live language filter dynamically populated from loaded repositories.
- **Granular Star Filters**: Filter from `All (0+)` stars up to preset tiers (`10k+`, `50k+`, `100k+`) or any custom threshold (`500`, `2,500`, `25,000+`).

### ⚡ 9. Rate Limit Quota Manager & Zero-Downtime Offline Fallback
- **Decoupled Quota Tracking**: Independent real-time tracking for Core (5,000 req/hr) and Search (30 req/min) GitHub API limits.
- **Curated Offline Vault**: Zero-downtime offline fallback providing curated project sets when network connectivity is lost or rate limits are reached.
- **Visual Refresh Feedback**: Animated indicator confirming live network fetch and quota refresh.

### 🌐 10. Persistent Regional Time & Geo-Location Footer
- **Regional Time & Zone**: Real-time 12-hour ticking digital clock in the persistent bottom footer.
- **Automatic Geo/Country Detection**: Detects and displays the user's country and GMT offset (e.g. `🌐 India (GMT+5:30)`).

### 🔄 11. Automated Silent Background Updates
- **GitHub Release Monitoring**: Periodically checks for new releases on GitHub.
- **Silent Background Updates**: Downloads and applies updates silently in the background, automatically restarting the app with zero manual wizard steps.

### 📱 12. OneGitVault for Android (Mobile Companion)
- **Edge-to-Edge Native Shell**: Complete under-the-bars immersion with transparent status and navigation bars.
- **Hardware-Accelerated Status Bar Theme Bridge**: Native `AndroidThemeBridge` dynamically synchronizes system icon luminance (`WindowInsetsControllerCompat`) on AMOLED dark and light themes without lag or battery drain.
- **Dual Vault Architecture & Batch Operations**: Easily switch between your locally saved Vault Bookmarks (with automatic private GitHub Gist sync) and your GitHub Starred repositories. Supports multi-selection mode to select multiple or all bookmarks and batch unbookmark them in a single tap.
- **Smart Notification Badge Clearing**: Vault badge count automatically clears as soon as you visit the Vault tab, keeping your bottom navigation clean and distraction-free.
- **Zero-Latency Tab Navigation**: Decoupled view rendering with zero-re-fetch caching across APKs, Trending, Vault, and Explore, completely eliminating tab-switching lag.
- **Translucent Search Flyout**: WhatsApp and Instagram-style frosted glass search drawer featuring instant category pills, live repository streaming, and persistent search history.
- **On-Demand README Translation**: Instant English translation of foreign documentation while safeguarding markdown syntax, code blocks, images, and badges.
- **Internal Heading & Link Navigation**: Seamlessly navigate inside repository READMEs with smooth scrolling to heading anchors (`#overview`, `#installation`) and automatic resolution of relative documentation files.
- **Native Android Share Sheet**: One-click sharing directly to native Android messaging and developer apps via `ACTION_SEND`.
- **Ultra-Smooth 120Hz Scrolling & Vector Branding**: Zero-lag list virtualization, frame-throttled scroll listeners, and crisp infinite-resolution vector launch icons on all screen densities.

---

## 🏗️ Architecture & Technology Stack

```
OneGitVault/
├── android/                 # Android Native Mobile Application (Capacitor + Vite + React)
│   ├── android/             # Android Studio / Gradle wrapper project (Java 17, SDK 34)
│   │   └── app/src/main/    # AndroidManifest.xml, MainActivity.java (AndroidThemeBridge)
│   └── src/                 # Mobile touch components, BottomNav, SearchFlyout, Gist sync
├── assets/                  # Multi-resolution application icons (.ico, .png)
├── electron/
│   ├── main.cjs             # Electron main process (IPC, window lifecycle, shell integration, silent updater)
│   └── preload.cjs          # Secure context-isolated bridge (electronAPI)
├── src/
│   ├── components/          # Desktop React components
│   │   ├── TitleBar.tsx     # Window header, search flyout, and header controls
│   │   ├── CategoryNav.tsx  # Technology sector navigation
│   │   ├── FilterBar.tsx    # Sorting, language filter, star thresholds, view toggles
│   │   ├── ProjectCard.tsx  # Interactive repository tile
│   │   ├── TrendingModal.tsx# In-app GitHub trending explorer (Daily/Weekly/Monthly)
│   │   ├── RepoDetailPanel.tsx # Markdown README & release binary inspector
│   │   ├── BookmarksModal.tsx  # Vault manager with Gist push/pull synchronization
│   │   ├── TokenModal.tsx   # Personal access token management
│   │   └── UpdateModal.tsx  # App release update prompt & changelog viewer
│   ├── hooks/               # Domain hooks (useRepositories, useBookmarks, useGitHubStars)
│   ├── services/            # Pure services (githubApi, rateLimit, storage, updateService, gistSync)
│   ├── themes/              # Modular theme registry
│   └── types/               # TypeScript domain contracts
├── OneGitVault.iss          # Inno Setup Windows installer compiler script
├── build-installer.bat      # Automated build & packaging script
└── SETUP_ANDROID.md         # Detailed Android setup, build, and run instructions
```

---

## 🚀 Getting Started

### Option 1: Standalone Windows Installer (Recommended for Windows)

1. Download the latest installer from [GitHub Releases](https://github.com/VKaddala/OneGitVault/releases/latest).
2. Run the installer. It automatically detects and cleanly upgrades any previous installation without orphan files.
3. Launch **OneGitVault** from your Desktop or Start Menu.

### Option 2: Android Native APK Installation (Recommended for Android)

1. Download the latest **`OneGitVault-Android-1.2.0.apk`** from [GitHub Releases](https://github.com/VKaddala/OneGitVault/releases/latest).
2. Open the `.apk` file on your Android device (Android 8.0+) and confirm installation.
3. For building from source with Node.js, JDK 17, and Gradle, see the comprehensive [Android Setup Guide](SETUP_ANDROID.md).

### Option 3: Precompiled Portable Windows Executable

Run the standalone executable directly without installation:
```
release\OneGitVault-win32-x64\OneGitVault.exe
```

### Option 4: Run Windows App from Source (Development)

**Prerequisites**: [Node.js](https://nodejs.org/) LTS and `npm`.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/VKaddala/OneGitVault.git
   cd OneGitVault
   ```

2. **Install dependencies**:
   ```bash
   npm.cmd install
   ```

3. **Start in Desktop Mode (Electron + Vite)**:
   ```bash
   npm.cmd start
   ```

4. **Start in Web Browser Mode**:
   ```bash
   npm.cmd run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 🔑 GitHub API Token & Gist Sync Setup

OneGitVault functions out-of-the-box with unauthenticated public GitHub API access (60 requests/hour). To unlock **5,000 requests/hour**, direct **Starring**, and **Cross-Device Gist Sync**:

1. Generate a [GitHub Personal Access Token (Classic)](https://github.com/settings/tokens/new?description=OneGitVault&scopes=public_repo,gist) with:
   - `public_repo` (Repository starring, search, and inspection)
   - `gist` (Cloud bookmark backup and restore)
2. In OneGitVault, click the **Key / Quota badge** in the header.
3. Paste your token and click **Save Token**.
4. Open the **Vault** drawer to **Push** (backup) or **Pull** (restore) your bookmarks at any time.

> *Note: Tokens are saved strictly in local browser storage (`localStorage`) and communicated directly to official `api.github.com` endpoints.*

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + K` / `Cmd + K` | Open / Close Search Flyout |
| `Escape` | Dismiss Open Modals, Popovers, or Search Flyout |
| `Ctrl + R` | Refresh Current Repository Stream |
| `Double Click TitleBar` | Maximize / Restore Window |

---

## 🛠️ Build & Release Commands

| Command | Description |
|---|---|
| `npm.cmd run build` | Compiles TypeScript and builds production web assets via Vite |
| `npm.cmd run desktop` | Starts Vite dev server and launches Electron desktop shell |
| `npm.cmd run package` | Packages standalone Electron binary into `release/OneGitVault-win32-x64/` |
| `node scripts/publish-release.cjs` | Automatically uploads installer binary to GitHub Releases with changelog |

---

## 🖼️ Application Gallery & Screenshots

### 1. Repository Dashboard & Discovery
<img width="3717" height="2157" alt="image" src="https://github.com/user-attachments/assets/42fadde8-0da2-43bc-b1a9-4e52903bc2c6" />
---

### 2. Android View

| <img width="400" height="1000" alt="Screenshot_20261124_204619" src="https://github.com/user-attachments/assets/4519d42d-8e0b-46ad-b1f3-9925b5733a4f" /> | <img width="400" height="1000" alt="Screenshot_20261124_204625" src="https://github.com/user-attachments/assets/03512e88-bb3f-492e-8851-af82b76b445e" /> |

---

## 📜 License

Distributed under the **GPL-3.0 License**. Designed and developed by [VKaddala](https://github.com/VKaddala).
