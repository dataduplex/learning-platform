import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { ProgressProvider, createLocalStorageStore, type ProgressStore } from '@/lib/progress';

/** In-memory Storage so component tests never touch a global. */
export function memoryStorage(seed: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(seed));
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => { map.delete(key); },
    setItem: (key, value) => { map.set(key, value); },
  };
}

export interface ProgressRenderResult extends RenderResult {
  store: ProgressStore;
}

/**
 * Renders inside a ProgressProvider backed by memory and a fixed clock, and
 * hands the store back so a test can assert on what was recorded.
 */
export function renderWithProgress(
  ui: ReactElement,
  options: Omit<RenderOptions, 'wrapper'> & { store?: ProgressStore } = {},
): ProgressRenderResult {
  const { store: provided, ...rest } = options;
  const store = provided ?? createLocalStorageStore({
    storage: memoryStorage(),
    now: () => 1_700_000_000_000,
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ProgressProvider store={store}>{children}</ProgressProvider>
  );
  return { ...render(ui, { wrapper, ...rest }), store };
}
