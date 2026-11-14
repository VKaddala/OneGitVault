# OneGitVault — Unified Open-Source Software Observatory

[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Web-blue?style=for-the-badge&logo=windows)](https://github.com)
[![Framework](https://img.shields.io/badge/Stack-React%2018%20%7C%20TypeScript%20%7C%20Vite%20%7C%20Electron-61dafb?style=for-the-badge&logo=react)](https://github.com)
[![Aesthetic](https://img.shields.io/badge/Theme-Warm%20Charcoal%20%26%20Honey%20Amber-f59e0b?style=for-the-badge)](https://github.com)
[![License](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](https://github.com)

A native **Windows Desktop Application** and modern web observatory for discovering, streaming, and bookmarking high-impact open-source software on GitHub. Built with a live GitHub Search streaming engine.

---
<img width="3712" height="1567" alt="image" src="https://github.com/user-attachments/assets/34cc194e-e24e-47de-9617-db383c93fbdb" />

<img width="3715" height="1495" alt="image" src="https://github.com/user-attachments/assets/31315aff-06eb-4f3d-b49f-2c4d90cfba79" />


## ⚡ Direct Quick-Launch (Desktop)

Inside the `Desktop/gemini/` directory on your computer, two launchers are pre-configured:

| Launcher | Type | Description |
|---|---|---|
| 🚀 **`Run-OneGitVault.bat`** | **Standalone Windows App** | Launches the precompiled native **`OneGitVault.exe`** directly with zero terminal or Node.js dependencies. |
| 🛠️ **`Launch-OneGitVault.bat`** | **Developer Environment** | Starts Vite development server and opens Electron with live **Hot Module Replacement (HMR)**. |

You can also run the standalone executable directly from:  
📁 `OneGitVault/release/OneGitVault-win32-x64/OneGitVault.exe`

---

## 🎨 Visual Design System

OneGitVault moves away from generic purple AI gradient templates in favor of a tactile, high-craft developer interface:

### 1. Distinctive Typography
- **Headlines & Insignia (`Bricolage Grotesque`)**: Gives the observatory an authoritative, editorial character with bespoke geometric curves.
- **Data & Star Badges (`JetBrains Mono`)**: Formatted star counts (`145.2k ★`), fork ratios, language dots, and query qualifiers render with monospace clarity.
- **Body & Descriptions (`Plus Jakarta Sans`)**: Clean, balanced micro-readability across cards and modals.

### 2. Warm Charcoal & Honey Amber Palette
- **Substrate Surfaces**: Warm obsidian `#0c0d10`, elevated charcoal `#111217`, card tile `#161720`.
- **Surgical Grid Borders**: 1px subtle borders `#20212b` and `#242634`.
- **Amber Accents**: Honey amber (`#f59e0b`), luminous gold (`#fbbf24`), and deep bronze (`#d97706`).

### 3. Dark / Light Mode Switcher
- Toggle between **Warm Charcoal Dark Mode** and **Sand / Porcelain Light Mode** with the Sun ☀️ / Moon 🌙 icon in the header.
- Preferences are saved automatically in `localStorage` (`onegitvault_theme_mode`).

---

## 🚀 Core Features

- **Infinite Live Repository Streaming**:
  - Automatically streams repositories in batches of 40 directly from GitHub Search API.
  - Built with an `IntersectionObserver` sentinel for seamless auto-scrolling, with an optional **Auto-Stream ON/OFF** toggle switch.

- **Multi-Sector Categorized Navigation**:
  - **AI & Machine Learning**: `topic:machine-learning` *(over 268,000 repos)*
  - **Web & Frameworks**: `topic:frontend` *(over 74,000 repos)*
  - **Cloud & DevOps**: `topic:devops` *(over 51,000 repos)*
  - **Developer Tools**: `topic:developer-tools` *(over 92,000 repos)*
  - **Databases & Storage**: `topic:database` *(over 54,000 repos)*
  - **Mobile & Desktop**: `topic:mobile` *(over 17,000 repos)*
  - **Security & Privacy**: `topic:security` *(over 72,000 repos)*

- **Precision Multi-Filter Engine**:
  - **Language Selector**: Filter by Python, TypeScript, Rust, Go, C++, C, Java, Swift, Kotlin, and more.
  - **Popularity Star Thresholds**: Filter by `All`, `10k+ ★`, `50k+ ★`, `100k+ ★`.
  - **Sorting**: Most Stars, Most Forks, Recently Updated.
  - **Dual Filter Execution**: Filters are applied both server-side on GitHub and client-side in memory for instant feedback.

- **Local Repository Vault (Bookmarks)**:
  - Save repositories locally to your device and view them in a sliding vault drawer.
  - One-click copy for `git clone <url>.git` with visual clipboard confirmation.

- **Rate-Limit Resilience & Security**:
  - Includes a `sessionStorage` cache layer to protect API quota.
  - Connect a read-only GitHub Personal Access Token (stored **strictly on your computer**) to boost quota to **5,000 requests/hour**.
  - Built-in curated fallback collection so the app never shows blank screens if offline.

- **External Link Interception**:
  - Clicking any repository link or project homepage automatically opens it in your default system browser (Chrome, Edge, Brave), keeping the desktop app clean.

---

## 🛠️ NPM Commands

Run from the `OneGitVault` directory:

```bash
# 1. Start development server & launch native Electron window
npm start

# 2. Package standalone Windows executable (.exe)
npm run package

# 3. Run in browser-only mode (http://localhost:5173/)
npm run dev

# 4. Compile TypeScript & Vite production build to dist/
npm run build
```

---

## 📖 In-Depth Technical Article

For an architectural deep-dive into how we built the stream engine, resolved GitHub's query validator, and designed the UI:  
📄 Read **[BLOG.md](BLOG.md)** — *"Building OneGitVault: A Raycast-Inspired Desktop Observatory for Exploring Open Source at Scale"*.

---

## 📁 Repository Structure

```
OneGitVault/
├── dist/                          # Production compiled bundle
├── electron/
│   ├── main.cjs                   # Native Electron window & URL handler
│   └── preload.cjs                # Secure context bridge
├── release/
│   └── OneGitVault-win32-x64/     # Standalone Windows application package
│       └── OneGitVault.exe        # Native standalone executable
├── scripts/
│   └── start-electron.cjs         # Development orchestrator
├── src/
│   ├── components/
│   │   ├── Header.tsx             # Brand, search, quota, theme toggle, and vault
│   │   ├── Hero.tsx               # Observatory metrics & topic chips
│   │   ├── CategoryNav.tsx        # Sector navigation tabs
│   │   ├── FilterBar.tsx          # Sorting, languages, star tiers, and view modes
│   │   ├── ProjectCard.tsx        # Grid & list repository cards
│   │   ├── TokenModal.tsx         # GitHub Personal Access Token dialog
│   │   ├── BookmarksModal.tsx     # Local repository vault drawer
│   │   └── OneGitVaultLogo.tsx    # Bespoke amber & charcoal vault emblem
│   ├── data/
│   │   └── curatedProjects.ts     # Verified fallback database & category topics
│   ├── services/
│   │   └── githubApi.ts           # GitHub REST Search API engine & rate tracker
│   ├── types/
│   │   └── index.ts               # TypeScript data definitions
│   ├── App.tsx                    # Main coordinator, theme manager & stream sentinel
│   ├── index.css                  # Custom scrollbar & font declarations
│   └── main.tsx                   # React root entry
├── BLOG.md                        # Technical blog post
├── package.json                   # Dependencies, scripts, and packager config
├── tailwind.config.js             # Color palette tokens & typography mappings
└── README.md                      # Project documentation
```

---

## 📄 License

MIT License. Crafted with precision.
