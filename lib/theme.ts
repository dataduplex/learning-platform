// Server-safe on purpose: a course's root layout is a server component and inlines
// themeBootstrapScript from here, so this module MUST NOT depend on a React hook.
// The hooks live in theme-client.ts.
import type { Mode } from './palette';

export type ThemeChoice = 'light' | 'dark' | 'system';

const CHOICES: readonly ThemeChoice[] = ['light', 'dark', 'system'];

function isChoice(value: unknown): value is ThemeChoice {
  return typeof value === 'string' && (CHOICES as readonly string[]).includes(value);
}

export function readStoredTheme(storage: Storage, key: string): ThemeChoice {
  try {
    const raw = storage.getItem(key);
    return isChoice(raw) ? raw : 'system';
  } catch {
    return 'system';
  }
}

const listeners = new Set<() => void>();

/**
 * The stored choice is the single source of truth, so readers subscribe rather
 * than keep a copy. A same-tab write emits no storage event, so applyTheme
 * announces itself; the storage event covers the other tabs.
 */
export function subscribeToTheme(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

/**
 * 'system' clears the attribute so the prefers-color-scheme block applies;
 * anything else stamps it, which wins over the OS in both directions.
 */
export function applyTheme(choice: ThemeChoice, root: HTMLElement, storage: Storage, key: string): void {
  if (choice === 'system') {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = choice;
  }
  try {
    storage.setItem(key, choice);
  } catch {
    // A refused write costs the choice on reload, nothing more.
  }
  for (const listener of listeners) listener();
}

/**
 * Inlined in the document head and run before first paint, so a dark-mode
 * reader never sees a light flash. A string because it must not wait for hydration.
 */
export function themeBootstrapScript(key: string): string {
  return `try{var t=localStorage.getItem('${key}');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t}}catch(e){}`;
}

/** Whether a dark surface is showing right now: the toggle wins, the OS decides otherwise. */
export function resolveMode(root: HTMLElement, prefersDark: boolean): Mode {
  const stamped = root.dataset.theme;
  if (stamped === 'dark') return 'dark';
  if (stamped === 'light') return 'light';
  return prefersDark ? 'dark' : 'light';
}
