'use client';

import { useMemo } from 'react';
import { contourSegments, evenLevels, type Domain, type Segment } from '@/lib/calculus/contour';
import type { Field2 } from '@/lib/calculus/gradient';
import { sequentialScale } from '@/lib/palette';
import { useResolvedMode } from '@/lib/theme-client';
import type { PlotScales } from './Plot';

/**
 * Level curves of a scalar field, drawn inside a Plot through its render prop.
 */
export function ContourField({
  scales,
  f,
  domain,
  levels,
  levelCount = 6,
  resolution = 48,
}: {
  scales: PlotScales;
  f: Field2;
  domain: Domain;
  /** Explicit levels; omit to space `levelCount` of them through the field's range. */
  levels?: readonly number[];
  levelCount?: number;
  resolution?: number;
}) {
  const mode = useResolvedMode();

  const drawn = useMemo(() => {
    const chosen = levels ?? evenLevels(f, domain, levelCount, resolution);
    const highest = Math.max(...chosen.map(Math.abs), 1e-9);
    const colorFor = sequentialScale(highest, mode);
    return chosen.map((level) => ({
      level,
      color: colorFor(Math.abs(level)),
      path: toPath(contourSegments(f, level, domain, resolution), scales),
    }));
  }, [f, domain, levels, levelCount, resolution, scales, mode]);

  return (
    <g className="contour-field" aria-hidden="true">
      {drawn.map(({ level, color, path }) => (
        path === null ? null : (
          <path key={level} className="contour-line" d={path} stroke={color} fill="none" />
        )
      ))}
    </g>
  );
}

/** Marching squares emits unordered segments, so each is its own move-and-line. */
function toPath(segments: readonly Segment[], scales: PlotScales): string | null {
  if (segments.length === 0) return null;
  return segments
    .map(({ from, to }) => [
      `M ${scales.x(from[0]).toFixed(2)} ${scales.y(from[1]).toFixed(2)}`,
      `L ${scales.x(to[0]).toFixed(2)} ${scales.y(to[1]).toFixed(2)}`,
    ].join(' '))
    .join(' ');
}
