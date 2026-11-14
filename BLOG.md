# Building OneGitVault: A Raycast-Inspired Desktop Observatory for Exploring Open Source at Scale

*How we broke free from generic AI gradients, tamed GitHub's Search API, and built a blazing-fast, standalone desktop application to explore the global open-source ecosystem.*

---

## The Problem: The Open Source Discovery Paradox

Every single day, thousands of groundbreaking open-source tools, machine learning weights, compiler frameworks, and developer utilities are pushed to GitHub. Yet, discovering them feels fundamentally broken.

GitHub's trending page is often dominated by novelty forks or algorithmically boosted repositories. Searching through GitHub's standard interface requires manual syntax gymnastics (`stars:>10000 language:rust topic:cli`), and switching between topics often resets your context.

We wanted something different:
1. **A dedicated command-center experience**: A standalone desktop application that feels as fast and responsive as Raycast, Arc, or Linear.
2. **Infinite streaming discovery**: No artificial 30-result barriers. Repositories should stream in continuously as you scroll.
3. **Opinionated, eye-pleasing aesthetics**: Rejecting the sea of identical purple/indigo "AI-generated" templates in favor of a warm, tactile charcoal and honey-amber palette with crafted typography.

This is the story of how we built **OneGitVault**.

---

## 1. Crafting the Aesthetic: Warm Charcoal & Honey Amber

Most modern developer web apps suffer from "template fatigue": generic indigo gradients, identical rounded cards, and interchanged sans-serif fonts.

For **OneGitVault**, we designed a bespoke design system centered around warmth, physical tactile depth, and editorial restraint:

### The Typography Hierarchy
- **Headline / Display (`Bricolage Grotesque`)**: Gives the observatory an authoritative, craftsman-like character with distinctive geometric curves.
- **Data / Metrics (`JetBrains Mono`)**: Stars (`145.2k ★`), fork ratios, language badges, and commit counts render with mathematical clarity.
- **Body / Prose (`Plus Jakarta Sans`)**: High-contrast, clean micro-text for descriptions and readmes.

### The Color Palette
Rather than generic pure blacks and electric neon colors, OneGitVault utilizes an organic, warm substrate:
- **Obsidian Substrates**: `#0c0d10`, `#111217`, `#161720`
- **Tactile Grid Borders**: 1px subtle borders `#20212b` and `#242634`
- **Amber Accents**: Honey amber (`#f59e0b`), luminous gold (`#fbbf24`), and deep bronze (`#d97706`)

With a single click in the header, the entire application switches seamlessly between **Warm Dark Mode** and a clean **Cream / Sand Light Mode** (`#fbfbf9`), with user preferences persisted in `localStorage`.

---

## 2. The Engine: Taming GitHub's Search API

Building a live open-source explorer means interfacing directly with GitHub's REST Search API (`api.github.com/search/repositories`). However, the API presents several architectural hurdles:

### The Parenthesis Trap
GitHub's search engine qualifier syntax is strict:
```
// ❌ WRONG: Returns HTTP 422 Unprocessable Entity
q = (topic:machine-learning OR topic:deep-learning) language:python

// ✅ CORRECT: Clean verified topic qualifiers without boolean parentheses
q = topic:machine-learning language:python stars:>=1000
```
We engineered a specialized `buildSearchQuery()` pipeline that maps broad technology sectors (*AI & ML*, *Web*, *Cloud & DevOps*, *DevTools*, *Databases*, *Mobile*, *Security*) into GitHub-compliant qualifiers, querying over **260,000+ live projects** per category.

### Infinite Auto-Streaming with Intersection Observer
Rather than paginating with clunky "Next Page" links, OneGitVault mounts a lightweight invisible sentinel element observed by `IntersectionObserver`.

```typescript
const observer = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting && hasMore && !isLoading) {
      loadNextPage();
    }
  },
  { threshold: 0.1, rootMargin: '300px' }
);
```

As the user scrolls down, the next batch of 40 repositories is fetched, deduplicated against existing repository IDs in memory, and appended smoothly without scroll-jumping.

### Rate-Limit Defense & Curated Fallback
Unauthenticated requests to GitHub are capped at 60 queries per hour per IP. OneGitVault handles this with three defensive layers:
1. **In-Memory & Session Caching**: Identical queries are served instantly from `sessionStorage`.
2. **Local Personal Access Token (PAT)**: Users can plug in a read-only GitHub token, elevating their limit to **5,000 requests/hour**. The token is kept strictly in their local browser storage and never leaves the machine.
3. **Curated Fallback Engine**: If rate-limited or offline, the app seamlessly switches to a hand-verified database of top projects, ensuring the UI is never blank.

---

## 3. From Web App to Standalone Windows Application

While OneGitVault runs in any modern browser, the real power comes from running it as a native Windows desktop app.

### Why Electron + Native Packaging?
- **Global Shortcut & Window Management**: Frameless dark titlebar, custom dimensions (`1340x890`), and auto-save of user position.
- **Default Browser Interception**: Instead of opening web links inside the app, the Electron main process intercepts external URLs (`webContents.setWindowOpenHandler`) and opens repositories directly in your preferred system browser (Chrome, Edge, Brave).
- **Standalone `.exe` Distribution**: Using `@electron/packager`, OneGitVault compiles into a portable Windows executable (`OneGitVault.exe`) that runs anywhere without requiring Node.js or terminal commands.

```bash
# Package into standalone Windows application
npm run package
```

---

## 4. Key Highlights & Features

| Feature | Description |
|---|---|
| **Live Multi-Sector Tabs** | One-click categorization for AI/LLMs, Web Frameworks, DevOps, CLI Tools, Databases, and Security. |
| **Precision Language Filtering** | Filter live results across Python, Rust, Go, TypeScript, C++, Swift, and more. |
| **Popularity Thresholds** | Narrow down results to `10k+`, `50k+`, or `100k+` stars. |
| **Local Vault Bookmarks** | Save favorite projects locally for quick offline recall. |
| **Instant Git Clone** | One-click copy of `git clone <url>.git` with clipboard verification. |
| **Bilingual Theme Engine** | Full Dark Mode and Light Mode with instant toggle. |

---

## 5. Conclusion & What's Next

OneGitVault transforms open-source discovery from a chore into an inspiring daily ritual. It proves that developer tools can be both mathematically precise and visually arresting.

Explore the source code on GitHub, download the desktop build, or build your own customized sector observatory.

*Happy exploring, and may your repositories always compile on the first try.* ✦
