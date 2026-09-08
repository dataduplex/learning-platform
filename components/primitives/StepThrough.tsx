'use client';

import { useId, useState, type ReactNode } from 'react';

export interface Step {
  title: string;
  body: ReactNode;
}

/**
 * Uncontrolled by default; pass `index` and `onIndexChange` to drive it from a
 * parent that also needs to know which step is showing.
 */
export function StepThrough({
  steps,
  label,
  index,
  onIndexChange,
}: {
  steps: readonly Step[];
  label: string;
  index?: number;
  onIndexChange?: (index: number) => void;
}) {
  const id = useId();
  const [internal, setInternal] = useState(0);
  const controlled = index !== undefined;
  const current = Math.min(steps.length - 1, Math.max(0, controlled ? index : internal));
  const step = steps[current];

  function go(next: number): void {
    const clamped = Math.min(steps.length - 1, Math.max(0, next));
    if (!controlled) setInternal(clamped);
    onIndexChange?.(clamped);
  }

  return (
    <section className="stepper" aria-labelledby={`${id}-label`}>
      <div className="stepper-head">
        <h4 className="stepper-label" id={`${id}-label`}>{label}</h4>
        <p className="stepper-position" role="status">
          Step {current + 1} of {steps.length}
        </p>
      </div>
      <h5 className="stepper-title">{step?.title}</h5>
      <div className="stepper-body">{step?.body}</div>
      <p className="stepper-actions">
        <button type="button" onClick={() => go(current - 1)} disabled={current === 0}>Back</button>
        <button
          type="button"
          onClick={() => go(current + 1)}
          disabled={current === steps.length - 1}
        >
          Next
        </button>
        <button type="button" className="stepper-restart" onClick={() => go(0)}>Restart</button>
      </p>
    </section>
  );
}
