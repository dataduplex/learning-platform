'use client';

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
  return (
    <details className="table-view" open={defaultOpen}>
      <summary>Show data table</summary>
      <table className="table-view-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => <th scope="col" key={column}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
