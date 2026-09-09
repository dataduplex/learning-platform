import { isRunReply, type WorkerLike } from './protocol';

export interface RunResult {
  stdout: string;
  /** The repr of the last expression, or null if the code ended in a statement. */
  value: string | null;
  /** A Python traceback or a load failure. Null on success. */
  error: string | null;
}

export type PyodideStatus = 'loading' | 'running' | 'idle';

export interface PyodideClient {
  run(code: string): Promise<RunResult>;
  status(): PyodideStatus;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}

/** The real worker. Constructed lazily so opening a lesson costs no download. */
export function browserWorker(): WorkerLike {
  return new Worker('/pyodide-worker.js');
}

export function createPyodideClient({ worker }: { worker: WorkerLike }): PyodideClient {
  const pending = new Map<number, (result: RunResult) => void>();
  const listeners = new Set<() => void>();
  let nextId = 1;
  let state: PyodideStatus = 'loading';
  let ready = false;
  let disposed = false;

  function announce(next: PyodideStatus): void {
    state = next;
    for (const listener of listeners) listener();
  }

  function onMessage(event: { data: unknown }): void {
    if (!isRunReply(event.data)) return;
    const reply = event.data;
    const settle = pending.get(reply.id);
    if (!settle) return;
    pending.delete(reply.id);
    ready = true;
    settle(
      reply.ok
        ? { stdout: reply.stdout, value: reply.value, error: null }
        : { stdout: '', value: null, error: reply.error },
    );
    if (pending.size === 0) announce('idle');
  }

  worker.addEventListener('message', onMessage);

  return {
    run(code) {
      if (disposed) return Promise.reject(new Error('This Python cell has been disposed.'));
      // The first run pays for the Pyodide download; say so rather than looking stuck.
      announce(ready ? 'running' : 'loading');
      const id = nextId++;
      const settled = new Promise<RunResult>((resolve) => { pending.set(id, resolve); });
      worker.postMessage({ id, code });
      if (!ready) announce('running');
      return settled;
    },
    status: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    dispose() {
      disposed = true;
      worker.removeEventListener('message', onMessage);
      worker.terminate();
      pending.clear();
    },
  };
}
