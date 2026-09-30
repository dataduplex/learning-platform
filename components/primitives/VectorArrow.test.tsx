import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectInside, pathPoints } from '@/test/render';
import { createScales, pixel } from './Plot';
import { VectorArrow, arrowGeometry, segmentWithin } from './VectorArrow';

const scales = createScales([-5, 5], [-5, 5], { left: 0, top: 0, width: 400, height: 400 }, 'equal');

describe('VectorArrow', () => {
  it('ends its shaft where its head begins, so the stroke never pokes through the tip', () => {
    const { container } = render(<svg><VectorArrow scales={scales} from={[0, 0]} to={[4, 0]} color="red" className="v" /></svg>);
    // Data x 4 is pixel 360 and the head is 9px long.
    expect(container.querySelector('line.v')).toHaveAttribute('x2', '351');
    expect(container.querySelector('path.v-head')?.getAttribute('d')).toBe('M360,200 L351,204 L351,196 Z');
  });

  it('draws nothing for a vector shorter than a pixel', () => {
    const { container } = render(<svg><VectorArrow scales={scales} from={[0, 0]} to={[0.001, 0]} color="red" className="v" /></svg>);
    expect(container.querySelector('line')).toBeNull();
    expect(container.querySelector('path')).toBeNull();
  });

  it('stops at the edge of the box it is drawn within, along its own direction', () => {
    const { container } = render(
      <svg>
        <VectorArrow scales={scales} from={[0, 0]} to={[7, 4]} color="red" className="v" within={{ x: [-5, 5], y: [-5, 5] }} />
      </svg>,
    );
    // The tip moves to (5, 20/7): pixel x 400, pixel y 400 - (55/7) * 40 = 85.71.
    expect(container.querySelector('path.v-head')?.getAttribute('d')).toMatch(/^M400,85\.71 /);
    expect(container.querySelector('line.v')).toHaveAttribute('data-clipped', 'true');
    expect(container.querySelector('path.v-head')).toHaveAttribute('data-clipped', 'true');
  });

  it('pulls the tip back until its head clears an edge the vector leaves nearly along', () => {
    const { container } = render(
      <svg>
        <VectorArrow scales={scales} from={[-4, 4.5]} to={[6, 5.3]} color="red" className="v" within={{ x: [-5, 5], y: [-5, 5] }} />
      </svg>,
    );
    // The ray leaves through the top at (2.25, 5), pixel (290, 0), where its upper corner
    // would sit 3.27px above the box. Back along the vector, that corner touches the edge.
    const head = container.querySelector('path.v-head');
    expect(head?.getAttribute('d')).toBe('M249.13,3.27 L240.48,7.97 L239.84,0 Z');
    const corners = pathPoints(head);
    expect(corners).toHaveLength(3);
    expectInside(corners, { left: 0, top: 0, right: 400, bottom: 400 });
    expect(head).toHaveAttribute('data-clipped', 'true');
    expect(container.querySelector('line.v')).toHaveAttribute('data-clipped', 'true');
  });

  it('draws nothing for an arrow that lies along an edge, where no head fits inside', () => {
    const { container } = render(
      <svg>
        <VectorArrow scales={scales} from={[5, 0]} to={[5, 3]} color="red" className="v" within={{ x: [-5, 5], y: [-5, 5] }} />
      </svg>,
    );
    expect(container.querySelector('line')).toBeNull();
    expect(container.querySelector('path')).toBeNull();
  });

  it('marks nothing as clipped when the vector ends inside the box', () => {
    const { container } = render(
      <svg>
        <VectorArrow scales={scales} from={[0, 0]} to={[4, 0]} color="red" className="v" within={{ x: [-5, 5], y: [-5, 5] }} />
      </svg>,
    );
    expect(container.querySelector('path.v-head')?.getAttribute('d')).toBe('M360,200 L351,204 L351,196 Z');
    expect(container.querySelector('line.v')).not.toHaveAttribute('data-clipped');
    expect(container.querySelector('path.v-head')).not.toHaveAttribute('data-clipped');
  });
});

describe('arrowGeometry', () => {
  const box = { x: [-5, 5], y: [-5, 5] } as const;

  it('reports the tip VectorArrow draws, so a caller can say what the plot shows', () => {
    const geometry = arrowGeometry(scales, [-4, 4.5], [6, 5.3], box);
    const { container } = render(
      <svg><VectorArrow scales={scales} from={[-4, 4.5]} to={[6, 5.3]} color="red" className="v" within={box} /></svg>,
    );
    expect(geometry?.clipped).toBe(true);
    expect(container.querySelector('path.v-head')?.getAttribute('d'))
      .toMatch(new RegExp(`^M${pixel(geometry?.x1 ?? NaN)},${pixel(geometry?.y1 ?? NaN)} `));
  });

  it('is null exactly when VectorArrow draws nothing', () => {
    expect(arrowGeometry(scales, [5, 0], [5, 3], box)).toBeNull();
    expect(arrowGeometry(scales, [0, 0], [0.001, 0])).toBeNull();
    expect(arrowGeometry(scales, [0, 0], [4, 0], box)?.clipped).toBe(false);
  });
});

describe('segmentWithin', () => {
  const box = { x: [-5, 5], y: [-5, 5] } as const;

  it('cuts a segment where it leaves the box, in drawn pixels', () => {
    expect(segmentWithin(scales, [0, 0], [10, 0], box)).toEqual({ x1: 200, y1: 200, x2: 400, y2: 200, clipped: true });
    expect(segmentWithin(scales, [0, 0], [1, 1], box)).toEqual({ x1: 200, y1: 200, x2: 240, y2: 160, clipped: false });
  });

  it('is null when less than a pixel of it is left inside', () => {
    expect(segmentWithin(scales, [5, 0], [6, 1], box)).toBeNull();
    expect(segmentWithin(scales, [1, 1], [1, 1], box)).toBeNull();
  });
});
