'use client';

import { useId } from 'react';

export interface LegendItem {
  label: string;
  /** A CSS color, normally a var(--series-N) from lib/palette.ts. */
  color: string;
  /** `area` keys a filled region: a framed swatch. */
  kind?: 'swatch' | 'line' | 'dashed' | 'area';
}

const KEY_CLASS = { swatch: 'legend-swatch', line: 'legend-line', area: 'legend-area' } as const;

/**
 * Renders nothing for a single series: the figure's own title names it, and a
 * one-row legend is noise. Two or more series always get one.
 */
export function Legend({ items, label }: { items: readonly LegendItem[]; label?: string }) {
  const id = useId();
  if (items.length < 2) return null;
  return (
    <>
      {label === undefined ? null : (
        <span className="legend-label" id={`${id}-label`}>{label}</span>
      )}
      <ul className="legend" {...(label === undefined ? {} : { 'aria-labelledby': `${id}-label` })}>
        {items.map((item) => (
          <li className="legend-item" key={item.label}>
            {item.kind === 'dashed' ? (
              <span className="legend-dashed" aria-hidden="true" style={{ borderColor: item.color }} />
            ) : (
              <span
                className={KEY_CLASS[item.kind ?? 'swatch']}
                aria-hidden="true"
                style={{ background: item.color }}
              />
            )}
            <span className="legend-text">{item.label}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
