import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { seriesVar } from '@/lib/palette';
import { GraphCanvas, type GraphEdge, type GraphNode } from './GraphCanvas';

const NODES: readonly GraphNode[] = [
  { id: 'a', label: 'a', rows: [{ name: 'value', value: '2.000' }], color: seriesVar(1), x: 0, y: -1 },
  { id: 'b', label: 'b', rows: [{ name: 'value', value: '-3.000' }], color: seriesVar(1), x: 0, y: 0 },
  { id: 'c', label: 'c', rows: [{ name: 'value', value: '4.000' }], color: seriesVar(1), x: 0, y: 1 },
  { id: 'e', label: 'e', rows: [{ name: 'value', value: '-1.000' }], color: seriesVar(7), x: 1, y: 0 },
  { id: 'd', label: 'd', rows: [{ name: 'value', value: '-4.000' }], color: seriesVar(7), x: 2, y: 0 },
];

const EDGES: readonly GraphEdge[] = [
  { fromId: 'a', toId: 'e' },
  { fromId: 'b', toId: 'e' },
  { fromId: 'e', toId: 'd', label: '4.00', active: true },
  { fromId: 'c', toId: 'd', label: '-1.00', active: true },
];

function renderCanvas(props: Partial<Parameters<typeof GraphCanvas>[0]> = {}) {
  return render(
    <GraphCanvas nodes={NODES} edges={EDGES} caption="A small expression graph" {...props} />,
  );
}

describe('GraphCanvas', () => {
  it('draws one box per node and one line per edge', () => {
    const { container } = renderCanvas();
    expect(container.querySelectorAll('g.graph-node')).toHaveLength(5);
    expect(container.querySelectorAll('line.graph-edge')).toHaveLength(4);
  });

  it('labels an edge only when the caller gives it one', () => {
    const { container } = renderCanvas();
    const labels = [...container.querySelectorAll('text.graph-edge-label')]
      .map((text) => text.textContent);
    expect(labels).toEqual(['4.00', '-1.00']);
  });

  it('marks the edges the caller called active, so a step is visible', () => {
    const { container } = renderCanvas();
    expect(container.querySelectorAll('line.graph-edge[data-active="true"]')).toHaveLength(2);
  });

  it('reads a node out with its rows and its inputs, because an edge is invisible to a screen reader', () => {
    renderCanvas();
    expect(screen.getByRole('button', { name: /^d: value -4\.000\. Inputs e and c\./ }))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^a: value 2\.000\. An input to the graph\./ }))
      .toBeInTheDocument();
  });

  it('says which column a node is in, since position carries meaning here', () => {
    renderCanvas();
    expect(screen.getByRole('button', { name: /d:.*Column 3 of 3/ })).toBeInTheDocument();
  });

  it('exposes exactly one tab stop and moves focus with the arrow keys', async () => {
    const user = userEvent.setup();
    renderCanvas();
    const nodes = screen.getAllByRole('button');
    expect(nodes.filter((node) => node.getAttribute('tabindex') === '0')).toHaveLength(1);

    await user.tab();
    expect(screen.getByRole('button', { name: /^a:/ })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: /^b:/ })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: /^e:/ })).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('button', { name: /^b:/ })).toHaveFocus();
  });

  it('stays put at an edge of the graph rather than wrapping', async () => {
    const user = userEvent.setup();
    renderCanvas();
    await user.tab();
    await user.keyboard('{ArrowUp}{ArrowLeft}');
    expect(screen.getByRole('button', { name: /^a:/ })).toHaveFocus();
  });

  it('reports the node a learner picks, by click and by keyboard', async () => {
    const user = userEvent.setup();
    const onActiveChange = vi.fn();
    renderCanvas({ onActiveChange });

    await user.click(screen.getByRole('button', { name: /^e:/ }));
    expect(onActiveChange).toHaveBeenLastCalledWith('e');

    await user.keyboard('{Enter}');
    expect(onActiveChange).toHaveBeenLastCalledWith('e');
  });

  it('marks the active node as pressed, so the state is not colour alone', () => {
    renderCanvas({ activeId: 'd' });
    expect(screen.getByRole('button', { name: /^d:/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^a:/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('takes every colour from its props, so the primitive picks none', () => {
    const { container } = renderCanvas();
    const strokes = [...container.querySelectorAll('rect.graph-node-box')]
      .map((box) => box.getAttribute('stroke'));
    expect(new Set(strokes)).toEqual(new Set([seriesVar(1), seriesVar(7)]));
  });

  it('sizes its viewBox from the nodes it was given', () => {
    const { container } = renderCanvas();
    // Three columns and three rows at the documented pitch.
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 376 220');
  });

  it('offers the numbers as a table, which starts closed', async () => {
    const user = userEvent.setup();
    const { container } = renderCanvas();
    // The svg is also role="group", so scope rather than query by role.
    expect(container.querySelector('details.table-view')).not.toHaveAttribute('open');

    await user.click(screen.getByText('Show data table'));
    const table = screen.getByRole('table');
    expect(table).toHaveTextContent('node');
    expect(table).toHaveTextContent('value');
    expect([...table.querySelectorAll('tbody tr td:first-child')].map((cell) => cell.textContent))
      .toEqual(['a', 'b', 'c', 'e', 'd']);
  });

  it('draws nothing at all when given no nodes', () => {
    const { container } = render(<GraphCanvas nodes={[]} edges={[]} caption="empty" />);
    expect(container).toBeEmptyDOMElement();
  });
});
