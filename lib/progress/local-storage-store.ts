import type { LessonId } from '../course/types';
import { emptySnapshot, migrate } from './migrations';
import type { AttemptRecord, LessonProgress, ProgressSnapshot, ProgressStore } from './types';

/** Bounded so one lesson cannot fill the origin's storage quota. */
const MAX_ATTEMPTS_PER_LESSON = 50;

export interface LocalStorageStoreOptions {
  storage: Storage;
  now: () => number;
  /** The storage key the snapshot lives under. */
  key: string;
}

function blankLesson(): LessonProgress {
  return { visited: false, completed: false, completedAt: null, attempts: [] };
}

export function createLocalStorageStore(options: LocalStorageStoreOptions): ProgressStore {
  const { storage, now, key } = options;
  const listeners = new Set<() => void>();
  let snapshot = read();

  function read(): ProgressSnapshot {
    try {
      const persisted = storage.getItem(key);
      return persisted === null ? emptySnapshot() : migrate(JSON.parse(persisted));
    } catch {
      // Corrupt payload or storage that refuses reads. Start clean.
      return emptySnapshot();
    }
  }

  /**
   * In-memory state is the source of truth for this session, so a storage
   * failure costs persistence but never the lesson the learner is reading.
   */
  function commit(next: ProgressSnapshot): void {
    snapshot = next;
    try {
      storage.setItem(key, JSON.stringify(next));
    } catch {
      // Private browsing or a full quota. Nothing useful to do here.
    }
    for (const listener of listeners) listener();
  }

  function update(lesson: LessonId, change: (current: LessonProgress) => LessonProgress): void {
    const current = snapshot.lessons[lesson] ?? blankLesson();
    commit({
      ...snapshot,
      lessons: { ...snapshot.lessons, [lesson]: change(current) },
    });
  }

  return {
    load: () => snapshot,

    markVisited: (lesson) => update(lesson, (current) => ({ ...current, visited: true })),

    setCompleted: (lesson, completed) => update(lesson, (current) => ({
      ...current,
      visited: true,
      completed,
      completedAt: completed ? now() : null,
    })),

    recordAttempt: (lesson, attempt) => update(lesson, (current) => {
      const record: AttemptRecord = { ...attempt, at: now() };
      const attempts = [...current.attempts, record].slice(-MAX_ATTEMPTS_PER_LESSON);
      return { ...current, visited: true, attempts };
    }),

    setNote: (lesson, text) => {
      const notes = { ...snapshot.notes };
      if (text.trim() === '') delete notes[lesson];
      else notes[lesson] = text;
      commit({ ...snapshot, notes });
    },

    reset: () => {
      try {
        storage.removeItem(key);
      } catch {
        // Ignored for the same reason as a failed write.
      }
      commit(emptySnapshot());
    },

    exportJson: () => JSON.stringify(snapshot, null, 2),

    importJson: (json) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(json);
      } catch {
        throw new Error('That file is not valid JSON.');
      }
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('That file is not a progress snapshot.');
      }
      commit(migrate(parsed));
    },

    subscribe: (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}
