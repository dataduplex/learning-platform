import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom implements no matchMedia, so any component reading prefers-color-scheme
// throws without this. Reports light and never changes, which is the deterministic
// starting point useResolvedMode already assumes.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) => ({
    media: query,
    matches: false,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});
