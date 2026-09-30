'use client';

import { useId } from 'react';
import { at, type Mat } from '@/lib/linalg';
import { inkOn } from '@/lib/palette';
import { formatFixed } from './NumberReadout';
import { TableView } from './TableView';

export interface ActiveCell {
  row: number;
  col: number;
  value: number;
}

export function Heatmap({
  matrix,
  colorFor,
  caption,
  rowLabels,
  colLabels,
  cellSize = 34,
  digits = 2,
  showValues = false,
  onActiveCell,
}: {
  matrix: Mat;
  /** A scale from lib/palette.ts. The primitive never picks a color itself. */
  colorFor: (value: number) => string;
  caption: string;
  rowLabels?: readonly string[];
  colLabels?: readonly string[];
  cellSize?: number;
  digits?: number;
  /** Print each value in its cell. Needs a cellSize wide enough for the formatted number. */
  showValues?: boolean;
  onActiveCell?: (cell: ActiveCell | null) => void;
}) {
  const id = useId();
  const gutterLeft = rowLabels ? 56 : 8;
  const gutterTop = colLabels ? 22 : 8;
  const width = gutterLeft + matrix.cols * cellSize + 8;
  const height = gutterTop + matrix.rows * cellSize + 8;
  // 2px of surface between fills, per the mark spec.
  const inset = 1;

  const columns = ['', ...Array.from({ length: matrix.cols }, (_, c) => colLabels?.[c] ?? `col ${c + 1}`)];
  const rows = Array.from({ length: matrix.rows }, (_, r) => [
    rowLabels?.[r] ?? `row ${r + 1}`,
    ...Array.from({ length: matrix.cols }, (_, c) => formatFixed(at(matrix, r, c), digits)),
  ]);

  return (
    <figure className="heatmap">
      <svg
        className="heatmap-svg"
        role="group"
        aria-labelledby={`${id}-caption`}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
      >
        <title id={`${id}-caption`}>{caption}</title>

        {colLabels?.map((text, column) => (
          <text
            key={`c-${column}`}
            className="heatmap-label"
            x={gutterLeft + column * cellSize + cellSize / 2}
            y={gutterTop - 8}
            textAnchor="middle"
          >
            {text}
          </text>
        ))}
        {rowLabels?.map((text, row) => (
          <text
            key={`r-${row}`}
            className="heatmap-label"
            x={gutterLeft - 10}
            y={gutterTop + row * cellSize + cellSize / 2 + 4}
            textAnchor="end"
          >
            {text}
          </text>
        ))}

        {Array.from({ length: matrix.rows }).flatMap((_, row) =>
          Array.from({ length: matrix.cols }).map((__, col) => {
            const value = at(matrix, row, col);
            return (
              <rect
                key={`${row}-${col}`}
                data-role="cell"
                className="heatmap-cell"
                x={gutterLeft + col * cellSize + inset}
                y={gutterTop + row * cellSize + inset}
                width={cellSize - inset * 2}
                height={cellSize - inset * 2}
                fill={colorFor(value)}
                onPointerEnter={() => onActiveCell?.({ row, col, value })}
                onPointerLeave={() => onActiveCell?.(null)}
              />
            );
          }),
        )}

        {showValues && Array.from({ length: matrix.rows }).flatMap((_, row) =>
          Array.from({ length: matrix.cols }).map((__, col) => {
            const value = at(matrix, row, col);
            return (
              <text
                key={`v-${row}-${col}`}
                className="heatmap-value"
                x={gutterLeft + col * cellSize + cellSize / 2}
                y={gutterTop + row * cellSize + cellSize / 2 + 4}
                textAnchor="middle"
                fill={inkOn(colorFor(value))}
              >
                {formatFixed(value, digits)}
              </text>
            );
          }),
        )}
      </svg>
      <figcaption className="heatmap-caption">{caption}</figcaption>
      <TableView caption={caption} columns={columns} rows={rows} />
    </figure>
  );
}
