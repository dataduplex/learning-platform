'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useCourse } from '../../lib/course/context';
import { tutorKeyStorageKey } from '../../lib/course/keys';
import { clearKey } from '../../lib/tutor/key-store';
import { createLazyBrowserTransport } from '../../lib/tutor/lazy-transport';
import { systemPrompt } from '../../lib/tutor/prompt';
import { useTutor } from '../../lib/tutor/use-tutor';
import type { TutorTransport } from '../../lib/tutor/types';
import { KeyGate } from './KeyGate';
import { MessageList } from './MessageList';

const PANEL_ID = 'tutor-panel';

export function TutorPanel({
  lessonId,
  transport,
  exercisePrompt,
}: {
  lessonId: string;
  transport?: TutorTransport;
  exercisePrompt?: string;
}) {
  const { identity } = useCourse();
  const storageKey = tutorKeyStorageKey(identity.storageKeyPrefix);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState('');
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const resolved = useMemo(
    () => transport ?? createLazyBrowserTransport(window.localStorage, {
      key: storageKey,
      systemPrompt: systemPrompt(identity.tutor),
    }),
    [transport, storageKey, identity.tutor],
  );
  const { messages, streaming, error, busy, usage, ask, retry } = useTutor({
    lessonId,
    transport: resolved,
    basePath: identity.basePath,
  });

  useEffect(() => { if (open && ready) inputRef.current?.focus(); }, [open, ready]);

  function close() {
    setOpen(false);
    // The opener stays mounted so focus has somewhere to land.
    openerRef.current?.focus();
  }

  function toggle() {
    if (open) {
      close();
      return;
    }
    // Read the key on open rather than in an effect: it only changes through this
    // panel's own controls, so there is nothing to subscribe to.
    setReady(resolved.isReady());
    setOpen(true);
  }

  function submit() {
    const question = draft;
    setDraft('');
    void ask(question, exercisePrompt);
  }

  return (
    <>
      <button
        type="button"
        ref={openerRef}
        className="tutor-opener"
        aria-expanded={open}
        aria-controls={PANEL_ID}
        onClick={toggle}
      >
        {open ? 'Hide the tutor' : 'Ask about this lesson'}
      </button>

      {!open ? null : (
        <section
          id={PANEL_ID}
          className="tutor-panel"
          aria-label="Lesson tutor"
          onKeyDown={(event) => { if (event.key === 'Escape') close(); }}
        >
          <header>
            <h2>Tutor</h2>
            <button type="button" onClick={close} aria-label="Close the tutor">Close</button>
          </header>

          {ready ? (
            <>
              <MessageList messages={messages} streaming={streaming} />

              {busy ? <p className="tutor-status" role="status">Thinking&hellip;</p> : null}

              {usage === null ? null : (
                <p className="tutor-usage">
                  {usage.cacheReadTokens > 0
                    ? `Lesson context served from cache (${usage.cacheReadTokens} tokens).`
                    : `Lesson context cached for the next question (${usage.cacheWriteTokens} tokens).`}
                </p>
              )}

              {error === null ? null : (
                <div className="tutor-error">
                  <p role="alert">{error.message}</p>
                  {error.kind === 'bad-key' ? (
                    <button
                      type="button"
                      onClick={() => { clearKey(window.localStorage, storageKey); setReady(false); }}
                    >
                      Replace the key
                    </button>
                  ) : (
                    <button type="button" onClick={retry}>Try again</button>
                  )}
                </div>
              )}

              <form onSubmit={(event) => { event.preventDefault(); submit(); }}>
                <label htmlFor="tutor-question">Your question</label>
                <textarea
                  id="tutor-question"
                  ref={inputRef}
                  rows={3}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    // Enter sends; Shift+Enter is a newline. Chat convention, and the
                    // learner is mid-thought, not composing an essay.
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      submit();
                    }
                  }}
                />
                <button type="submit" disabled={busy}>Send</button>
              </form>
            </>
          ) : (
            <KeyGate storage={window.localStorage} storageKey={storageKey} onSaved={() => setReady(true)} />
          )}
        </section>
      )}
    </>
  );
}
