import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserWorker, createPyodideClient } from './client';
import type { WorkerLike } from './protocol';

/** A stand-in for the real worker: replies on the next microtask. */
function fakeWorker(reply: (code: string) => unknown): WorkerLike & { terminated: boolean } {
  const listeners = new Set<(event: { data: unknown }) => void>();
  const worker = {
    terminated: false,
    addEventListener(_type: 'message', listener: (event: { data: unknown }) => void) {
      listeners.add(listener);
    },
    removeEventListener(_type: 'message', listener: (event: { data: unknown }) => void) {
      listeners.delete(listener);
    },
    postMessage(message: unknown) {
      const request = message as { id: number; code: string };
      void Promise.resolve().then(() => {
        const data = { id: request.id, ...(reply(request.code) as object) };
        for (const listener of listeners) listener({ data });
      });
    },
    terminate() { worker.terminated = true; },
  };
  return worker;
}

describe('createPyodideClient', () => {
  it('returns stdout and the final expression value', async () => {
    const client = createPyodideClient({
      worker: fakeWorker(() => ({ ok: true, stdout: 'hello\n', value: '42' })),
    });
    await expect(client.run('print("hello")\n42')).resolves.toEqual({
      stdout: 'hello\n',
      value: '42',
      error: null,
    });
  });

  it('surfaces a Python traceback as an error result rather than throwing', async () => {
    const client = createPyodideClient({
      worker: fakeWorker(() => ({ ok: false, error: 'NameError: name "x" is not defined' })),
    });
    const result = await client.run('x');
    expect(result.error).toMatch(/NameError/);
    expect(result.stdout).toBe('');
  });

  it('matches replies to requests, so two runs cannot cross', async () => {
    const client = createPyodideClient({
      worker: fakeWorker((code) => ({ ok: true, stdout: '', value: code })),
    });
    const [first, second] = await Promise.all([client.run('one'), client.run('two')]);
    expect(first.value).toBe('one');
    expect(second.value).toBe('two');
  });

  it('reports status as it moves from idle to running and back', async () => {
    const seen: string[] = [];
    const client = createPyodideClient({
      worker: fakeWorker(() => ({ ok: true, stdout: '', value: null })),
    });
    client.subscribe(() => seen.push(client.status()));
    await client.run('1');
    expect(seen).toEqual(['loading', 'running', 'idle']);
  });

  it('reports a worker that fails to load as an error, once', async () => {
    const client = createPyodideClient({
      worker: fakeWorker(() => ({ ok: false, error: 'failed to fetch pyodide' })),
    });
    const result = await client.run('1');
    expect(result.error).toMatch(/failed to fetch/);
    expect(client.status()).toBe('idle');
  });

  it('terminates the worker on dispose', () => {
    const worker = fakeWorker(() => ({ ok: true, stdout: '', value: null }));
    const client = createPyodideClient({ worker });
    client.dispose();
    expect(worker.terminated).toBe(true);
  });

  it('rejects a run after dispose instead of hanging', async () => {
    const client = createPyodideClient({
      worker: fakeWorker(() => ({ ok: true, stdout: '', value: null })),
    });
    client.dispose();
    await expect(client.run('1')).rejects.toThrow(/disposed/);
  });
});

describe('browserWorker', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the worker script from under the base path', () => {
    const urls: string[] = [];
    vi.stubGlobal('Worker', class { constructor(url: string) { urls.push(url); } });
    browserWorker('/courses/test');
    expect(urls).toEqual(['/courses/test/pyodide-worker.js']);
  });
});
