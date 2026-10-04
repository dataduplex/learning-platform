'use client';

import { useId, type ReactNode } from 'react';
import { formatFixed } from './NumberReadout';

/** The shared size of a data chart: the widget card's content width, at the old 480 by 300 aspect. */
export const CHART_WIDTH = 598;
export const CHART_HEIGHT = 374;

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

/** A labelled position on an axis, in data units. */
export interface Tick {
  readonly at: number;
  readonly label: ReactNode;
}

/**
 * Offsets from the data box, in pixels. The x title sits a full row below the tick
 * values, so a centred title can never read as the middle tick's second line.
 */
export const PLOT_LAYOUT = {
  tickRow: 16,
  titleRow: 22,
  yTickGap: 8,
  /** Room for y tick text of up to six characters at 11px. */
  yTickReserve: 36,
} as const;

/** An 11px line box reaches about 10px above the baseline. */
const Y_TITLE_OFFSET = 12;

export interface PlotPadding {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/** Each side grows by what it draws and never shrinks below the base padding. */
export function plotPadding(
  draws: { readonly xTicks: boolean; readonly xLabel: boolean; readonly yTicks: boolean; readonly yLabel: boolean },
  base = 36,
): PlotPadding {
  const { tickRow, titleRow, yTickGap, yTickReserve } = PLOT_LAYOUT;
  const bottom = draws.xTicks && draws.xLabel ? tickRow + titleRow + 10
    : draws.xTicks || draws.xLabel ? tickRow + 10 : 0;
  const left = draws.yTicks ? yTickGap + yTickReserve + (draws.yLabel ? 20 : 4)
    : draws.yLabel ? 28 : 0;
  return { top: base, right: base, bottom: Math.max(base, bottom), left: Math.max(base, left) };
}

/** Ten to a power, for a log axis. The zeroth power writes 1. */
export function decadeLabel(exponent: number): ReactNode {
  if (exponent === 0) return '1';
  return (
    <>
      10<tspan dy="-4" fontSize="8">{exponent < 0 ? `−${-exponent}` : String(exponent)}</tspan>
    </>
  );
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

/** A tick at each multiple of a whole-number `step` inside the domain, labelled as a whole number. */
export function wholeTicks(domain: readonly [number, number], step: number): Tick[] {
  if (!Number.isInteger(step) || step <= 0) {
    throw new RangeError(`Whole-number ticks need a positive whole step, not ${step}.`);
  }
  return stepTicks(domain, step);
}

/** The fewest decimals that write `step` exactly. */
function stepDigits(step: number): number {
  for (let digits = 0; digits <= 10; digits += 1) {
    if (Number(step.toFixed(digits)) === step) return digits;
  }
  throw new RangeError(`A tick step needs at most ten decimals, not ${step}.`);
}

/** A tick at each multiple of `step` inside the domain, written to the step's decimals without trailing zeros. */
export function stepTicks(domain: readonly [number, number], step: number): Tick[] {
  if (!(step > 0) || !Number.isFinite(step)) {
    throw new RangeError(`Ticks need a positive finite step, not ${step}.`);
  }
  const digits = stepDigits(step);
  return ticksFor(domain, step).map((at) => {
    const written = formatFixed(at, digits);
    return { at, label: digits === 0 ? written : written.replace(/\.?0+$/, '') };
  });
}

/** The ticks of an axis that spans the whole probability scale. */
export const PROBABILITY_TICKS: readonly Tick[] = stepTicks([0, 1], 0.25);

/** One, two or five times a power of ten, whichever splits `span` most nearly into `intervals`. */
export function niceStep(span: number, intervals = 5): number {
  if (!(span > 0) || !Number.isFinite(span)) {
    throw new RangeError(`A tick step needs a positive finite span, not ${span}.`);
  }
  const rough = span / intervals;
  const power = 10 ** Math.floor(Math.log10(rough));
  const ratio = rough / power;
  const factor = ratio >= Math.sqrt(50) ? 10 : ratio >= Math.sqrt(10) ? 5 : ratio >= Math.sqrt(2) ? 2 : 1;
  return Number((factor * power).toFixed(10));
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
  /** Gridline spacing in data units: one spacing, or `{ x, y }` to space each axis separately. Omit for no grid. */
  gridStep?: number | { x: number; y: number };
  gridAxis?: GridAxis;
  aspect?: Aspect;
  xTicks?: readonly Tick[];
  yTicks?: readonly Tick[];
  xLabel?: string;
  yLabel?: string;
  children?: (scales: PlotScales) => ReactNode;
}

/** The props that decide where a Plot puts its data. */
export type PlotLayout = Pick<
  PlotProps,
  'xDomain' | 'yDomain' | 'width' | 'height' | 'padding' | 'aspect' | 'xTicks' | 'yTicks' | 'xLabel' | 'yLabel'
>;

const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 360;

/** The scales a Plot with this layout draws with. */
export function plotScales({
  xDomain,
  yDomain,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  padding = 36,
  aspect = 'fill',
  xTicks,
  yTicks,
  xLabel,
  yLabel,
}: PlotLayout): PlotScales {
  const pad = plotPadding(
    {
      xTicks: (xTicks?.length ?? 0) > 0,
      xLabel: xLabel !== undefined,
      yTicks: (yTicks?.length ?? 0) > 0,
      yLabel: yLabel !== undefined,
    },
    padding,
  );
  const box: Box = {
    left: pad.left,
    top: pad.top,
    width: width - pad.left - pad.right,
    height: height - pad.top - pad.bottom,
  };
  return createScales(xDomain, yDomain, box, aspect);
}

export function Plot(props: PlotProps) {
  const {
    title,
    description,
    xDomain,
    yDomain,
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    gridStep,
    gridAxis = 'both',
    xTicks,
    yTicks,
    xLabel,
    yLabel,
    children,
  } = props;
  const id = useId();
  const hasXTicks = (xTicks?.length ?? 0) > 0;
  const scales = plotScales(props);
  const { inner } = scales;
  const bottom = inner.top + inner.height;
  const { tickRow, titleRow, yTickGap } = PLOT_LAYOUT;
  const yTitleX = pixel(Y_TITLE_OFFSET);
  const yTitleY = pixel(inner.top + inner.height / 2);

  const xGridStep = typeof gridStep === 'number' ? gridStep : gridStep?.x;
  const yGridStep = typeof gridStep === 'number' ? gridStep : gridStep?.y;
  const xGridTicks = xGridStep === undefined || gridAxis === 'y' ? [] : ticksFor(xDomain, xGridStep);
  const yGridTicks = yGridStep === undefined || gridAxis === 'x' ? [] : ticksFor(yDomain, yGridStep);
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

      <rect
        className="plot-frame"
        data-role="data-box"
        x={pixel(inner.left)}
        y={pixel(inner.top)}
        width={pixel(inner.width)}
        height={pixel(inner.height)}
      />

      {xGridTicks.filter((tick) => tick !== 0 || !showZeroX).map((tick) => (
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
      {yGridTicks.filter((tick) => tick !== 0 || !showZeroY).map((tick) => (
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

      {xTicks?.map((tick) => (
        <text
          key={`xt-${tick.at}`}
          className="plot-tick"
          data-axis="x"
          x={pixel(scales.x(tick.at))}
          y={pixel(bottom + tickRow)}
          textAnchor="middle"
        >
          {tick.label}
        </text>
      ))}
      {yTicks?.map((tick) => (
        <text
          key={`yt-${tick.at}`}
          className="plot-tick"
          data-axis="y"
          x={pixel(inner.left - yTickGap)}
          y={pixel(scales.y(tick.at) + 4)}
          textAnchor="end"
        >
          {tick.label}
        </text>
      ))}

      {xLabel === undefined ? null : (
        <text
          className="plot-axis-label"
          data-axis="x"
          x={pixel(inner.left + inner.width / 2)}
          y={pixel(bottom + (hasXTicks ? tickRow + titleRow : tickRow))}
          textAnchor="middle"
        >
          {xLabel}
        </text>
      )}
      {yLabel === undefined ? null : (
        <text
          className="plot-axis-label"
          data-axis="y"
          x={yTitleX}
          y={yTitleY}
          textAnchor="middle"
          transform={`rotate(-90 ${yTitleX} ${yTitleY})`}
        >
          {yLabel}
        </text>
      )}

      {children?.(scales)}
    </svg>
  );
}
