import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

/** Everything that leaves for the platform package, relative to the course root. */
export const PLATFORM_PATHS = [
  'components/lesson',
  'components/primitives',
  'components/shell',
  'components/tutor',
  'lib/course',
  'lib/exercises',
  'lib/progress',
  'lib/pyodide',
  'lib/tutor',
  'lib/base-path.ts',
  'lib/palette.ts',
  'lib/theme.ts',
  'lib/theme-client.ts',
  'test',
  'scripts/build-lesson-context.mjs',
  'scripts/build-lesson-context.test.mjs',
  'scripts/deploy',
  'scripts/infra',
];

/** Primitives that stay with the course because they depend on its own library. */
export const COURSE_PRIMITIVES = ['ContourField', 'Heatmap', 'MatrixInput', 'VectorArrow'];

/** An import that binds code to this course rather than to the platform. */
const COURSE_IMPORT = /(?:from|import\()\s*'(?:@\/|(?:\.\.\/)+)(?:content\/|components\/widgets\/|lib\/(?:linalg|calculus|autograd|prob|net|optim|transformer|data|graph)(?:\/|'))/;

/** A string that names this course rather than a course. */
const COURSE_IDENTITY = /llm-math-course|mathematics of language models|mathematics behind large language|engineer\/learning\/ai\/math/;

/** Files still importing from the course. Each task of cycle 1a shortens this list; it ends empty. */
const IMPORT_DEBTS = new Set([
  'components/lesson/LessonShell.tsx',
  'components/lesson/NotationTable.tsx',
  'components/lesson/PrevNext.test.tsx',
  'components/lesson/PrevNext.tsx',
  'components/lesson/Sym.test.tsx',
  'components/lesson/Sym.tsx',
  'components/shell/CourseMap.test.tsx',
  'components/shell/CourseMap.tsx',
  'scripts/build-lesson-context.mjs',
]);

/** Files still naming the course. Same rule: it only shrinks. */
const IDENTITY_DEBTS = new Set([
  'components/shell/SiteHeader.tsx',
  'components/tutor/KeyGate.test.tsx',
  'lib/base-path.test.ts',
  'lib/progress/local-storage-store.ts',
  'lib/pyodide/client.test.ts',
  'lib/theme.ts',
  'lib/tutor/context.test.ts',
  'lib/tutor/key-store.ts',
  'lib/tutor/prompt.ts',
]);

function sources(path: string): string[] {
  if (statSync(path).isFile()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    if (entry.isDirectory()) return sources(child);
    return /\.(?:ts|tsx|mts|mjs)$/.test(entry.name) ? [child] : [];
  });
}

function platformFiles(): string[] {
  return PLATFORM_PATHS.flatMap((entry) => sources(join(ROOT, entry)))
    .map((file) => relative(ROOT, file).split(sep).join('/'))
    .filter((file) => file !== 'lib/course/boundary.test.ts')
    .filter((file) => !COURSE_PRIMITIVES.some((name) => file.startsWith(`components/primitives/${name}.`)));
}

const read = (file: string) => readFileSync(join(ROOT, file), 'utf8');

describe('platform-bound code', () => {
  it('imports nothing from the course beyond the known debts', () => {
    const offenders = platformFiles()
      .filter((file) => !IMPORT_DEBTS.has(file))
      .filter((file) => COURSE_IMPORT.test(read(file)));
    expect(offenders).toEqual([]);
  });

  it('keeps the import debt list honest: every listed debt still offends', () => {
    const settled = [...IMPORT_DEBTS].filter((file) => !COURSE_IMPORT.test(read(file)));
    expect(settled).toEqual([]);
  });

  it('names no course outside the deployment table, beyond the known debts', () => {
    const offenders = platformFiles()
      .filter((file) => !file.startsWith('scripts/'))
      .filter((file) => !IDENTITY_DEBTS.has(file))
      .filter((file) => COURSE_IDENTITY.test(read(file)));
    expect(offenders).toEqual([]);
  });

  it('keeps the identity debt list honest: every listed debt still offends', () => {
    const settled = [...IDENTITY_DEBTS].filter((file) => !COURSE_IDENTITY.test(read(file)));
    expect(settled).toEqual([]);
  });
});
