'use client';

import { useId, type ReactNode } from 'react';

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PlotScales {
  /** Data x to pixel x. */
  x(value: number): number;
  /** Data y to pixel y, flipped so larger is higher. */
  y(value: number): number;
  invertX(pixel: number): number;
  invertY(pixel: number): number;
  /** The box the data actually occupies, after any aspect correction. */
  readonly inner: Box;
}

export type Aspect = 'equal' | 'fill';

/**
 * 'equal' gives both axes one scale factor and centers the result, so angles and
 * lengths are true. 'fill' stretches each axis to the space available.
 */
export function createScales(
  xDomain: readonly [number, number],
  yDomain: readonly [number, number],
  box: Box,
  aspect: Aspect,
): PlotScales {
  const [x0, x1] = xDomain;
  const [y0, y1] = yDomain;
  const spanX = x1 - x0;
  const spanY = y1 - y0;
  if (spanX === 0 || spanY === 0) {
    throw new RangeError(
      `A plot domain cannot be a single point: x [${x0}, ${x1}], y [${y0}, ${y1}].`,
    );
  }

  let inner = box;
  if (aspect === 'equal') {
    const factor = Math.min(box.width / Math.abs(spanX), box.height / Math.abs(spanY));
    const width = factor * Math.abs(spanX);
    const height = factor * Math.abs(spanY);
    inner = {
      left: box.left + (box.width - width) / 2,
      top: box.top + (box.height - height) / 2,
      width,
      height,
    };
  }

  return {
    inner,
    x: (value) => inner.left + ((value - x0) / spanX) * inner.width,
    y: (value) => inner.top + inner.height - ((value - y0) / spanY) * inner.height,
    invertX: (pixel) => x0 + ((pixel - inner.left) / inner.width) * spanX,
    invertY: (pixel) => y0 + ((inner.top + inner.height - pixel) / inner.height) * spanY,
  };
}

/**
 * A drawn coordinate, quantised to hundredths of a pixel. Sub-pixel precision is
 * invisible, and rounding makes the value identical wherever it is computed:
 * `Math.log` and `Math.exp` are allowed to differ in their last bits between
 * implementations, which React reports as a hydration mismatch when a figure is
 * rendered once at build time and again in the browser.
 */
export function pixel(value: number): number {
  return Math.round(value * 100) / 100;
}

/** A polyline's `points` attribute, with every coordinate quantised. */
export function polylinePoints(points: Iterable<readonly [number, number]>): string {
  const parts: string[] = [];
  for (const [x, y] of points) parts.push(`${pixel(x)},${pixel(y)}`);
  return parts.join(' ');
}

/** Multiples of `step` inside the closed domain. */
function ticksFor(domain: readonly [number, number], step: number): number[] {
  const [low, high] = domain;
  const first = Math.ceil(low / step) * step;
  const ticks: number[] = [];
  // Nudge the bound so a tick that lands exactly on `high` is not lost to float error.
  for (let value = first; value <= high + step * 1e-9; value += step) {
    ticks.push(Number(value.toFixed(10)));
  }
  return ticks;
}

/**
 * Which axes `gridStep` applies to. One spacing cannot serve two axes measured in
 * different units, as on a density plotted against its variable.
 */
export type GridAxis = 'both' | 'x' | 'y';

export interface PlotProps {
  /** The accessible name. Required: an unnamed figure is unusable without sight. */
  title: string;
  description?: string;
  xDomain: readonly [number, number];
  yDomain: readonly [number, number];
  width?: number;
  height?: number;
  padding?: number;
  /** Gridline spacing in data units. Omit for no grid. */
  gridStep?: number;
  gridAxis?: GridAxis;
  aspect?: Aspect;
  xLabel?: string;
  yLabel?: string;
  children?: (scales: PlotScales) => ReactNode;
}

export function Plot({
  title,
  description,
  xDomain,
  yDomain,
  width = 420,
  height = 360,
  padding = 36,
  gridStep,
  gridAxis = 'both',
  aspect = 'fill',
  xLabel,
  yLabel,
  children,
}: PlotProps) {
  const id = useId();
  const box: Box = {
    left: padding,
    top: padding,
    width: width - padding * 2,
    height: height - padding * 2,
  };
  const scales = createScales(xDomain, yDomain, box, aspect);
  const { inner } = scales;

  const xTicks = gridStep === undefined || gridAxis === 'y' ? [] : ticksFor(xDomain, gridStep);
  const yTicks = gridStep === undefined || gridAxis === 'x' ? [] : ticksFor(yDomain, gridStep);
  const showZeroX = xDomain[0] <= 0 && 0 <= xDomain[1];
  const showZeroY = yDomain[0] <= 0 && 0 <= yDomain[1];

  return (
    <svg
      className="plot"
      role="group"
      aria-labelledby={`${id}-title`}
      {...(description === undefined ? {} : { 'aria-describedby': `${id}-desc` })}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
    >
      <title id={`${id}-title`}>{title}</title>
      {description === undefined ? null : <desc id={`${id}-desc`}>{description}</desc>}

      {xTicks.filter((tick) => tick !== 0 || !showZeroX).map((tick) => (
        <line
          key={`vx-${tick}`}
          data-role="gridline"
          className="plot-grid"
          x1={scales.x(tick)}
          x2={scales.x(tick)}
          y1={inner.top}
          y2={inner.top + inner.height}
        />
      ))}
      {yTicks.filter((tick) => tick !== 0 || !showZeroY).map((tick) => (
        <line
          key={`hy-${tick}`}
          data-role="gridline"
          className="plot-grid"
          x1={inner.left}
          x2={inner.left + inner.width}
          y1={scales.y(tick)}
          y2={scales.y(tick)}
        />
      ))}

      {showZeroY ? (
        <line
          data-role="zero-axis"
          className="plot-axis"
          x1={inner.left}
          x2={inner.left + inner.width}
          y1={scales.y(0)}
          y2={scales.y(0)}
        />
      ) : null}
      {showZeroX ? (
        <line
          data-role="zero-axis"
          className="plot-axis"
          x1={scales.x(0)}
          x2={scales.x(0)}
          y1={inner.top}
          y2={inner.top + inner.height}
        />
      ) : null}

      {xLabel === undefined ? null : (
        <text className="plot-axis-label" x={inner.left + inner.width / 2} y={height - 6} textAnchor="middle">
          {xLabel}
        </text>
      )}
      {yLabel === undefined ? null : (
        <text
          className="plot-axis-label"
          x={12}
          y={inner.top + inner.height / 2}
          textAnchor="middle"
          transform={`rotate(-90 12 ${inner.top + inner.height / 2})`}
        >
          {yLabel}
        </text>
      )}

      {children?.(scales)}
    </svg>
  );
}
