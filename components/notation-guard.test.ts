import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd(), 'components');

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe('numbers a reader sees', () => {
  it('are never written in JavaScript exponent notation', () => {
    const offenders = sources(ROOT)
      .filter((path) => !path.endsWith(`primitives${sep}NumberReadout.tsx`))
      .filter((path) => /\.toExponential\(|formatExponential/.test(readFileSync(path, 'utf8')))
      .map((path) => path.slice(ROOT.length + 1));
    expect(offenders).toEqual([]);
  });
});
