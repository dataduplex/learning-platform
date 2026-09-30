import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createScales } from './Plot';
import { VectorArrow } from './VectorArrow';

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
});
