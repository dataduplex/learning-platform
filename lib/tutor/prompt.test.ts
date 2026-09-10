import { describe, expect, it } from 'vitest';
import type { LessonContext } from './context';
import { SYSTEM_PROMPT, buildRequestBlocks } from './prompt';

const CONTEXT: LessonContext = {
  lessonId: 'dot-product-similarity',
  title: 'The dot product and similarity',
  partTitle: 'Foundations',
  objectives: ['Compute a dot product'],
  prerequisites: ['vectors-as-meaning'],
  notation: [],
  body: 'The dot product multiplies entrywise and sums.',
  wordCount: 7,
};

describe('SYSTEM_PROMPT', () => {
  it('tells the tutor to teach rather than to answer exercises', () => {
    expect(SYSTEM_PROMPT).toMatch(/do not give the answer/i);
  });

  it('tells the tutor to stay inside what the learner has covered', () => {
    expect(SYSTEM_PROMPT).toMatch(/earlier lesson/i);
  });

  it('tells the tutor to say when it does not know', () => {
    expect(SYSTEM_PROMPT).toMatch(/say so/i);
  });
});

describe('buildRequestBlocks', () => {
  it('puts the lesson context in its own cacheable block', () => {
    const blocks = buildRequestBlocks({ context: CONTEXT, history: [], question: 'Why?' });
    const contextBlock = blocks.system.find((block) => block.text.includes('dot product multiplies'));
    expect(contextBlock?.cache_control).toEqual({ type: 'ephemeral' });
  });

  it('does not mark the system instructions themselves as ephemeral', () => {
    const blocks = buildRequestBlocks({ context: CONTEXT, history: [], question: 'Why?' });
    expect(blocks.system[0]?.cache_control).toBeUndefined();
  });

  // Render order is system then messages, so the breakpoint on the last system
  // block caches the instructions and the lesson together.
  it('puts the stable instructions before the lesson context', () => {
    const blocks = buildRequestBlocks({ context: CONTEXT, history: [], question: 'Why?' });
    expect(blocks.system).toHaveLength(2);
    expect(blocks.system[0]?.text).toBe(SYSTEM_PROMPT);
    expect(blocks.system.at(-1)?.cache_control).toEqual({ type: 'ephemeral' });
  });

  it('works with no lesson context at all', () => {
    const blocks = buildRequestBlocks({ context: null, history: [], question: 'Why?' });
    expect(blocks.system).toHaveLength(1);
    expect(blocks.messages).toEqual([{ role: 'user', content: 'Why?' }]);
  });

  it('carries prior turns through in order', () => {
    const blocks = buildRequestBlocks({
      context: null,
      history: [
        { role: 'user', content: 'First?' },
        { role: 'assistant', content: 'Yes.' },
      ],
      question: 'Second?',
    });
    expect(blocks.messages.map((message) => message.content)).toEqual(['First?', 'Yes.', 'Second?']);
  });

  it('marks an exercise question so the tutor hints instead of solving', () => {
    const blocks = buildRequestBlocks({
      context: null,
      history: [],
      question: 'Am I close?',
      exercisePrompt: 'Compute the norm of (3, 4).',
    });
    const last = blocks.messages.at(-1);
    expect(last?.content).toContain('Compute the norm of (3, 4)');
    expect(last?.content).toMatch(/hint/i);
  });
});
