'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadLessonContext, type LessonContext } from './context';
import {
  TutorError,
  type TutorMessage,
  type TutorRequest,
  type TutorTransport,
} from './types';

export interface TutorState {
  readonly messages: readonly TutorMessage[];
  readonly streaming: string | null;
  readonly error: TutorError | null;
  readonly busy: boolean;
  /** Cache counters from the most recent request; null before the first one. */
  readonly usage: { readonly cacheReadTokens: number; readonly cacheWriteTokens: number } | null;
}

const EMPTY: TutorState = {
  messages: [], streaming: null, error: null, busy: false, usage: null,
};

interface Turn {
  readonly question: string;
  readonly exercisePrompt?: string;
}

export function useTutor({
  lessonId,
  transport,
}: {
  lessonId: string;
  transport: TutorTransport;
}) {
  const [context, setContext] = useState<LessonContext | null>(null);
  const [state, setState] = useState<TutorState>(EMPTY);
  const lastTurn = useRef<Turn | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    let live = true;
    void loadLessonContext(lessonId).then((loaded) => { if (live) setContext(loaded); });
    return () => { live = false; };
  }, [lessonId]);

  // A panel that unmounts mid-stream must not leave the request running.
  useEffect(() => () => abort.current?.abort(), []);

  /**
   * Takes the history explicitly rather than reading it from state, so a retry can
   * replace its own failed turn instead of appending to it.
   */
  const send = useCallback(async (
    question: string,
    history: readonly TutorMessage[],
    exercisePrompt?: string,
  ) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;

    const asked: readonly TutorMessage[] = [...history, { role: 'user', content: question }];
    setState((previous) => ({ ...previous, messages: asked, streaming: '', error: null, busy: true }));

    let answer = '';
    try {
      const request: TutorRequest = {
        context,
        history,
        question,
        ...(exercisePrompt === undefined ? {} : { exercisePrompt }),
      };
      for await (const chunk of transport.ask(request, controller.signal)) {
        if (chunk.kind === 'text') {
          answer += chunk.text;
          setState((previous) => ({ ...previous, streaming: answer }));
        } else if (chunk.kind === 'usage') {
          setState((previous) => ({
            ...previous,
            usage: {
              cacheReadTokens: chunk.cacheReadTokens,
              cacheWriteTokens: chunk.cacheWriteTokens,
            },
          }));
        }
      }
      setState((previous) => ({
        ...previous,
        messages: [...asked, { role: 'assistant', content: answer }],
        streaming: null,
        error: null,
        busy: false,
      }));
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return;
      setState((previous) => ({
        ...previous,
        streaming: null,
        busy: false,
        error: caught instanceof TutorError
          ? caught
          : new TutorError('unknown', 'The tutor request failed.'),
      }));
    }
  }, [context, transport]);

  const ask = useCallback(async (question: string, exercisePrompt?: string) => {
    const trimmed = question.trim();
    if (trimmed === '') return;
    lastTurn.current = {
      question: trimmed,
      ...(exercisePrompt === undefined ? {} : { exercisePrompt }),
    };
    await send(trimmed, state.messages, exercisePrompt);
  }, [send, state.messages]);

  const retry = useCallback(() => {
    const turn = lastTurn.current;
    if (turn === null) return;
    // The failed question is still the last message. Drop it: this is the same turn
    // again, not a follow-up to itself.
    void send(turn.question, state.messages.slice(0, -1), turn.exercisePrompt);
  }, [send, state.messages]);

  return { ...state, ask, retry, hasContext: context !== null };
}
