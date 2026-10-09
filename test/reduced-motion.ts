import { vi } from 'vitest';

/** Replaces matchMedia with one under which only the reduced-motion query matches. */
export function preferReducedMotion(): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: /prefers-reduced-motion:\s*reduce/u.test(query),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}
