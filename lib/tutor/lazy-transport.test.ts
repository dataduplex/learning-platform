import { describe, expect, it, vi } from 'vitest';
import { createLazyBrowserTransport } from './lazy-transport';
import { TutorError } from './types';

const KEY = `sk-ant-${'x'.repeat(60)}`;

function storageWith(key: string | null): Storage {
  return {
    length: key === null ? 0 : 1,
    clear: vi.fn(),
    getItem: () => key,
    key: () => null,
    removeItem: vi.fn(),
    setItem: vi.fn(),
  };
}

describe('createLazyBrowserTransport', () => {
  it('answers isReady from the key store alone, with no request', () => {
    expect(createLazyBrowserTransport(storageWith(KEY)).isReady()).toBe(true);
    expect(createLazyBrowserTransport(storageWith(null)).isReady()).toBe(false);
  });

  it('still reports a missing key as no-key once asked', async () => {
    const transport = createLazyBrowserTransport(storageWith(null));
    const consume = async () => {
      // The error arrives on the first pull, so nothing may be yielded before it.
      for await (const chunk of transport.ask({ context: null, history: [], question: 'Hi' })) {
        throw new Error(`expected no chunks before the error, got ${chunk.kind}`);
      }
    };
    await expect(consume()).rejects.toMatchObject({ kind: 'no-key' });
    await expect(consume()).rejects.toThrow(TutorError);
  });
});
