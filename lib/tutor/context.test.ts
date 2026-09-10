import { describe, expect, it, vi } from 'vitest';
import { contextToPromptBlock, loadLessonContext, type LessonContext } from './context';

const CONTEXT: LessonContext = {
  lessonId: 'vectors-as-meaning',
  title: 'Vectors as meaning',
  partTitle: 'Foundations',
  objectives: ['Read a vector as a point and an arrow'],
  prerequisites: [],
  notation: [{ id: 'vector', symbol: '\\mathbf{v}', meaning: 'a vector' }],
  body: 'A vector is a list of numbers with a geometric reading.',
  wordCount: 10,
};

function fetcherFor(status: number, payload?: unknown) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  })) as unknown as typeof fetch;
}

describe('loadLessonContext', () => {
  it('fetches the manifest for the lesson', async () => {
    const fetcher = fetcherFor(200, CONTEXT);
    await expect(loadLessonContext('vectors-as-meaning', fetcher)).resolves.toEqual(CONTEXT);
    expect(fetcher).toHaveBeenCalledWith('/lesson-context/vectors-as-meaning.json');
  });

  it('returns null when the lesson has no manifest, rather than throwing', async () => {
    // A lesson listed but not authored is an expected state, not an error.
    await expect(loadLessonContext('capstone-gpt', fetcherFor(404))).resolves.toBeNull();
  });

  it('returns null when the response is not the shape we expect', async () => {
    await expect(loadLessonContext('vectors-as-meaning', fetcherFor(200, { nope: true })))
      .resolves.toBeNull();
  });

  it('returns null when the network fails, so the tutor degrades quietly', async () => {
    const fetcher = vi.fn(async () => { throw new TypeError('offline'); }) as unknown as typeof fetch;
    await expect(loadLessonContext('vectors-as-meaning', fetcher)).resolves.toBeNull();
  });
});

describe('contextToPromptBlock', () => {
  it('names the lesson and its part', () => {
    const block = contextToPromptBlock(CONTEXT);
    expect(block).toContain('Vectors as meaning');
    expect(block).toContain('Foundations');
  });

  it('lists the objectives, which bound what the learner has been told', () => {
    expect(contextToPromptBlock(CONTEXT)).toContain('Read a vector as a point and an arrow');
  });

  it('includes the notation with its meanings', () => {
    const block = contextToPromptBlock(CONTEXT);
    expect(block).toContain('a vector');
    expect(block).toContain('\\mathbf{v}');
  });

  it('includes the lesson body', () => {
    expect(contextToPromptBlock(CONTEXT)).toContain('geometric reading');
  });

  it('is deterministic, so it caches', () => {
    // Prompt caching only pays off if the block is byte-identical across turns.
    expect(contextToPromptBlock(CONTEXT)).toBe(contextToPromptBlock(CONTEXT));
  });
});
