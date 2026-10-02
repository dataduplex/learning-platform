import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { matFrom } from '@/lib/linalg';
import { DIVERGING_MID, SEQUENTIAL_BLUE, divergingScale, inkOn } from '@/lib/palette';
import { Heatmap } from './Heatmap';

const matrix = matFrom([[-1, 0], [2, 5]]);
const colorFor = divergingScale(-1, 5, 'light');

describe('Heatmap', () => {
  it('draws one cell per entry', () => {
    render(<Heatmap matrix={matrix} colorFor={colorFor} caption="Attention weights" />);
    expect(document.querySelectorAll('[data-role="cell"]')).toHaveLength(4);
  });

  it('colors each cell through the scale it was given', () => {
    render(<Heatmap matrix={matrix} colorFor={colorFor} caption="c" />);
    const cells = [...document.querySelectorAll('[data-role="cell"]')];
    // Row-major order, so index 1 is the zero entry.
    expect(cells[1]).toHaveAttribute('fill', DIVERGING_MID.light);
    expect(cells[0]).not.toHaveAttribute('fill', DIVERGING_MID.light);
  });

  it('renders row and column labels when given', () => {
    render(
      <Heatmap
        matrix={matrix}
        colorFor={colorFor}
        caption="c"
        rowLabels={['q1', 'q2']}
        colLabels={['k1', 'k2']}
      />,
    );
    // Not getByText: the table view carries the same labels, so a bare text query
    // is ambiguous. Columns render before rows.
    const labels = [...document.querySelectorAll('.heatmap-label')].map((n) => n.textContent);
    expect(labels).toEqual(['k1', 'k2', 'q1', 'q2']);
  });

  it('leaves room for one glyph beside one-glyph row labels', () => {
    const tall = matFrom(Array.from({ length: 8 }, () => [0, 0, 0, 0, 0, 0]));
    render(
      <Heatmap
        matrix={tall}
        colorFor={colorFor}
        caption="c"
        cellSize={26}
        rowLabels={['1', '2', '3', '4', '5', '6', '7', '8']}
      />,
    );
    // 8 of edge, 6 for the glyph and 10 to the grid, then 6 columns of 26 and 8 of edge.
    expect(document.querySelector('.heatmap-svg')).toHaveAttribute('width', '188');
    expect(document.querySelector('.heatmap-label')).toHaveAttribute('x', '14');
    expect(document.querySelector('[data-role="cell"]')).toHaveAttribute('x', '25');
  });

  it('sizes the row-label gutter to its longest label', () => {
    render(<Heatmap matrix={matrix} colorFor={colorFor} caption="c" rowLabels={['q1', 'q10']} />);
    // 8 of edge, 3 glyphs of 6 and 10 to the grid, then 2 columns of 34 and 8 of edge.
    expect(document.querySelector('.heatmap-svg')).toHaveAttribute('width', '112');
    expect(document.querySelector('.heatmap-label')).toHaveAttribute('x', '26');
  });

  it('always ships the table view, so the numbers are reachable without color', async () => {
    const user = userEvent.setup();
    render(<Heatmap matrix={matrix} colorFor={colorFor} caption="Attention weights" />);
    await user.click(screen.getByText(/show data table/i));
    expect(screen.getByRole('table', { name: 'Attention weights' })).toBeInTheDocument();
    expect(screen.getByText('5.00')).toBeInTheDocument();
  });

  it('reports the hovered cell by row and column', async () => {
    const user = userEvent.setup();
    const onActiveCell = vi.fn();
    render(
      <Heatmap matrix={matrix} colorFor={colorFor} caption="c" onActiveCell={onActiveCell} />,
    );
    await user.hover(document.querySelectorAll('[data-role="cell"]')[3] as Element);
    expect(onActiveCell).toHaveBeenLastCalledWith({ row: 1, col: 1, value: 5 });
  });

  it('names the figure for assistive technology', () => {
    render(<Heatmap matrix={matrix} colorFor={colorFor} caption="Attention weights" />);
    expect(screen.getByRole('group', { name: /Attention weights/ })).toBeInTheDocument();
  });

  it('prints no value in a cell unless asked, so colour stays the default reading', () => {
    render(<Heatmap matrix={matrix} colorFor={colorFor} caption="c" />);
    expect(document.querySelectorAll('.heatmap-value')).toHaveLength(0);
  });

  it('prints every value in its cell when asked', () => {
    render(<Heatmap matrix={matrix} colorFor={colorFor} caption="c" showValues digits={1} />);
    const values = [...document.querySelectorAll('.heatmap-value')].map((n) => n.textContent);
    expect(values).toEqual(['-1.0', '0.0', '2.0', '5.0']);
  });

  it('wears ink that reads well on its fill, so no halo is needed', () => {
    const darkCell = matFrom([[1]]);
    const darkColor = SEQUENTIAL_BLUE[12] as string;
    render(
      <Heatmap
        matrix={darkCell}
        colorFor={() => darkColor}
        caption="c"
        showValues
      />,
    );
    const cell = document.querySelector('[data-role="cell"]');
    const value = document.querySelector('.heatmap-value');
    expect(cell).toHaveAttribute('fill', darkColor);
    expect(value).toHaveAttribute('fill', inkOn(darkColor));
  });
});
