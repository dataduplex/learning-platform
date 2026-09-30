'use client';

import { pixel, type PlotScales } from './Plot';

/** Category bars never fill their slot; the rest of the slot is left empty. */
export const BAR_MAX_WIDTH = 24;
export const BAR_RADIUS = 4;
/** Neighbouring histogram bins are separated by a gap in the surface colour. */
export const BIN_GAP = 2;

/** A column from y0 to y1 in pixels, rounded only at the end away from y0. */
function columnPath(left: number, right: number, y0: number, y1: number): string {
  const x0 = pixel(left);
  const x1 = pixel(right);
  const base = pixel(y0);
  const tip = pixel(y1);
  const r = pixel(Math.min(BAR_RADIUS, (x1 - x0) / 2, Math.abs(base - tip)));
  if (r <= 0) return `M${x0},${base} L${x1},${base} L${x1},${tip} L${x0},${tip} Z`;
  const up = tip < base;
  const inset = pixel(up ? tip + r : tip - r);
  const sweep = up ? 1 : 0;
  return `M${x0},${base} L${x0},${inset} A${r},${r} 0 0 ${sweep} ${pixel(x0 + r)},${tip} `
    + `L${pixel(x1 - r)},${tip} A${r},${r} 0 0 ${sweep} ${x1},${inset} L${x1},${base} Z`;
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
