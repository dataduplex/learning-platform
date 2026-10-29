import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SKIP = new Set(['node_modules', '.git', 'coverage']);

/** An installed package has no path alias, so none may be used. */
const ALIAS_IMPORT = /(?:from|import\()\s*'@\//;

/** An import that would bind the platform to one course. */
const COURSE_IMPORT = /(?:from|import\()\s*'(?:\.\.\/)+(?:content\/|components\/widgets\/|lib\/(?:linalg|calculus|autograd|prob|net|optim|transformer|data|graph)(?:\/|'))/;

/** A string that names one course rather than a course. */
const COURSE_IDENTITY = /llm-math-course|mathematics of language models|mathematics behind large language|engineer\/learning\/ai\/math/;

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP.has(entry.name)) return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.(?:ts|tsx|mts|mjs)$/.test(entry.name) ? [path] : [];
  });
}

const files = () => sources(ROOT)
  .map((file) => relative(ROOT, file).split(sep).join('/'))
  .filter((file) => file !== 'test/boundary.test.ts');
const read = (file: string) => readFileSync(join(ROOT, file), 'utf8');

describe('the platform package', () => {
  it('uses no path alias', () => {
    expect(files().filter((file) => ALIAS_IMPORT.test(read(file)))).toEqual([]);
  });

  it('imports nothing from a course', () => {
    expect(files().filter((file) => COURSE_IMPORT.test(read(file)))).toEqual([]);
  });

  it('names no course outside the deployment table', () => {
    const offenders = files()
      .filter((file) => !file.startsWith('scripts/'))
      .filter((file) => COURSE_IDENTITY.test(read(file)));
    expect(offenders).toEqual([]);
  });
});
