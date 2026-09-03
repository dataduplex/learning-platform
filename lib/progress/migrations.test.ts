import { describe, expect, it } from 'vitest';
import { PROGRESS_SCHEMA_VERSION } from './types';
import { emptySnapshot, migrate } from './migrations';

describe('migrate', () => {
  it('returns an empty snapshot at the current version for null', () => {
    const snapshot = migrate(null);
    expect(snapshot.version).toBe(PROGRESS_SCHEMA_VERSION);
    expect(snapshot.lessons).toEqual({});
  });

  it('returns an empty snapshot for a non-object', () => {
    expect(migrate('nonsense').lessons).toEqual({});
    expect(migrate(42).lessons).toEqual({});
  });

  it('lifts the unversioned v0 shape into v1, keeping completions', () => {
    const v0 = { completed: ['vectors-as-meaning', 'dot-product-similarity'] };
    const snapshot = migrate(v0);
    expect(snapshot.version).toBe(1);
    expect(snapshot.lessons['vectors-as-meaning']).toEqual({
      visited: true, completed: true, completedAt: null, attempts: [],
    });
    expect(snapshot.lessons['dot-product-similarity']?.completed).toBe(true);
  });

  it('tolerates a v0 shape with no completed array', () => {
    expect(migrate({}).lessons).toEqual({});
  });

  it('passes a current-version snapshot through unchanged', () => {
    const current = {
      version: 1,
      lessons: {
        'vectors-as-meaning': {
          visited: true, completed: false, completedAt: null,
          attempts: [{ exerciseId: 'e1', correct: true, revealed: false, at: 1000 }],
        },
      },
      notes: { 'vectors-as-meaning': 'basis is a choice' },
    };
    expect(migrate(current)).toEqual(current);
  });

  it('discards a snapshot from a future version rather than guessing its shape', () => {
    const snapshot = migrate({ version: 99, lessons: { x: {} } });
    expect(snapshot.version).toBe(PROGRESS_SCHEMA_VERSION);
    expect(snapshot.lessons).toEqual({});
  });

  it('drops lesson entries that are not objects', () => {
    const snapshot = migrate({ version: 1, lessons: { a: 'broken' }, notes: {} });
    expect(snapshot.lessons).toEqual({});
  });

  it('fills missing fields on a partial lesson entry', () => {
    const snapshot = migrate({ version: 1, lessons: { a: { completed: true } }, notes: {} });
    expect(snapshot.lessons['a']).toEqual({
      visited: true, completed: true, completedAt: null, attempts: [],
    });
  });
});
