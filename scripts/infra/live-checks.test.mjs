import { describe, expect, it } from 'vitest';
import {
  chunkCheck, firstChunkPath, fontCheck, katexFontPath, liveChecks, probe, problems, stylesheetCheck, stylesheetPath,
} from './live-checks.mjs';
import { ASSET_CACHE_CONTROL, PAGE_CACHE_CONTROL } from './targets.mjs';

const BASE = '/engineer/learning/ai/math';

describe('liveChecks', () => {
  it('lists the fixed rows of the design in order, with absolute paths', () => {
    const rows = liveChecks({ basePath: BASE, lesson: 'train-a-net', commit: 'abc123' });
    expect(rows.map((row) => [row.name, row.path, row.status])).toEqual([
      ['course map', `${BASE}/`, 200],
      ['lesson page', `${BASE}/lessons/train-a-net/`, 200],
      ['unslashed lesson URL', `${BASE}/lessons/train-a-net`, 301],
      ['bare prefix', BASE, 301],
      ['lesson context', `${BASE}/lesson-context/train-a-net.json`, 200],
      ['version', `${BASE}/version.txt`, 200],
      ['missing lesson', `${BASE}/lessons/no-such-lesson/`, 404],
    ]);
    expect(rows[1].cacheControl).toBe(PAGE_CACHE_CONTROL);
    expect(rows[2].location).toBe(`${BASE}/lessons/train-a-net/`);
    expect(rows[3].location).toBe(`${BASE}/`);
    expect(rows[5]).toMatchObject({ contentType: 'text/plain', firstLine: 'abc123' });
  });

  it('expects hashed assets to be immutable and the chunk to arrive compressed', () => {
    expect(chunkCheck('/x.js')).toMatchObject({ status: 200, cacheControl: ASSET_CACHE_CONTROL, contentEncoding: ['gzip', 'br'] });
    expect(stylesheetCheck('/x.css')).toMatchObject({ contentType: 'text/css', cacheControl: ASSET_CACHE_CONTROL });
    expect(fontCheck('/x.woff2')).toMatchObject({ contentType: 'font/woff2', cacheControl: ASSET_CACHE_CONTROL });
  });
});

describe('asset discovery', () => {
  const html = [
    '<html><head>',
    `<link rel="stylesheet" href="${BASE}/_next/static/css/abc.css" data-precedence="next"/>`,
    `<script src="${BASE}/_next/static/chunks/webpack-1.js" async=""></script>`,
    `<script src="${BASE}/_next/static/chunks/main-app-2.js" async=""></script>`,
    '</head></html>',
  ].join('\n');
  const css = `@font-face{font-family:KaTeX_Main;src:url(${BASE}/_next/static/media/KaTeX_Main-Regular.abc.woff2) format("woff2"),`
    + `url(${BASE}/_next/static/media/KaTeX_Main-Regular.abc.woff) format("woff")}`;

  it('finds the first chunk, the stylesheet and a woff2 KaTeX font under the prefix', () => {
    expect(firstChunkPath(html, BASE)).toBe(`${BASE}/_next/static/chunks/webpack-1.js`);
    expect(stylesheetPath(html, BASE)).toBe(`${BASE}/_next/static/css/abc.css`);
    expect(katexFontPath(css, BASE)).toBe(`${BASE}/_next/static/media/KaTeX_Main-Regular.abc.woff2`);
  });

  it('refuses a page or stylesheet that references the root instead', () => {
    expect(() => firstChunkPath(html.replaceAll(BASE, ''), BASE)).toThrow(/No _next\/static chunk/);
    expect(() => stylesheetPath('<html></html>', BASE)).toThrow(/No _next\/static stylesheet/);
    expect(() => katexFontPath('body{}', BASE)).toThrow(/No KaTeX woff2/);
  });
});

describe('problems', () => {
  const ok = {
    status: 200, contentType: 'text/html', cacheControl: PAGE_CACHE_CONTROL,
    contentEncoding: null, location: null, body: 'abc123\n2026-10-09T00:00:00Z\n',
  };

  it('is empty when every named expectation holds', () => {
    expect(problems({ status: 200, contentType: 'text/html', cacheControl: PAGE_CACHE_CONTROL, firstLine: 'abc123' }, ok)).toEqual([]);
    expect(problems({ status: 200 }, ok)).toEqual([]);
  });

  it('names each thing that is wrong', () => {
    const wrong = {
      ...ok, status: 403, contentType: 'application/xml', cacheControl: null,
      location: '/elsewhere', contentEncoding: 'identity', body: 'zzz',
    };
    const check = {
      status: 200, contentType: 'text/html', cacheControl: PAGE_CACHE_CONTROL,
      location: '/x/', contentEncoding: ['gzip', 'br'], firstLine: 'abc123',
    };
    expect(problems(check, wrong)).toEqual([
      'status 403, wanted 200',
      'content-type application/xml, wanted text/html',
      `cache-control null, wanted ${PAGE_CACHE_CONTROL}`,
      'location /elsewhere, wanted /x/',
      'content-encoding identity, wanted one of gzip, br',
      'first line "zzz", wanted "abc123"',
    ]);
  });

  it('accepts either JavaScript content type by pattern, and a charset suffix by prefix', () => {
    const chunk = { ...ok, contentType: 'application/javascript', cacheControl: ASSET_CACHE_CONTROL, contentEncoding: 'br' };
    expect(problems(chunkCheck('/x.js'), chunk)).toEqual([]);
    expect(problems({ status: 200, contentType: 'text/html' }, { ...ok, contentType: 'text/html; charset=utf-8' })).toEqual([]);
  });
});

describe('probe', () => {
  it('asks without following redirects and keeps the headers the checks read', async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url, init });
      return {
        status: 301,
        headers: new Headers({ location: '/x/', 'content-type': 'text/html' }),
        text: async () => '',
      };
    };
    const result = await probe('https://example.test/x', fetchImpl);
    expect(calls[0].init.redirect).toBe('manual');
    expect(result).toEqual({
      status: 301, contentType: 'text/html', cacheControl: null, contentEncoding: null, location: '/x/', body: '',
    });
  });
});
