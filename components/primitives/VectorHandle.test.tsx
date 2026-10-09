import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createScales } from './Plot';
import { VectorHandle } from './VectorHandle';

const scales = createScales([-5, 5], [-5, 5], { left: 0, top: 0, width: 200, height: 200 }, 'equal');

function renderHandle(value: [number, number] = [2, 1], onChange = vi.fn(), step = 0.5) {
  render(
    <svg>
      <VectorHandle scales={scales} value={value} onChange={onChange} label="vector a" step={step} />
    </svg>,
  );
  return { onChange, handle: screen.getByRole('button', { name: /vector a/i }) };
}

describe('VectorHandle', () => {
  it('draws an arrow from the origin to the value', () => {
    renderHandle([4, 0]);
    const line = document.querySelector('[data-role="vector-shaft"]') as SVGLineElement;
    expect(Number(line.getAttribute('x1'))).toBeCloseTo(scales.x(0), 6);
    const head = document.querySelector('[data-role="vector-head"]') as SVGPathElement;
    const d = head.getAttribute('d') ?? '';
    const tipX = Number(d.match(/^M([\d.]+),/)?.[1]);
    // The shaft ends where the head begins, not at the tip.
    expect(Number(line.getAttribute('x2'))).toBeLessThan(tipX);
  });

  it('shows its direction with a head and its handle with a hollow ring', () => {
    renderHandle([4, 0]);
    expect(document.querySelector('path[data-role="vector-head"]')).not.toBeNull();
    const ring = document.querySelector('[data-role="vector-tip"]');
    expect(ring).toHaveAttribute('fill', 'none');
    expect(Number(document.querySelector('.vector-grab')?.getAttribute('r'))).toBeGreaterThanOrEqual(12);
  });

  it('carries its coordinates in its accessible name', () => {
    renderHandle([2, 1]);
    expect(screen.getByRole('button', { name: /x 2.00, y 1.00/ })).toBeInTheDocument();
  });

  it('moves by one step per arrow key', async () => {
    const user = userEvent.setup();
    const { onChange, handle } = renderHandle([2, 1], vi.fn(), 0.5);
    handle.focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith([2.5, 1]);
    await user.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith([2, 1.5]);
  });

  it('multiplies the step by ten with Shift held', async () => {
    const user = userEvent.setup();
    const { onChange, handle } = renderHandle([0, 0], vi.fn(), 0.1);
    handle.focus();
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(onChange).toHaveBeenLastCalledWith([1, 0]);
  });

  it('returns to the origin on Home', async () => {
    const user = userEvent.setup();
    const { onChange, handle } = renderHandle([3, -2]);
    handle.focus();
    await user.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith([0, 0]);
  });

  it('clamps to the plot domain instead of leaving the frame', async () => {
    const user = userEvent.setup();
    const { onChange, handle } = renderHandle([5, 5], vi.fn(), 1);
    handle.focus();
    await user.keyboard('{ArrowRight}{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith([5, 5]);
  });

  it('rounds to the step so dragging cannot produce 1.9999999', async () => {
    const user = userEvent.setup();
    const { onChange, handle } = renderHandle([0.2, 0], vi.fn(), 0.1);
    handle.focus();
    // 0.2 + 0.1 is 0.30000000000000004 in binary floating point. A pointer drag in
    // jsdom has no geometry, so the rounding is asserted through the keyboard path,
    // which shares the same reducer.
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith([0.3, 0]);
  });

  it('is focusable', () => {
    const { handle } = renderHandle();
    expect(handle).toHaveAttribute('tabindex', '0');
  });
});
