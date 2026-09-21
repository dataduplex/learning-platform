'use client';

/** Fixed width, so a changing value never reflows the line it sits on. */
export function formatFixed(value: number, digits: number): string {
  if (!Number.isFinite(value)) return '-';
  // Adding zero collapses -0 to 0.
  return (value + 0).toFixed(digits);
}

/** For a value small enough that fixed point prints only zeros. */
export function formatExponential(value: number, digits: number): string {
  if (!Number.isFinite(value)) return '-';
  return value.toExponential(digits);
}

export function NumberReadout({
  label,
  value,
  digits = 2,
  unit,
  testId,
}: {
  label: string;
  value: number;
  digits?: number;
  unit?: string;
  /** Put on the number itself, for a test that needs the value and not the label. */
  testId?: string;
}) {
  return (
    <div className="readout">
      <dt className="readout-label">{label}</dt>
      <dd className="readout-value">
        <span className="readout-number" data-testid={testId}>{formatFixed(value, digits)}</span>
        {unit === undefined ? null : <span className="readout-unit">{unit}</span>}
      </dd>
    </div>
  );
}

/** Groups readouts so the dt/dd pairs sit in one description list. */
export function ReadoutGroup({ children }: { children: React.ReactNode }) {
  return <dl className="readout-group">{children}</dl>;
}
