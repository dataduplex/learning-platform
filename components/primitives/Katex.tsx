'use client';

import katex from 'katex';
import { useMemo } from 'react';

/**
 * Runtime typesetting for values that change as a learner drags. Synchronous, so
 * the markup is present in the same paint and nothing shifts. Prose math is
 * typeset at build time by rehype-katex and does not come through here.
 */
export function Katex({
  source,
  display = false,
  label,
}: {
  source: string;
  display?: boolean;
  /** Spoken alternative. The rendered markup is hidden from assistive tech. */
  label?: string;
}) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(source, { displayMode: display, throwOnError: true });
    } catch {
      return null;
    }
  }, [source, display]);

  if (html === null) {
    // Authoring error. Showing the source is more useful than showing nothing.
    return <code className="katex-error">{source}</code>;
  }

  return (
    <>
      <span
        className={display ? 'katex-block' : 'katex-inline'}
        aria-hidden={label === undefined ? undefined : true}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {label === undefined ? null : <span className="sr-only">{label}</span>}
    </>
  );
}
