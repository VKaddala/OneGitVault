# OneGitVault — Unified Open-Source Observatory

[![Platform](https://img.shields.io/badge/Platform-Windows%20Desktop-blue?style=for-the-badge&logo=windows)](https://github.com/VKaddala/OneGitVault)
[![Stack](https://img.shields.io/badge/Stack-React%2018%20%7C%20TypeScript%20%7C%20Vite%20%7C%20Electron-61dafb?style=for-the-badge&logo=react)](https://github.com/VKaddala/OneGitVault)
[![Theme](https://img.shields.io/badge/Theme-Warm%20Charcoal%20%26%20Honey%20Amber-f59e0b?style=for-the-badge)](https://github.com/VKaddala/OneGitVault)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

A native **Windows Desktop Application** for discovering, streaming, and bookmarking high-impact open-source repositories — powered by the GitHub Search API, built with Electron + React 18 + TypeScript + Tailwind CSS.

---
<img width="3712" height="1567" alt="image" src="https://github.com/user-attachments/assets/34cc194e-e24e-47de-9617-db383c93fbdb" />

<img width="3715" height="1495" alt="image" src="https://github.com/user-attachments/assets/31315aff-06eb-4f3d-b49f-2c4d90cfba79" />


## ⚡ Quick Launch

### Option A — Run the Installer (Recommended)

1. Download **`OneGitVault-Setup-1.0.0.exe`** from `release/setup/`
2. Double-click it, follow the wizard
3. App installs to `Program Files`, Desktop & Start Menu shortcuts created automatically
4. Launch **OneGitVault** from Desktop or Start Menu

### Option B — Run the Raw Executable (Portable)

Navigate to and double-click:
```
release\installer\win-unpacked\OneGitVault.exe
```
> **Note:** You must keep the entire `win-unpacked` folder intact — the `.exe` alone will crash without its supporting DLLs.

### Option C — Developer Mode

```bash
npm start        # Starts Vite dev server + opens Electron window with HMR
```

---

## 🛠️ Build from Source

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18+ | https://nodejs.org |
| npm | 9+ | Bundled with Node |
| Inno Setup 6 | Latest | https://jrsoftware.org/isdl.php — required only for installer |
| Git | Any | https://git-scm.com |

### 1. Clone & Install

```bash
git clone https://github.com/VKaddala/OneGitVault.git
cd OneGitVault
npm install
```

### 2. Run in Development

```bash
npm start
# Opens Electron window connected to Vite dev server (Hot Module Replacement enabled)
# App available at http://localhost:5173/ in browser too
```

### 3. Build Web App

```bash
npm run build
# Compiles TypeScript + Vite → outputs to dist/
```

### 4. Build the Windows Installer (Single .exe)

> Requires **Inno Setup 6** installed at `C:\Program Files (x86)\Inno Setup 6\`

```bash
# Double-click build-installer.bat in the project root
# OR run manually:

npm run installer:dir          # Packages Electron app → release/installer/win-unpacked/
# Then compile OneGitVault.iss with Inno Setup Compiler
# Output: release/setup/OneGitVault-Setup-1.0.0.exe
```

The bat file `build-installer.bat` does all three steps end-to-end:
1. `npm run build` → compiles React app
2. `electron-builder --dir` → packages Electron (no admin needed)
3. Inno Setup → compiles single-file installer

### 5. Build Portable Folder (No Installer)

```bash
npm run package
# Output: release/OneGitVault-win32-x64/   (entire folder is the portable app)
```

---

## 📦 All NPM Scripts

```bash
npm start              # Dev: Vite server + Electron window (HMR)
npm run dev            # Web only: http://localhost:5173/
npm run build          # Compile TypeScript + Vite → dist/
npm run installer      # Build + electron-builder NSIS (requires Developer Mode / admin)
npm run installer:dir  # Build + electron-builder --dir only (no admin needed)
npm run package        # Build + electron-packager portable folder
```

---

## 🎨 Design System

OneGitVault uses a distinctive **Warm Charcoal & Honey Amber** palette — inspired by Raycast and Arc Browser — avoiding generic AI-gradient templates.

### Typography

| Role | Font | Usage |
|------|------|-------|
| Headlines & Logo | **Bricolage Grotesque** | Observatory title, section headers |
| Body & Descriptions | **Plus Jakarta Sans** | Cards, descriptions, modals |
| Data & Badges | **JetBrains Mono** | Star counts (`145.2k ★`), forks, language labels |

### Colour Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `charcoal-950` | `#0c0d10` | Main background (dark) |
| `charcoal-900` | `#111217` | Elevated surface |
| `charcoal-800` | `#161720` | Card tiles |
| `amber-brand` | `#f59e0b` | Primary accent, stars, CTAs |
| `amber-glow` | `#fbbf24` | Hover states, luminous highlights |

### Dark / Light Mode

Toggle via the ☀️ / 🌙 button in the header. Preference persists to `localStorage` (`onegitvault_theme_mode`).

---

## 🚀 Features

- **Live GitHub Search Streaming** — Infinite pagination in batches of 40, powered by `IntersectionObserver`
- **7 Category Sectors** — AI/ML, Web & Frameworks, Cloud & DevOps, Developer Tools, Databases, Mobile & Desktop, Security
- **Multi-Filter Engine** — Language, star tier (`10k+`, `50k+`, `100k+`), sort order
- **Repository Vault** — Bookmark repos locally, one-click `git clone` copy
- **GitHub Token Support** — Boosts API quota from 60 → 5,000 req/hour (stored locally only)
- **Offline Fallback** — 30+ curated repos shown when API is unavailable
- **External Link Interception** — GitHub links open in default browser, not inside the app

---

## 📁 Project Structure

```
OneGitVault/
├── electron/
│   ├── main.cjs                   # Electron main process, BrowserWindow config
│   └── preload.cjs                # Secure context bridge
├── src/
│   ├── components/
│   │   ├── Header.tsx             # Logo, search, theme toggle, vault button
│   │   ├── Hero.tsx               # Observatory metrics & topic chips
│   │   ├── CategoryNav.tsx        # Sector navigation tabs
│   │   ├── FilterBar.tsx          # Language, stars, sort filters
│   │   ├── ProjectCard.tsx        # Repository cards (grid & list)
│   │   ├── TokenModal.tsx         # GitHub PAT dialog
│   │   ├── BookmarksModal.tsx     # Saved repos drawer
│   │   └── OneGitVaultLogo.tsx    # Custom SVG vault emblem
│   ├── data/
│   │   └── curatedProjects.ts     # Offline fallback repository list
│   ├── services/
│   │   └── githubApi.ts           # GitHub Search API engine & cache
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces
│   ├── App.tsx                    # Root component, theme & stream coordinator
│   ├── index.css                  # Fonts, custom scrollbar
│   └── main.tsx                   # React entry point
├── scripts/
│   └── start-electron.cjs         # Dev server orchestrator
├── release/
│   ├── installer/
│   │   └── win-unpacked/          # Electron-packaged app (portable)
│   └── setup/
│       └── OneGitVault-Setup-1.0.0.exe  # Single-file Windows installer
├── OneGitVault.iss                # Inno Setup script
├── build-installer.bat            # End-to-end installer build script
├── .gitignore                     # Excludes node_modules, dist, release, certs
├── .gitattributes                 # Line ending normalisation
├── tailwind.config.js             # Custom colour tokens & dark mode config
├── vite.config.ts                 # Vite + React plugin config
├── tsconfig.json                  # TypeScript config
├── package.json                   # Dependencies, scripts, electron-builder config
├── BLOG.md                        # Engineering blog post
└── README.md                      # This file
```

---

## 🔐 Code Signing

The installer is currently unsigned (self-signed workflow available). On first launch Windows SmartScreen may appear — click **More info → Run anyway**.

To sign with a self-signed certificate, run:
```bash
# Located at Desktop/gemini/cert/
run_sign_onegitvault.bat
```

For public distribution, obtain a standard or EV code-signing certificate from DigiCert / Sectigo.

---

## 📄 License

MIT License — crafted with precision by [VKaddala](https://github.com/VKaddala).  
Read the full engineering story in [BLOG.md](BLOG.md).
