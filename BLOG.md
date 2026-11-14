# Engineering OneGitVault: From GitHub Search to a Windows Desktop App

OneGitVault brings repository discovery into a focused desktop interface. It combines a React and TypeScript renderer, GitHub's repository Search API, browser storage for user preferences, and an Electron shell for Windows distribution. This article walks through how those pieces interact and which libraries support the build.

## What the application does

The interface presents eight selection options: an all-projects view and seven curated categories covering AI and machine learning, web frameworks, cloud and DevOps, developer tools, databases, mobile and desktop, and security. Search terms are combined with optional language and minimum-star filters. Results can be sorted by stars, forks, or last update and displayed as cards or a list.

Users can bookmark repositories in a local vault, open GitHub pages in the system browser, or copy a `git clone` command from a result card. The UI also includes theme selection and an optional GitHub token entry form.

## Runtime architecture

The project is split between the web renderer and Electron's main process:

```text
React UI (src/)
  ├─ App.tsx: feature state and coordination
  ├─ components/: controls, cards, and dialogs
  ├─ services/githubApi.ts: search, cache, and fallback
  └─ data/curatedProjects.ts: categories and local fallback data
          │
          ├── fetch() ──> api.github.com
          │
          └── Electron preload bridge
                    │
Electron main (electron/main.cjs): window lifecycle and OS integration
```

In development, `scripts/start-electron.cjs` starts Vite on port 5173, waits for the server to respond, and launches Electron with `VITE_DEV_SERVER_URL`. In production, the main process loads `dist/index.html` from the Vite build. The Vite `base: './'` setting allows packaged assets to resolve relative to the local HTML file.

The `BrowserWindow` opens at 1340 × 890 pixels, with minimum dimensions of 980 × 680. External HTTP and HTTPS windows are denied inside the Electron renderer and opened with `shell.openExternal`, keeping repository navigation in the user's default browser.

## Building a GitHub search

The API integration lives in `src/services/githubApi.ts`. `buildSearchQuery()` assembles the Search API `q` parameter from:

1. The user's keyword or phrase.
2. One topic qualifier for the selected category (for example, `topic:machine-learning`).
3. An optional `language:` qualifier. C++ and C# are translated to GitHub's `cpp` and `csharp` language identifiers; multi-word language names are quoted.
4. An optional `stars:>=N` minimum.

For an unfiltered All Projects search, the service uses `stars:>500` as a baseline query. The query string is URL-encoded and sent to `https://api.github.com/search/repositories` with descending order and the selected sort field.

The category labels and descriptive text are in `src/data/curatedProjects.ts`. The actual category-to-topic mapping is implemented in the service, so changing a category's search behavior should be done there as well as in the category data if those values are kept aligned.

### Mapping API data into UI data

GitHub's response shape is mapped into the shared `Repository` interface in `src/types/index.ts`. The mapper takes the repository and owner fields used by the UI, including its URL, description, counts, language, topics, timestamps, and license details. The rest of the interface operates on this app-level type rather than repeatedly reading raw API response objects.

The API response's rate-limit headers update an in-memory status object. The header can display the remaining quota, and the token dialog uses that status when explaining API access.

## Pagination and result rendering

The UI requests 40 repositories per page. In `src/App.tsx`, the initial query resets the page and replaces the current result set. Subsequent pages are requested by an `IntersectionObserver` watching a sentinel near the end of the list. Its `rootMargin` is 300 pixels so the next request can start before the user reaches the bottom. A manual load-more button provides an alternative, and an Auto-Stream control can disable observer-driven requests.

Loading guards prevent overlapping page requests. Repositories are appended only when their IDs are not already present, which avoids duplicate cards. Search input is debounced by 400 milliseconds before it triggers a new initial query.

The service requests the API's page results, but GitHub Search pagination is limited to the first 1,000 matches. Therefore, the UI can stream pages progressively, but cannot provide unbounded results from a single search.

## Rate limits, cache, and offline behavior

The GitHub API request includes an `Accept` header and, if configured, a bearer token. Requests are aborted after 7.5 seconds. The API's `x-ratelimit-limit`, `x-ratelimit-remaining`, and reset headers are parsed when present.

Successful result pages are serialized in `sessionStorage`. The key includes the query, sort field, page, and page size; cached pages last for the current browser session. This avoids repeating identical page requests while the session is open.

If a request fails because of a network error, timeout, or non-success HTTP response, the service filters the local `CURATED_PROJECTS` list by category, language, star count, and search text, then sorts and paginates that list. The response carries an offline-fallback flag so the UI can tell users that live GitHub results are not being shown.

This fallback is a predefined dataset, not a local mirror of GitHub. It keeps discovery usable during API outages or rate limiting but cannot reflect current repository data.

## Token handling and local data

The token dialog is implemented in `src/components/TokenModal.tsx`. It links to GitHub's fine-grained token settings and allows a user to save or clear a token. The service reads and writes the token in browser `localStorage`, then attaches it to GitHub requests. The token must be treated as a credential: it is stored locally by the app and transmitted to GitHub as an authorization header for API calls.

Other persisted values are also local to the app profile:

| Value | Storage key | Mechanism |
|---|---|---|
| Repository bookmarks | `onegitvault_bookmarks_v1` | `localStorage` |
| Theme preference | `onegitvault_theme_mode` | `localStorage` |
| GitHub token | `gitpulse_github_pat` | `localStorage` |
| Search result pages | Query-based key with `gitpulse_v3_` prefix | `sessionStorage` |

No separate database, account system, synchronization service, or state-management library is used.

## Frontend libraries

The core UI dependencies are intentionally small. React hooks in `App.tsx` own the application state; individual components receive values and callbacks through props. The browser's `fetch`, `IntersectionObserver`, `localStorage`, `sessionStorage`, and Clipboard API provide the browser-side platform features.

| Package | Declared range | Use |
|---|---:|---|
| `react` | `^18.3.1` | Component model and UI state |
| `react-dom` | `^18.3.1` | Mounts React into the browser document |
| `lucide-react` | `^1.16.0` | Interface icons |
| `typescript` | `^5.6.3` | Type checking and JavaScript compilation |
| `vite` | `^5.4.11` | Local development server and production bundler |
| `@vitejs/plugin-react` | `^4.3.4` | React support for Vite |
| `tailwindcss` | `^3.4.17` | Utility-based styling and dark-mode class strategy |
| `postcss` | `^8.4.49` | CSS transformation pipeline |
| `autoprefixer` | `^10.4.20` | CSS vendor-prefix generation |
| `@types/react` | `^18.3.18` | React TypeScript declarations |
| `@types/react-dom` | `^18.3.5` | React DOM TypeScript declarations |

Tailwind's content paths and theme configuration are in `tailwind.config.js`; Vite uses the React plugin in `vite.config.ts`. The project does not declare a separate HTTP client, router, or global state library.

## Electron and Windows packaging

Electron is configured in `electron/main.cjs` with `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true`. `electron/preload.cjs` exposes only a small `electronAPI` object containing the platform and an Electron indicator. The renderer does not receive general Node.js access.

Packaging options:

| Command or file | Process | Output |
|---|---|---|
| `npm run build` | Runs `tsc` and then `vite build` | `dist/` |
| `npm run package` | Builds the renderer, then invokes `@electron/packager` for Windows x64 | `release/OneGitVault-win32-x64/` |
| `npm run installer` | Builds the renderer, then invokes electron-builder with its NSIS target | Under `release/installer/` |
| `npm run installer:dir` | Builds the renderer and packages the app directory without creating an installer | `release/installer/win-unpacked/` |
| `build-installer.bat` | Builds the renderer and unpacked app, then calls Inno Setup Compiler | `release/setup/OneGitVault-Setup-1.0.0.exe` |

The electron-builder configuration in `package.json` sets the Windows x64 target to NSIS and enables directory selection, Start Menu and desktop shortcuts, and per-user installation. The separate Inno Setup definition (`OneGitVault.iss`) takes the `win-unpacked` directory, recursively includes its files, and creates a setup executable with LZMA2 compression. Its companion batch file currently uses a fixed `PROJECT_DIR`; adjust that value when building from another checkout location. Inno Setup must be installed to compile that installer.

The installer is not code-signed by this build setup. Windows can therefore show a SmartScreen warning. Signing requires a valid code-signing certificate and a separately configured signing process.

## Source map

- `src/App.tsx`: coordinates UI state, debounced search, bookmarking, and pagination.
- `src/services/githubApi.ts`: builds search queries, requests and maps GitHub data, updates quota state, caches pages, and supplies fallback results.
- `src/data/curatedProjects.ts`: category metadata, curated fallback entries, and language colors.
- `src/components/`: presentation components for search, filters, cards, navigation, and dialogs.
- `src/types/index.ts`: repository, category, sort, and view-mode types.
- `electron/main.cjs` and `electron/preload.cjs`: desktop window configuration and restricted bridge.
- `scripts/start-electron.cjs`: development startup orchestration.
- `package.json`, `vite.config.ts`, and `tailwind.config.js`: dependency scripts and build/tool configuration.

For installation and everyday commands, see [README.md](README.md).
