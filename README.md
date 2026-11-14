# OneGitVault

[![Windows](https://img.shields.io/badge/platform-Windows-blue?logo=windows&logoColor=white)](https://github.com/VKaddala/OneGitVault)
[![React](https://img.shields.io/badge/React-18-149eca?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-33-47848f?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Version](https://img.shields.io/badge/version-1.0.0-informational)](package.json)
[![GitHub stars](https://img.shields.io/github/stars/VKaddala/OneGitVault)](https://github.com/VKaddala/OneGitVault/stargazers)
[![License](https://img.shields.io/github/license/VKaddala/OneGitVault)](LICENSE)

OneGitVault is a Windows desktop app for discovering and saving open-source repositories from GitHub. Search by category, keyword, language, or star count; sort results; and browse them in a grid or list.

<p align="center">
  <img src="https://github.com/user-attachments/assets/34cc194e-e24e-47de-9617-db383c93fbdb" alt="OneGitVault repository discovery screen" width="100%">
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/31315aff-06eb-4f3d-b49f-2c4d90cfba79" alt="OneGitVault repository browsing screen" width="100%">
</p>

## Features

- Search live GitHub repository data across curated categories.
- Load additional results as you scroll, or use the manual load button.
- Filter by language and minimum stars; sort by stars, forks, or last update.
- Save repositories to a local bookmark vault and copy their `git clone` command.
- Use an optional GitHub personal access token to increase API request limits.
- Fall back to a curated repository list when GitHub is unavailable or rate-limited.
- Switch between dark and light themes.

## Quick launch

### Install the Windows app

Download `OneGitVault-Setup-1.0.0.exe` from the [GitHub Releases page](https://github.com/VKaddala/OneGitVault/releases) when a release is available, then run it and follow the setup wizard. The Inno Setup installer supports a per-user installation, creates a Start Menu shortcut, offers a desktop shortcut, and can launch the app after setup.

The installer bundles the Electron application and its runtime files. For a portable, non-installer build, use the complete application directory described below.

### Run from source

Prerequisites: Node.js 18 or later and npm.

```powershell
git clone https://github.com/VKaddala/OneGitVault.git
cd OneGitVault
npm install
npm start
```

`npm start` starts the Vite development server and opens the Electron desktop window. To run only the browser version, use `npm run dev` and open the URL printed by Vite (by default, `http://localhost:5173`).

## GitHub token setup

Live repository search works without a token, but GitHub applies stricter API rate limits to unauthenticated requests. To authenticate searches:

1. In GitHub, create a [fine-grained personal access token](https://github.com/settings/tokens?type=beta). For public repository search, the app requests no private repository access; follow GitHub's current token requirements and grant only the minimum access needed.
2. In OneGitVault, select the key/rate-limit control in the top-right of the window.
3. Paste the token into the **Personal Access Token (PAT)** field and select **Save Token**.

The app stores the token in local browser storage and sends it in the authorization header to `api.github.com` for search requests. It is not sent to any other service. Do not save a token on a shared device; use GitHub's expiration and revocation controls, and clear the token in the app when it is no longer needed.

## Build from source

Prerequisites: Node.js 18 or later and npm. Windows installer builds additionally require the relevant packaging tool described below.

```powershell
npm run build
```

This type-checks the TypeScript application and creates the web build in `dist/`.

To package a portable Windows application directory:

```powershell
npm run package
```

The portable app directory is written to `release/OneGitVault-win32-x64/`. Run `OneGitVault.exe` from inside that directory; do not copy the executable out on its own because it needs the accompanying runtime files.

### Build an installer

There are two installer workflows:

1. **electron-builder / NSIS:** Run the command below. It builds the web app and packages a Windows x64 NSIS installer under `release/installer/`. Installer configuration in `package.json` enables the installation directory chooser and creates Start Menu and desktop shortcuts.

```powershell
npm run installer
```

2. **Inno Setup:** Install [Inno Setup 6](https://jrsoftware.org/isdl.php), then run `build-installer.bat`. It builds the renderer, creates `release/installer/win-unpacked/`, and wraps that directory using `OneGitVault.iss`. The resulting setup file is `release/setup/OneGitVault-Setup-1.0.0.exe`. The batch file currently contains this checkout's absolute project path; update its `PROJECT_DIR` value if you cloned the repository somewhere else.

The installer is unsigned. Windows may show a SmartScreen warning for builds that are not code-signed. See [BLOG.md](BLOG.md) for packaging details and [OneGitVault.iss](OneGitVault.iss) for the Inno Setup configuration.

## NPM scripts

| Command | Description |
|---|---|
| `npm start` | Start Vite and open the Electron development window |
| `npm run dev` | Start the Vite web development server only |
| `npm run build` | Type-check and create the production web build in `dist/` |
| `npm run package` | Build the portable Windows application directory |
| `npm run installer` | Build the Windows NSIS installer with electron-builder |
| `npm run installer:dir` | Package the Electron app directory without building an installer |
| `build-installer.bat` | Build the Inno Setup installer (requires Inno Setup 6) |

## Technology

- React 18 and TypeScript
- Vite
- Electron
- Tailwind CSS
- GitHub REST API (repository search)
- Lucide React icons

## Project structure

```text
OneGitVault/
├── electron/
│   ├── main.cjs              # Electron window, app lifecycle, external links
│   └── preload.cjs           # Restricted renderer bridge
├── scripts/
│   └── start-electron.cjs    # Starts Vite and launches Electron in development
├── src/
│   ├── components/           # Search UI, filters, cards, and dialogs
│   ├── data/
│   │   └── curatedProjects.ts # Categories and offline fallback repositories
│   ├── services/
│   │   └── githubApi.ts      # Search API, caching, token, and fallback logic
│   ├── types/
│   │   └── index.ts          # Shared application types
│   ├── App.tsx               # App state and feature coordination
│   ├── index.css             # Global styles
│   └── main.tsx              # React entry point
├── release/                  # Packaged Windows builds
├── OneGitVault.iss           # Optional Inno Setup installer definition
├── package.json              # Dependencies, scripts, and electron-builder config
├── tailwind.config.js        # Tailwind configuration
├── vite.config.ts            # Vite configuration
├── BLOG.md                   # Technical overview and dependency details
└── README.md
```

## Local data

Bookmarks and theme preference are stored in local browser storage and are not synchronized between devices. Token storage and transmission details are covered in [GitHub token setup](#github-token-setup).

## License

OneGitVault is licensed under the MIT License. See [LICENSE](LICENSE).
