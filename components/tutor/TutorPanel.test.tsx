import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TutorPanel } from './TutorPanel';
import { TutorError, type TutorRequest, type TutorTransport } from '@/lib/tutor/types';

function transportYielding(texts: string[], ready = true): TutorTransport {
  return {
    isReady: () => ready,
    async *ask() {
      for (const text of texts) yield { kind: 'text' as const, text };
      yield { kind: 'done' as const };
    },
  };
}

function transportThrowing(error: TutorError): TutorTransport {
  return {
    isReady: () => true,
    async *ask() { throw error; },
  };
}

async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /ask about this lesson/i }));
}

function questionBox() {
  return screen.getByRole('textbox', { name: /your question/i });
}

describe('TutorPanel', () => {
  it('starts closed, so it never covers the lesson uninvited', () => {
    render(<TutorPanel lessonId="vectors-as-meaning" transport={transportYielding([])} />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ask about this lesson/i })).toBeInTheDocument();
  });

  it('opens on click and focuses the input', async () => {
    const user = userEvent.setup();
    render(<TutorPanel lessonId="vectors-as-meaning" transport={transportYielding([])} />);
    await open(user);
    expect(questionBox()).toHaveFocus();
  });

  it('shows the key gate when the transport is not ready', async () => {
    const user = userEvent.setup();
    render(<TutorPanel lessonId="vectors-as-meaning" transport={transportYielding([], false)} />);
    await open(user);
    expect(screen.getByLabelText(/api key/i)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /your question/i })).not.toBeInTheDocument();
  });

  it('streams an answer into the transcript', async () => {
    const user = userEvent.setup();
    render(
      <TutorPanel
        lessonId="vectors-as-meaning"
        transport={transportYielding(['A vector ', 'is a list.'])}
      />,
    );
    await open(user);
    await user.type(questionBox(), 'What is a vector?');
    await user.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => {
      expect(screen.getByText(/A vector is a list\./)).toBeInTheDocument();
    });
  });

  it('shows the learner their own question immediately', async () => {
    const user = userEvent.setup();
    render(<TutorPanel lessonId="vectors-as-meaning" transport={transportYielding(['ok'])} />);
    await open(user);
    await user.type(questionBox(), 'Why?');
    await user.click(screen.getByRole('button', { name: /send/i }));
    expect(screen.getByText('Why?')).toBeInTheDocument();
  });

  it('clears the input after sending, so the next question starts clean', async () => {
    const user = userEvent.setup();
    render(<TutorPanel lessonId="vectors-as-meaning" transport={transportYielding(['ok'])} />);
    await open(user);
    const input = questionBox();
    await user.type(input, 'Why?');
    await user.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => { expect(input).toHaveValue(''); });
  });

  it('refuses to send an empty question', async () => {
    const user = userEvent.setup();
    const transport = transportYielding(['ok']);
    const ask = vi.spyOn(transport, 'ask');
    render(<TutorPanel lessonId="vectors-as-meaning" transport={transport} />);
    await open(user);
    await user.click(screen.getByRole('button', { name: /send/i }));
    expect(ask).not.toHaveBeenCalled();
  });

  it('announces that it is thinking while the stream is open', async () => {
    const user = userEvent.setup();
    let release = () => {};
    const transport: TutorTransport = {
      isReady: () => true,
      async *ask() {
        await new Promise<void>((resolve) => { release = resolve; });
        yield { kind: 'done' as const };
      },
    };
    render(<TutorPanel lessonId="vectors-as-meaning" transport={transport} />);
    await open(user);
    await user.type(questionBox(), 'Why?');
    await user.click(screen.getByRole('button', { name: /send/i }));
    expect(screen.getByRole('status')).toHaveTextContent(/thinking/i);
    release();
  });

  it('shows a rejected key as an actionable message, not a stack trace', async () => {
    const user = userEvent.setup();
    render(
      <TutorPanel
        lessonId="vectors-as-meaning"
        transport={transportThrowing(new TutorError('bad-key', 'The API key was rejected.'))}
      />,
    );
    await open(user);
    await user.type(questionBox(), 'Why?');
    await user.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/key was rejected/i);
    });
    expect(screen.getByRole('button', { name: /replace the key/i })).toBeInTheDocument();
  });

  it('offers to retry after a rate limit', async () => {
    const user = userEvent.setup();
    render(
      <TutorPanel
        lessonId="vectors-as-meaning"
        transport={transportThrowing(new TutorError('rate-limited', 'Rate limited.'))}
      />,
    );
    await open(user);
    await user.type(questionBox(), 'Why?');
    await user.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  it('retries without sending the failed question twice', async () => {
    const user = userEvent.setup();
    const requests: TutorRequest[] = [];
    let calls = 0;
    const transport: TutorTransport = {
      isReady: () => true,
      async *ask(request) {
        requests.push(request);
        calls += 1;
        if (calls === 1) throw new TutorError('rate-limited', 'Rate limited.');
        yield { kind: 'text' as const, text: 'Because.' };
        yield { kind: 'done' as const };
      },
    };
    render(<TutorPanel lessonId="vectors-as-meaning" transport={transport} />);
    await open(user);
    await user.type(questionBox(), 'Why?');
    await user.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => { expect(requests).toHaveLength(2); });

    // The retried turn is the same turn, not a follow-up to itself: the question
    // belongs in `question`, and must not also sit in the history it is sent with.
    const second = requests[1];
    expect(second?.question).toBe('Why?');
    expect(second?.history.map((message) => message.content)).not.toContain('Why?');
    expect(screen.getAllByText('Why?')).toHaveLength(1);
  });

  it('carries the earlier turns as history on a follow-up question', async () => {
    const user = userEvent.setup();
    const requests: TutorRequest[] = [];
    const transport: TutorTransport = {
      isReady: () => true,
      async *ask(request) {
        requests.push(request);
        yield { kind: 'text' as const, text: 'A list.' };
        yield { kind: 'done' as const };
      },
    };
    render(<TutorPanel lessonId="vectors-as-meaning" transport={transport} />);
    await open(user);
    await user.type(questionBox(), 'What is a vector?');
    await user.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => { expect(screen.getByText('A list.')).toBeInTheDocument(); });
    await user.type(questionBox(), 'Why does that matter?');
    await user.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => { expect(requests).toHaveLength(2); });

    expect(requests[0]?.history).toEqual([]);
    expect(requests[1]?.history).toEqual([
      { role: 'user', content: 'What is a vector?' },
      { role: 'assistant', content: 'A list.' },
    ]);
  });

  it('reports the cache counters, so the caching claim is visible', async () => {
    const user = userEvent.setup();
    const transport: TutorTransport = {
      isReady: () => true,
      async *ask() {
        yield { kind: 'usage' as const, cacheReadTokens: 1840, cacheWriteTokens: 0 };
        yield { kind: 'text' as const, text: 'ok' };
        yield { kind: 'done' as const };
      },
    };
    render(<TutorPanel lessonId="vectors-as-meaning" transport={transport} />);
    await open(user);
    await user.type(questionBox(), 'Why?');
    await user.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => {
      expect(screen.getByText(/served from cache \(1840 tokens\)/i)).toBeInTheDocument();
    });
  });

  it('says what the opener will do, in both states', async () => {
    const user = userEvent.setup();
    render(<TutorPanel lessonId="vectors-as-meaning" transport={transportYielding([])} />);
    const opener = screen.getByRole('button', { name: /ask about this lesson/i });
    await user.click(opener);
    // Still the same control - it must not read as a second invitation to ask.
    expect(opener).toHaveAccessibleName(/hide the tutor/i);
    expect(opener).toHaveAttribute('aria-expanded', 'true');
    await user.click(opener);
    expect(opener).toHaveAccessibleName(/ask about this lesson/i);
    expect(opener).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on Escape and returns focus to the opener', async () => {
    const user = userEvent.setup();
    render(<TutorPanel lessonId="vectors-as-meaning" transport={transportYielding([])} />);
    const opener = screen.getByRole('button', { name: /ask about this lesson/i });
    await user.click(opener);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('textbox', { name: /your question/i })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
