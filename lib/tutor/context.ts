import { withBasePath } from '../base-path';
export interface NotationSummary {
  readonly id: string;
  /** KaTeX source, no delimiters. Same field name as NotationEntry.symbol. */
  readonly symbol: string;
  readonly meaning: string;
}

export interface LessonContext {
  readonly lessonId: string;
  readonly title: string;
  readonly partTitle: string;
  readonly objectives: readonly string[];
  readonly prerequisites: readonly string[];
  readonly notation: readonly NotationSummary[];
  readonly body: string;
  readonly wordCount: number;
}

function isLessonContext(value: unknown): value is LessonContext {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.lessonId === 'string'
    && typeof candidate.title === 'string'
    && typeof candidate.body === 'string'
    && Array.isArray(candidate.objectives)
    && Array.isArray(candidate.notation);
}

/** Null means "no context available", which the tutor treats as a normal state. */
export async function loadLessonContext(
  lessonId: string,
  fetcher: typeof fetch = fetch,
): Promise<LessonContext | null> {
  try {
    const response = await fetcher(withBasePath(`/lesson-context/${lessonId}.json`));
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    return isLessonContext(payload) ? payload : null;
  } catch {
    return null;
  }
}

/** The cacheable half of the prompt. Must be byte-stable for a given lesson. */
export function contextToPromptBlock(context: LessonContext): string {
  const notation = context.notation.length === 0
    ? 'None introduced in this lesson.'
    : context.notation.map((entry) => `- ${entry.symbol}: ${entry.meaning}`).join('\n');

  return [
    `# Lesson: ${context.title}`,
    `Part: ${context.partTitle}`,
    '',
    '## What this lesson is meant to teach',
    context.objectives.map((objective) => `- ${objective}`).join('\n'),
    '',
    '## Notation introduced here',
    notation,
    '',
    '## Lesson text',
    context.body,
  ].join('\n');
}
