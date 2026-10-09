'use client';

import { useState } from 'react';

/** A number, its whole part optionally grouped in threes by commas, in scientific notation or as a percentage. */
const NUMBER = /^[-−+]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+)(?: × 10[⁻⁺]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+|%)?$/u;

/** Whether every cell in each column is a number, so that column aligns on the right. */
export function numericColumns(columns: readonly string[], rows: readonly (readonly string[])[]): boolean[] {
  const numeric = columns.map(() => rows.length > 0);
  for (const row of rows) {
    if (row.length !== columns.length) {
      throw new RangeError(`The row ${JSON.stringify(row)} does not fit the columns ${JSON.stringify(columns)}.`);
    }
    for (const [index, cell] of row.entries()) if (!NUMBER.test(cell)) numeric[index] = false;
  }
  return numeric;
}

/**
 * The non-visual route to the same numbers. Every figure that encodes data ships
 * one, which is what lets a color WARN be discharged and what makes a widget
 * usable without sight.
 */
export function TableView({
  caption,
  columns,
  rows,
  defaultOpen = false,
}: {
  caption: string;
  columns: readonly string[];
  rows: readonly (readonly string[])[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const numeric = numericColumns(columns, rows);
  const align = (index: number) => (numeric[index] === true ? 'table-view-number' : undefined);
  return (
    <details className="table-view" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>{open ? 'Hide data table' : 'Show data table'}</summary>
      <table className="table-view-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column, index) => <th scope="col" key={column} className={align(index)}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => <td key={cellIndex} className={align(cellIndex)}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
