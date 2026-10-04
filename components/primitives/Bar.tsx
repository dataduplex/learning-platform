'use client';

import { pixel, type PlotScales } from './Plot';

/** Category bars never fill their slot; the rest of the slot is left empty. */
export const BAR_MAX_WIDTH = 24;
export const BAR_RADIUS = 4;
/** Neighbouring histogram bins are separated by a gap in the surface colour. */
export const BIN_GAP = 2;
/** Two bars sharing a slot sit this many pixels either side of its centre, BIN_GAP apart. */
export const PAIR_OFFSET = (BAR_MAX_WIDTH + BIN_GAP) / 2;

/**
 * A bar in pixels whose length runs along `axis` from `from` to `to`, between `side0` and `side1`
 * across it, rounded only at the end away from `from`.
 */
function barPath(axis: 'x' | 'y', side0: number, side1: number, from: number, to: number): string {
  const s0 = pixel(side0);
  const s1 = pixel(side1);
  const base = pixel(from);
  const tip = pixel(to);
  const point = axis === 'y'
    ? (across: number, along: number) => `${across},${along}`
    : (across: number, along: number) => `${along},${across}`;
  const r = pixel(Math.min(BAR_RADIUS, (s1 - s0) / 2, Math.abs(base - tip)));
  if (r <= 0) return `M${point(s0, base)} L${point(s1, base)} L${point(s1, tip)} L${point(s0, tip)} Z`;
  const inset = pixel(tip < base ? tip + r : tip - r);
  // Trading x for y mirrors the outline, so the same corner turns the other way.
  const sweep = (tip < base) === (axis === 'y') ? 1 : 0;
  return `M${point(s0, base)} L${point(s0, inset)} A${r},${r} 0 0 ${sweep} ${point(pixel(s0 + r), tip)} `
    + `L${point(pixel(s1 - r), tip)} A${r},${r} 0 0 ${sweep} ${point(s1, inset)} L${point(s1, base)} Z`;
}

/** A column from y0 to y1 in pixels, rounded only at the end away from y0. */
function columnPath(left: number, right: number, y0: number, y1: number): string {
  return barPath('y', left, right, y0, y1);
}

/** A bar from x0 to x1 in pixels, rounded only at the end away from x0. */
export function horizontalBarPath(top: number, bottom: number, x0: number, x1: number): string {
  return barPath('x', top, bottom, x0, x1);
}

export function Bar({
  scales, x, dx = 0, width = BAR_MAX_WIDTH, base, value, role, color,
}: {
  scales: PlotScales;
  /** The category's centre, in data units. */
  x: number;
  /** This bar's offset from the centre in pixels, for bars that share a slot. */
  dx?: number;
  width?: number;
  base: number;
  value: number;
  role: string;
  color: string;
}) {
  const half = Math.min(width, BAR_MAX_WIDTH) / 2;
  const centre = scales.x(x) + dx;
  return (
    <path
      className="dist-bar"
      data-role={role}
      fill={color}
      d={columnPath(centre - half, centre + half, scales.y(base), scales.y(value))}
    />
  );
}

export function Bin({
  scales, from, to, value, role, color,
}: {
  scales: PlotScales;
  from: number;
  to: number;
  value: number;
  role: string;
  color: string;
}) {
  return (
    <path
      className="dist-bar"
      data-role={role}
      fill={color}
      d={columnPath(scales.x(from) + BIN_GAP / 2, scales.x(to) - BIN_GAP / 2, scales.y(0), scales.y(value))}
    />
  );
}
