'use client';

import { isValidElement, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useCourse } from '../../lib/course/context';
import {
  browserWorker,
  createPyodideClient,
  type PyodideClient,
  type RunResult,
} from '../../lib/pyodide/client';

type Phase = 'idle' | 'loading' | 'running' | 'done';

const REACT_LAZY = Symbol.for('react.lazy');

type LazyNode = { $$typeof: symbol; _payload: unknown; _init: (payload: unknown) => unknown };

/**
 * The node a lazy reference stands for, or the node itself.
 *
 * Lessons render on the server and a code cell on the client. On a full page
 * load its children arrive as plain elements, but on client-side navigation
 * React's Flight client can hand them over as lazy references instead. `_init`
 * is what React calls when it renders one: it returns the value, or throws the
 * pending thenable so the nearest Suspense boundary waits for it.
 */
function unwrapLazy(node: ReactNode): ReactNode {
  let current: unknown = node;
  while (
    typeof current === 'object'
    && current !== null
    && (current as LazyNode).$$typeof === REACT_LAZY
  ) {
    const lazy = current as LazyNode;
    current = lazy._init(lazy._payload);
  }
  return current as ReactNode;
}

/** The text of a fenced Python block, without the newline that closes it. */
export function fencedCode(children: ReactNode): string {
  const pre = unwrapLazy(children);
  if (isValidElement<{ children?: ReactNode }>(pre) && pre.type === 'pre') {
    const code = unwrapLazy(pre.props.children);
    if (
      isValidElement<{ className?: string; children?: ReactNode }>(code)
      && code.type === 'code'
      && code.props.className === 'language-python'
      && typeof code.props.children === 'string'
    ) {
      return code.props.children.replace(/\n$/, '');
    }
  }
  throw new Error('A code cell holds exactly one fenced python block.');
}

/** One row per line, so every line shows whole. */
export function editorRows(source: string): number {
  return Math.max(3, source.split('\n').length);
}

export function CodeCell({
  children,
  label = 'Python',
  editable = false,
  client: injected,
}: {
  /** One fenced python block. Its text is kept verbatim, indentation included. */
  children: ReactNode;
  label?: string;
  editable?: boolean;
  /** Tests inject a stub; the browser gets a lazily created worker client. */
  client?: PyodideClient;
}) {
  const id = useId();
  const { identity } = useCourse();
  const code = fencedCode(children);
  const [source, setSource] = useState(code);
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<RunResult | null>(null);
  const clientRef = useRef<PyodideClient | null>(injected ?? null);

  useEffect(() => () => {
    // Only dispose a client this component created.
    if (!injected) clientRef.current?.dispose();
  }, [injected]);

  async function run(): Promise<void> {
    clientRef.current ??= createPyodideClient({ worker: browserWorker(identity.basePath) });
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
    <div className="code-cell" data-code-cell>
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
          wrap="off"
          rows={editorRows(source)}
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
