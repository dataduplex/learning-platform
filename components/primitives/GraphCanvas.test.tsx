import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { seriesVar } from '@/lib/palette';
import { GraphCanvas, type GraphEdge, type GraphNode } from './GraphCanvas';

const NODES: readonly GraphNode[] = [
  { id: 'a', label: 'a', rows: [{ name: 'value', short: 'value', value: '2.000' }], color: seriesVar(1), x: 0, y: -1 },
  { id: 'b', label: 'b', rows: [{ name: 'value', short: 'value', value: '-3.000' }], color: seriesVar(1), x: 0, y: 0 },
  { id: 'c', label: 'c', rows: [{ name: 'value', short: 'value', value: '4.000' }], color: seriesVar(1), x: 0, y: 1 },
  {
    id: 'e', label: 'e', detail: 'a + b', rows: [{ name: 'value', short: 'value', value: '-1.000' }],
    color: seriesVar(7), x: 1, y: 0,
  },
  {
    id: 'd', label: 'd', detail: 'e · c', rows: [{ name: 'value', short: 'value', value: '-4.000' }],
    color: seriesVar(7), x: 2, y: 0,
  },
];

const EDGES: readonly GraphEdge[] = [
  { fromId: 'a', toId: 'e' },
  { fromId: 'b', toId: 'e' },
  { fromId: 'e', toId: 'd', label: '4.00', active: true },
  { fromId: 'c', toId: 'd', label: '-1.00', active: true },
];

/** y = (a + b) * a: the edge from a to y skips a column, past the box of e. */
const REUSE_NODES: readonly GraphNode[] = [
  { id: 'a', label: 'a', rows: [{ name: 'value', value: '2.000' }], color: seriesVar(1), x: 0, y: -0.5 },
  { id: 'b', label: 'b', rows: [{ name: 'value', value: '-3.000' }], color: seriesVar(1), x: 0, y: 0.5 },
  { id: 'e', label: 'e', rows: [{ name: 'value', value: '-1.000' }], color: seriesVar(7), x: 1, y: 0 },
  { id: 'y', label: 'y', rows: [{ name: 'value', value: '-2.000' }], color: seriesVar(7), x: 2, y: 0 },
];

const REUSE_EDGES: readonly GraphEdge[] = [
  { fromId: 'a', toId: 'e' },
  { fromId: 'b', toId: 'e' },
  { fromId: 'e', toId: 'y', label: '2.00', active: true },
  { fromId: 'a', toId: 'y', label: '-1.00', active: true },
];

type Point = readonly [number, number];

function renderCanvas(props: Partial<Parameters<typeof GraphCanvas>[0]> = {}) {
  return render(
    <GraphCanvas nodes={NODES} edges={EDGES} caption="A small expression graph" {...props} />,
  );
}

function edge(container: HTMLElement, fromId: string, toId: string): Element {
  const found = container.querySelector(`g.graph-edge[data-from="${fromId}"][data-to="${toId}"]`);
  if (found === null) throw new Error(`no edge from ${fromId} to ${toId}`);
  return found;
}

function linePoints(group: Element): Point[] {
  const points = group.querySelector('.graph-edge-line')?.getAttribute('points') ?? '';
  return points.trim().split(/\s+/).map((pair) => {
    const [x, y] = pair.split(',').map(Number);
    return [x as number, y as number];
  });
}

function headPoints(group: Element): Point[] {
  const d = group.querySelector('.graph-edge-head')?.getAttribute('d') ?? '';
  return [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((match) => [Number(match[1]), Number(match[2])]);
}

interface Box { readonly id: string; readonly x: number; readonly y: number; readonly width: number; readonly height: number }

function boxes(container: HTMLElement): Box[] {
  return [...container.querySelectorAll('g.graph-node')].map((node) => {
    const rect = node.querySelector('rect.graph-node-box');
    return {
      id: node.getAttribute('data-node-id') ?? '',
      x: Number(rect?.getAttribute('x')),
      y: Number(rect?.getAttribute('y')),
      width: Number(rect?.getAttribute('width')),
      height: Number(rect?.getAttribute('height')),
    };
  });
}

/** The pixel gap between a point and a box, zero inside it. */
function gap([x, y]: Point, box: Box): number {
  const dx = Math.max(box.x - x, 0, x - (box.x + box.width));
  const dy = Math.max(box.y - y, 0, y - (box.y + box.height));
  return Math.hypot(dx, dy);
}

function closestApproach(path: readonly Point[], box: Box): number {
  let closest = Infinity;
  for (let index = 1; index < path.length; index += 1) {
    const [x1, y1] = path[index - 1] as Point;
    const [x2, y2] = path[index] as Point;
    for (let step = 0; step <= 200; step += 1) {
      const t = step / 200;
      closest = Math.min(closest, gap([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t], box));
    }
  }
  return closest;
}

describe('GraphCanvas', () => {
  it('draws one box per node and one arrow per edge, each with a head', () => {
    const { container } = renderCanvas();
    expect(container.querySelectorAll('g.graph-node')).toHaveLength(5);
    const edges = [...container.querySelectorAll('.graph-edge')];
    expect(edges).toHaveLength(4);
    for (const each of edges) expect(each.querySelectorAll('.graph-edge-head')).toHaveLength(1);
  });

  it('puts each head on the side of the box it points at, at the height its edge arrives', () => {
    const { container } = renderCanvas();
    // The d box starts at x=458; its two inputs arrive 12px either side of its centre at y=142.
    expect(headPoints(edge(container, 'e', 'd'))[0]).toEqual([458, 130]);
    expect(headPoints(edge(container, 'c', 'd'))[0]).toEqual([458, 154]);
    expect(headPoints(edge(container, 'a', 'e'))[0]).toEqual([234, 130]);
  });

  it('draws the head as VectorArrow does: 9px long and 8px wide, where the line stops', () => {
    const { container } = renderCanvas();
    for (const each of container.querySelectorAll('.graph-edge')) {
      const [tip, left, right] = headPoints(each) as [Point, Point, Point];
      const base: Point = [(left[0] + right[0]) / 2, (left[1] + right[1]) / 2];
      expect(Math.hypot(tip[0] - base[0], tip[1] - base[1])).toBeCloseTo(9, 1);
      expect(Math.hypot(left[0] - right[0], left[1] - right[1])).toBeCloseTo(8, 1);
      const end = linePoints(each).at(-1) as Point;
      expect(Math.hypot(end[0] - base[0], end[1] - base[1])).toBeLessThan(0.02);
    }
  });

  it('gives the upper of two inputs the upper arrival, so their edges never cross', () => {
    const { container } = render(
      <GraphCanvas nodes={REUSE_NODES} edges={REUSE_EDGES} caption="A reused input" />,
    );
    // y lists e before a, but a is the higher box.
    const fromA = headPoints(edge(container, 'a', 'y'))[0] as Point;
    const fromE = headPoints(edge(container, 'e', 'y'))[0] as Point;
    expect(fromA[1]).toBeLessThan(fromE[1]);
    expect(fromE[1] - fromA[1]).toBe(24);
  });

  it('routes an edge that skips a column around the box standing in its way', () => {
    const { container } = render(
      <GraphCanvas nodes={REUSE_NODES} edges={REUSE_EDGES} caption="A reused input" />,
    );
    const all = boxes(container);
    for (const each of container.querySelectorAll('g.graph-edge')) {
      const ends = [each.getAttribute('data-from'), each.getAttribute('data-to')];
      for (const box of all.filter((candidate) => !ends.includes(candidate.id))) {
        expect(closestApproach(linePoints(each), box), `${ends.join(' to ')} past ${box.id}`)
          .toBeGreaterThanOrEqual(4);
      }
    }
    expect(linePoints(edge(container, 'a', 'y'))).toHaveLength(3);
  });

  it('labels an edge only when the caller gives it one', () => {
    const { container } = renderCanvas();
    const labels = [...container.querySelectorAll('text.graph-edge-label')]
      .map((text) => text.textContent);
    expect(labels).toEqual(['4.00', '-1.00']);
  });

  it('draws edge labels after every node, so a box cannot cover one', () => {
    const { container } = renderCanvas();
    const marks = [...(container.querySelector('svg')?.children ?? [])].map((mark) => mark.getAttribute('class'));
    expect(marks.indexOf('graph-edge-labels')).toBeGreaterThan(marks.lastIndexOf('graph-node'));
  });

  it('ends every edge label just short of the node its edge points at', () => {
    const { container } = renderCanvas();
    for (const label of container.querySelectorAll('text.graph-edge-label')) {
      expect(label).toHaveAttribute('text-anchor', 'end');
      expect(Number(label.getAttribute('x'))).toBe(458 - 4);
    }
  });

  it('keeps every label clear by height of the heads it reaches over', () => {
    const { container } = renderCanvas();
    const heads = [...container.querySelectorAll('.graph-edge')]
      .filter((each) => each.getAttribute('data-to') === 'd')
      .map((each) => headPoints(each).map(([, y]) => y));
    expect(heads).toHaveLength(2);
    for (const label of container.querySelectorAll('text.graph-edge-label')) {
      const baseline = Number(label.getAttribute('y'));
      for (const heights of heads) {
        // Above by the 4px gap, or below by the gap and the 9px ascent. Both sides are rounded to 0.01.
        const above = baseline <= Math.min(...heights) - 4 + 0.01;
        const below = baseline - 9 >= Math.max(...heights) + 4 - 0.01;
        expect(above || below, `label at ${baseline} against a head over ${heights.join(', ')}`).toBe(true);
      }
    }
  });

  it('fits a five-character label into the narrowest channel, clear of the column before it', () => {
    const steep: GraphNode[] = [
      { id: 'p', label: 'p', rows: [], color: seriesVar(1), x: 0, y: -2 },
      { id: 'q', label: 'q', rows: [], color: seriesVar(1), x: 0, y: -1 },
      { id: 'r', label: 'r', rows: [], color: seriesVar(7), x: 1, y: 0 },
      ...[2, 3, 4].map((column): GraphNode => ({ id: `n${column}`, label: `n${column}`, rows: [], color: seriesVar(7), x: column, y: 0 })),
    ];
    const { container } = renderCanvas({
      nodes: steep,
      edges: [{ fromId: 'p', toId: 'r', label: '-0.00' }, { fromId: 'q', toId: 'r', label: '-1.25' }],
    });
    const columnRight = 10 + 92;
    for (const label of container.querySelectorAll('text.graph-edge-label')) {
      // At the 6.5px a label character is budgeted.
      const left = Number(label.getAttribute('x')) - (label.textContent ?? '').length * 6.5;
      expect(left).toBeGreaterThan(columnRight);
    }
  });

  it('puts the labels of two edges into one node on the far sides of the pair', () => {
    const { container } = renderCanvas();
    const [upper, lower] = [...container.querySelectorAll('text.graph-edge-label')]
      .map((text) => Number(text.getAttribute('y'))) as [number, number];
    // The upper label sits above the upper edge and the lower one below the lower edge.
    expect(upper).toBeLessThan(130);
    expect(lower).toBeGreaterThan(154 + 4);
  });

  it('marks the edges the caller called active, so a step is visible', () => {
    const { container } = renderCanvas();
    expect(container.querySelectorAll('g.graph-edge[data-active="true"]')).toHaveLength(2);
  });

  it('shows what an operation computes as a second line in its box', () => {
    const { container } = renderCanvas();
    const node = container.querySelector('[data-node-id="e"]');
    expect(node?.querySelector('.graph-node-detail')).toHaveTextContent('a + b');
    expect(container.querySelector('[data-node-id="a"] .graph-node-detail')).toBeNull();
  });

  it('prefixes a row with its short name, set apart from the number', () => {
    const { container } = renderCanvas();
    const row = container.querySelector('[data-node-id="d"] .graph-node-value');
    expect(row?.querySelector('.graph-node-short')).toHaveTextContent('value');
    expect(row).toHaveTextContent('value -4.000');
  });

  it('reads a node out with what it computes, its rows and its inputs', () => {
    renderCanvas();
    expect(screen.getByRole('button', { name: /^d: e · c\. value -4\.000\. Inputs e and c\./ }))
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

  it('spreads a graph of few columns across the card', () => {
    const { container } = renderCanvas();
    const svg = container.querySelector('svg.graph-canvas-svg');
    expect(Number(svg?.getAttribute('width'))).toBeGreaterThanOrEqual(540);
    // Three columns 224px apart and three rows 96px apart.
    expect(svg).toHaveAttribute('viewBox', '0 0 560 284');
  });

  it('keeps the narrowest pitch for a graph of many columns', () => {
    const chain = Array.from({ length: 5 }, (_, column): GraphNode => ({
      id: `n${column}`, label: `n${column}`, rows: [], color: seriesVar(1), x: column, y: 0,
    }));
    const { container } = render(<GraphCanvas nodes={chain} edges={[]} caption="A long chain" />);
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 640 92');
  });

  it('sizes a one-column graph to its box', () => {
    const single: GraphNode = { id: 'x', label: 'x', rows: [], color: seriesVar(1), x: 0, y: 0 };
    const { container } = render(<GraphCanvas nodes={[single]} edges={[]} caption="One node" />);
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 112 92');
  });

  it('places a legend between the graph and its caption', () => {
    const { container } = renderCanvas({
      legend: [{ label: 'input', color: seriesVar(1) }, { label: 'operation', color: seriesVar(7) }],
    });
    const parts = [...(container.querySelector('figure.graph-canvas')?.children ?? [])]
      .map((part) => part.getAttribute('class'));
    expect(parts.slice(0, 3)).toEqual(['graph-canvas-svg', 'legend', 'graph-canvas-caption']);
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
