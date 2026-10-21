import { describe, expect, it } from 'vitest';
import { withBasePath } from './base-path';

describe('withBasePath', () => {
  it('is the identity at the root', () => {
    expect(withBasePath('', '/pyodide-worker.js')).toBe('/pyodide-worker.js');
  });

  it('prefixes a hand-built URL with the configured base path', () => {
    expect(withBasePath('/courses/test', '/lesson-context/alpha.json'))
      .toBe('/courses/test/lesson-context/alpha.json');
  });

  it('refuses a relative path, which would lose the prefix silently', () => {
    expect(() => withBasePath('/courses/test', 'pyodide-worker.js')).toThrow(/starting with "\//);
  });
});
