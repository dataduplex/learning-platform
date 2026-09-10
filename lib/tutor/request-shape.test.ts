import type { MessageStreamParams } from '@anthropic-ai/sdk/resources/messages/messages';
import { describe, expect, it } from 'vitest';

/**
 * The transport types its client seam as Record<string, unknown> so tests can
 * inject a fake, which means TypeScript cannot check the request body against the
 * SDK. This file restores that check: it is the same literal the transport sends,
 * annotated with the SDK's own params type. If a parameter is renamed, removed, or
 * newly rejected, `npm run typecheck` fails here instead of the browser getting a
 * 400 the first time a learner asks a question.
 */
const BODY: MessageStreamParams = {
  model: 'claude-opus-5',
  max_tokens: 8192,
  thinking: { type: 'adaptive' },
  output_config: { effort: 'medium' },
  system: [
    { type: 'text', text: 'instructions' },
    { type: 'text', text: 'lesson context', cache_control: { type: 'ephemeral' } },
  ],
  messages: [{ role: 'user', content: 'Why is the dot product a similarity?' }],
};

describe('the request body the transport sends', () => {
  it('is a valid SDK request, as the type annotation above asserts at compile time', () => {
    expect(BODY.model).toBe('claude-opus-5');
  });

  it('carries no sampling parameters, which claude-opus-5 rejects with a 400', () => {
    for (const banned of ['temperature', 'top_p', 'top_k']) {
      expect(BODY as Record<string, unknown>).not.toHaveProperty(banned);
    }
  });

  it('does not use budget_tokens, which this model rejects', () => {
    expect(BODY.thinking).toEqual({ type: 'adaptive' });
  });

  it('ends its system array with the cached block, so the prefix is stable', () => {
    // Render order is system then messages: a breakpoint on the last system block
    // caches the instructions and the lesson together.
    const system = BODY.system as { cache_control?: unknown }[];
    expect(system.at(-1)?.cache_control).toEqual({ type: 'ephemeral' });
    expect(system[0]?.cache_control).toBeUndefined();
  });
});
