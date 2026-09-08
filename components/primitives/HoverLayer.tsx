'use client';

import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { PlotScales } from './Plot';

export interface HoverPoint {
  key: string;
  x: number;
  y: number;
}

export interface HoverLayerProps {
  scales: PlotScales;
  points: readonly HoverPoint[];
  /** Called with the active point's key, or null when nothing is active. */
  onActiveChange: (key: string | null) => void;
  /** Accessible name, e.g. "Similarity scores". */
  label: string;
}

/**
 * A transparent overlay that resolves both pointer position and arrow keys to
 * one of the given points. The widget above decides what to show for the
 * active key.
 */
export function HoverLayer({ scales, points, onActiveChange, label }: HoverLayerProps) {
  const rectRef = useRef<SVGRectElement>(null);
  const [index, setIndex] = useState(-1);
  const { inner } = scales;

  function nearestTo(pixelX: number, pixelY: number): string | null {
    let bestKey: string | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const point of points) {
      const dx = scales.x(point.x) - pixelX;
      const dy = scales.y(point.y) - pixelY;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestKey = point.key;
      }
    }
    return bestKey;
  }

  function handlePointerMove(event: PointerEvent<SVGRectElement>): void {
    const bounds = rectRef.current?.getBoundingClientRect();
    // jsdom reports a zero-size box, so fall back to raw client coordinates.
    const offsetX = bounds && bounds.width > 0 ? event.clientX - bounds.left : event.clientX;
    const offsetY = bounds && bounds.height > 0 ? event.clientY - bounds.top : event.clientY;
    onActiveChange(nearestTo(offsetX + inner.left, offsetY + inner.top));
  }

  function move(next: number): void {
    const clamped = Math.min(points.length - 1, Math.max(0, next));
    setIndex(clamped);
    onActiveChange(points[clamped]?.key ?? null);
  }

  function handleKeyDown(event: KeyboardEvent<SVGRectElement>): void {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        move(index + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        move(index <= 0 ? 0 : index - 1);
        break;
      case 'Home':
        event.preventDefault();
        move(0);
        break;
      case 'End':
        event.preventDefault();
        move(points.length - 1);
        break;
      case 'Escape':
        setIndex(-1);
        onActiveChange(null);
        break;
      default:
        break;
    }
  }

  return (
    <rect
      ref={rectRef}
      className="hover-layer"
      role="button"
      aria-label={label}
      tabIndex={0}
      x={inner.left}
      y={inner.top}
      width={inner.width}
      height={inner.height}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => { onActiveChange(null); }}
      onKeyDown={handleKeyDown}
      onBlur={() => { setIndex(-1); onActiveChange(null); }}
    />
  );
}
