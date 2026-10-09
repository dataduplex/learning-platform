'use client';

import type { ReactNode } from 'react';
import { useId } from 'react';
import { at, matFrom, toRows, type Mat } from '@/lib/linalg';

export function MatrixInput({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  caption,
  columnLabels,
}: {
  label: string;
  value: Mat;
  onChange: (next: Mat) => void;
  step?: number;
  min?: number;
  max?: number;
  caption?: ReactNode;
  /** Shown above the columns, and used to name each cell. */
  columnLabels?: readonly string[];
}) {
  const id = useId();
  if (columnLabels !== undefined && columnLabels.length !== value.cols) {
    throw new RangeError(`columnLabels (${columnLabels.length}) does not match the column count (${value.cols}) of ${label}.`);
  }

  function setCell(row: number, column: number, raw: string): void {
    const rows = toRows(value);
    const parsed = raw.trim() === '' ? 0 : Number(raw);
    const target = rows[row];
    if (!target) return;
    let next = Number.isFinite(parsed) ? parsed : 0;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    target[column] = next;
    onChange(matFrom(rows));
  }

  const tracks = { gridTemplateColumns: `repeat(${value.cols}, minmax(0, 4.5rem))` };

  return (
    <div
      className="matrix-input"
      role="group"
      {...(caption !== undefined ? { 'aria-labelledby': `${id}-caption` } : { 'aria-labelledby': `${id}-label` })}
    >
      {caption !== undefined ? (
        <span className="matrix-input-caption" id={`${id}-caption`}>{caption}</span>
      ) : (
        <span className="sr-only" id={`${id}-label`}>
          {label}, {value.rows} by {value.cols} matrix
        </span>
      )}
      {columnLabels === undefined ? null : (
        <div className="matrix-input-columns" style={tracks}>
          {columnLabels.map((columnLabel, column) => (
            <span key={`col-${column}`} className="matrix-input-column">{columnLabel}</span>
          ))}
        </div>
      )}
      <div className="matrix-input-cells" style={tracks}>
        {Array.from({ length: value.rows }).flatMap((_, row) =>
          Array.from({ length: value.cols }).map((__, column) => {
            const cellName = columnLabels
              ? `${label} ${columnLabels[column]}${value.rows > 1 ? ` row ${row + 1}` : ''}`
              : `${label} row ${row + 1} column ${column + 1}`;
            return (
              <input
                key={`${row}-${column}`}
                type="number"
                step={step}
                {...(min === undefined ? {} : { min })}
                {...(max === undefined ? {} : { max })}
                aria-label={cellName}
                value={at(value, row, column)}
                onChange={(event) => setCell(row, column, event.target.value)}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}
