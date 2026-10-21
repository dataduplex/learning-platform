import { describe, expect, it } from 'vitest';
import { clearKey, looksLikeKey, readKey, writeKey } from './key-store';

const STORAGE_KEY = 'test-course:tutor-key';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => { map.delete(key); },
    setItem: (key, value) => { map.set(key, value); },
  };
}

describe('looksLikeKey', () => {
  it('accepts the documented prefix and a plausible length', () => {
    expect(looksLikeKey(`sk-ant-${'x'.repeat(60)}`)).toBe(true);
  });

  it('rejects an empty string, whitespace, and an obviously wrong prefix', () => {
    for (const bad of ['', '   ', 'hunter2', `pk-ant-${'x'.repeat(60)}`]) {
      expect(looksLikeKey(bad)).toBe(false);
    }
  });

  it('rejects something too short to be a key', () => {
    expect(looksLikeKey('sk-ant-abc')).toBe(false);
  });
});

describe('the key store', () => {
  it('round-trips a key', () => {
    const storage = memoryStorage();
    writeKey(`sk-ant-${'x'.repeat(60)}`, storage, STORAGE_KEY);
    expect(readKey(storage, STORAGE_KEY)).toBe(`sk-ant-${'x'.repeat(60)}`);
  });

  it('trims surrounding whitespace, which pasting reliably introduces', () => {
    const storage = memoryStorage();
    writeKey(`  sk-ant-${'x'.repeat(60)}\n`, storage, STORAGE_KEY);
    expect(readKey(storage, STORAGE_KEY)).toBe(`sk-ant-${'x'.repeat(60)}`);
  });

  it('refuses to store something that is not key-shaped', () => {
    const storage = memoryStorage();
    expect(() => writeKey('hunter2', storage, STORAGE_KEY)).toThrow(/does not look like/i);
    expect(readKey(storage, STORAGE_KEY)).toBeNull();
  });

  it('reports no key when none was ever written', () => {
    expect(readKey(memoryStorage(), STORAGE_KEY)).toBeNull();
  });

  it('clears the key', () => {
    const storage = memoryStorage();
    writeKey(`sk-ant-${'x'.repeat(60)}`, storage, STORAGE_KEY);
    clearKey(storage, STORAGE_KEY);
    expect(readKey(storage, STORAGE_KEY)).toBeNull();
  });

  it('survives storage that throws, as it does in private browsing', () => {
    const hostile: Storage = {
      ...memoryStorage(),
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
    };
    expect(readKey(hostile, STORAGE_KEY)).toBeNull();
    expect(() => writeKey(`sk-ant-${'x'.repeat(60)}`, hostile, STORAGE_KEY)).not.toThrow();
  });

  it('never puts the rejected value in the error it throws', () => {
    // A mistyped key is still a secret, and this error reaches the UI.
    const attempt = `sk-ant-oops${'y'.repeat(20)}-typo`;
    try {
      writeKey('not-a-key-at-all', memoryStorage(), STORAGE_KEY);
    } catch (error) {
      expect((error as Error).message).not.toContain('not-a-key-at-all');
    }
    expect(() => writeKey(attempt.slice(0, 10), memoryStorage(), STORAGE_KEY)).toThrow(/does not look like/i);
  });
});
