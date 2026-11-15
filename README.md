# OneGitVault

<p align="center">
  <img src="assets/icons/onegitvault.png" alt="OneGitVault Logo" width="96" height="96" />
</p>

<p align="center">
  <strong>Fast, Standalone Open-Source Repository Observatory & Vault for Windows</strong>
</p>

<p align="center">
  <a href="https://github.com/VKaddala/OneGitVault"><img src="https://img.shields.io/badge/platform-Windows-blue?logo=windows&logoColor=white" alt="Windows" /></a>
  <a href="https://github.com/VKaddala/OneGitVault/releases"><img src="https://img.shields.io/badge/version-2.0.0-emerald?logo=github" alt="Version 2.0.0" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-18.3-149eca?logo=react&logoColor=white" alt="React 18" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.6-3178c6?logo=typescript&logoColor=white" alt="TypeScript 5" /></a>
  <a href="https://www.electronjs.org/"><img src="https://img.shields.io/badge/Electron-33-47848f?logo=electron&logoColor=white" alt="Electron 33" /></a>
  <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-5.4-646cff?logo=vite&logoColor=white" alt="Vite" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/VKaddala/OneGitVault" alt="License" /></a>
</p>

---

## 📖 Overview

**OneGitVault** is an open-source Windows desktop application designed to explore, stream, inspect, and bookmark open-source GitHub repositories. 

Engineered with **React 18**, **TypeScript**, **Tailwind CSS**, and **Electron 33**, OneGitVault combines real-time repository streaming, a high-density 4-column responsive grid, in-app trending discovery, instantaneous markdown documentation rendering, binary asset downloading, and cross-device cloud synchronization into a distraction-free environment.

---

## ✨ Core Features

### 📐 1. Responsive 4-Column Grid & Compact Cards
- **High-Density Desktop Canvas**: Expands across widescreen displays (`max-w-[1720px]`) eliminating dead gutters and delivering 4 responsive columns (`xl:grid-cols-4 2xl:grid-cols-4`).
- **Feature-Packed Compact Cards**: Sleek and modern tiles that preserve 100% of repository functionality:
  - **One-Click Clone Copy**: Copies `git clone <url>.git` to clipboard with animated visual checkmark confirmation.
  - **Vault Bookmark**: Instantly toggle local bookmark status with live counter increments.
  - **Interactive Topic Chips**: Filter by tagged technologies with a single click.
  - **Language & License Telemetry**: Accurate color-coded language dot, license type (`MIT`, `Apache-2.0`, `GPLv3`), and calendar update timestamps.
  - **Star & Fork Metrics**: Real-time popularity counters with formatted numbers (`14.2k`, `1.5M`).

### 🔥 2. In-App GitHub Trending Explorer
- **Zero-Redirection Discovery**: Inspect global trending open-source projects without leaving the desktop app or switching to external browser tabs.
- **Multiple Time Horizons**: Filter trending projects across **Daily**, **Weekly**, and **Monthly** timeframes.
- **Deep README Inspection**: Click any trending repository to immediately preview its live documentation and release assets.

### 🪟 3. Unified Frameless Window Header & Flyout Search
- **Integrated Window TitleBar**: Consolidates native window management (minimize, maximize/restore, close), branding, live API quota badge, trending launcher, vault bookmarks, and theme selector into an ultra-slim top bar.
- **Full-Width Search Flyout**: Triggered with `Ctrl+K` / `Cmd+K` or search icon click, providing a spacious input field with quick-filter topic tags and instant `Esc` dismissal.
- **Mobile & Narrow-Screen Resilient**: Flex layout dynamically accommodates resizing down to 500px without horizontal truncation.

### 🎨 4. Modular Theme Plugin Architecture
- **5 High-Contrast Ergonomic Themes**:
  1. **Prometheus Dark**: Deep cinematic petrol teal (`#0c1519` / `#16272f`) with vermilion flame accents (`#e64833`).
  2. **Sand & Ivory Light**: Warm biscuit sand canvas (`#FBE9D0`) with crisp ivory containers (`#FFF9F0`) and terracotta highlights.
  3. **Ambient Twilight**: Midnight slate (`#0a0e14` / `#161e2b`) with calming sky-cyan accents (`#38bdf8`) for zero eye strain.
  4. **GitHub Simple Light**: Crisp white elevated cards with dark typography and signature GitHub blue accents (`#0969da`).
  5. **GitHub Simple Dark**: Classic slate canvas (`#0d1117`) with elevated containers (`#1c2128`) and gold star badges (`#e3b341`).
- **Permanent Theme Palette Selector**: Consistent palette trigger icon and elevated popover featuring dual live preview swatches.

### 📑 5. README & Release Inspector
- **Markdown Documentation Viewer**: Renders GitHub Flavored Markdown (GFM) with syntax highlighting, tables, callout blocks, and secure sanitized links.
- **Release Asset Downloader**: Inspect release tags, changelog notes, and download executable assets (`.exe`, `.zip`, `.tar.gz`) directly to your system.

### 🔒 6. Vault Bookmarks & GitHub Gist Cloud Sync
- **Local Vault Storage**: Instant bookmarking stored securely via `localStorage`.
- **Cloud Backup & Restore**: Sync your vault across different computers using a private GitHub Gist (`onegitvault-bookmarks.json`).

### 🌐 7. Persistent Location & Live Clock Footer
- **Regional Time & Zone**: Real-time 12-hour ticking digital clock in the persistent bottom footer.
- **Country Identification**: Automatically detects and displays your country and GMT offset (e.g. `🌐 India (GMT+5:30)`).

### ⭐ 8. Custom Stars Filter Portal
- **Granular Thresholds**: Filter from `All (0+)` stars up to any custom number (`500`, `2,500`, `25,000+`).
- **Body-Portaled Popover**: Portaled to document root to ensure perfect layering above cards and scroll areas.

### ⚡ 9. Rate Limit Quota Manager & Offline Resilience
- **Real-Time Quota Tracking**: Visual meter displaying remaining GitHub API calls (60/hr unauthenticated, 5,000/hr authenticated).
- **Curated Offline Vault**: Zero-downtime offline fallback providing curated project sets when network connectivity is lost or rate limits are reached.

### 🔄 10. Background Update Checker
- **Automated GitHub Release Monitoring**: Periodically checks `VKaddala/OneGitVault` releases for new versions.
- **One-Click Upgrades**: Displays release notes and provides direct installer downloads.

---

## 🏗️ Architecture & Technology Stack

```
OneGitVault/
├── assets/                  # Application icons (.ico, .png)
├── electron/
│   ├── main.cjs             # Electron main process (IPC, window lifecycle, shell integration)
│   └── preload.js           # Secure context-isolated bridge (electronAPI)
├── src/
│   ├── components/          # Modular React components
│   │   ├── TitleBar.tsx     # Frameless window controls, search flyout, header utilities
│   │   ├── CategoryNav.tsx  # Horizontal technology category navigation
│   │   ├── FilterBar.tsx    # Sorting, language filter, stars custom portal, view toggles
│   │   ├── ProjectCard.tsx  # Compact 4-column responsive repository tile
│   │   ├── TrendingModal.tsx# In-app GitHub trending explorer (Daily/Weekly/Monthly)
│   │   ├── RepoDetailPanel.tsx # Centered README & release binary inspector
│   │   ├── BookmarksModal.tsx  # Vault manager with Gist push/pull synchronization
│   │   ├── TokenModal.tsx   # Personal access token management
│   │   └── UpdateModal.tsx  # App release update prompt & changelog viewer
│   ├── hooks/               # Domain hooks (useRepositories, useBookmarks)
│   ├── services/            # Pure services (githubApi, rateLimit, storage, updateService)
│   ├── themes/              # Modular ThemePlugin registry (5 themes)
│   └── types/               # TypeScript domain contracts
├── OneGitVault.iss          # Inno Setup Windows installer compiler script
└── build-installer.bat      # Automated build & packaging script
```

---

## 🚀 Getting Started

### Option 1: Standalone Windows Installer (Recommended)

1. Download **`OneGitVault-Setup-2.0.0.exe`** from [GitHub Releases](https://github.com/VKaddala/OneGitVault/releases).
2. Run the installer. It automatically detects and upgrades any previous installation without orphan files.
3. Launch **OneGitVault** from your Desktop or Start Menu.

### Option 2: Precompiled Portable Executable

Run the standalone executable directly without installation:
```
release\OneGitVault-win32-x64\OneGitVault.exe
```

### Option 3: Run from Source (Development)

**Prerequisites**: [Node.js](https://nodejs.org/) v18+ and `npm`.

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

OneGitVault functions out-of-the-box with unauthenticated public GitHub API access (60 requests/hour). To unlock **5,000 requests/hour** and **Cross-Device Gist Sync**:

1. Generate a [GitHub Personal Access Token (Classic)](https://github.com/settings/tokens/new?description=OneGitVault&scopes=public_repo,gist) with:
   - `public_repo` (Repository search and inspection)
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

## 📜 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
