import Anthropic from '@anthropic-ai/sdk';
import { readKey } from './key-store';
import { buildRequestBlocks } from './prompt';
import { TutorError, type TutorChunk, type TutorRequest, type TutorTransport } from './types';

const MODEL = 'claude-opus-5';
/**
 * Thinking is on by default on this model and shares max_tokens with the response
 * text, so this budget covers both. Brevity comes from the system prompt, not from
 * a cap tight enough to truncate an answer once thinking is counted.
 */
const MAX_TOKENS = 8192;
/**
 * The latency and cost lever for an interactive tutor. Lower than the `high`
 * default because a two-paragraph answer to a scoped question does not need the
 * ceiling; raise it if answers come back shallow.
 */
const EFFORT = 'medium';

/** The slice of the SDK this module uses, so tests can supply a stand-in. */
interface StreamingClient {
  messages: { stream(body: Record<string, unknown>): AsyncIterable<unknown> };
}

export interface BrowserTutorOptions {
  /** The localStorage key holding the learner's API key. */
  readonly key: string;
  /** The system prompt sent with every request. */
  readonly systemPrompt: string;
}

export interface BrowserKeyTransportOptions extends BrowserTutorOptions {
  readonly storage: Storage;
  readonly createClient?: (apiKey: string) => StreamingClient;
}

function defaultClient(apiKey: string): StreamingClient {
  // The learner's own key in the learner's own browser is the whole design here.
  // There is no server to hold it, which is exactly why this flag is appropriate.
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true }) as unknown as StreamingClient;
}

function classify(error: unknown): TutorError {
  const status = typeof error === 'object' && error !== null && 'status' in error
    ? (error as { status?: unknown }).status
    : undefined;

  if (status === 401 || status === 403) {
    return new TutorError('bad-key', 'The API key was rejected. Check it and try again.');
  }
  if (status === 429) {
    return new TutorError('rate-limited', 'Rate limited. Wait a moment and ask again.');
  }
  if (error instanceof TypeError) {
    return new TutorError('network', 'Could not reach the API. Check your connection.');
  }
  // Deliberately generic: an upstream message can contain the request, and the
  // request can contain the key.
  return new TutorError('unknown', 'The tutor request failed.');
}

function isTextDelta(event: unknown): event is { delta: { text: string } } {
  if (typeof event !== 'object' || event === null) return false;
  const candidate = event as { type?: unknown; delta?: { type?: unknown; text?: unknown } };
  return candidate.type === 'content_block_delta'
    && candidate.delta?.type === 'text_delta'
    && typeof candidate.delta.text === 'string';
}

/** Cache counters arrive on message_start, before any content. */
function usageOf(event: unknown): { read: number; write: number } | null {
  if (typeof event !== 'object' || event === null) return null;
  const candidate = event as { type?: unknown; message?: { usage?: Record<string, unknown> } };
  if (candidate.type !== 'message_start') return null;
  const usage = candidate.message?.usage;
  if (usage === undefined) return null;
  const read = usage.cache_read_input_tokens;
  const write = usage.cache_creation_input_tokens;
  return {
    read: typeof read === 'number' ? read : 0,
    write: typeof write === 'number' ? write : 0,
  };
}

function stopReasonOf(event: unknown): string | null {
  if (typeof event !== 'object' || event === null) return null;
  const candidate = event as { type?: unknown; delta?: { stop_reason?: unknown } };
  if (candidate.type !== 'message_delta') return null;
  const reason = candidate.delta?.stop_reason;
  return typeof reason === 'string' ? reason : null;
}

export function createBrowserKeyTransport(
  options: BrowserKeyTransportOptions,
): TutorTransport {
  const createClient = options.createClient ?? defaultClient;

  return {
    isReady: () => readKey(options.storage, options.key) !== null,

    async *ask(request: TutorRequest, signal?: AbortSignal): AsyncIterable<TutorChunk> {
      const apiKey = readKey(options.storage, options.key);
      if (apiKey === null) {
        throw new TutorError('no-key', 'Add your Anthropic API key to use the tutor.');
      }
      signal?.throwIfAborted();

      const { system, messages } = buildRequestBlocks(request, options.systemPrompt);

      let stream: AsyncIterable<unknown>;
      try {
        // No temperature, top_p, or top_k: this model rejects them outright.
        stream = createClient(apiKey).messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          thinking: { type: 'adaptive' },
          output_config: { effort: EFFORT },
          system,
          messages,
        });
      } catch (error) {
        throw classify(error);
      }

      try {
        for await (const event of stream) {
          signal?.throwIfAborted();

          // Check the stop reason before reading content: a refusal must not be shown.
          const reason = stopReasonOf(event);
          if (reason === 'refusal') {
            throw new TutorError('refused', 'The model declined to answer that.');
          }
          const usage = usageOf(event);
          if (usage !== null) {
            yield { kind: 'usage', cacheReadTokens: usage.read, cacheWriteTokens: usage.write };
          }
          if (isTextDelta(event)) {
            yield { kind: 'text', text: event.delta.text };
          }
        }
      } catch (error) {
        if (error instanceof TutorError) throw error;
        if (error instanceof DOMException && error.name === 'AbortError') throw error;
        throw classify(error);
      }

      yield { kind: 'done' };
    },
  };
}
