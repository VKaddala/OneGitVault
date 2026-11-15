# OneGitVault

[![Windows](https://img.shields.io/badge/platform-Windows-blue?logo=windows&logoColor=white)](https://github.com/VKaddala/OneGitVault)
[![React](https://img.shields.io/badge/React-18-149eca?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-33-47848f?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Version](https://img.shields.io/badge/version-1.0.3-informational)](package.json)
[![GitHub stars](https://img.shields.io/github/stars/VKaddala/OneGitVault)](https://github.com/VKaddala/OneGitVault/stargazers)
[![License](https://img.shields.io/github/license/VKaddala/OneGitVault)](LICENSE)

**OneGitVault** is a standalone native Windows desktop application and modern open-source observatory for discovering, inspecting, bookmarking, and synchronizing high-impact repositories from GitHub.

Featuring three curated themes (**Dark**, **Light**, and **Ambient** twilight slate), a centered README modal inspector with direct **GitHub Releases binary downloader**, and cross-device GitHub Gist bookmark synchronization.

---

## ✨ Features

- **Centered README & Releases Inspector**: Click any repository tile to open a centered modal inspector.
  - **README View**: Renders GitHub Flavored Markdown (code blocks, directory trees, tables, links, images) with a quick action footer to **Copy `git clone`**, **Download ZIP**, open the **Homepage**, or launch on **GitHub**. All external links open securely in your default browser.
  - **Releases Downloader**: If the repository publishes releases, view recent release tags, dates, changelogs, and directly download release assets (`.exe`, `.zip`, `.tar.gz`, `.deb`, etc.) with file sizes and download counts.
- **Three Ergonomic Themes**: Toggle seamlessly between **Dark** (Warm Charcoal & Honey Amber), **Light** (Sand & Ivory), and **Ambient** (Twilight Slate with zero eye glare and sky cyan accents). All modals, repository cards, and README styling dynamically adapt.
- **Live Search & Streaming**: Infinite pagination streaming repository batches directly from GitHub's REST API, with an Auto-Stream toggle and manual page loading.
- **7 Curated Technology Sectors**: Instant filtering across AI & Machine Learning, Web & Frameworks, Cloud & DevOps, Developer Tools, Databases, Mobile & Cross-platform, and Cybersecurity.
- **Precision Multi-Filter Engine**: Filter live by language (TypeScript, Rust, Python, Go, C++, etc.) and minimum star thresholds (`10k+`, `50k+`, `100k+`), with star, fork, and update-time sorting.
- **Repository Vault with GitHub Gist Cloud Sync**:
  - Save your favorite repositories locally in an organized bookmark drawer.
  - When a GitHub Personal Access Token is connected, use **Push** and **Pull** to sync and back up bookmarks to your personal GitHub account as a private Gist (`onegitvault-bookmarks.json`) across machines.
- **Rate Limit Tracker & Offline Resilience**: Built-in quota monitor for GitHub API limits (60/hr unauthenticated, 5,000/hr with token) and an offline fallback vault of 30+ curated projects.
- **Bespoke Application Icon**: Custom amber vault insignia embedded into the Windows `.exe`, installer wizard, title bar, desktop shortcut, and browser favicon.

---

## ⚡ Quick Launch

### 1. Standalone Installer (Recommended)

1. Download **`OneGitVault-Setup-1.0.3.exe`** from `release/setup/` (or [GitHub Releases](https://github.com/VKaddala/OneGitVault/releases)).
2. Double-click the installer and follow the setup wizard.
3. Automatically creates Start Menu and Desktop shortcuts with the custom OneGitVault icon and installs an uninstaller in Windows *Add or remove programs*.

### 2. Portable Directory

You can also run the precompiled standalone executable directly from:
```
release\OneGitVault-win32-x64\OneGitVault.exe
```
> *Keep the complete directory intact so accompanying Electron runtimes and libraries remain accessible.*

### 3. Run from Source (Development)

Prerequisites: **Node.js 18+** and **npm**.

```powershell
git clone https://github.com/VKaddala/OneGitVault.git
cd OneGitVault
npm install
npm start
```

- `npm start` launches the Vite development server and opens the native Electron desktop application with Hot Module Replacement (HMR).
- `npm run dev` starts the browser-only development server at `http://localhost:5173`.

---

## 🔑 GitHub Token & Gist Sync Setup

OneGitVault functions out-of-the-box without authentication. To unlock **5,000 requests/hour** and **Bookmark Gist Synchronization**:

1. Generate a [GitHub Personal Access Token](https://github.com/settings/tokens/new?description=OneGitVault&scopes=public_repo,gist) with:
   - `public_repo` (read-only search)
   - `gist` (for bookmark cloud backup and restore)
2. In OneGitVault, click the **Key / Quota badge** in the header.
3. Paste your token and click **Save Token**.
4. Open the **Vault** icon in the header to use **Push** (backup) and **Pull** (restore) synchronization.

> *Your token is strictly stored on your local machine (`localStorage`) and is only transmitted directly to official `api.github.com` endpoints.*

---

## 🛠️ Building & Packaging

### Compile Web Assets
```powershell
npm run build
```
Type-checks TypeScript and compiles production assets into `dist/`.

### Package Portable Windows App
```powershell
npm run package
```
Packages the complete standalone Windows directory with the custom icon into `release/OneGitVault-win32-x64/`.

### Compile Windows Single-File Setup Installer
Install [Inno Setup 6](https://jrsoftware.org/isdl.php), then run:
```powershell
.\build-installer.bat
```
Produces `release\setup\OneGitVault-Setup-1.0.0.exe` (~84 MB).

---

## 📜 NPM Scripts Reference

| Command | Description |
|---|---|
| `npm start` | Start Vite dev server + launch native Electron window (HMR) |
| `npm run dev` | Run Vite development server in web mode (`localhost:5173`) |
| `npm run build` | Type-check TypeScript and build production bundle into `dist/` |
| `npm run package` | Compile portable standalone Windows app with embedded icon |
| `npm run installer:dir` | Package Electron application folder via electron-builder |
| `build-installer.bat` | End-to-end build producing `OneGitVault-Setup-1.0.0.exe` |

---

## 📁 Project Structure

```text
OneGitVault/
├── assets/
│   └── icons/
│       ├── onegitvault.ico          # Multi-resolution Windows app icon (16-256px)
│       └── onegitvault.png          # High-resolution PNG logo
├── electron/
│   ├── main.cjs                     # Electron main process, window config, external links
│   └── preload.cjs                  # Context bridge script
├── scripts/
│   └── start-electron.cjs           # Dev orchestrator starting Vite & Electron
├── src/
│   ├── components/
│   │   ├── BookmarksModal.tsx       # Saved repository vault & Gist sync interface
│   │   ├── CategoryNav.tsx          # Technology sector tabs
│   │   ├── FilterBar.tsx            # Language selector, star thresholds, sort modes
│   │   ├── Header.tsx               # Brand, search bar, theme toggle, and vault button
│   │   ├── Hero.tsx                 # Observatory metrics and popular topic chips
│   │   ├── OneGitVaultLogo.tsx      # SVG amber vault insignia
│   │   ├── ProjectCard.tsx          # Repository card with click-to-inspect trigger
│   │   ├── RepoDetailPanel.tsx      # Slide-in README inspector & download/clone footer
│   │   └── TokenModal.tsx           # GitHub PAT management & quota monitor
│   ├── data/
│   │   └── curatedProjects.ts       # Curated repository collections & language palettes
│   ├── services/
│   │   ├── gistSync.ts              # GitHub Gist bookmark backup and restore engine
│   │   └── githubApi.ts             # GitHub REST Search API streaming & rate limiter
│   ├── types/
│   │   └── index.ts                 # TypeScript type definitions
│   ├── App.tsx                      # Root state coordinator & theme provider
│   ├── index.css                    # Tailwind setup & GFM README custom styles
│   └── main.tsx                     # React entry point
├── release/
│   ├── OneGitVault-win32-x64/       # Portable standalone Windows application
│   └── setup/
│       └── OneGitVault-Setup-1.0.0.exe # Single-file distributable installer
├── OneGitVault.iss                  # Inno Setup compiler configuration
├── build-installer.bat              # Batch build orchestrator
├── vite.config.ts                   # Vite configuration with build exclusion filters
├── tailwind.config.js               # Theme colors, tokens, and typography
├── package.json                     # Dependencies, scripts, and build metadata
├── BLOG.md                          # Engineering deep-dive article
└── README.md                        # Documentation
```

---
## Application look
Light mode:
<img width="3715" height="2157" alt="image" src="https://github.com/user-attachments/assets/e0ceb2d3-58a1-464a-a215-b616b1a56773" />
<img width="3725" height="2145" alt="image" src="https://github.com/user-attachments/assets/b2ca6aea-49b0-4a8a-ad29-5cf87336b6f7" />

Dark mode:
<img width="3710" height="2130" alt="image" src="https://github.com/user-attachments/assets/5b6ff46e-c7ed-487a-9c55-0ed4a9a03a8a" />

---

## 📄 License

MIT License. Designed and developed by [VKaddala](https://github.com/VKaddala).
