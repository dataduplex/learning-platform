import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CodeCell } from './CodeCell';
import type { PyodideClient, RunResult } from '@/lib/pyodide/client';

function stubClient(result: RunResult): PyodideClient {
  return {
    run: vi.fn(async () => result),
    status: () => 'idle',
    subscribe: () => () => {},
    dispose: vi.fn(),
  };
}

const CODE = 'import numpy as np\nprint(np.dot([1, 2], [3, 4]))';

describe('CodeCell', () => {
  it('shows the code before anything runs', () => {
    render(<CodeCell code={CODE} client={stubClient({ stdout: '', value: null, error: null })} />);
    expect(screen.getByText(/import numpy as np/)).toBeInTheDocument();
  });

  it('runs on demand and shows stdout', async () => {
    const user = userEvent.setup();
    render(<CodeCell code={CODE} client={stubClient({ stdout: '11\n', value: null, error: null })} />);
    await user.click(screen.getByRole('button', { name: /run/i }));
    expect(await screen.findByText('11')).toBeInTheDocument();
  });

  it('shows a traceback as an error, with words not only color', async () => {
    const user = userEvent.setup();
    render(
      <CodeCell code={CODE} client={stubClient({ stdout: '', value: null, error: 'NameError: x' })} />,
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
    render(<CodeCell code={CODE} client={client} />);
    await user.click(screen.getByRole('button', { name: /run/i }));
    expect(screen.getByRole('status')).toHaveTextContent(/loading python/i);
    resolve?.({ stdout: 'done\n', value: null, error: null });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('done'));
  });

  it('lets a learner edit the code and run what they wrote', async () => {
    const user = userEvent.setup();
    const client = stubClient({ stdout: '', value: null, error: null });
    render(<CodeCell code="1 + 1" client={client} editable />);
    const editor = screen.getByRole('textbox', { name: /python/i });
    await user.clear(editor);
    await user.type(editor, '2 + 2');
    await user.click(screen.getByRole('button', { name: /run/i }));
    expect(client.run).toHaveBeenCalledWith('2 + 2');
  });

  it('restores the original code on reset', async () => {
    const user = userEvent.setup();
    render(<CodeCell code="1 + 1" client={stubClient({ stdout: '', value: null, error: null })} editable />);
    const editor = screen.getByRole('textbox', { name: /python/i });
    await user.clear(editor);
    await user.type(editor, 'broken');
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(editor).toHaveValue('1 + 1');
  });

  it('disables Run while a run is in flight, so a slow cell is not queued twice', async () => {
    const user = userEvent.setup();
    const client: PyodideClient = {
      run: vi.fn(() => new Promise<RunResult>(() => {})),
      status: () => 'running',
      subscribe: () => () => {},
      dispose: vi.fn(),
    };
    render(<CodeCell code="1" client={client} />);
    await user.click(screen.getByRole('button', { name: /run/i }));
    expect(screen.getByRole('button', { name: /run/i })).toBeDisabled();
  });
});
