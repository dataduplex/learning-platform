import { describe, expect, it } from 'vitest';
import {
  ALL_PAIRS_SERIES_CAP, DIVERGING_MID, SEQUENTIAL_BLUE, SERIES,
  divergingScale, ordinalScale, sequentialScale, seriesVar, statusVar,
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
    expect(scale(4)).toBe(SERIES.light[7]);
  });

  it('gives both arms the same number of steps', () => {
    const scale = divergingScale(-1, 1, 'light');
    const cool = new Set([0.05, 0.2, 0.4, 0.6, 0.8, 1].map((t) => scale(-t)));
    const warm = new Set([0.05, 0.2, 0.4, 0.6, 0.8, 1].map((t) => scale(t)));
    expect(cool.size).toBe(warm.size);
  });

  it('is symmetric in magnitude: equal distance from zero means equal saturation', () => {
    const scale = divergingScale(-5, 5, 'light');
    const coolSteps = [1, 2, 3, 4, 5].map((v) => scale(-v));
    const warmSteps = [1, 2, 3, 4, 5].map((v) => scale(v));
    expect(new Set(coolSteps).size).toBe(5);
    expect(new Set(warmSteps).size).toBe(5);
  });

  it('rejects a domain that does not contain zero', () => {
    expect(() => divergingScale(1, 5, 'light')).toThrow(RangeError);
  });
});

describe('ordinalScale', () => {
  it('never starts lighter than step 250 on the light surface', () => {
    // Steps 100 through 200 are below 2:1 against #fcfcfb, so ordinal marks
    // would recede into the surface.
    for (const color of ordinalScale(4, 'light')) {
      expect(SEQUENTIAL_BLUE.indexOf(color as typeof SEQUENTIAL_BLUE[number])).toBeGreaterThanOrEqual(3);
    }
  });

  it('never goes darker than step 600 on the dark surface', () => {
    for (const color of ordinalScale(4, 'dark')) {
      expect(SEQUENTIAL_BLUE.indexOf(color as typeof SEQUENTIAL_BLUE[number])).toBeLessThanOrEqual(10);
    }
  });

  it('returns the requested count, all distinct', () => {
    const colors = ordinalScale(5, 'light');
    expect(colors).toHaveLength(5);
    expect(new Set(colors).size).toBe(5);
  });

  it('rejects a count it cannot fill distinctly', () => {
    expect(() => ordinalScale(20, 'light')).toThrow(RangeError);
  });
});
