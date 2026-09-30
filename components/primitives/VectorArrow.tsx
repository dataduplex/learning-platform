'use client';

import { clipRay, type Domain2, type Point2D } from '@/lib/linalg';
import { pixel, type PlotScales } from './Plot';

export const HEAD_LENGTH = 9;
export const HEAD_HALF_WIDTH = 4;
/** In pixels: a point this close to the box counts as inside, so float error never cuts a vector. */
const TOLERANCE = 1e-6;

interface PixelBox {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

function pixelBox(scales: PlotScales, box: Domain2): PixelBox {
  const xs = [scales.x(box.x[0]), scales.x(box.x[1])];
  const ys = [scales.y(box.y[0]), scales.y(box.y[1])];
  return {
    left: Math.min(...xs) - TOLERANCE,
    right: Math.max(...xs) + TOLERANCE,
    top: Math.min(...ys) - TOLERANCE,
    bottom: Math.max(...ys) + TOLERANCE,
  };
}

/**
 * The longest reach from (x0, y0) along (ux, uy), at most `length`, at which the tip and
 * both corners of the head lie in the box. Null when no reach fits the head there.
 */
function reachInside(
  x0: number, y0: number, ux: number, uy: number, length: number, box: PixelBox,
): number | null {
  const head = Math.min(HEAD_LENGTH, length);
  const half = HEAD_HALF_WIDTH * (head / HEAD_LENGTH);
  // Each point starts here and moves by (ux, uy) per pixel of reach.
  const starts: readonly (readonly [number, number])[] = [
    [x0, y0],
    [x0 - head * ux - half * uy, y0 - head * uy + half * ux],
    [x0 - head * ux + half * uy, y0 - head * uy - half * ux],
  ];
  let low = head;
  let high = length;
  for (const [sx, sy] of starts) {
    for (const [start, step, min, max] of [[sx, ux, box.left, box.right], [sy, uy, box.top, box.bottom]] as const) {
      if (step > 0) {
        high = Math.min(high, (max - start) / step);
        low = Math.max(low, (min - start) / step);
      } else if (step < 0) {
        high = Math.min(high, (min - start) / step);
        low = Math.max(low, (max - start) / step);
      } else if (start < min || start > max) {
        return null;
      }
    }
  }
  return high >= low ? high : null;
}

/** Where VectorArrow draws a vector, in pixels: its tail, its drawn tip and its direction. */
export interface ArrowGeometry {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly ux: number;
  readonly uy: number;
  readonly length: number;
  /** The drawn tip falls short of the vector's own. */
  readonly clipped: boolean;
}

/**
 * The arrow VectorArrow draws for a vector, or null when it draws nothing. Drawn `within` a
 * box, the tip moves back along the vector until the tip and the head's corners lie inside it.
 */
export function arrowGeometry(
  scales: PlotScales, from: Point2D, to: Point2D, within?: Domain2,
): ArrowGeometry | null {
  const ray = within === undefined ? { point: to, clipped: false } : clipRay(from, to, within);
  const x0 = scales.x(from[0]);
  const y0 = scales.y(from[1]);
  const fullX = scales.x(ray.point[0]);
  const fullY = scales.y(ray.point[1]);
  const full = Math.hypot(fullX - x0, fullY - y0);
  if (full < 1) return null;
  const ux = (fullX - x0) / full;
  const uy = (fullY - y0) / full;
  const length = within === undefined ? full : reachInside(x0, y0, ux, uy, full, pixelBox(scales, within));
  if (length === null || length < 1) return null;
  return {
    x0,
    y0,
    x1: length === full ? fullX : x0 + ux * length,
    y1: length === full ? fullY : y0 + uy * length,
    ux,
    uy,
    length,
    clipped: ray.clipped || length < full,
  };
}

/** A straight mark in drawn pixels. */
export interface Segment {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  /** It stops where it leaves the box, short of the point it heads for. */
  readonly clipped: boolean;
}

/** A segment from a point in the box toward another, cut where it leaves the box. Null under a pixel. */
export function segmentWithin(scales: PlotScales, from: Point2D, to: Point2D, within: Domain2): Segment | null {
  const { point, clipped } = clipRay(from, to, within);
  const x1 = pixel(scales.x(from[0]));
  const y1 = pixel(scales.y(from[1]));
  const x2 = pixel(scales.x(point[0]));
  const y2 = pixel(scales.y(point[1]));
  return Math.hypot(x2 - x1, y2 - y1) < 1 ? null : { x1, y1, x2, y2, clipped };
}

/** A vector from tail to tip, with a drawn head so its direction never has to be guessed. */
export function VectorArrow({
  scales, from, to, color, className, dashed = false, within,
}: {
  scales: PlotScales;
  from: Point2D;
  to: Point2D;
  color: string;
  className: string;
  dashed?: boolean;
  within?: Domain2;
}) {
  const geometry = arrowGeometry(scales, from, to, within);
  if (geometry === null) return null;
  const { x0, y0, x1, y1, ux, uy, length, clipped } = geometry;
  const head = Math.min(HEAD_LENGTH, length);
  const baseX = x1 - ux * head;
  const baseY = y1 - uy * head;
  const half = HEAD_HALF_WIDTH * (head / HEAD_LENGTH);
  const marked = clipped ? { 'data-clipped': 'true' } : {};
  return (
    <>
      <line
        className={className}
        data-role="vector-shaft"
        x1={pixel(x0)} y1={pixel(y0)} x2={pixel(baseX)} y2={pixel(baseY)}
        stroke={color}
        {...(dashed ? { strokeDasharray: '4 3' } : {})}
        {...marked}
      />
      <path
        className={`${className}-head`}
        data-role="vector-head"
        fill={color}
        d={`M${pixel(x1)},${pixel(y1)} L${pixel(baseX - uy * half)},${pixel(baseY + ux * half)} `
          + `L${pixel(baseX + uy * half)},${pixel(baseY - ux * half)} Z`}
        {...marked}
      />
    </>
  );
}
