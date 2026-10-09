'use client';

import type { ReactNode } from 'react';
import { useId } from 'react';
import { at, type Mat } from '@/lib/linalg';
import { inkOn } from '@/lib/palette';
import { ColorKey, swatchWidthFor, type KeyStop } from './ColorKey';
import { formatFixed } from './NumberReadout';
import { TableView } from './TableView';

export interface ActiveCell {
  row: number;
  col: number;
  value: number;
}

/** In pixels: the surface left around the grid and its labels. */
const EDGE = 8;
/** In pixels: from a row label's end to the grid. */
const LABEL_GAP = 10;
/** In pixels: an average glyph of the 11px label font. A wider glyph eats into the edge. */
const LABEL_GLYPH = 6;

function rowLabelGutter(labels: readonly string[]): number {
  const glyphs = Math.max(0, ...labels.map((label) => Array.from(label).length));
  return EDGE + glyphs * LABEL_GLYPH + LABEL_GAP;
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
  colorKey,
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
  /** Set under the cells, spanning their grid. */
  colorKey?: { caption: ReactNode; stops: readonly KeyStop[] };
  onActiveCell?: (cell: ActiveCell | null) => void;
}) {
  const id = useId();
  const gutterLeft = rowLabels ? rowLabelGutter(rowLabels) : EDGE;
  const gutterTop = colLabels ? 22 : EDGE;
  const width = gutterLeft + matrix.cols * cellSize + EDGE;
  const height = gutterTop + matrix.rows * cellSize + EDGE;
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
            x={gutterLeft - LABEL_GAP}
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
      {colorKey === undefined ? null : (
        <div className="heatmap-key" style={{ marginLeft: gutterLeft }}>
          <ColorKey
            caption={colorKey.caption}
            stops={colorKey.stops}
            swatchWidth={swatchWidthFor(matrix.cols * cellSize, colorKey.stops.length)}
          />
        </div>
      )}
      <figcaption className="heatmap-caption">{caption}</figcaption>
      <TableView caption={caption} columns={columns} rows={rows} />
    </figure>
  );
}
