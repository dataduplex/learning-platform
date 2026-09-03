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
    // An entry's presence implies interaction, so missing flag reads as visited.
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
function v0ToV1(raw: Record<string, unknown>): Record<string, unknown> {
  const lessons: Record<string, unknown> = {};
  const completed = Array.isArray(raw.completed) ? raw.completed : [];
  for (const id of completed) {
    if (typeof id !== 'string') continue;
    lessons[id] = { visited: true, completed: true, completedAt: null, attempts: [] };
  }
  return { version: 1, lessons, notes: {} };
}

/**
 * Step i takes a version-i payload to version i+1. Each returns a raw record
 * rather than a ProgressSnapshot, because only the final normalize produces the
 * typed shape. Append one function per schema bump and raise
 * PROGRESS_SCHEMA_VERSION in the same change.
 */
const STEPS: ReadonlyArray<(raw: Record<string, unknown>) => Record<string, unknown>> = [
  v0ToV1,
];

/** Exported so a schema bump that forgets its step fails a test, not a learner's load. */
export const MIGRATION_STEP_COUNT = STEPS.length;

function normalizeCurrent(raw: Record<string, unknown>): ProgressSnapshot {
  const lessons: Record<string, LessonProgress> = {};
  if (isRecord(raw.lessons)) {
    for (const [id, value] of Object.entries(raw.lessons)) {
      const lesson = normalizeLesson(value);
      if (lesson) lessons[id] = lesson;
    }
  }
  return { version: PROGRESS_SCHEMA_VERSION, lessons, notes: normalizeNotes(raw.notes) };
}

/**
 * Brings any persisted payload to the current schema. Unrecognizable or
 * future-versioned data is discarded rather than guessed at: losing local
 * progress is recoverable, rendering against a wrong shape is not.
 */
export function migrate(raw: unknown): ProgressSnapshot {
  if (!isRecord(raw)) return emptySnapshot();
  const version = typeof raw.version === 'number' ? raw.version : 0;
  if (version > PROGRESS_SCHEMA_VERSION) return emptySnapshot();

  let data = raw;
  for (let v = version; v < PROGRESS_SCHEMA_VERSION; v += 1) {
    const step = STEPS[v];
    if (step === undefined) return emptySnapshot();
    data = step(data);
  }
  return normalizeCurrent(data);
}
