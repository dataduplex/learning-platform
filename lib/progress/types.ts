import type { LessonId } from '../course/types';

export const PROGRESS_SCHEMA_VERSION = 1;

/** One graded submission. The store stamps `at`; callers supply the rest. */
export interface AttemptRecord {
  exerciseId: string;
  correct: boolean;
  revealed: boolean;
  at: number;
}

export interface LessonProgress {
  visited: boolean;
  completed: boolean;
  completedAt: number | null;
  attempts: AttemptRecord[];
}

export interface ProgressSnapshot {
  version: number;
  /** Keyed by lesson id. Absent means never opened. */
  lessons: Record<string, LessonProgress>;
  /** Free-text learner notes, keyed by lesson id. */
  notes: Record<string, string>;
}

/**
 * The only way the app touches progress. A server-backed implementation
 * replaces the localStorage one without any component changing.
 */
export interface ProgressStore {
  load(): ProgressSnapshot;
  markVisited(lesson: LessonId): void;
  setCompleted(lesson: LessonId, completed: boolean): void;
  recordAttempt(lesson: LessonId, attempt: Omit<AttemptRecord, 'at'>): void;
  setNote(lesson: LessonId, text: string): void;
  reset(): void;
  exportJson(): string;
  importJson(json: string): void;
  /** Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
}
