import { screen, waitFor } from '@testing-library/react';
import { renderWithCourse } from '../../test/render';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CodeCell, fencedCode } from './CodeCell';
import type { PyodideClient, RunResult } from '../../lib/pyodide/client';

function stubClient(result: RunResult): PyodideClient {
  return {
    run: vi.fn(async () => result),
    status: () => 'idle',
    subscribe: () => () => {},
    dispose: vi.fn(),
  };
}

const CODE = 'import numpy as np\nprint(np.dot([1, 2], [3, 4]))';

const NESTED = [
  'def sign(x):',
  '    if x < 0:',
  '        return -1',
  '',
  '    return 1',
].join('\n');

/** What a fenced python block in a lesson compiles to. */
function fence(code: string) {
  return <pre><code className="language-python">{`${code}\n`}</code></pre>;
}

/** A child as React's Flight client hands it over after client-side navigation. */
function lazy(node: ReactNode): ReactNode {
  return {
    $$typeof: Symbol.for('react.lazy'),
    _payload: node,
    _init: (payload: unknown) => payload,
  } as unknown as ReactNode;
}

describe('CodeCell', () => {
  it('shows the code before anything runs', () => {
    renderWithCourse(<CodeCell client={stubClient({ stdout: '', value: null, error: null })}>{fence(CODE)}</CodeCell>);
    expect(screen.getByText(/import numpy as np/)).toBeInTheDocument();
  });

  it('runs on demand and shows stdout', async () => {
    const user = userEvent.setup();
    renderWithCourse(<CodeCell client={stubClient({ stdout: '11\n', value: null, error: null })}>{fence(CODE)}</CodeCell>);
    await user.click(screen.getByRole('button', { name: /run/i }));
    expect(await screen.findByText('11')).toBeInTheDocument();
  });

  it('shows a traceback as an error, with words not only color', async () => {
    const user = userEvent.setup();
    renderWithCourse(
      <CodeCell client={stubClient({ stdout: '', value: null, error: 'NameError: x' })}>{fence(CODE)}</CodeCell>,
    );
    await user.click(screen.getByRole('button', { name: /run/i }));
    const output = await screen.findByRole('status');
    expect(output).toHaveTextContent(/error/i);
    expect(output).toHaveTextContent(/NameError/);
  });

  it('announces that it is loading on the first run, since Pyodide is a large download', async () => {
    const user = userEvent.setup();
    let resolve: ((value: RunResult) => void) | undefined;
    const client: PyodideClient = {
      run: vi.fn(() => new Promise<RunResult>((r) => { resolve = r; })),
      status: () => 'loading',
      subscribe: () => () => {},
      dispose: vi.fn(),
    };
    renderWithCourse(<CodeCell client={client}>{fence(CODE)}</CodeCell>);
    await user.click(screen.getByRole('button', { name: /run/i }));
    expect(screen.getByRole('status')).toHaveTextContent(/loading python/i);
    resolve?.({ stdout: 'done\n', value: null, error: null });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('done'));
  });

  it('lets a learner edit the code and run what they wrote', async () => {
    const user = userEvent.setup();
    const client = stubClient({ stdout: '', value: null, error: null });
    renderWithCourse(<CodeCell client={client} editable>{fence('1 + 1')}</CodeCell>);
    const editor = screen.getByRole('textbox', { name: /python/i });
    await user.clear(editor);
    await user.type(editor, '2 + 2');
    await user.click(screen.getByRole('button', { name: /run/i }));
    expect(client.run).toHaveBeenCalledWith('2 + 2');
  });

  it('restores the original code on reset', async () => {
    const user = userEvent.setup();
    renderWithCourse(
      <CodeCell client={stubClient({ stdout: '', value: null, error: null })} editable>{fence('1 + 1')}</CodeCell>,
    );
    const editor = screen.getByRole('textbox', { name: /python/i });
    await user.clear(editor);
    await user.type(editor, 'broken');
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(editor).toHaveValue('1 + 1');
  });

  it('keeps the fenced code verbatim, indentation included', () => {
    const client = stubClient({ stdout: '', value: null, error: null });
    const { unmount } = renderWithCourse(<CodeCell client={client} editable>{fence(NESTED)}</CodeCell>);
    expect(screen.getByRole('textbox', { name: /python/i })).toHaveValue(NESTED);
    unmount();
    const { container } = renderWithCourse(<CodeCell client={client}>{fence(NESTED)}</CodeCell>);
    expect(container.querySelector('.code-cell-source code')?.textContent).toBe(NESTED);
  });

  it('gives the editor one row per line, and never fewer than three', async () => {
    const user = userEvent.setup();
    const client = stubClient({ stdout: '', value: null, error: null });
    const { unmount } = renderWithCourse(<CodeCell client={client} editable>{fence(NESTED)}</CodeCell>);
    const editor = screen.getByRole('textbox', { name: /python/i });
    expect(editor).toHaveAttribute('rows', '5');
    await user.type(editor, '{Enter}{Enter}print(sign(-2))');
    expect(editor).toHaveAttribute('rows', '7');
    unmount();
    renderWithCourse(<CodeCell client={client} editable>{fence('1 + 1')}</CodeCell>);
    expect(screen.getByRole('textbox', { name: /python/i })).toHaveAttribute('rows', '3');
  });

  it('turns soft wrapping off, so a long line scrolls instead of restarting at column 0', () => {
    renderWithCourse(<CodeCell client={stubClient({ stdout: '', value: null, error: null })} editable>{fence(CODE)}</CodeCell>);
    expect(screen.getByRole('textbox', { name: /python/i })).toHaveAttribute('wrap', 'off');
  });

  it('throws unless it holds exactly one fenced python block', () => {
    const message = 'A code cell holds exactly one fenced python block.';
    expect(fencedCode(fence(NESTED))).toBe(NESTED);
    expect(() => fencedCode('print(1)')).toThrow(message);
    expect(() => fencedCode(<pre><code className="language-js">{'1\n'}</code></pre>)).toThrow(message);
    expect(() => fencedCode(<pre>{'print(1)\n'}</pre>)).toThrow(message);
    expect(() => fencedCode([fence('1'), fence('2')])).toThrow(message);
    expect(() => fencedCode(undefined)).toThrow(message);
  });

  it('reads a block that arrives as a lazy reference, as it does after client-side navigation', () => {
    expect(fencedCode(lazy(fence(NESTED)))).toBe(NESTED);
    expect(fencedCode(<pre>{lazy(<code className="language-python">{'x = 2\n'}</code>)}</pre>)).toBe('x = 2');
    expect(fencedCode(lazy(lazy(fence('1'))))).toBe('1');
    expect(() => fencedCode(lazy(<pre>{'print(1)\n'}</pre>))).toThrow('A code cell holds exactly one fenced python block.');
  });

  it('renders a cell whose block arrives as a lazy reference', () => {
    renderWithCourse(
      <CodeCell client={stubClient({ stdout: '', value: null, error: null })} editable>{lazy(fence(NESTED))}</CodeCell>,
    );
    expect(screen.getByRole('textbox', { name: /python/i })).toHaveValue(NESTED);
  });

  it('disables Run while a run is in flight, so a slow cell is not queued twice', async () => {
    const user = userEvent.setup();
    const client: PyodideClient = {
      run: vi.fn(() => new Promise<RunResult>(() => {})),
      status: () => 'running',
      subscribe: () => () => {},
      dispose: vi.fn(),
    };
    renderWithCourse(<CodeCell client={client}>{fence('1')}</CodeCell>);
    await user.click(screen.getByRole('button', { name: /run/i }));
    expect(screen.getByRole('button', { name: /run/i })).toBeDisabled();
  });
});
