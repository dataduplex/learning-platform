import { describe, expect, it } from 'vitest';
import { HEAD_HALF_WIDTH, HEAD_LENGTH, arrowHead } from './ArrowHead';

describe('arrowHead', () => {
  it('draws a full head behind the tip, along the unit vector', () => {
    const head = arrowHead(100, 50, 1, 0, 40);
    expect(head.baseX).toBe(100 - HEAD_LENGTH);
    expect(head.baseY).toBe(50);
    expect(head.corners).toEqual([[100, 50], [91, 50 + HEAD_HALF_WIDTH], [91, 50 - HEAD_HALF_WIDTH]]);
    expect(head.d).toBe('M100,50 L91,54 L91,46 Z');
  });

  it('shrinks in proportion when the arrow is shorter than a full head', () => {
    const head = arrowHead(0, 0, 0, -1, 3);
    expect(head.baseX).toBe(0);
    expect(head.baseY).toBe(3);
    expect(head.corners[1]?.[0]).toBeCloseTo(4 / 3);
    expect(head.corners[2]?.[0]).toBeCloseTo(-4 / 3);
  });
});
