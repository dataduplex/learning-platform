import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TableView, numericColumns } from './TableView';

const props = {
  caption: 'Cosine similarity by pair',
  columns: ['pair', 'cosine'] as const,
  rows: [
    ['king / queen', '0.71'],
    ['king / apple', '0.02'],
  ],
};

const summary = () => document.querySelector('summary');

describe('TableView', () => {
  it('starts collapsed behind a disclosure', () => {
    render(<TableView {...props} />);
    expect(screen.getByRole('group')).not.toHaveAttribute('open');
    expect(summary()?.textContent).toBe('Show data table');
  });

  it('reveals a captioned table with a header row', async () => {
    const user = userEvent.setup();
    render(<TableView {...props} />);
    await user.click(screen.getByText(/show data table/i));
    const table = screen.getByRole('table', { name: props.caption });
    expect(table).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['pair', 'cosine']);
    expect(screen.getAllByRole('row')).toHaveLength(3);
  });

  it('says Hide while open and Show once closed again', async () => {
    const user = userEvent.setup();
    render(<TableView {...props} />);
    await user.click(screen.getByText('Show data table'));
    expect(screen.getByRole('group')).toHaveAttribute('open');
    expect(summary()?.textContent).toBe('Hide data table');
    await user.click(screen.getByText('Hide data table'));
    expect(screen.getByRole('group')).not.toHaveAttribute('open');
    expect(summary()?.textContent).toBe('Show data table');
  });

  it('opens on first render when asked, for a print or accessibility default', () => {
    render(<TableView {...props} defaultOpen />);
    expect(screen.getByRole('group')).toHaveAttribute('open');
    expect(summary()?.textContent).toBe('Hide data table');
  });

  it('right-aligns a numeric column, its header included, and leaves a text column left', () => {
    render(
      <TableView
        caption="c"
        columns={['pair', 'cosine', 'change']}
        rows={[['king / queen', '0.71', '-0.25'], ['king / apple', '0.02', '1.2 × 10⁻⁵']]}
      />,
    );
    const aligned = (cells: readonly Element[]) => cells.map((cell) => cell.classList.contains('table-view-number'));
    expect(aligned(screen.getAllByRole('columnheader'))).toEqual([false, true, true]);
    expect(aligned(screen.getAllByRole('cell'))).toEqual([false, true, true, false, true, true]);
  });

  it('right-aligns a percentage column and a column of numbers grouped in threes', () => {
    render(<TableView caption="c" columns={['step', 'accuracy']} rows={[['1,000', '43%'], ['20', '100%']]} />);
    const aligned = (cells: readonly Element[]) => cells.map((cell) => cell.classList.contains('table-view-number'));
    expect(aligned(screen.getAllByRole('columnheader'))).toEqual([true, true]);
    expect(aligned(screen.getAllByRole('cell'))).toEqual([true, true, true, true]);
  });
});

describe('numericColumns', () => {
  it('counts a column numeric only when every cell in it is a number', () => {
    expect(numericColumns(['a', 'b', 'c', 'd'], [['1', '−0.5', '0 (tails)', '.25'], ['-2', '3', '1 (heads)', '+4']]))
      .toEqual([true, true, false, true]);
    expect(numericColumns(['a'], [])).toEqual([false]);
  });

  it('takes a trailing percent sign and commas between groups of three as part of a number', () => {
    expect(numericColumns(['a', 'b', 'c'], [['43%', '1,000', '−12,345.5'], ['-0.5%', '2,000,000', '999']]))
      .toEqual([true, true, true]);
    expect(numericColumns(['a', 'b', 'c', 'd', 'e', 'f'], [['1,0000', ',100', '1,00', '1234,567', '43 %', '%']]))
      .toEqual([false, false, false, false, false, false]);
  });
});
