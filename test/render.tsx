import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { expect } from 'vitest';
import { ProgressProvider, createLocalStorageStore, type ProgressStore } from '@/lib/progress';

/** In-memory Storage so component tests never touch a global. */
export function memoryStorage(seed: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(seed));
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => { map.delete(key); },
    setItem: (key, value) => { map.set(key, value); },
  };
}

export interface ProgressRenderResult extends RenderResult {
  store: ProgressStore;
}

/**
 * Renders inside a ProgressProvider backed by memory and a fixed clock, and
 * hands the store back so a test can assert on what was recorded.
 */
export function renderWithProgress(
  ui: ReactElement,
  options: Omit<RenderOptions, 'wrapper'> & { store?: ProgressStore } = {},
): ProgressRenderResult {
  const { store: provided, ...rest } = options;
  const store = provided ?? createLocalStorageStore({
    storage: memoryStorage(),
    now: () => 1_700_000_000_000,
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ProgressProvider store={store}>{children}</ProgressProvider>
  );
  return { ...render(ui, { wrapper, ...rest }), store };
}

/** Every point in an SVG path's `d`, in order. */
export function pathPoints(path: Element | null): [number, number][] {
  return [...(path?.getAttribute('d') ?? '').matchAll(/(-?[\d.]+),(-?[\d.]+)/g)]
    .map((match) => [Number(match[1]), Number(match[2])]);
}

/** The first point of a path: an arrowhead's tip. */
export function tip(path: Element | null): [number, number] {
  const first = pathPoints(path)[0];
  if (first === undefined) throw new Error(`no arrowhead: ${path?.outerHTML ?? 'null'}`);
  return first;
}

/** A label as the uppercase readout style shows it: only a LabelSymbol keeps its case. */
export function shown(label: Element): string {
  const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
  let text = '';
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const kept = node.parentElement?.closest('.label-symbol') != null;
    text += kept ? node.textContent : (node.textContent ?? '').toUpperCase();
  }
  return text;
}

export interface PixelBox {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** A plot's data box in pixels, read from the rect Plot marks with `data-role="data-box"`. */
export function dataBox(root: ParentNode): PixelBox {
  const rect = root.querySelector('[data-role="data-box"]');
  if (rect === null) throw new Error('no data box');
  const left = Number(rect.getAttribute('x'));
  const top = Number(rect.getAttribute('y'));
  return { left, top, right: left + Number(rect.getAttribute('width')), bottom: top + Number(rect.getAttribute('height')) };
}

/** Asserts each point lies in the box, edges included. */
export function expectInside(points: readonly (readonly [number, number])[], box: PixelBox): void {
  for (const [x, y] of points) {
    expect(x).toBeGreaterThanOrEqual(box.left);
    expect(x).toBeLessThanOrEqual(box.right);
    expect(y).toBeGreaterThanOrEqual(box.top);
    expect(y).toBeLessThanOrEqual(box.bottom);
  }
}

/** Every point in an SVG polygon's `points`, in order. */
export function polygonPoints(polygon: Element | null): [number, number][] {
  const points = polygon?.getAttribute('points') ?? '';
  return points === '' ? [] : points.split(' ').map((pair) => pair.split(',').map(Number) as [number, number]);
}

/** A line's drawn endpoints, x1, y1, x2 and y2, as written on the element. */
export function lineEnds(line: Element | null): (string | null | undefined)[] {
  return ['x1', 'y1', 'x2', 'y2'].map((name) => line?.getAttribute(name));
}

/** Where a butt-capped stroke of `width` around a drawn line reaches: its four corners. */
export function strokeCorners(line: Element | null, width: number): [number, number][] {
  const [x1, y1, x2, y2] = lineEnds(line).map(Number) as [number, number, number, number];
  const length = Math.hypot(x2 - x1, y2 - y1);
  const nx = (-(y2 - y1) / length) * (width / 2);
  const ny = ((x2 - x1) / length) * (width / 2);
  return [[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]];
}
