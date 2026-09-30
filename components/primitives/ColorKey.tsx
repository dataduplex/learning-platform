'use client';

import type { ReactNode } from 'react';

export interface KeyStop {
  readonly color: string;
  /** Printed under this stop; most stops carry none. */
  readonly label?: string;
}

/** The scale behind a figure's colour, so a colour is never the only way to read a value. */
export function ColorKey({ caption, stops }: { caption: ReactNode; stops: readonly KeyStop[] }) {
  return (
    <figure className="color-key" data-role="color-key">
      <figcaption className="color-key-caption">{caption}</figcaption>
      <div className="color-key-row">
        {stops.map((stop, index) => (
          <span key={index} className="color-key-stop">
            <span className="color-key-swatch" style={{ background: stop.color }} />
            <span className="color-key-label">{stop.label ?? ''}</span>
          </span>
        ))}
      </div>
    </figure>
  );
}
