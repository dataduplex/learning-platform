'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Mode } from '@/lib/palette';
import { readStoredTheme, resolveMode, subscribeToTheme, type ThemeChoice } from './theme';

/**
 * The stored choice, current across tabs. 'system' on the server so the exported
 * markup is deterministic; the bootstrap script has already stamped the document
 * by then, so nothing flashes while this corrects itself.
 */
export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(
    subscribeToTheme,
    () => readStoredTheme(window.localStorage),
    () => 'system',
  );
}

/**
 * The resolved mode, kept current as the toggle and the OS setting change.
 * Starts at 'light' so the server-rendered markup is deterministic, then
 * corrects on mount - a widget's colours are not content, so a one-frame
 * correction is invisible where a hydration mismatch would not be.
 */
export function useResolvedMode(): Mode {
  const [mode, setMode] = useState<Mode>('light');

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const root = document.documentElement;
    const sync = () => setMode(resolveMode(root, query.matches));

    sync();
    query.addEventListener('change', sync);
    // The toggle writes data-theme on the root, which no event reports.
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributeFilter: ['data-theme'] });

    return () => {
      query.removeEventListener('change', sync);
      observer.disconnect();
    };
  }, []);

  return mode;
}
