'use client';

import type { ReactNode } from 'react';

const SUPERSCRIPT: Readonly<Record<string, string>> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻',
};

/** Fixed width, so a changing value never reflows the line it sits on. */
export function formatFixed(value: number, digits: number): string {
  if (!Number.isFinite(value)) return '-';
  // Adding zero collapses -0 to 0.
  return (value + 0).toFixed(digits);
}

/** m × 10ⁿ, for a value fixed point would print as zeros. The zeroth power prints the mantissa alone. */
export function formatScientific(value: number, digits: number): string {
  if (!Number.isFinite(value)) return '-';
  const [mantissa, exponent] = value.toExponential(digits).split('e') as [string, string];
  const power = Number(exponent);
  if (power === 0) return mantissa;
  const written = [...String(power)].map((character) => SUPERSCRIPT[character] ?? character).join('');
  return `${mantissa} × 10${written}`;
}

/** A comma between each group of three digits in a written number's whole part. */
export function groupThousands(text: string): string {
  return text.replace(/^([-−+]?)(\d+)/u, (_, sign: string, whole: string) => sign + whole.replace(/\B(?=(\d{3})+$)/gu, ','));
}

/** Keeps a math symbol's case inside a label the stylesheet sets in capitals. */
export function LabelSymbol({ children }: { children: ReactNode }) {
  return <span className="label-symbol">{children}</span>;
}

/** Units set against the number with no space, as in 85%. */
const ATTACHED_UNITS: ReadonlySet<string> = new Set(['%']);

export function NumberReadout({
  label,
  value,
  digits = 2,
  format = 'fixed',
  unit,
  grouped = false,
  testId,
}: {
  label: ReactNode;
  value: number;
  digits?: number;
  format?: 'fixed' | 'scientific';
  unit?: string;
  /** Commas between groups of three digits in the whole part. */
  grouped?: boolean;
  /** Put on the number itself, for a test that needs the value and not the label. */
  testId?: string;
}) {
  const written = format === 'scientific' ? formatScientific(value, digits) : formatFixed(value, digits);
  const text = grouped ? groupThousands(written) : written;
  return (
    <div className="readout">
      <dt className="readout-label">{label}</dt>
      <dd className="readout-value">
        <span className="readout-number" data-testid={testId}>{text}</span>
        {unit === undefined ? null : (
          <span className="readout-unit">{ATTACHED_UNITS.has(unit) ? unit : `\u00a0${unit}`}</span>
        )}
      </dd>
    </div>
  );
}

/** Groups readouts so the dt/dd pairs sit in one description list. */
export function ReadoutGroup({ children }: { children: React.ReactNode }) {
  return <dl className="readout-group">{children}</dl>;
}
