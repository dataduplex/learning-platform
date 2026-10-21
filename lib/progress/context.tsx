'use client';

import {
  createContext, useCallback, useContext, useMemo, useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useCourse } from '../course/context';
import { progressStorageKey } from '../course/keys';
import type { LessonId } from '../course/types';
import { createLocalStorageStore } from './local-storage-store';
import { emptySnapshot } from './migrations';
import type { LessonProgress, ProgressSnapshot, ProgressStore } from './types';

const ProgressContext = createContext<ProgressStore | null>(null);

/** Used during prerender and in any tree without a provider. */
const SERVER_SNAPSHOT = emptySnapshot();

function createDefaultStore(key: string): ProgressStore {
  return createLocalStorageStore({
    storage: window.localStorage,
    now: () => Date.now(),
    key,
  });
}

let browserStore: ProgressStore | null = null;

function sharedBrowserStore(key: string): ProgressStore {
  browserStore ??= createDefaultStore(key);
  return browserStore;
}

export function ProgressProvider({
  children,
  store,
}: {
  children: ReactNode;
  /** Injected by tests and, later, by a server-backed adapter. */
  store?: ProgressStore;
}) {
  const key = progressStorageKey(useCourse().identity.storageKeyPrefix);
  const value = useMemo(
    () => store ?? (typeof window === 'undefined' ? null : sharedBrowserStore(key)),
    [store, key],
  );
  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

function useStore(): ProgressStore | null {
  return useContext(ProgressContext);
}

export function useProgress(): {
  snapshot: ProgressSnapshot;
  store: ProgressStore | null;
} {
  const store = useStore();
  const subscribe = useCallback(
    (listener: () => void) => store?.subscribe(listener) ?? (() => {}),
    [store],
  );
  const snapshot = useSyncExternalStore(
    subscribe,
    () => store?.load() ?? SERVER_SNAPSHOT,
    () => SERVER_SNAPSHOT,
  );
  return { snapshot, store };
}

const BLANK: LessonProgress = {
  visited: false, completed: false, completedAt: null, attempts: [],
};

export function useLessonProgress(lesson: LessonId): {
  progress: LessonProgress;
  store: ProgressStore | null;
} {
  const { snapshot, store } = useProgress();
  return { progress: snapshot.lessons[lesson] ?? BLANK, store };
}
