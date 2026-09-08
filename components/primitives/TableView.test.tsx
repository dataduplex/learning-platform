import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TableView } from './TableView';

const props = {
  caption: 'Cosine similarity by pair',
  columns: ['pair', 'cosine'] as const,
  rows: [
    ['king / queen', '0.71'],
    ['king / apple', '0.02'],
  ],
};

describe('TableView', () => {
  it('starts collapsed behind a disclosure', () => {
    render(<TableView {...props} />);
    expect(screen.getByRole('group')).not.toHaveAttribute('open');
    expect(screen.getByText(/show data table/i)).toBeInTheDocument();
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

  it('opens on first render when asked, for a print or accessibility default', () => {
    render(<TableView {...props} defaultOpen />);
    expect(screen.getByRole('group')).toHaveAttribute('open');
  });

  it('aligns numeric columns with tabular figures', async () => {
    const user = userEvent.setup();
    render(<TableView {...props} />);
    await user.click(screen.getByText(/show data table/i));
    expect(screen.getByRole('table')).toHaveClass('table-view-table');
  });
});
