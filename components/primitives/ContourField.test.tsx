// components/primitives/ContourField.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { contourScale } from '@/lib/palette';
import { ContourField } from './ContourField';
import { createScales } from './Plot';

const scales = createScales([-3, 3], [-3, 3], { left: 0, top: 0, width: 300, height: 300 }, 'equal');
const bowl = (x: number, y: number) => x * x + y * y;
const DOMAIN = { x: [-3, 3] as const, y: [-3, 3] as const };

function renderField(props: Partial<Parameters<typeof ContourField>[0]> = {}) {
  return render(
    <svg>
      <ContourField scales={scales} f={bowl} domain={DOMAIN} {...props} />
    </svg>,
  );
}

describe('ContourField', () => {
  it('draws one path per level', () => {
    const { container } = renderField({ levels: [1, 4, 9] });
    expect(container.querySelectorAll('path.contour-line')).toHaveLength(3);
  });

  it('chooses its own levels when not given any', () => {
    const { container } = renderField({ levelCount: 5 });
    expect(container.querySelectorAll('path.contour-line')).toHaveLength(5);
  });

  it('draws in pixel space, so the path lands inside the plot box', () => {
    const { container } = renderField({ levels: [4] });
    const d = container.querySelector('path.contour-line')?.getAttribute('d') ?? '';
    const numbers = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    expect(numbers.length).toBeGreaterThan(4);
    for (const value of numbers) {
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(301);
    }
  });

  it('hides its paths from the accessibility tree, which the figure title covers', () => {
    const { container } = renderField({ levels: [4] });
    expect(container.querySelector('g.contour-field')).toHaveAttribute('aria-hidden', 'true');
  });

  it('emits no path for a level the function never reaches', () => {
    const { container } = renderField({ levels: [-5] });
    expect(container.querySelectorAll('path.contour-line')).toHaveLength(0);
  });

  it('takes its colour from the shared sequential ramp, not from a local literal', () => {
    const { container } = renderField({ levels: [1, 4] });
    const ramp = contourScale(2, 'light');
    const strokes = [...container.querySelectorAll('path.contour-line')]
      .map((path) => path.getAttribute('stroke') ?? '');
    expect(strokes).toHaveLength(2);
    for (const stroke of strokes) expect(ramp).toContain(stroke);
  });
});
