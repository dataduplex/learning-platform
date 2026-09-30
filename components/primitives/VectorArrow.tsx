'use client';

import { clipRay, type Domain2 } from '@/lib/linalg';
import { pixel, type PlotScales } from './Plot';

const HEAD_LENGTH = 9;
const HEAD_HALF_WIDTH = 4;

/**
 * A vector from tail to tip, with a drawn head so its direction never has to be guessed.
 * Drawn `within` a box, a tip beyond the box moves back to its edge along the vector.
 */
export function VectorArrow({
  scales, from, to, color, className, dashed = false, within,
}: {
  scales: PlotScales;
  from: readonly [number, number];
  to: readonly [number, number];
  color: string;
  className: string;
  dashed?: boolean;
  within?: Domain2;
}) {
  const { point: tip, clipped } = within === undefined ? { point: to, clipped: false } : clipRay(from, to, within);
  const x0 = scales.x(from[0]);
  const y0 = scales.y(from[1]);
  const x1 = scales.x(tip[0]);
  const y1 = scales.y(tip[1]);
  const length = Math.hypot(x1 - x0, y1 - y0);
  if (length < 1) return null;
  const ux = (x1 - x0) / length;
  const uy = (y1 - y0) / length;
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
