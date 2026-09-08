import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HoverLayer } from './HoverLayer';
import { createScales } from './Plot';

const scales = createScales([0, 10], [0, 10], { left: 0, top: 0, width: 100, height: 100 }, 'fill');
const points = [
  { key: 'a', x: 0, y: 0 },
  { key: 'b', x: 5, y: 5 },
  { key: 'c', x: 10, y: 10 },
];

function renderLayer(onActiveChange = vi.fn()) {
  render(
    <svg>
      <HoverLayer scales={scales} points={points} onActiveChange={onActiveChange} label="Points" />
    </svg>,
  );
  return { onActiveChange, target: screen.getByRole('button', { name: 'Points' }) };
}

describe('HoverLayer', () => {
  it('reports the nearest point on pointer move', () => {
    const { onActiveChange, target } = renderLayer();
    // The points sit at pixels a (0, 100), b (50, 50), c (100, 0), so each probe
    // below is nearest one corner. Top-right resolving to c and bottom-left to a
    // is what shows y is flipped: screen-down is data-down.
    fireEvent.pointerMove(target, { clientX: 95, clientY: 5 });
    expect(onActiveChange).toHaveBeenLastCalledWith('c');
    fireEvent.pointerMove(target, { clientX: 5, clientY: 95 });
    expect(onActiveChange).toHaveBeenLastCalledWith('a');
    fireEvent.pointerMove(target, { clientX: 50, clientY: 50 });
    expect(onActiveChange).toHaveBeenLastCalledWith('b');
  });

  it('clears the active point when the pointer leaves', () => {
    const { onActiveChange, target } = renderLayer();
    fireEvent.pointerMove(target, { clientX: 50, clientY: 50 });
    fireEvent.pointerLeave(target);
    expect(onActiveChange).toHaveBeenLastCalledWith(null);
  });

  it('walks the points with the arrow keys', async () => {
    const user = userEvent.setup();
    const { onActiveChange, target } = renderLayer();
    target.focus();
    await user.keyboard('{ArrowRight}');
    expect(onActiveChange).toHaveBeenLastCalledWith('a');
    await user.keyboard('{ArrowRight}');
    expect(onActiveChange).toHaveBeenLastCalledWith('b');
    await user.keyboard('{ArrowLeft}');
    expect(onActiveChange).toHaveBeenLastCalledWith('a');
  });

  it('stops at both ends rather than wrapping, so position stays legible', async () => {
    const user = userEvent.setup();
    const { onActiveChange, target } = renderLayer();
    target.focus();
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(onActiveChange).toHaveBeenLastCalledWith('a');
    await user.keyboard('{End}');
    expect(onActiveChange).toHaveBeenLastCalledWith('c');
    await user.keyboard('{ArrowRight}');
    expect(onActiveChange).toHaveBeenLastCalledWith('c');
  });

  it('clears on blur and on Escape', async () => {
    const user = userEvent.setup();
    const { onActiveChange, target } = renderLayer();
    target.focus();
    await user.keyboard('{ArrowRight}{Escape}');
    expect(onActiveChange).toHaveBeenLastCalledWith(null);
  });

  it('is focusable', () => {
    const { target } = renderLayer();
    expect(target).toHaveAttribute('tabindex', '0');
  });
});
