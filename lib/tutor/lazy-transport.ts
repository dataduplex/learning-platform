'use client';

import type { BrowserTutorOptions } from './browser-key-transport';
import { readKey } from './key-store';
import type { TutorChunk, TutorRequest, TutorTransport } from './types';

/**
 * A transport that pulls in the API SDK on the first question rather than on mount.
 * The SDK is around 190 kB and most readers of a lesson never ask anything, so the
 * cost belongs on the learner who uses the tutor. Readiness needs only the key
 * store, which is small enough to ship with the page.
 */
export function createLazyBrowserTransport(storage: Storage, options: BrowserTutorOptions): TutorTransport {
  return {
    isReady: () => readKey(storage, options.key) !== null,

    async *ask(request: TutorRequest, signal?: AbortSignal): AsyncIterable<TutorChunk> {
      const { createBrowserKeyTransport } = await import('./browser-key-transport');
      yield* createBrowserKeyTransport({ storage, ...options }).ask(request, signal);
    },
  };
}
