'use client';

import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { formatFixed } from './NumberReadout';
import { pixel, type PlotScales } from './Plot';
import { VectorArrow } from './VectorArrow';

export type Point2 = [number, number];

function roundToStep(value: number, step: number): number {
  return Number((Math.round(value / step) * step).toFixed(6));
}

/**
 * A draggable arrow tip. Owns no state: the parent holds the vector, so the
 * same value can feed a readout, a formula, and an exercise at once.
 */
export function VectorHandle({
  scales,
  value,
  onChange,
  label,
  color = 'var(--series-1)',
  step = 0.25,
}: {
  scales: PlotScales;
  value: Point2;
  onChange: (next: Point2) => void;
  label: string;
  color?: string;
  step?: number;
}) {
  const dragging = useRef(false);
  const [x, y] = value;
  const tipX = scales.x(x);
  const tipY = scales.y(y);

  function clamp(next: Point2): Point2 {
    const lowX = scales.invertX(scales.inner.left);
    const highX = scales.invertX(scales.inner.left + scales.inner.width);
    const lowY = scales.invertY(scales.inner.top + scales.inner.height);
    const highY = scales.invertY(scales.inner.top);
    return [
      Math.min(highX, Math.max(lowX, next[0])),
      Math.min(highY, Math.max(lowY, next[1])),
    ];
  }

  function nudge(dx: number, dy: number): void {
    onChange(clamp([roundToStep(x + dx, step), roundToStep(y + dy, step)]));
  }

  function handleKeyDown(event: KeyboardEvent<SVGGElement>): void {
    const distance = event.shiftKey ? step * 10 : step;
    switch (event.key) {
      case 'ArrowRight': event.preventDefault(); nudge(distance, 0); break;
      case 'ArrowLeft': event.preventDefault(); nudge(-distance, 0); break;
      case 'ArrowUp': event.preventDefault(); nudge(0, distance); break;
      case 'ArrowDown': event.preventDefault(); nudge(0, -distance); break;
      case 'Home': event.preventDefault(); onChange([0, 0]); break;
      default: break;
    }
  }

  function moveTo(event: PointerEvent<SVGElement>): void {
    const svg = event.currentTarget.ownerSVGElement ?? event.currentTarget;
    const bounds = svg.getBoundingClientRect();
    if (bounds.width === 0) return;
    const scaleX = svg.clientWidth === 0 ? 1 : bounds.width / svg.clientWidth;
    const localX = (event.clientX - bounds.left) / scaleX;
    const localY = (event.clientY - bounds.top) / scaleX;
    onChange(clamp([
      roundToStep(scales.invertX(localX), step),
      roundToStep(scales.invertY(localY), step),
    ]));
  }

  return (
    <g
      className="vector-handle"
      role="button"
      tabIndex={0}
      aria-label={`${label}, x ${formatFixed(x, 2)}, y ${formatFixed(y, 2)}. Arrow keys to move.`}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => {
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => { if (dragging.current) moveTo(event); }}
      onPointerUp={(event) => {
        dragging.current = false;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
    >
      <VectorArrow scales={scales} from={[0, 0]} to={value} color={color} className="vector-shaft" />
      {/* The grab area is 24px across, wider than the head it sits on. */}
      <circle className="vector-grab" cx={pixel(tipX)} cy={pixel(tipY)} r={12} />
      <circle
        data-role="vector-tip"
        className="vector-tip"
        cx={pixel(tipX)} cy={pixel(tipY)} r={7}
        fill="none" stroke={color}
      />
    </g>
  );
}
