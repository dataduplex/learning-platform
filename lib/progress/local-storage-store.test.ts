import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalStorageStore } from './local-storage-store';

/** Minimal in-memory Storage. Keeps the tests free of jsdom globals. */
function memoryStorage(seed: Record<string, string> = {}): Storage {
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

const KEY = 'test-course:progress:v1';

let clock = 1000;
const now = () => clock;

beforeEach(() => { clock = 1000; });

describe('createLocalStorageStore', () => {
  it('starts empty when storage is empty', () => {
    const store = createLocalStorageStore({ storage: memoryStorage(), now, key: KEY });
    expect(store.load().lessons).toEqual({});
  });

  it('records a visit and persists it under the versioned key', () => {
    const storage = memoryStorage();
    const store = createLocalStorageStore({ storage, now, key: KEY });
    store.markVisited('vectors-as-meaning');
    expect(store.load().lessons['vectors-as-meaning']?.visited).toBe(true);
    const persisted = JSON.parse(storage.getItem(KEY) as string);
    expect(persisted.version).toBe(1);
    expect(persisted.lessons['vectors-as-meaning'].visited).toBe(true);
  });

  it('is idempotent: a second visit does not duplicate anything', () => {
    const store = createLocalStorageStore({ storage: memoryStorage(), now, key: KEY });
    store.markVisited('vectors-as-meaning');
    store.markVisited('vectors-as-meaning');
    expect(Object.keys(store.load().lessons)).toEqual(['vectors-as-meaning']);
  });

  it('stamps completion time from the injected clock', () => {
    const store = createLocalStorageStore({ storage: memoryStorage(), now, key: KEY });
    clock = 5555;
    store.setCompleted('vectors-as-meaning', true);
    expect(store.load().lessons['vectors-as-meaning']?.completedAt).toBe(5555);
  });

  it('clears the completion time when completion is undone', () => {
    const store = createLocalStorageStore({ storage: memoryStorage(), now, key: KEY });
    store.setCompleted('vectors-as-meaning', true);
    store.setCompleted('vectors-as-meaning', false);
    const lesson = store.load().lessons['vectors-as-meaning'];
    expect(lesson?.completed).toBe(false);
    expect(lesson?.completedAt).toBeNull();
  });

  it('appends attempts in order and stamps each with the clock', () => {
    const store = createLocalStorageStore({ storage: memoryStorage(), now, key: KEY });
    store.recordAttempt('vectors-as-meaning', { exerciseId: 'e1', correct: false, revealed: false });
    clock = 2000;
    store.recordAttempt('vectors-as-meaning', { exerciseId: 'e1', correct: true, revealed: false });
    expect(store.load().lessons['vectors-as-meaning']?.attempts).toEqual([
      { exerciseId: 'e1', correct: false, revealed: false, at: 1000 },
      { exerciseId: 'e1', correct: true, revealed: false, at: 2000 },
    ]);
  });

  it('keeps at most the most recent 50 attempts per lesson', () => {
    const store = createLocalStorageStore({ storage: memoryStorage(), now, key: KEY });
    for (let i = 0; i < 60; i += 1) {
      clock = i;
      store.recordAttempt('vectors-as-meaning', { exerciseId: `e${i}`, correct: true, revealed: false });
    }
    const attempts = store.load().lessons['vectors-as-meaning']?.attempts ?? [];
    expect(attempts).toHaveLength(50);
    expect(attempts[0]?.exerciseId).toBe('e10');
  });

  it('stores and clears a note', () => {
    const store = createLocalStorageStore({ storage: memoryStorage(), now, key: KEY });
    store.setNote('vectors-as-meaning', 'a basis is a choice');
    expect(store.load().notes['vectors-as-meaning']).toBe('a basis is a choice');
    store.setNote('vectors-as-meaning', '   ');
    expect(store.load().notes['vectors-as-meaning']).toBeUndefined();
  });

  it('notifies subscribers on every write and stops after unsubscribe', () => {
    const store = createLocalStorageStore({ storage: memoryStorage(), now, key: KEY });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.markVisited('vectors-as-meaning');
    store.setCompleted('vectors-as-meaning', true);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    store.markVisited('dot-product-similarity');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('migrates a v0 payload found in storage on first load', () => {
    const storage = memoryStorage({
      [KEY]: JSON.stringify({ completed: ['vectors-as-meaning'] }),
    });
    const store = createLocalStorageStore({ storage, now, key: KEY });
    expect(store.load().lessons['vectors-as-meaning']?.completed).toBe(true);
  });

  it('recovers from corrupt JSON instead of throwing', () => {
    const storage = memoryStorage({ [KEY]: '{not json' });
    const store = createLocalStorageStore({ storage, now, key: KEY });
    expect(store.load().lessons).toEqual({});
  });

  it('keeps working when storage refuses to write', () => {
    // Safari private browsing throws on setItem. Losing progress is acceptable;
    // breaking the lesson is not.
    const storage = memoryStorage();
    storage.setItem = () => { throw new DOMException('quota'); };
    const store = createLocalStorageStore({ storage, now, key: KEY });
    expect(() => store.markVisited('vectors-as-meaning')).not.toThrow();
    expect(store.load().lessons['vectors-as-meaning']?.visited).toBe(true);
  });

  it('round-trips through export and import', () => {
    const first = createLocalStorageStore({ storage: memoryStorage(), now, key: KEY });
    first.setCompleted('vectors-as-meaning', true);
    const json = first.exportJson();

    const second = createLocalStorageStore({ storage: memoryStorage(), now, key: KEY });
    second.importJson(json);
    expect(second.load()).toEqual(first.load());
  });

  it('rejects an import that is not a progress snapshot', () => {
    const store = createLocalStorageStore({ storage: memoryStorage(), now, key: KEY });
    expect(() => store.importJson('[]')).toThrow(/snapshot/i);
    expect(() => store.importJson('{oops')).toThrow(/JSON/i);
  });

  it('resets to empty', () => {
    const store = createLocalStorageStore({ storage: memoryStorage(), now, key: KEY });
    store.setCompleted('vectors-as-meaning', true);
    store.reset();
    expect(store.load().lessons).toEqual({});
  });
});
