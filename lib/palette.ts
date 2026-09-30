export type Mode = 'light' | 'dark';

export type StatusKind = 'good' | 'warning' | 'serious' | 'critical';

type Rgb = readonly [number, number, number];

function toLinear(channel: number): number {
  const v = channel / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function fromLinear(v: number): number {
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  return c * 255;
}

function linearToOklab([r, g, b]: Rgb): Rgb {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToLinear([lightness, a, b]: Rgb): Rgb {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function oklabOf(hex: string): Rgb {
  const [r, g, b] = parseHex(hex);
  return linearToOklab([toLinear(r), toLinear(g), toLinear(b)]);
}

export function oklabLightness(hex: string): number {
  return oklabOf(hex)[0];
}

function linearToHex([r, g, b]: Rgb): string {
  const channel = (v: number) => fromLinear(Math.min(1, Math.max(0, v)));
  return toHex([channel(r), channel(g), channel(b)]);
}

/** An OKLCH colour as hex, with its chroma reduced until it fits the sRGB gamut. */
function oklchToHex(lightness: number, chroma: number, hue: number): string {
  for (let c = chroma; c > 0; c -= 0.002) {
    const linear = oklabToLinear([lightness, c * Math.cos(hue), c * Math.sin(hue)]);
    if (linear.every((v) => v >= -1e-9 && v <= 1 + 1e-9)) return linearToHex(linear);
  }
  return linearToHex(oklabToLinear([lightness, 0, 0]));
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

const DARK_INK = '#0b0b0b';
const LIGHT_INK = '#ffffff';

/** The ink that reads better on a fill. A fill that is not a hex colour gets the page ink. */
export function inkOn(fill: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(fill)) return 'var(--ink-primary)';
  return contrastRatio(DARK_INK, fill) >= contrastRatio(LIGHT_INK, fill) ? DARK_INK : LIGHT_INK;
}

/** The reference palette's blue ramp, steps 100 through 700. */
export const SEQUENTIAL_BLUE = [
  '#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#5598e7', '#3987e5',
  '#2a78d6', '#256abf', '#1c5cab', '#184f95', '#104281', '#0d366b',
] as const;


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
  const warmArm = warmSteps(mode, coolArm);

  return (value) => {
    if (halfRange === 0 || value === 0) return DIVERGING_MID[mode];
    const magnitude = Math.min(1, Math.abs(value) / halfRange);
    const step = Math.max(0, Math.ceil(magnitude * arms) - 1);
    return value < 0 ? (coolArm[step] as string) : (warmArm[step] as string);
  };
}

/** Each warm step matches its cool partner's lightness, in the red pole's hue. */
function warmSteps(mode: Mode, coolArm: readonly string[]): string[] {
  const pole = oklabOf(SERIES[mode][7] as string);
  const middle = oklabOf(DIVERGING_MID[mode]);
  const hue = Math.atan2(pole[2], pole[1]);
  const poleChroma = Math.hypot(pole[1], pole[2]);
  const middleChroma = Math.hypot(middle[1], middle[2]);
  return coolArm.map((cool, i) => {
    const t = (i + 1) / coolArm.length;
    return oklchToHex(oklabLightness(cool), middleChroma + (poleChroma - middleChroma) * t, hue);
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

/** Neutral contour levels, lowest first. Every level clears 3:1 against the surface, and the lowest has the most contrast. */
export function contourScale(count: number, mode: Mode): string[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError(`A contour ramp needs a positive integer count, received ${count}.`);
  }
  const [strong, faint] = mode === 'light' ? [0.36, 0.64] : [0.9, 0.56];
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : i / (count - 1);
    return oklchToHex(strong + (faint - strong) * t, 0, 0);
  });
}
