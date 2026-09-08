import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressRing } from './ProgressRing';

describe('ProgressRing', () => {
  it('states the count in words, not only in arc', () => {
    render(<ProgressRing done={2} total={5} />);
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '2 of 5 lessons complete' })).toBeInTheDocument();
  });

  it('draws no arc at zero', () => {
    render(<ProgressRing done={0} total={5} />);
    const arc = document.querySelector('[data-role="arc"]') as SVGCircleElement;
    expect(arc.getAttribute('stroke-dasharray')).toMatch(/^0 /);
  });

  it('closes the ring when everything is done', () => {
    render(<ProgressRing done={5} total={5} />);
    const arc = document.querySelector('[data-role="arc"]') as SVGCircleElement;
    const [drawn, gap] = (arc.getAttribute('stroke-dasharray') ?? '').split(' ').map(Number);
    expect(gap).toBeCloseTo(0, 6);
    expect(drawn).toBeGreaterThan(0);
  });

  it('reports zero of zero rather than dividing by it', () => {
    render(<ProgressRing done={0} total={0} />);
    expect(screen.getByText('0 / 0')).toBeInTheDocument();
  });
});
