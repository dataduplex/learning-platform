import { describe, expect, it, vi } from 'vitest';
import { createBrowserKeyTransport } from './browser-key-transport';
import { TutorError } from './types';

const KEY = `sk-ant-${'x'.repeat(60)}`;

function storageWith(key: string | null): Storage {
  return {
    length: key === null ? 0 : 1,
    clear: vi.fn(),
    getItem: () => key,
    key: () => null,
    removeItem: vi.fn(),
    setItem: vi.fn(),
  };
}

/** A fake stream that yields the SDK's event shapes. */
function fakeStream(events: unknown[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const event of events) yield event;
    },
  };
}

function clientYielding(events: unknown[], capture?: (body: unknown) => void) {
  return {
    messages: {
      stream: vi.fn((body: unknown) => {
        capture?.(body);
        return fakeStream(events);
      }),
    },
  };
}

const TEXT_EVENTS = [
  { type: 'content_block_delta', delta: { type: 'text_delta', text: 'A vector ' } },
  { type: 'content_block_delta', delta: { type: 'text_delta', text: 'is a list.' } },
  { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
];

async function collect(iterable: AsyncIterable<{ kind: string; text?: string }>) {
  const chunks = [];
  for await (const chunk of iterable) chunks.push(chunk);
  return chunks;
}

describe('createBrowserKeyTransport', () => {
  it('is not ready without a key', () => {
    const transport = createBrowserKeyTransport({
      storage: storageWith(null),
      createClient: () => clientYielding([]),
    });
    expect(transport.isReady()).toBe(false);
  });

  it('is ready once a key is stored', () => {
    const transport = createBrowserKeyTransport({
      storage: storageWith(KEY),
      createClient: () => clientYielding([]),
    });
    expect(transport.isReady()).toBe(true);
  });

  it('throws a no-key error rather than calling out without one', async () => {
    const createClient = vi.fn(() => clientYielding([]));
    const transport = createBrowserKeyTransport({ storage: storageWith(null), createClient });
    await expect(collect(transport.ask({ context: null, history: [], question: 'Hi' })))
      .rejects.toThrow(TutorError);
    expect(createClient).not.toHaveBeenCalled();
  });

  it('streams text deltas through as chunks, then done', async () => {
    const transport = createBrowserKeyTransport({
      storage: storageWith(KEY),
      createClient: () => clientYielding(TEXT_EVENTS),
    });
    const chunks = await collect(transport.ask({ context: null, history: [], question: 'Hi' }));
    expect(chunks).toEqual([
      { kind: 'text', text: 'A vector ' },
      { kind: 'text', text: 'is a list.' },
      { kind: 'done' },
    ]);
  });

  it('sends the documented model and adaptive thinking', async () => {
    let body: Record<string, unknown> = {};
    const transport = createBrowserKeyTransport({
      storage: storageWith(KEY),
      createClient: () => clientYielding(TEXT_EVENTS, (sent) => { body = sent as Record<string, unknown>; }),
    });
    await collect(transport.ask({ context: null, history: [], question: 'Hi' }));
    expect(body.model).toBe('claude-opus-5');
    expect(body.thinking).toEqual({ type: 'adaptive' });
  });

  // Thinking and response text share max_tokens on this model, so a cap sized for
  // the answer alone truncates mid-sentence once thinking is counted.
  it('leaves room for thinking as well as the answer', async () => {
    let body: Record<string, unknown> = {};
    const transport = createBrowserKeyTransport({
      storage: storageWith(KEY),
      createClient: () => clientYielding(TEXT_EVENTS, (sent) => { body = sent as Record<string, unknown>; }),
    });
    await collect(transport.ask({ context: null, history: [], question: 'Hi' }));
    expect(body.max_tokens as number).toBeGreaterThanOrEqual(4096);
  });

  it('sends no sampling parameters, which this model rejects', async () => {
    let body: Record<string, unknown> = {};
    const transport = createBrowserKeyTransport({
      storage: storageWith(KEY),
      createClient: () => clientYielding(TEXT_EVENTS, (sent) => { body = sent as Record<string, unknown>; }),
    });
    await collect(transport.ask({ context: null, history: [], question: 'Hi' }));
    for (const banned of ['temperature', 'top_p', 'top_k']) {
      expect(body[banned]).toBeUndefined();
    }
  });

  it('surfaces the cache counters, so the caching claim is checkable', async () => {
    const transport = createBrowserKeyTransport({
      storage: storageWith(KEY),
      createClient: () => clientYielding([
        {
          type: 'message_start',
          message: { usage: { cache_read_input_tokens: 1840, cache_creation_input_tokens: 0 } },
        },
        ...TEXT_EVENTS,
      ]),
    });
    const chunks = await collect(transport.ask({ context: null, history: [], question: 'Hi' }));
    expect(chunks[0]).toEqual({ kind: 'usage', cacheReadTokens: 1840, cacheWriteTokens: 0 });
  });

  it('treats absent cache counters as zero rather than undefined', async () => {
    const transport = createBrowserKeyTransport({
      storage: storageWith(KEY),
      createClient: () => clientYielding([
        { type: 'message_start', message: { usage: { input_tokens: 12 } } },
        ...TEXT_EVENTS,
      ]),
    });
    const chunks = await collect(transport.ask({ context: null, history: [], question: 'Hi' }));
    expect(chunks[0]).toEqual({ kind: 'usage', cacheReadTokens: 0, cacheWriteTokens: 0 });
  });

  it('reports a refusal as its own error kind, before reading any content', async () => {
    const transport = createBrowserKeyTransport({
      storage: storageWith(KEY),
      createClient: () => clientYielding([
        { type: 'message_delta', delta: { stop_reason: 'refusal' } },
      ]),
    });
    await expect(collect(transport.ask({ context: null, history: [], question: 'Hi' })))
      .rejects.toMatchObject({ kind: 'refused' });
  });

  it('maps a 401 to a bad-key error', async () => {
    const transport = createBrowserKeyTransport({
      storage: storageWith(KEY),
      createClient: () => ({
        messages: {
          stream: () => { throw Object.assign(new Error('unauthorized'), { status: 401 }); },
        },
      }),
    });
    await expect(collect(transport.ask({ context: null, history: [], question: 'Hi' })))
      .rejects.toMatchObject({ kind: 'bad-key' });
  });

  it('maps a 429 to a rate-limited error', async () => {
    const transport = createBrowserKeyTransport({
      storage: storageWith(KEY),
      createClient: () => ({
        messages: {
          stream: () => { throw Object.assign(new Error('slow down'), { status: 429 }); },
        },
      }),
    });
    await expect(collect(transport.ask({ context: null, history: [], question: 'Hi' })))
      .rejects.toMatchObject({ kind: 'rate-limited' });
  });

  it('never puts the key in an error message', async () => {
    const transport = createBrowserKeyTransport({
      storage: storageWith(KEY),
      createClient: () => ({
        messages: {
          stream: () => { throw Object.assign(new Error(`bad key ${KEY}`), { status: 401 }); },
        },
      }),
    });
    const error = await collect(transport.ask({ context: null, history: [], question: 'Hi' }))
      .catch((caught: Error) => caught);
    expect((error as Error).message).not.toContain(KEY);
  });

  it('never puts the key in an error raised mid-stream either', async () => {
    const transport = createBrowserKeyTransport({
      storage: storageWith(KEY),
      createClient: () => ({
        messages: {
          stream: () => ({
            async *[Symbol.asyncIterator]() {
              yield TEXT_EVENTS[0];
              throw new Error(`upstream said ${KEY}`);
            },
          }),
        },
      }),
    });
    const error = await collect(transport.ask({ context: null, history: [], question: 'Hi' }))
      .catch((caught: Error) => caught);
    expect((error as Error).message).not.toContain(KEY);
  });

  it('stops when the caller aborts', async () => {
    const controller = new AbortController();
    const transport = createBrowserKeyTransport({
      storage: storageWith(KEY),
      createClient: () => clientYielding(TEXT_EVENTS),
    });
    controller.abort();
    await expect(collect(transport.ask(
      { context: null, history: [], question: 'Hi' },
      controller.signal,
    ))).rejects.toMatchObject({ name: 'AbortError' });
  });
});
