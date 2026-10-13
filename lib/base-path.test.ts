import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('BASE_PATH and withBasePath', () => {
  it('are empty and identity at the root, where the suite runs', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', undefined);
    const { BASE_PATH, withBasePath } = await import('./base-path');
    expect(BASE_PATH).toBe('');
    expect(withBasePath('/pyodide-worker.js')).toBe('/pyodide-worker.js');
  });

  it('prefix a hand-built URL with the configured base path', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/engineer/learning/ai/math');
    const { BASE_PATH, withBasePath } = await import('./base-path');
    expect(BASE_PATH).toBe('/engineer/learning/ai/math');
    expect(withBasePath('/lesson-context/train-a-net.json'))
      .toBe('/engineer/learning/ai/math/lesson-context/train-a-net.json');
  });

  it('refuse a relative path, which would lose the prefix silently', async () => {
    const { withBasePath } = await import('./base-path');
    expect(() => withBasePath('pyodide-worker.js')).toThrow(/starting with "\//);
  });
});
