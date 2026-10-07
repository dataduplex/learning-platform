import { act } from '@testing-library/react';
import { vi } from 'vitest';

let pending = new Map<number, FrameRequestCallback>();
let nextId = 1;

/** Replaces requestAnimationFrame and cancelAnimationFrame, so a frame runs only on `flushFrame`. */
export function stubFrameClock(): void {
  pending = new Map();
  nextId = 1;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = nextId;
    nextId += 1;
    pending.set(id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { pending.delete(id); });
}

/** Frames requested and neither run nor cancelled. */
export function pendingFrames(): number {
  return pending.size;
}

/** Runs the frames requested so far. A frame they request waits for the next flush. */
export function flushFrame(): void {
  const due = [...pending.values()];
  pending = new Map();
  act(() => { for (const callback of due) callback(0); });
}
