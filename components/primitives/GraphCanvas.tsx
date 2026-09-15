'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { TableView } from './TableView';

export interface GraphNodeRow {
  readonly name: string;
  readonly value: string;
}

export interface GraphNode {
  readonly id: string;
  readonly label: string;
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

const PAD = 10;
const BOX_W = 92;
const BOX_H = 56;
const COL_PITCH = 132;
/**
 * Generous against BOX_H: a diagonal spanning several columns has to clear the boxes
 * standing between its ends, and so does its label.
 */
const ROW_PITCH = 96;

export function GraphCanvas({
  nodes,
  edges,
  caption,
  activeId,
  onActiveChange,
}: {
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  caption: string;
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
  const width = PAD * 2 + (columns - 1) * COL_PITCH + BOX_W;
  const height = PAD * 2 + (yMax - yMin) * ROW_PITCH + BOX_H;

  const cx = (node: GraphNode): number => PAD + BOX_W / 2 + node.x * COL_PITCH;
  const cy = (node: GraphNode): number => PAD + BOX_H / 2 + (node.y - yMin) * ROW_PITCH;
  const find = (nodeId: string): GraphNode | undefined => nodes.find((node) => node.id === nodeId);

  const incoming = new Map<string, GraphEdge[]>();
  for (const edge of edges) {
    const shared = incoming.get(edge.toId) ?? [];
    shared.push(edge);
    incoming.set(edge.toId, shared);
  }

  /** Edges into one node arrive at distinct heights, so their labels cannot coincide. */
  function arrivalY(edge: GraphEdge, to: GraphNode): number {
    const shared = incoming.get(edge.toId) ?? [];
    const index = shared.indexOf(edge);
    return cy(to) + (index - (shared.length - 1) / 2) * (BOX_H / (shared.length + 1));
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
    const values = node.rows.map((row) => `${row.name} ${row.value}`).join(', ');
    const inputs = edges
      .filter((edge) => edge.toId === node.id)
      .map((edge) => find(edge.fromId)?.label ?? edge.fromId);
    const parents = inputs.length === 0
      ? 'An input to the graph.'
      : `Inputs ${inputs.join(' and ')}.`;
    return `${node.label}: ${values}. ${parents} Column ${node.x + 1} of ${columns}.`
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
            const from = find(edge.fromId);
            const to = find(edge.toId);
            if (from === undefined || to === undefined) return null;
            const x1 = cx(from) + BOX_W / 2;
            const x2 = cx(to) - BOX_W / 2;
            return (
              <g key={`${edge.fromId}-${edge.toId}`}>
                <line
                  className="graph-edge"
                  data-active={edge.active === true ? 'true' : undefined}
                  x1={x1}
                  y1={cy(from)}
                  x2={x2}
                  y2={arrivalY(edge, to)}
                />
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
            <text className="graph-node-label" x={cx(node)} y={cy(node) - 12} textAnchor="middle">
              {node.label}
            </text>
            {node.rows.map((row, index) => (
              <text
                key={row.name}
                className="graph-node-value"
                x={cx(node)}
                y={cy(node) + 4 + index * 14}
                textAnchor="middle"
              >
                {row.value}
              </text>
            ))}
          </g>
        ))}

        {/*
          Labels last, and each one inside the empty channel left of the node it points at.
          That channel is COL_PITCH - BOX_W wide and no box can reach into it, so a label
          cannot land on top of an unrelated node however far its edge travels.
        */}
        <g className="graph-edge-labels" aria-hidden="true">
          {edges.map((edge) => {
            const from = find(edge.fromId);
            const to = find(edge.toId);
            if (from === undefined || to === undefined || edge.label === undefined) return null;
            const x1 = cx(from) + BOX_W / 2;
            const x2 = cx(to) - BOX_W / 2;
            const x = x2 - 6;
            const along = (x - x1) / (x2 - x1);
            const y2 = arrivalY(edge, to);
            return (
              <text
                key={`${edge.fromId}-${edge.toId}`}
                className="graph-edge-label"
                x={x}
                y={cy(from) + (y2 - cy(from)) * along - 4}
                textAnchor="end"
              >
                {edge.label}
              </text>
            );
          })}
        </g>
      </svg>

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
