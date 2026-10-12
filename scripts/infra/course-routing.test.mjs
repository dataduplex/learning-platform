import { describe, expect, it } from 'vitest';
import { loadCourseRouting, readCourseRoutingSource } from './load-course-routing.mjs';
import { BASE_PATH } from './targets.mjs';

const routeCourse = loadCourseRouting();
const request = (uri) => ({ method: 'GET', uri, querystring: {}, headers: {}, cookies: {} });

describe('routeCourse', () => {
  it('redirects the bare prefix to its slashed form', () => {
    const result = routeCourse(request(BASE_PATH));
    expect(result.statusCode).toBe(301);
    expect(result.statusDescription).toBe('Moved Permanently');
    expect(result.headers.location.value).toBe(`${BASE_PATH}/`);
  });

  it('appends index.html to a directory URL', () => {
    expect(routeCourse(request(`${BASE_PATH}/`)).uri).toBe(`${BASE_PATH}/index.html`);
    expect(routeCourse(request(`${BASE_PATH}/lessons/train-a-net/`)).uri)
      .toBe(`${BASE_PATH}/lessons/train-a-net/index.html`);
  });

  it('redirects a page URL that lacks its slash', () => {
    const result = routeCourse(request(`${BASE_PATH}/lessons/train-a-net`));
    expect(result.statusCode).toBe(301);
    expect(result.headers.location.value).toBe(`${BASE_PATH}/lessons/train-a-net/`);
  });

  it('leaves a file URL alone', () => {
    const files = [
      '_next/static/chunks/main-app.js',
      'pyodide-worker.js',
      'lesson-context/train-a-net.json',
      'version.txt',
      'lessons/train-a-net/index.txt',
    ];
    for (const file of files) {
      const original = request(`${BASE_PATH}/${file}`);
      expect(routeCourse(original)).toBe(original);
      expect(original.uri).toBe(`${BASE_PATH}/${file}`);
    }
  });

  it('leaves everything outside the prefix alone, including look-alike prefixes', () => {
    for (const uri of ['/', '/api/health', '/engineer/learning/ai/mathematics', '/engineer/learning/ai/mathx/']) {
      const original = request(uri);
      expect(routeCourse(original)).toBe(original);
      expect(original.uri).toBe(uri);
    }
  });

  it('is written for the edge runtime and names the deployed prefix', () => {
    const source = readCourseRoutingSource();
    expect(source).not.toMatch(/\b(let|const|import|export|class)\b/);
    expect(source).not.toMatch(/=>/);
    expect(source).not.toContain('`');
    expect(source).toContain(`var COURSE_PREFIX = '${BASE_PATH}';`);
    expect(Buffer.byteLength(source, 'utf8')).toBeLessThan(2048);
  });
});
