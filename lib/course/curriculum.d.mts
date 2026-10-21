import type { Lesson, LessonId, Part } from './types';

export function allLessons(parts: readonly Part[]): readonly Lesson[];
export function lessonById(parts: readonly Part[], id: LessonId): Lesson | undefined;
export function partOfLesson(parts: readonly Part[], id: LessonId): Part | undefined;
export function partById(parts: readonly Part[], id: string): Part | undefined;
export function lessonsInPart(parts: readonly Part[], id: string): readonly Lesson[];
export function neighbours(parts: readonly Part[], id: LessonId): {
  readonly previous: Lesson | undefined;
  readonly next: Lesson | undefined;
};
export function lessonPath(id: LessonId): string;
