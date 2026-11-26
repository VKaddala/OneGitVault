/**
 * Vault Annotation Store
 * Manages personal private notes, custom developer workflow tags (#billing, #auth, #infra),
 * and "Revisit Later" smart reminders for bookmarked and starred repositories.
 */

const ANNOTATIONS_STORAGE_KEY = 'ogv_repo_annotations_v1';

export interface RepoReminder {
  date: string; // ISO date string
  label: string; // e.g. "This Weekend", "Tomorrow", "Next Week"
  completed?: boolean;
}

export interface RepoAnnotation {
  repoId: number;
  repoFullName: string;
  notes?: string;
  tags?: string[];
  reminder?: RepoReminder;
  updatedAt: number;
}

type AnnotationsMap = Record<number, RepoAnnotation>;

let cachedAnnotations: AnnotationsMap | null = null;

function loadAnnotations(): AnnotationsMap {
  if (cachedAnnotations !== null) return cachedAnnotations;
  try {
    const raw = localStorage.getItem(ANNOTATIONS_STORAGE_KEY);
    cachedAnnotations = raw ? JSON.parse(raw) : {};
  } catch {
    cachedAnnotations = {};
  }
  return cachedAnnotations!;
}

function persistAnnotations(map: AnnotationsMap): void {
  cachedAnnotations = map;
  try {
    localStorage.setItem(ANNOTATIONS_STORAGE_KEY, JSON.stringify(map));
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ogv_annotations_updated'));
  }
}

export function getRepoAnnotation(repoId: number): RepoAnnotation | null {
  const map = loadAnnotations();
  return map[repoId] || null;
}

export function saveRepoNote(repoId: number, repoFullName: string, notes: string): void {
  const map = { ...loadAnnotations() };
  const existing = map[repoId] || { repoId, repoFullName, updatedAt: Date.now() };
  const trimmed = notes.trim();
  if (!trimmed) {
    delete existing.notes;
  } else {
    existing.notes = trimmed;
  }
  existing.updatedAt = Date.now();
  map[repoId] = existing;
  persistAnnotations(map);
}

export function addRepoTag(repoId: number, repoFullName: string, tag: string): void {
  const cleanTag = tag.trim().replace(/^#+/, '').toLowerCase();
  if (!cleanTag) return;
  const map = { ...loadAnnotations() };
  const existing = map[repoId] || { repoId, repoFullName, updatedAt: Date.now() };
  const currentTags = Array.isArray(existing.tags) ? existing.tags : [];
  if (!currentTags.includes(cleanTag)) {
    existing.tags = [...currentTags, cleanTag];
  }
  existing.updatedAt = Date.now();
  map[repoId] = existing;
  persistAnnotations(map);
}

export function removeRepoTag(repoId: number, tag: string): void {
  const cleanTag = tag.trim().replace(/^#+/, '').toLowerCase();
  const map = { ...loadAnnotations() };
  const existing = map[repoId];
  if (!existing || !Array.isArray(existing.tags)) return;
  existing.tags = existing.tags.filter((t) => t.toLowerCase() !== cleanTag);
  if (existing.tags.length === 0) {
    delete existing.tags;
  }
  existing.updatedAt = Date.now();
  map[repoId] = existing;
  persistAnnotations(map);
}

export function setRepoReminder(
  repoId: number,
  repoFullName: string,
  date: string,
  label: string
): void {
  const map = { ...loadAnnotations() };
  const existing = map[repoId] || { repoId, repoFullName, updatedAt: Date.now() };
  existing.reminder = {
    date,
    label,
    completed: false,
  };
  existing.updatedAt = Date.now();
  map[repoId] = existing;
  persistAnnotations(map);
}

export function clearRepoReminder(repoId: number): void {
  const map = { ...loadAnnotations() };
  const existing = map[repoId];
  if (!existing || !existing.reminder) return;
  delete existing.reminder;
  existing.updatedAt = Date.now();
  map[repoId] = existing;
  persistAnnotations(map);
}

export function getAllAnnotations(): AnnotationsMap {
  return { ...loadAnnotations() };
}

export function getAllCustomTags(): string[] {
  const map = loadAnnotations();
  const tagSet = new Set<string>();
  for (const item of Object.values(map)) {
    if (Array.isArray(item.tags)) {
      item.tags.forEach((t) => tagSet.add(t));
    }
  }
  return Array.from(tagSet).sort();
}

export function getRevisitQueue(): RepoAnnotation[] {
  const map = loadAnnotations();
  return Object.values(map)
    .filter((a) => Boolean(a.reminder && !a.reminder.completed))
    .sort((a, b) => new Date(a.reminder!.date).getTime() - new Date(b.reminder!.date).getTime());
}
