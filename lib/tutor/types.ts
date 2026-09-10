import type { LessonContext } from './context';

export interface TutorMessage {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

export interface TutorRequest {
  readonly context: LessonContext | null;
  readonly history: readonly TutorMessage[];
  /** The learner's new question. */
  readonly question: string;
  /** Set when the question was asked from an exercise, so the tutor can hint not answer. */
  readonly exercisePrompt?: string;
}

export type TutorChunk =
  | { readonly kind: 'text'; readonly text: string }
  /**
   * Emitted once per request, before any text. Exists so the caching claim is
   * observable: a second question about the same lesson MUST report a non-zero
   * cacheReadTokens, and if it does not, the cached block is not byte-stable.
   */
  | {
      readonly kind: 'usage';
      readonly cacheReadTokens: number;
      readonly cacheWriteTokens: number;
    }
  | { readonly kind: 'done' };

export type TutorErrorKind =
  | 'no-key'
  | 'bad-key'
  | 'rate-limited'
  | 'refused'
  | 'network'
  | 'unknown';

export class TutorError extends Error {
  constructor(readonly kind: TutorErrorKind, message: string) {
    super(message);
    this.name = 'TutorError';
  }
}

/**
 * The one thing components depend on. A server-proxy implementation lands as a
 * second class satisfying this interface, with no change above it.
 */
export interface TutorTransport {
  /** True when the transport can send: a key is present, or none is needed. */
  isReady(): boolean;
  ask(request: TutorRequest, signal?: AbortSignal): AsyncIterable<TutorChunk>;
}
