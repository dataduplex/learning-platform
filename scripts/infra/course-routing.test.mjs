import { describe, expect, it } from 'vitest';
import { loadCourseRouting, readCourseRoutingTemplate, renderCourseRouting } from './load-course-routing.mjs';

const PREFIXES = ['/courses/alpha', '/courses/beta'];
const routeCourse = loadCourseRouting(PREFIXES);
const request = (uri) => ({ method: 'GET', uri, querystring: {}, headers: {}, cookies: {} });

describe('routeCourse', () => {
  it('redirects the bare prefix of every course to its slashed form', () => {
    for (const prefix of PREFIXES) {
      const result = routeCourse(request(prefix));
      expect(result.statusCode).toBe(301);
      expect(result.statusDescription).toBe('Moved Permanently');
      expect(result.headers.location.value).toBe(`${prefix}/`);
    }
  });

  it('appends index.html to a directory URL', () => {
    expect(routeCourse(request('/courses/alpha/')).uri).toBe('/courses/alpha/index.html');
    expect(routeCourse(request('/courses/beta/lessons/one/')).uri).toBe('/courses/beta/lessons/one/index.html');
  });

  it('redirects a page URL that lacks its slash', () => {
    const result = routeCourse(request('/courses/alpha/lessons/one'));
    expect(result.statusCode).toBe(301);
    expect(result.headers.location.value).toBe('/courses/alpha/lessons/one/');
  });

  it('leaves a file URL alone', () => {
    const files = [
      '_next/static/chunks/main-app.js',
      'pyodide-worker.js',
      'lesson-context/one.json',
      'version.txt',
      'lessons/one/index.txt',
    ];
    for (const file of files) {
      const original = request(`/courses/beta/${file}`);
      expect(routeCourse(original)).toBe(original);
      expect(original.uri).toBe(`/courses/beta/${file}`);
    }
  });

  it('leaves everything outside every prefix alone, including look-alike prefixes', () => {
    for (const uri of ['/', '/api/health', '/courses/alphabet', '/courses/alphax/', '/courses/']) {
      const original = request(uri);
      expect(routeCourse(original)).toBe(original);
      expect(original.uri).toBe(uri);
    }
  });
});

describe('renderCourseRouting', () => {
  it('is written for the edge runtime and names every deployed prefix', () => {
    const source = renderCourseRouting(PREFIXES);
    expect(source).not.toMatch(/\b(let|const|import|export|class)\b/);
    expect(source).not.toMatch(/=>/);
    expect(source).not.toContain('`');
    expect(source).toContain('var COURSE_PREFIXES = ["/courses/alpha","/courses/beta"];');
    expect(Buffer.byteLength(source, 'utf8')).toBeLessThan(2048);
  });

  it('starts from a template that routes nothing, and refuses a malformed prefix', () => {
    expect(readCourseRoutingTemplate()).toContain('var COURSE_PREFIXES = [];');
    expect(() => renderCourseRouting(['courses/alpha'])).toThrow(/start with/);
    expect(() => renderCourseRouting(['/courses/alpha/'])).toThrow(/not end with one/);
  });
});
