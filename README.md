# OneGitVault

[![Windows](https://img.shields.io/badge/platform-Windows-blue?logo=windows&logoColor=white)](https://github.com/VKaddala/OneGitVault)
[![React](https://img.shields.io/badge/React-18-149eca?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-33-47848f?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Version](https://img.shields.io/badge/version-1.0.4-informational)](package.json)
[![GitHub stars](https://img.shields.io/github/stars/VKaddala/OneGitVault)](https://github.com/VKaddala/OneGitVault/stargazers)
[![License](https://img.shields.io/github/license/VKaddala/OneGitVault)](LICENSE)

**OneGitVault** is a fast, standalone Windows desktop application for discovering, streaming, and bookmarking popular open-source repositories from GitHub.

Featuring five ergonomic themes, a themed frameless titlebar with built-in update checks, a centered README and release asset inspector, and cross-device GitHub Gist bookmark sync.

---

## ✨ Features

- **Themed Frameless Titlebar**: Custom frameless titlebar aligned with the active theme, window controls (minimize, maximize/restore, close), and an expand menu containing About details and in-app update checks.
- **In-App GitHub Update Checker**: Checks `VKaddala/OneGitVault` GitHub releases for newer versions, displays release notes, and provides one-click `.exe` installer upgrades.
- **Clean Installer Upgrade**: Inno Setup installer that automatically detects and replaces previous installations cleanly, without leaving stale packages or orphan files.
- **Five Ergonomic Themes**:
  - **GitHub Simple Dark**: Classic slate surfaces with high-contrast borders and blue buttons.
  - **GitHub Simple Light**: Crisp clean light mode with GitHub blue accents.
  - **Prometheus Dark**: Cinematic petrol teal and flame vermilion accents.
  - **Sand Light**: Warm ivory and terracotta styling.
  - **Ambient Twilight**: Cool twilight slate and cyan designed for zero eye strain.
- **Direct Content Layout**: Clean, focused interface starting straight from category navigation and live repository streams.
- **7 Curated Technology Sectors**: Instant filtering across AI & Machine Learning, Web & Frameworks, Cloud & DevOps, Developer Tools, Databases, Mobile & Desktop, and Cybersecurity.
- **Live Search & Streaming**: Real-time GitHub search with infinite auto-streaming, manual refresh, and language and star threshold filters (`10k+`, `50k+`, `100k+`).
- **README & Release Inspector**:
  - **README View**: Renders GitHub Flavored Markdown with quick actions to copy `git clone`, download ZIP, or open repository.
  - **Releases Downloader**: View release tags, release dates, changelogs, and directly download binary assets (`.exe`, `.zip`, `.tar.gz`, etc.).
- **Vault Bookmarks with Gist Sync**: Save repositories locally or sync backups across machines using a private GitHub Gist (`onegitvault-bookmarks.json`).
- **Rate Limit Monitor & Offline Resilience**: Built-in quota tracker for GitHub API limits (60/hr unauthenticated, 5,000/hr with personal access token) and an offline fallback vault.

---

## ⚡ Quick Launch

### 1. Standalone Installer (Recommended)

1. Download **`OneGitVault-Setup-1.0.4.exe`** from `release/setup/` or [GitHub Releases](https://github.com/VKaddala/OneGitVault/releases).
2. Run the installer. It automatically removes any previous version and installs the latest release cleanly.
3. Shortcuts are created on your Desktop and Start Menu.

### 2. Portable Directory

Run the precompiled standalone executable directly from:
```
release\OneGitVault-win32-x64\OneGitVault.exe
```

### 3. Run from Source (Development)

Prerequisites: **Node.js 18+** and **npm**.

```powershell
git clone https://github.com/VKaddala/OneGitVault.git
cd OneGitVault
npm install
npm start
```

- `npm start` (or `npm run desktop`): Starts the Vite development server and launches Electron.
- `npm run dev`: Starts the browser-only development server at `http://localhost:5173`.

---

## 🔑 GitHub Token & Gist Sync Setup

OneGitVault works out-of-the-box without authentication. To enable **5,000 requests/hour** and **Bookmark Gist Synchronization**:

1. Create a [GitHub Personal Access Token](https://github.com/settings/tokens/new?description=OneGitVault&scopes=public_repo,gist) with:
   - `public_repo` (repository search)
   - `gist` (for bookmark cloud backup and restore)
2. In OneGitVault, click the **Key / Quota badge** in the header.
3. Paste your token and click **Save Token**.
4. Open the **Vault** drawer to **Push** (backup) and **Pull** (restore) bookmarks.

> *Your token is saved locally (`localStorage`) and only communicated directly to official `api.github.com` endpoints.*

---

## 🛠️ Building & Packaging

### Compile Web Assets
```powershell
npm run build
```

### Package Portable Windows App
```powershell
npm run package
```
Packages the standalone Windows app into `release/OneGitVault-win32-x64/`.

### Compile Single-File Windows Setup Installer
```powershell
.\build-installer.bat
```
Generates `release\setup\OneGitVault-Setup-1.0.4.exe`.
