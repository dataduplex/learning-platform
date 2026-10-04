'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Legend, type LegendItem } from './Legend';
import { pixel, polylinePoints } from './Plot';
import { TableView } from './TableView';
import { type ArrowHead, arrowHead } from './VectorArrow';

export interface GraphNodeRow {
  readonly name: string;
  /** Drawn before the value inside the box. The full name is what is read out. */
  readonly short?: string | undefined;
  readonly value: string;
}

export interface GraphNode {
  readonly id: string;
  readonly label: string;
  /** What the node computes, drawn under the label and read out after it. */
  readonly detail?: string | undefined;
  /** Shown inside the box and read out after the label. */
  readonly rows: readonly GraphNodeRow[];
  /** From lib/palette. The primitive never picks a colour. */
  readonly color: string;
  /** Column index, as lib/graph/layout produces it. */
  readonly x: number;
  /** Row offset centred on zero, as lib/graph/layout produces it. */
  readonly y: number;
}

export interface GraphEdge {
  readonly fromId: string;
  readonly toId: string;
  readonly label?: string | undefined;
  readonly active?: boolean | undefined;
}

type Point = readonly [number, number];

const PAD = 10;
const BOX_W = 92;
const BOX_H = 72;
/** The narrowest pitch between columns. */
const COL_PITCH = 132;
/** The width a graph of few columns spreads to. */
const WIDE = 560;
const ROW_PITCH = 96;
/** The least gap an edge keeps from a box it passes. */
const CLEARANCE = 6;
/** Baseline to baseline inside a box. */
const LINE = 14;
/** From a label's end to the box its edge points at. The label clears the heads in that gap by height. */
const LABEL_INSET = 4;
/** One label character's advance, estimated at the label's font size. */
const LABEL_ADVANCE = 6.5;
/** From an edge to the nearer side of its label. */
const LABEL_GAP = 4;
/** From a label's top to its baseline. */
const LABEL_ASCENT = 9;

/** A vertical opening at one x that a path must pass through. */
interface Gate {
  readonly x: number;
  readonly top: number;
  readonly bottom: number;
}

/**
 * The shortest path from start to end through every gate in order, sorted by x and all
 * strictly between the two. It bends only at a gate's top or bottom.
 */
function pullThrough(start: Point, end: Point, gates: readonly Gate[]): Point[] {
  const all: readonly Gate[] = [...gates, { x: end[0], top: end[1], bottom: end[1] }];
  const path: Point[] = [start];
  let apex = start;
  let first = 0;
  for (;;) {
    // The slopes from the apex that pass every gate so far, and the gates that bound them.
    let least = -Infinity;
    let most = Infinity;
    let leastAt = first;
    let mostAt = first;
    let bend: { readonly point: Point; readonly index: number } | null = null;
    for (let index = first; index < all.length; index += 1) {
      const gate = all[index] as Gate;
      const run = gate.x - apex[0];
      const toTop = (gate.top - apex[1]) / run;
      const toBottom = (gate.bottom - apex[1]) / run;
      if (toTop > most) {
        bend = { point: [(all[mostAt] as Gate).x, (all[mostAt] as Gate).bottom], index: mostAt };
        break;
      }
      if (toBottom < least) {
        bend = { point: [(all[leastAt] as Gate).x, (all[leastAt] as Gate).top], index: leastAt };
        break;
      }
      if (toTop > least) { least = toTop; leastAt = index; }
      if (toBottom < most) { most = toBottom; mostAt = index; }
    }
    if (bend === null) {
      path.push(end);
      return path;
    }
    path.push(bend.point);
    apex = bend.point;
    first = bend.index + 1;
  }
}

/** The height of a path at x, which must lie within the path's span. */
function heightAt(path: readonly Point[], x: number): number {
  for (let index = 1; index < path.length; index += 1) {
    const [x1, y1] = path[index - 1] as Point;
    const [x2, y2] = path[index] as Point;
    if (x <= x2 || index === path.length - 1) return y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
  }
  throw new Error('a path needs two points');
}

/** The least and greatest height of a path between two x. */
function heightRange(path: readonly Point[], left: number, right: number): readonly [number, number] {
  const heights = [left, right, ...path.map(([x]) => x).filter((x) => x > left && x < right)]
    .map((x) => heightAt(path, x));
  return [Math.min(...heights), Math.max(...heights)];
}

/** One line of text inside a node's box. */
type NodeLine =
  | { readonly kind: 'label' | 'detail'; readonly key: string; readonly text: string }
  | { readonly kind: 'row'; readonly key: string; readonly text: string; readonly short: string | undefined };

/** A box's lines from the top: its label, what it computes, then its rows. */
function nodeLines(node: GraphNode): NodeLine[] {
  return [
    { kind: 'label', key: 'label', text: node.label },
    ...(node.detail === undefined ? [] : [{ kind: 'detail' as const, key: 'detail', text: node.detail }]),
    ...node.rows.map((row) => ({ kind: 'row' as const, key: `row-${row.name}`, text: row.value, short: row.short })),
  ];
}

export function GraphCanvas({
  nodes,
  edges,
  caption,
  legend,
  activeId,
  onActiveChange,
}: {
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  caption: string;
  /** Drawn between the graph and its caption. */
  legend?: readonly LegendItem[] | undefined;
  activeId?: string | undefined;
  onActiveChange?: ((id: string) => void) | undefined;
}) {
  const id = useId();
  const boxes = useRef(new Map<string, SVGGElement>());
  const [wanted, setWanted] = useState('');

  if (nodes.length === 0) return null;

  const columns = Math.max(...nodes.map((node) => node.x)) + 1;
  const yMin = Math.min(...nodes.map((node) => node.y));
  const yMax = Math.max(...nodes.map((node) => node.y));
  const pitch = columns > 1
    ? Math.max(COL_PITCH, (WIDE - PAD * 2 - BOX_W) / (columns - 1))
    : COL_PITCH;
  const width = PAD * 2 + (columns - 1) * pitch + BOX_W;
  const height = PAD * 2 + (yMax - yMin) * ROW_PITCH + BOX_H;

  const cx = (node: GraphNode): number => PAD + BOX_W / 2 + node.x * pitch;
  const cy = (node: GraphNode): number => PAD + BOX_H / 2 + (node.y - yMin) * ROW_PITCH;
  const find = (nodeId: string): GraphNode | undefined => nodes.find((node) => node.id === nodeId);

  /** Each node's incoming edges, from the highest source down, so no two of them cross. */
  const incoming = new Map<string, GraphEdge[]>();
  for (const edge of edges) {
    const shared = incoming.get(edge.toId) ?? [];
    shared.push(edge);
    incoming.set(edge.toId, shared);
  }
  const sourceY = (edge: GraphEdge): number => {
    const from = find(edge.fromId);
    return from === undefined ? 0 : cy(from);
  };
  for (const shared of incoming.values()) shared.sort((left, right) => sourceY(left) - sourceY(right));

  /** Where an edge meets its target. Edges into one node spread evenly down its side. */
  function arrivalY(edge: GraphEdge, to: GraphNode): number {
    const shared = incoming.get(edge.toId) ?? [];
    const index = shared.indexOf(edge);
    return cy(to) + (index - (shared.length - 1) / 2) * (BOX_H / (shared.length + 1));
  }

  /** The opening in one column nearest a height, kept CLEARANCE from every box in it. */
  function openingAt(column: number, near: number): Gate {
    const blocks = nodes
      .filter((node) => node.x === column)
      .map((node) => [cy(node) - BOX_H / 2 - CLEARANCE, cy(node) + BOX_H / 2 + CLEARANCE] as const)
      .sort((left, right) => left[0] - right[0]);
    const openings: (readonly [number, number])[] = [];
    let top = 0;
    for (const [blockTop, blockBottom] of blocks) {
      if (blockTop > top) openings.push([top, blockTop]);
      top = Math.max(top, blockBottom);
    }
    if (top < height) openings.push([top, height]);
    const distance = ([low, high]: readonly [number, number]): number => Math.max(low - near, 0, near - high);
    const [best] = [...openings].sort((left, right) => distance(left) - distance(right));
    if (best === undefined) throw new Error(`column ${column} has no opening`);
    const left = PAD + column * pitch;
    return { x: left, top: best[0], bottom: best[1] };
  }

  /** An edge's path from its source's right side to its arrival, around every box between. */
  function routeOf(edge: GraphEdge, from: GraphNode, to: GraphNode): Point[] {
    const start: Point = [cx(from) + BOX_W / 2, cy(from)];
    const end: Point = [cx(to) - BOX_W / 2, arrivalY(edge, to)];
    const gates: Gate[] = [];
    for (let column = from.x + 1; column < to.x; column += 1) {
      const middle = PAD + column * pitch + BOX_W / 2;
      const near = start[1] + ((end[1] - start[1]) * (middle - start[0])) / (end[0] - start[0]);
      const opening = openingAt(column, near);
      gates.push(opening, { ...opening, x: opening.x + BOX_W });
    }
    return pullThrough(start, end, gates);
  }

  const routes = new Map<GraphEdge, readonly Point[]>();
  const heads = new Map<GraphEdge, ArrowHead>();
  for (const edge of edges) {
    const from = find(edge.fromId);
    const to = find(edge.toId);
    if (from === undefined || to === undefined) continue;
    const path = routeOf(edge, from, to);
    const [x1, y1] = path.at(-2) as Point;
    const [x2, y2] = path.at(-1) as Point;
    const length = Math.hypot(x2 - x1, y2 - y1);
    routes.set(edge, path);
    heads.set(edge, arrowHead(x2, y2, (x2 - x1) / length, (y2 - y1) / length, length));
  }

  /**
   * A label's baseline. The lowest of several edges into one node takes its label below
   * the edge, and every other edge above, so a pair's labels sit on its far sides. A label
   * reaches over its edge's head, so it clears the head as well as the edge.
   */
  function labelY(edge: GraphEdge, path: readonly Point[], head: ArrowHead, right: number, text: string): number {
    const heights = [
      ...heightRange(path, right - text.length * LABEL_ADVANCE, right),
      ...head.corners.map(([, y]) => y),
    ];
    const shared = incoming.get(edge.toId) ?? [];
    return shared.length > 1 && shared.at(-1) === edge
      ? Math.max(...heights) + LABEL_GAP + LABEL_ASCENT
      : Math.min(...heights) - LABEL_GAP;
  }

  const reading = [...nodes].sort((left, right) => left.x - right.x || left.y - right.y);
  const focusId = nodes.some((node) => node.id === wanted) ? wanted : (reading[0]?.id ?? '');

  function focus(nodeId: string): void {
    setWanted(nodeId);
    boxes.current.get(nodeId)?.focus();
  }

  function step(from: GraphNode, key: string): void {
    const sameColumn = nodes
      .filter((node) => node.x === from.x)
      .sort((left, right) => left.y - right.y);
    const index = sameColumn.indexOf(from);

    if (key === 'ArrowUp') focus(sameColumn[index - 1]?.id ?? from.id);
    if (key === 'ArrowDown') focus(sameColumn[index + 1]?.id ?? from.id);

    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      const target = from.x + (key === 'ArrowRight' ? 1 : -1);
      const nearest = nodes
        .filter((node) => node.x === target)
        .sort((left, right) => (
          Math.abs(left.y - from.y) - Math.abs(right.y - from.y) || left.y - right.y
        ));
      focus(nearest[0]?.id ?? from.id);
    }
  }

  function onKeyDown(event: KeyboardEvent<SVGGElement>, node: GraphNode): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActiveChange?.(node.id);
      return;
    }
    if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      step(node, event.key);
    }
  }

  function nameOf(node: GraphNode): string {
    const computes = node.detail === undefined ? '' : `${node.detail}. `;
    const values = node.rows.map((row) => `${row.name} ${row.value}`).join(', ');
    const inputs = edges
      .filter((edge) => edge.toId === node.id)
      .map((edge) => find(edge.fromId)?.label ?? edge.fromId);
    const parents = inputs.length === 0
      ? 'An input to the graph.'
      : `Inputs ${inputs.join(' and ')}.`;
    return `${node.label}: ${computes}${values}. ${parents} Column ${node.x + 1} of ${columns}.`
      + ' Arrow keys move, Enter selects.';
  }

  const rowNames = [...new Set(nodes.flatMap((node) => node.rows.map((row) => row.name)))];

  return (
    <figure className="graph-canvas">
      <svg
        className="graph-canvas-svg"
        role="group"
        aria-labelledby={`${id}-caption`}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
      >
        <title id={`${id}-caption`}>{caption}</title>

        <g className="graph-edges" aria-hidden="true">
          {edges.map((edge) => {
            const path = routes.get(edge);
            const head = heads.get(edge);
            if (path === undefined || head === undefined) return null;
            return (
              <g
                key={`${edge.fromId}-${edge.toId}`}
                className="graph-edge"
                data-from={edge.fromId}
                data-to={edge.toId}
                data-active={edge.active === true ? 'true' : undefined}
              >
                <polyline
                  className="graph-edge-line"
                  points={polylinePoints([...path.slice(0, -1), [head.baseX, head.baseY]])}
                />
                <path className="graph-edge-head" d={head.d} />
              </g>
            );
          })}
        </g>

        {nodes.map((node) => (
          <g
            key={node.id}
            ref={(element) => {
              if (element === null) boxes.current.delete(node.id);
              else boxes.current.set(node.id, element);
            }}
            className="graph-node"
            data-node-id={node.id}
            data-active={node.id === activeId ? 'true' : undefined}
            role="button"
            aria-pressed={node.id === activeId}
            aria-label={nameOf(node)}
            tabIndex={node.id === focusId ? 0 : -1}
            onClick={() => { focus(node.id); onActiveChange?.(node.id); }}
            onKeyDown={(event) => onKeyDown(event, node)}
          >
            <rect
              className="graph-node-box"
              x={cx(node) - BOX_W / 2}
              y={cy(node) - BOX_H / 2}
              width={BOX_W}
              height={BOX_H}
              rx={7}
              stroke={node.color}
            />
            {nodeLines(node).map((line, index, lines) => {
              const y = cy(node) + 4 + (index - (lines.length - 1) / 2) * LINE;
              return line.kind === 'row' ? (
                <text key={line.key} className="graph-node-value" x={cx(node)} y={y} textAnchor="middle">
                  {line.short === undefined ? null : (
                    <><tspan className="graph-node-short">{line.short}</tspan>{' '}</>
                  )}
                  {line.text}
                </text>
              ) : (
                <text key={line.key} className={`graph-node-${line.kind}`} x={cx(node)} y={y} textAnchor="middle">
                  {line.text}
                </text>
              );
            })}
          </g>
        ))}

        {/*
          Labels last, and each one inside the empty channel left of the node it points at.
          No box reaches into that channel, so a label cannot land on an unrelated node.
        */}
        <g className="graph-edge-labels" aria-hidden="true">
          {edges.map((edge) => {
            const path = routes.get(edge);
            const head = heads.get(edge);
            if (path === undefined || head === undefined || edge.label === undefined) return null;
            const right = (path.at(-1) as Point)[0] - LABEL_INSET;
            return (
              <text
                key={`${edge.fromId}-${edge.toId}`}
                className="graph-edge-label"
                x={right}
                y={pixel(labelY(edge, path, head, right, edge.label))}
                textAnchor="end"
              >
                {edge.label}
              </text>
            );
          })}
        </g>
      </svg>

      {legend === undefined ? null : <Legend items={legend} />}

      <figcaption className="graph-canvas-caption">{caption}</figcaption>

      <TableView
        caption={caption}
        columns={['node', ...rowNames]}
        rows={reading.map((node) => [
          node.label,
          ...rowNames.map((name) => node.rows.find((row) => row.name === name)?.value ?? '-'),
        ])}
      />
    </figure>
  );
}
