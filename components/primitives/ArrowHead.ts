import { pixel } from './Plot';

export const HEAD_LENGTH = 9;
export const HEAD_HALF_WIDTH = 4;

/** An arrowhead in pixel space: the centre of its base, its corners, and its outline. */
export interface ArrowHead {
  readonly baseX: number;
  readonly baseY: number;
  /** The tip, then the two ends of the base. */
  readonly corners: readonly (readonly [number, number])[];
  readonly d: string;
}

/**
 * The head whose tip is (x, y), pointing along the unit vector (ux, uy). It shrinks in
 * proportion when the arrow is shorter than a full head.
 */
export function arrowHead(x: number, y: number, ux: number, uy: number, length: number): ArrowHead {
  const head = Math.min(HEAD_LENGTH, length);
  const half = HEAD_HALF_WIDTH * (head / HEAD_LENGTH);
  const baseX = x - ux * head;
  const baseY = y - uy * head;
  const corners = [[x, y], [baseX - uy * half, baseY + ux * half], [baseX + uy * half, baseY - ux * half]] as const;
  const [tip, left, right] = corners;
  return {
    baseX,
    baseY,
    corners,
    d: `M${pixel(tip[0])},${pixel(tip[1])} L${pixel(left[0])},${pixel(left[1])} L${pixel(right[0])},${pixel(right[1])} Z`,
  };
}
