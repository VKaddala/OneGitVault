/**
 * Intelligent 10-Day Rotating Suggestion Engine for Spotlight.
 * - Rotates curated topic cohorts automatically every 10 days (zero-cost offline deterministic rotation)
 * - Enriches suggestions once per 10-day cycle from recently trending GitHub topics & user's Vault affinity
 * - Caches the generated 10 keywords in localStorage for the entire 10-day window (0 extra requests between cycles)
 */

import { fetchRepositories } from './githubApi';
import { getBookmarks, getUserInterests } from './bookmarkStore';
import { safeSetLocalCache } from './cacheManager';

export interface SpotlightKeyword {
  label: string;
  query: string;
}

const SUGGESTIONS_STORAGE_KEY = 'ogv_spotlight_suggestions_v1';
const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

const ROTATING_COHORTS: SpotlightKeyword[][] = [
  [
    { label: '🤖 AI Agents', query: 'ai-agents' },
    { label: '🧠 Local LLM', query: 'ollama' },
    { label: '🔌 MCP Servers', query: 'mcp' },
    { label: '📱 Android APK', query: 'android apk' },
    { label: '🦀 Rust CLI', query: 'rust cli' },
    { label: '📦 Self-Hosted', query: 'self-hosted' },
    { label: '🔒 Cybersecurity', query: 'cybersecurity' },
    { label: '🎥 Screen Mirror', query: 'scrcpy' },
    { label: '⚡ React & Next', query: 'react' },
    { label: '🎮 Godot Engine', query: 'godot' }
  ],
  [
    { label: '🕸️ Browser Agents', query: 'browser-use' },
    { label: '⚡ Fast APIs', query: 'fastapi' },
    { label: '🐧 Linux TUI', query: 'tui' },
    { label: '📲 FOSS Android', query: 'android-app' },
    { label: '🎬 FFmpeg Video', query: 'ffmpeg' },
    { label: '🏠 Homelab', query: 'homelab' },
    { label: '🔍 Vector RAG', query: 'rag' },
    { label: '🛡️ Privacy Tools', query: 'privacy' },
    { label: '⌨️ Neovim', query: 'neovim' },
    { label: '🌐 WebAssembly', query: 'webassembly' }
  ],
  [
    { label: '🎙️ Voice & TTS', query: 'text-to-speech' },
    { label: '📘 Knowledge Base', query: 'note-taking' },
    { label: '🐳 Docker Stacks', query: 'docker-compose' },
    { label: '🎨 Design Systems', query: 'ui-components' },
    { label: '📡 Networking', query: 'wireguard' },
    { label: '🐍 Automation', query: 'python automation' },
    { label: '📊 Data & BI', query: 'analytics' },
    { label: '📦 Package Mgrs', query: 'package-manager' },
    { label: '📱 Material You', query: 'jetpack-compose' },
    { label: '🔬 Dev Observability', query: 'opentelemetry' }
  ],
  [
    { label: '🧬 Edge Inference', query: 'llama' },
    { label: '💻 Code Editors', query: 'code-editor' },
    { label: '🎧 Audio Players', query: 'music-player' },
    { label: '☁️ Serverless', query: 'cloudflare-workers' },
    { label: '🔐 Passwords & Auth', query: 'authentication' },
    { label: '🗺️ Maps & Geo', query: 'openstreetmap' },
    { label: '📐 CAD & 3D', query: 'threejs' },
    { label: '⚙️ Kubernetes', query: 'kubernetes' },
    { label: '🚀 Build Tools', query: 'bundler' },
    { label: '🕹️ Emulators', query: 'emulator' }
  ]
];

const TOPIC_EMOJI_MAP: Array<[RegExp, string]> = [
  [/ai|llm|agent|gpt|rag|ml|deep/i, '🤖'],
  [/android|apk|kotlin|compose|mobile/i, '📱'],
  [/rust|cargo/i, '🦀'],
  [/python/i, '🐍'],
  [/security|auth|privacy|pentest|crypto/i, '🔒'],
  [/docker|self|home|server|cloud|k8s/i, '📦'],
  [/video|audio|ffmpeg|media|stream/i, '🎬'],
  [/react|next|vue|svelte|web|ts|js/i, '⚡'],
  [/cli|terminal|tui|shell/i, '⌨️'],
  [/game|godot|3d|unity/i, '🎮'],
];

const IGNORED_TOPICS = new Set([
  'awesome', 'awesome-list', 'list', 'lists', 'tutorial', 'resources',
  'open-source', 'opensource', 'free', 'project', 'app', 'tool', 'tools',
  'github', 'hacktoberfest', 'learning', 'examples', 'documentation'
]);

function formatTopicKeyword(topic: string): SpotlightKeyword {
  const clean = topic.trim().toLowerCase();
  const emojiRule = TOPIC_EMOJI_MAP.find(([regex]) => regex.test(clean));
  const emoji = emojiRule ? emojiRule[1] : '✨';
  const pretty = clean
    .split(/[-_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return {
    label: `${emoji} ${pretty.length > 18 ? pretty.slice(0, 17) + '…' : pretty}`,
    query: clean
  };
}

function getCurrentCycleIndex(now: number = Date.now()): number {
  return Math.floor(now / TEN_DAYS_MS);
}

/**
 * Computes next suggestion rotation timestamp for UI/telemetry if needed.
 */
export function getNextSuggestionCycleDate(): string {
  const cycleEnd = (getCurrentCycleIndex() + 1) * TEN_DAYS_MS;
  try {
    return new Date(cycleEnd).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

/**
 * Returns cached 10-day suggestions synchronously (0ms), falling back cleanly to the current cycle's curated cohort.
 */
export function getCachedSpotlightSuggestions(): SpotlightKeyword[] {
  const now = Date.now();
  const currentCycle = getCurrentCycleIndex(now);

  try {
    const raw = localStorage.getItem(SUGGESTIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        Array.isArray(parsed?.keywords) &&
        parsed.keywords.length >= 6 &&
        parsed.periodIndex === currentCycle &&
        now - (parsed.generatedAt || 0) < TEN_DAYS_MS
      ) {
        return parsed.keywords.slice(0, 10);
      }
    }
  } catch {}

  const cohort = ROTATING_COHORTS[currentCycle % ROTATING_COHORTS.length];
  return cohort;
}

/**
 * Refreshes Spotlight keyword suggestions when entering a new 10-day interval.
 * Blends Vault user affinity, rotating seasonal topics, and top newly-trending GitHub topics.
 */
export async function refreshSpotlightSuggestionsIfDue(): Promise<SpotlightKeyword[]> {
  const now = Date.now();
  const currentCycle = getCurrentCycleIndex(now);

  try {
    const raw = localStorage.getItem(SUGGESTIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        Array.isArray(parsed?.keywords) &&
        parsed.keywords.length >= 10 &&
        parsed.periodIndex === currentCycle &&
        now - (parsed.generatedAt || 0) < TEN_DAYS_MS
      ) {
        return parsed.keywords.slice(0, 10);
      }
    }
  } catch {}

  const baseCohort = [...ROTATING_COHORTS[currentCycle % ROTATING_COHORTS.length]];
  const collected: SpotlightKeyword[] = [];
  const seenQueries = new Set<string>();

  const pushUnique = (kw: SpotlightKeyword) => {
    const qNorm = kw.query.trim().toLowerCase();
    if (!qNorm || seenQueries.has(qNorm)) return;
    seenQueries.add(qNorm);
    collected.push(kw);
  };

  // 0. Blend onboarding picked topic interests first
  try {
    const picked = getUserInterests();
    for (const topic of picked.slice(0, 3)) {
      pushUnique(formatTopicKeyword(topic));
    }
  } catch {}

  // 1. User affinity: top 2 topics/languages from saved Vault bookmarks
  try {
    const bookmarks = getBookmarks();
    const freq = new Map<string, number>();
    for (const b of bookmarks.slice(0, 30)) {
      for (const t of b.topics || []) {
        const lower = t.toLowerCase();
        if (lower.length >= 3 && !IGNORED_TOPICS.has(lower)) {
          freq.set(lower, (freq.get(lower) || 0) + 1);
        }
      }
    }
    const topUserTopics = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([t]) => formatTopicKeyword(t));
    for (const kw of topUserTopics) pushUnique(kw);
  } catch {}

  // 2. Live 10-day emerging topic intelligence (single query cached for 10 days!)
  try {
    const tenDaysAgo = new Date(now - TEN_DAYS_MS).toISOString().split('T')[0];
    const trendingSample = await fetchRepositories(
      'all',
      `created:>=${tenDaysAgo} stars:>80`,
      'stars',
      0,
      1,
      30,
      false,
      false
    );

    const topicCounts = new Map<string, number>();
    for (const r of trendingSample.repositories || []) {
      for (const t of r.topics || []) {
        const clean = t.toLowerCase().trim();
        if (clean.length >= 3 && clean.length <= 22 && !IGNORED_TOPICS.has(clean)) {
          topicCounts.set(clean, (topicCounts.get(clean) || 0) + 1);
        }
      }
    }

    const emergingTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([t]) => formatTopicKeyword(t));

    for (const kw of emergingTopics) pushUnique(kw);
  } catch {}

  // 3. Fill remaining slots up to 10 from the rotating 10-day seasonal cohort
  for (const kw of baseCohort) {
    if (collected.length >= 10) break;
    pushUnique(kw);
  }

  const finalKeywords = collected.slice(0, 10);
  safeSetLocalCache(
    SUGGESTIONS_STORAGE_KEY,
    JSON.stringify({
      generatedAt: now,
      periodIndex: currentCycle,
      keywords: finalKeywords
    })
  );

  return finalKeywords;
}
