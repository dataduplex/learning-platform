import {
  PROGRESS_SCHEMA_VERSION, type AttemptRecord, type LessonProgress,
  type ProgressSnapshot,
} from './types';

export function emptySnapshot(): ProgressSnapshot {
  return { version: PROGRESS_SCHEMA_VERSION, lessons: {}, notes: {} };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeAttempt(value: unknown): AttemptRecord | null {
  if (!isRecord(value) || typeof value.exerciseId !== 'string') return null;
  return {
    exerciseId: value.exerciseId,
    correct: value.correct === true,
    revealed: value.revealed === true,
    at: typeof value.at === 'number' ? value.at : 0,
  };
}

function normalizeLesson(value: unknown): LessonProgress | null {
  if (!isRecord(value)) return null;
  const completed = value.completed === true;
  const attempts = Array.isArray(value.attempts)
    ? value.attempts.map(normalizeAttempt).filter((a): a is AttemptRecord => a !== null)
    : [];
  return {
    // An entry exists at all only because the lesson was opened.
    visited: value.visited === undefined ? true : value.visited === true,
    completed,
    completedAt: typeof value.completedAt === 'number' ? value.completedAt : null,
    attempts,
  };
}

function normalizeNotes(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const notes: Record<string, string> = {};
  for (const [key, text] of Object.entries(value)) {
    if (typeof text === 'string' && text.trim() !== '') notes[key] = text;
  }
  return notes;
}

/** v0 was unversioned: a bare list of completed lesson ids. */
function fromV0(raw: Record<string, unknown>): ProgressSnapshot {
  const snapshot = emptySnapshot();
  const completed = Array.isArray(raw.completed) ? raw.completed : [];
  for (const id of completed) {
    if (typeof id !== 'string') continue;
    snapshot.lessons[id] = { visited: true, completed: true, completedAt: null, attempts: [] };
  }
  return snapshot;
}

/**
 * Brings any persisted payload to the current schema. Unrecognizable or
 * future-versioned data is discarded rather than guessed at: losing local
 * progress is recoverable, rendering against a wrong shape is not.
 */
export function migrate(raw: unknown): ProgressSnapshot {
  if (!isRecord(raw)) return emptySnapshot();

  const version = typeof raw.version === 'number' ? raw.version : 0;
  if (version === 0) return fromV0(raw);
  if (version > PROGRESS_SCHEMA_VERSION) return emptySnapshot();

  const lessons: Record<string, LessonProgress> = {};
  if (isRecord(raw.lessons)) {
    for (const [id, value] of Object.entries(raw.lessons)) {
      const lesson = normalizeLesson(value);
      if (lesson) lessons[id] = lesson;
    }
  }
  return { version: PROGRESS_SCHEMA_VERSION, lessons, notes: normalizeNotes(raw.notes) };
}
