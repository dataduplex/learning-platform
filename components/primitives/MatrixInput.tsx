'use client';

import { useId } from 'react';
import { at, matFrom, toRows, type Mat } from '@/lib/linalg';

export function MatrixInput({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  label: string;
  value: Mat;
  onChange: (next: Mat) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  const id = useId();

  function setCell(row: number, column: number, raw: string): void {
    const rows = toRows(value);
    const parsed = raw.trim() === '' ? 0 : Number(raw);
    const target = rows[row];
    if (!target) return;
    target[column] = Number.isFinite(parsed) ? parsed : 0;
    onChange(matFrom(rows));
  }

  return (
    <div
      className="matrix-input"
      role="group"
      aria-labelledby={`${id}-label`}
      style={{ gridTemplateColumns: `repeat(${value.cols}, minmax(0, 3.5rem))` }}
    >
      <span className="sr-only" id={`${id}-label`}>
        {label}, {value.rows} by {value.cols} matrix
      </span>
      {Array.from({ length: value.rows }).flatMap((_, row) =>
        Array.from({ length: value.cols }).map((__, column) => (
          <input
            key={`${row}-${column}`}
            type="number"
            step={step}
            {...(min === undefined ? {} : { min })}
            {...(max === undefined ? {} : { max })}
            aria-label={`${label} row ${row + 1} column ${column + 1}`}
            value={at(value, row, column)}
            onChange={(event) => setCell(row, column, event.target.value)}
          />
        )),
      )}
    </div>
  );
}
