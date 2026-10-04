'use client';

import type { ReactNode } from 'react';

export interface KeyStop {
  readonly color: string;
  /** Printed under this stop; most stops carry none. */
  readonly label?: string;
}

/** In pixels: between neighbouring swatches. */
const SWATCH_GAP = 2;

/** In pixels: how wide a key of `count` swatches is, gaps included. */
export function keyWidth(count: number, swatchWidth: number): number {
  return count * swatchWidth + (count - 1) * SWATCH_GAP;
}

/** In pixels: the whole swatch width at which `count` swatches span `span`. */
export function swatchWidthFor(span: number, count: number): number {
  const width = (span - (count - 1) * SWATCH_GAP) / count;
  if (!Number.isInteger(width) || width < 1) {
    throw new Error(`${count} swatches cannot span ${span}px in whole pixels`);
  }
  return width;
}

/** The scale behind a figure's colour, so a colour is never the only way to read a value. */
export function ColorKey({
  caption,
  stops,
  swatchWidth = 22,
}: {
  caption: ReactNode;
  stops: readonly KeyStop[];
  /** In pixels. */
  swatchWidth?: number;
}) {
  return (
    <figure className="color-key" data-role="color-key">
      <figcaption className="color-key-caption">{caption}</figcaption>
      <div className="color-key-row" style={{ gap: SWATCH_GAP, width: keyWidth(stops.length, swatchWidth) }}>
        {stops.map((stop, index) => (
          <span key={index} className="color-key-stop" style={{ width: swatchWidth }}>
            <span className="color-key-swatch" style={{ background: stop.color }} />
            <span className="color-key-label">{stop.label ?? ''}</span>
          </span>
        ))}
      </div>
    </figure>
  );
}
