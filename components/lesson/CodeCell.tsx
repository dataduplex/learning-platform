'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  browserWorker,
  createPyodideClient,
  type PyodideClient,
  type RunResult,
} from '@/lib/pyodide/client';

type Phase = 'idle' | 'loading' | 'running' | 'done';

export function CodeCell({
  code,
  label = 'Python',
  editable = false,
  client: injected,
}: {
  code: string;
  label?: string;
  editable?: boolean;
  /** Tests inject a stub; the browser gets a lazily created worker client. */
  client?: PyodideClient;
}) {
  const id = useId();
  const [source, setSource] = useState(code);
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<RunResult | null>(null);
  const clientRef = useRef<PyodideClient | null>(injected ?? null);

  useEffect(() => () => {
    // Only dispose a client this component created.
    if (!injected) clientRef.current?.dispose();
  }, [injected]);

  async function run(): Promise<void> {
    clientRef.current ??= createPyodideClient({ worker: browserWorker() });
    const client = clientRef.current;
    setPhase(client.status() === 'idle' ? 'running' : 'loading');
    try {
      const next = await client.run(source);
      setResult(next);
    } catch (error) {
      setResult({ stdout: '', value: null, error: String(error) });
    } finally {
      setPhase('done');
    }
  }

  const busy = phase === 'loading' || phase === 'running';
  const message = phase === 'loading'
    ? 'Loading Python. The first run downloads the runtime; later runs are instant.'
    : phase === 'running'
      ? 'Running.'
      : null;

  return (
    <div className="code-cell">
      <div className="code-cell-head">
        <span className="code-cell-label">{label}</span>
        <button type="button" onClick={() => void run()} disabled={busy}>
          {busy ? 'Running' : 'Run'}
        </button>
        {editable ? (
          <button type="button" onClick={() => { setSource(code); setResult(null); setPhase('idle'); }}>
            Reset
          </button>
        ) : null}
      </div>

      {editable ? (
        <textarea
          className="code-cell-editor"
          aria-label={`${label} code`}
          spellCheck={false}
          rows={Math.max(3, source.split('\n').length)}
          value={source}
          onChange={(event) => setSource(event.target.value)}
        />
      ) : (
        <pre className="code-cell-source" id={`${id}-source`}><code>{source}</code></pre>
      )}

      <div className="code-cell-output" role="status" data-state={result?.error ? 'error' : 'ok'}>
        {message}
        {result?.error ? <><strong>Error.</strong> <pre>{result.error}</pre></> : null}
        {result && !result.error ? (
          <>
            {result.stdout ? <pre>{result.stdout.trimEnd()}</pre> : null}
            {result.value === null ? null : <pre className="code-cell-value">{result.value}</pre>}
          </>
        ) : null}
      </div>
    </div>
  );
}
