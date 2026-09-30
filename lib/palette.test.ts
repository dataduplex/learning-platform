import { describe, expect, it } from 'vitest';
import {
  ALL_PAIRS_SERIES_CAP, DIVERGING_MID, SEQUENTIAL_BLUE, SERIES,
  contourScale, contrastRatio, divergingScale, inkOn, oklabLightness, sequentialScale, seriesVar, statusVar,
} from './palette';

describe('palette constants', () => {
  it('holds eight categorical slots per mode, in the spec order', () => {
    expect(SERIES.light).toHaveLength(8);
    expect(SERIES.dark).toHaveLength(8);
    expect(SERIES.light[0]).toBe('#2a78d6');
    expect(SERIES.dark[0]).toBe('#3987e5');
    expect(SERIES.light[7]).toBe('#e34948');
  });

  it('gives green the same hex in both modes, as the reference palette does', () => {
    expect(SERIES.light[5]).toBe(SERIES.dark[5]);
  });

  it('holds the full thirteen-step blue ramp', () => {
    expect(SEQUENTIAL_BLUE).toHaveLength(13);
    expect(SEQUENTIAL_BLUE[0]).toBe('#cde2fb');
    expect(SEQUENTIAL_BLUE[12]).toBe('#0d366b');
  });

  it('caps all-pairs forms at three series', () => {
    expect(ALL_PAIRS_SERIES_CAP).toBe(3);
  });

  it('names series and status custom properties, one-indexed for series', () => {
    expect(seriesVar(1)).toBe('var(--series-1)');
    expect(seriesVar(8)).toBe('var(--series-8)');
    expect(() => seriesVar(0)).toThrow(RangeError);
    expect(() => seriesVar(9)).toThrow(RangeError);
    expect(statusVar('critical')).toBe('var(--status-critical)');
  });
});

describe('sequentialScale', () => {
  it('runs light to dark across the range', () => {
    const scale = sequentialScale(10, 'light');
    expect(scale(0)).toBe(SEQUENTIAL_BLUE[0]);
    expect(scale(10)).toBe(SEQUENTIAL_BLUE[12]);
  });

  it('clamps outside the range instead of returning undefined', () => {
    const scale = sequentialScale(10, 'light');
    expect(scale(-5)).toBe(SEQUENTIAL_BLUE[0]);
    expect(scale(999)).toBe(SEQUENTIAL_BLUE[12]);
  });

  it('is monotone: a larger value never maps to a lighter step', () => {
    const scale = sequentialScale(1, 'light');
    const indices = [0, 0.1, 0.2, 0.4, 0.6, 0.8, 1]
      .map((v) => SEQUENTIAL_BLUE.indexOf(scale(v) as typeof SEQUENTIAL_BLUE[number]));
    for (let i = 1; i < indices.length; i += 1) {
      expect(indices[i]!).toBeGreaterThanOrEqual(indices[i - 1]!);
    }
  });

  it('rejects a non-positive maximum', () => {
    expect(() => sequentialScale(0, 'light')).toThrow(RangeError);
  });

  it('reverses direction per mode: light recedes to high index, dark recedes to low index', () => {
    const scaleLight = sequentialScale(10, 'light');
    const scaleDark = sequentialScale(10, 'dark');
    const lightNear = scaleLight(0.1);
    const lightFar = scaleLight(9.9);
    const darkNear = scaleDark(0.1);
    const darkFar = scaleDark(9.9);

    // Light: near value has lower index (lighter)
    expect(SEQUENTIAL_BLUE.indexOf(lightNear as typeof SEQUENTIAL_BLUE[number]))
      .toBeLessThan(SEQUENTIAL_BLUE.indexOf(lightFar as typeof SEQUENTIAL_BLUE[number]));

    // Dark: near value has higher index (darker)
    expect(SEQUENTIAL_BLUE.indexOf(darkNear as typeof SEQUENTIAL_BLUE[number]))
      .toBeGreaterThan(SEQUENTIAL_BLUE.indexOf(darkFar as typeof SEQUENTIAL_BLUE[number]));
  });
});

describe('divergingScale', () => {
  it('paints exactly zero neutral, even on an asymmetric domain', () => {
    // A midpoint-anchored scale would paint +2 neutral here. That is the bug.
    const scale = divergingScale(-1, 5, 'light');
    expect(scale(0)).toBe(DIVERGING_MID.light);
    expect(scale(2)).not.toBe(DIVERGING_MID.light);
  });

  it('uses the dark neutral in dark mode', () => {
    expect(divergingScale(-1, 1, 'dark')(0)).toBe(DIVERGING_MID.dark);
  });

  it('sends negative values cool and positive values warm', () => {
    const scale = divergingScale(-4, 4, 'light');
    expect(scale(-4)).toBe(SEQUENTIAL_BLUE[12]);
    const warmPole = scale(4);
    const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(warmPole.slice(i, i + 2), 16)) as [number, number, number];
    expect(r).toBeGreaterThan(Math.max(g, b));
  });

  it('gives both arms the same number of steps', () => {
    const scale = divergingScale(-1, 1, 'light');
    const cool = new Set([0.05, 0.2, 0.4, 0.6, 0.8, 1].map((t) => scale(-t)));
    const warm = new Set([0.05, 0.2, 0.4, 0.6, 0.8, 1].map((t) => scale(t)));
    expect(cool.size).toBe(warm.size);
  });

  it('rejects a domain that does not contain zero', () => {
    expect(() => divergingScale(1, 5, 'light')).toThrow(RangeError);
  });

  it('reverses cool arm direction per mode: light recedes to high index, dark recedes to low index', () => {
    const scaleLight = divergingScale(-10, 10, 'light');
    const scaleDark = divergingScale(-10, 10, 'dark');
    const lightSmall = scaleLight(-0.5);
    const lightLarge = scaleLight(-9.5);
    const darkSmall = scaleDark(-0.5);
    const darkLarge = scaleDark(-9.5);

    // Light: small magnitude has lower index (lighter)
    expect(SEQUENTIAL_BLUE.indexOf(lightSmall as typeof SEQUENTIAL_BLUE[number]))
      .toBeLessThan(SEQUENTIAL_BLUE.indexOf(lightLarge as typeof SEQUENTIAL_BLUE[number]));

    // Dark: small magnitude has higher index (darker)
    expect(SEQUENTIAL_BLUE.indexOf(darkSmall as typeof SEQUENTIAL_BLUE[number]))
      .toBeGreaterThan(SEQUENTIAL_BLUE.indexOf(darkLarge as typeof SEQUENTIAL_BLUE[number]));
  });
});

describe('diverging arms', () => {
  it('match in lightness step for step, so equal magnitudes look equally strong', () => {
    for (const mode of ['light', 'dark'] as const) {
      const scale = divergingScale(-6, 6, mode);
      for (let v = 1; v <= 6; v += 1) {
        expect(Math.abs(oklabLightness(scale(v)) - oklabLightness(scale(-v)))).toBeLessThan(0.02);
      }
    }
  });

  it('keep zero at the neutral midpoint', () => {
    expect(divergingScale(-1, 1, 'light')(0)).toBe(DIVERGING_MID.light);
  });
});

describe('contourScale', () => {
  it('keeps every level at least 3:1 against the surface, lowest level strongest', () => {
    for (const [mode, surface] of [['light', '#fcfcfb'], ['dark', '#1a1a19']] as const) {
      const levels = contourScale(7, mode);
      const contrasts = levels.map((color) => contrastRatio(color, surface));
      for (const value of contrasts) expect(value).toBeGreaterThanOrEqual(3);
      for (let i = 1; i < contrasts.length; i += 1) {
        expect(contrasts[i] as number).toBeLessThan(contrasts[i - 1] as number);
      }
    }
  });

  it('is neutral, so a coloured path is never lost in it', () => {
    for (const color of contourScale(7, 'light')) {
      const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(color.slice(i, i + 2), 16));
      expect(Math.max(r as number, g as number, b as number) - Math.min(r as number, g as number, b as number)).toBeLessThanOrEqual(2);
    }
  });
});

describe('inkOn', () => {
  it('picks whichever ink reads better on the fill', () => {
    expect(inkOn('#0d366b')).toBe('#ffffff');
    expect(inkOn('#cde2fb')).toBe('#0b0b0b');
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 6);
  });
});
