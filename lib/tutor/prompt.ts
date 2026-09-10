import { contextToPromptBlock } from './context';
import type { TutorMessage, TutorRequest } from './types';

export interface SystemBlock {
  readonly type: 'text';
  readonly text: string;
  readonly cache_control?: { readonly type: 'ephemeral' };
}

export interface RequestBlocks {
  readonly system: readonly SystemBlock[];
  readonly messages: readonly TutorMessage[];
}

export const SYSTEM_PROMPT = [
  'You are a tutor inside an interactive course on the mathematics behind large language',
  'models. The learner is a working software engineer who studied calculus and linear',
  'algebra years ago and remembers the vocabulary but not the mechanics.',
  '',
  'How to answer:',
  '- Start from the concrete. Give a small worked example with actual numbers before any',
  '  general statement.',
  '- Stay inside what the learner has covered. The lesson text below is what they have just',
  '  read; if answering properly needs something from a later part of the course, say which',
  '  idea it needs and give the intuition without the machinery.',
  '- Connect back to an earlier lesson by name when it helps.',
  '- Use LaTeX between single dollar signs for inline maths and double for display maths.',
  '  The interface renders it.',
  '- Be brief. Two or three short paragraphs is usually right.',
  '',
  'What not to do:',
  '- When the learner asks about an exercise, do not give the answer. Ask what they have',
  '  tried, or give the next step only. The course grades exercises, not you, and a learner',
  '  who is handed the answer has lost the exercise.',
  '- Do not invent notation the course has not introduced.',
  '- If you are not sure, say so plainly rather than guessing. A wrong confident answer',
  '  costs the learner far more than an admission of uncertainty.',
].join('\n');

export function buildRequestBlocks(request: TutorRequest): RequestBlocks {
  const system: SystemBlock[] = [{ type: 'text', text: SYSTEM_PROMPT }];

  if (request.context !== null) {
    // Cached: identical for every question about this lesson, and by far the largest block.
    system.push({
      type: 'text',
      text: contextToPromptBlock(request.context),
      cache_control: { type: 'ephemeral' },
    });
  }

  const question = request.exercisePrompt === undefined
    ? request.question
    : [
      'I am working on this exercise:',
      request.exercisePrompt,
      '',
      'My question:',
      request.question,
      '',
      '(Give me a hint, not the answer.)',
    ].join('\n');

  return {
    system,
    messages: [...request.history, { role: 'user', content: question }],
  };
}
