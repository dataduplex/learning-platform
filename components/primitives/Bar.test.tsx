import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Bar, Bin, BAR_MAX_WIDTH } from './Bar';
import { createScales } from './Plot';

const scales = createScales([0.5, 5.5], [-1, 1], { left: 0, top: 0, width: 500, height: 200 }, 'fill');

/** The x of every point in a path written with absolute M, L and A commands. */
function pathXs(d: string): number[] {
  const xs: number[] = [];
  for (const [, command, args] of d.matchAll(/([MLA])([^MLAZ]*)/g)) {
    const values = (args ?? '').trim().split(/[ ,]+/).map(Number);
    xs.push(command === 'A' ? values[5] as number : values[0] as number);
  }
  return xs;
}

describe('Bar', () => {
  it('never fills its slot', () => {
    const { container } = render(<svg><Bar scales={scales} x={1} width={80} base={0} value={0.5} role="p" color="red" /></svg>);
    const path = container.querySelector('path.dist-bar') as SVGPathElement;
    expect(path).toHaveAttribute('data-role', 'p');
    const xs = pathXs(path.getAttribute('d') ?? '');
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(BAR_MAX_WIDTH, 6);
  });

  it('rounds the end away from the baseline and keeps the baseline square', () => {
    const { container } = render(
      <svg>
        <Bar scales={scales} x={1} base={0} value={0.5} role="up" color="red" />
        <Bar scales={scales} x={2} base={0} value={-0.5} role="down" color="red" />
      </svg>,
    );
    const up = container.querySelector('[data-role="up"]')?.getAttribute('d') ?? '';
    const down = container.querySelector('[data-role="down"]')?.getAttribute('d') ?? '';
    expect(up).toMatch(/A4,4 0 0 1/);
    expect(down).toMatch(/A4,4 0 0 0/);
    // Both start on the baseline at y = 100 with a straight edge.
    expect(up).toMatch(/^M\d+(\.\d+)?,100 L/);
    expect(down).toMatch(/^M\d+(\.\d+)?,100 L/);
  });

  it('quantises every coordinate it draws', () => {
    const { container } = render(<svg><Bar scales={scales} x={1.3333333} base={0} value={0.123456} role="q" color="red" /></svg>);
    for (const match of (container.querySelector('path')?.getAttribute('d') ?? '').matchAll(/-?\d+(\.\d+)?/g)) {
      const value = Number(match[0]);
      expect(Math.round(value * 100) / 100).toBe(value);
    }
  });

  it('draws a zero-height bar as a flat path, not NaN', () => {
    const { container } = render(<svg><Bar scales={scales} x={1} base={0} value={0} role="z" color="red" /></svg>);
    expect(container.querySelector('path')?.getAttribute('d')).not.toMatch(/NaN/);
  });
});

describe('Bin', () => {
  it('leaves a 2px surface gap between neighbouring bins', () => {
    const { container } = render(
      <svg>
        <Bin scales={scales} from={1} to={2} value={0.5} role="a" color="red" />
        <Bin scales={scales} from={2} to={3} value={0.5} role="b" color="red" />
      </svg>,
    );
    const a = pathXs(container.querySelector('[data-role="a"]')?.getAttribute('d') ?? '');
    const b = pathXs(container.querySelector('[data-role="b"]')?.getAttribute('d') ?? '');
    expect(Math.min(...b) - Math.max(...a)).toBeCloseTo(2, 6);
  });
});
