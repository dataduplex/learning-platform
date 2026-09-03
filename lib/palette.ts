export type Mode = 'light' | 'dark';

export type StatusKind = 'good' | 'warning' | 'serious' | 'critical';

/** The reference palette's blue ramp, steps 100 through 700. */
export const SEQUENTIAL_BLUE = [
  '#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#5598e7', '#3987e5',
  '#2a78d6', '#256abf', '#1c5cab', '#184f95', '#104281', '#0d366b',
] as const;

/** Index bounds that keep an ordinal ramp distinguishable from its surface. */
const ORDINAL_BOUNDS: Record<Mode, readonly [number, number]> = {
  light: [3, 12],
  dark: [0, 10],
};

export const DIVERGING_MID: Record<Mode, string> = {
  light: '#f0efec',
  dark: '#383835',
};

/** Categorical slots 1 through 8, in the fixed order the validator passed. */
export const SERIES: Record<Mode, readonly string[]> = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
};

/**
 * All-pairs forms (scatter, dot, trajectory) validate only for the first three
 * slots. Past three, fold to Other or facet.
 */
export const ALL_PAIRS_SERIES_CAP = 3;

/** One-indexed to match the CSS custom property names and the spec's slot table. */
export function seriesVar(slot: number): string {
  if (!Number.isInteger(slot) || slot < 1 || slot > 8) {
    throw new RangeError(`Series slot must be an integer in [1, 8], received ${slot}.`);
  }
  return `var(--series-${slot})`;
}

export function statusVar(kind: StatusKind): string {
  return `var(--status-${kind})`;
}

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function rampStep(t: number): string {
  const index = Math.round(clamp01(t) * (SEQUENTIAL_BLUE.length - 1));
  return SEQUENTIAL_BLUE[index] as string;
}

/** Magnitude in a known non-negative range. One hue, light to dark. */
export function sequentialScale(max: number, mode: Mode): (value: number) => string {
  if (!(max > 0)) {
    throw new RangeError(`A sequential domain needs a positive maximum, received ${max}.`);
  }
  return (value) => {
    const t = clamp01(value / max);
    return rampStep(mode === 'dark' ? 1 - t : t);
  };
}

/**
 * Signed value with a meaningful zero. Neutral sits at exactly zero, never at the
 * data midpoint, and both arms carry six steps. Negative runs cool, positive warm.
 */
export function divergingScale(
  min: number,
  max: number,
  mode: Mode,
): (value: number) => string {
  if (min > 0 || max < 0) {
    throw new RangeError(
      `A diverging domain must contain zero, received [${min}, ${max}]. ` +
      'Use sequentialScale for a one-sided range.',
    );
  }
  const halfRange = Math.max(Math.abs(min), Math.abs(max));
  const arms = 6;
  const coolArm = Array.from({ length: arms }, (_, i) => {
    const t = (i + 1) / arms;
    return rampStep(mode === 'dark' ? 1 - t : t);
  });
  const warmArm = warmSteps(mode, arms);

  return (value) => {
    if (halfRange === 0 || value === 0) return DIVERGING_MID[mode];
    const magnitude = Math.min(1, Math.abs(value) / halfRange);
    const step = Math.max(0, Math.ceil(magnitude * arms) - 1);
    return value < 0 ? (coolArm[step] as string) : (warmArm[step] as string);
  };
}

/** Six steps from the neutral gray to the slot-8 red pole, in sRGB. */
function warmSteps(mode: Mode, arms: number): string[] {
  const from = parseHex(DIVERGING_MID[mode]);
  const to = parseHex(SERIES[mode][7] as string);
  return Array.from({ length: arms }, (_, i) => {
    const t = (i + 1) / arms;
    return toHex([
      from[0] + (to[0] - from[0]) * t,
      from[1] + (to[1] - from[1]) * t,
      from[2] + (to[2] - from[2]) * t,
    ]);
  });
}

function parseHex(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function toHex(rgb: readonly [number, number, number]): string {
  return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

/** Discrete ordered marks. Stays clear of the surface at both ends. */
export function ordinalScale(count: number, mode: Mode): string[] {
  const [low, high] = ORDINAL_BOUNDS[mode];
  const available = high - low + 1;
  if (!Number.isInteger(count) || count < 1 || count > available) {
    throw new RangeError(
      `An ordinal ramp in ${mode} mode holds 1 to ${available} distinct steps, received ${count}.`,
    );
  }
  if (count === 1) return [SEQUENTIAL_BLUE[low] as string];
  return Array.from({ length: count }, (_, i) => {
    const index = low + Math.round((i / (count - 1)) * (available - 1));
    return SEQUENTIAL_BLUE[index] as string;
  });
}
