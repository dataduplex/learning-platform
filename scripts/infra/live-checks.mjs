import { ASSET_CACHE_CONTROL, BASE_PATH, PAGE_CACHE_CONTROL } from './targets.mjs';

/** One GET without following redirects, reduced to what the checks compare. */
export async function probe(url, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    redirect: 'manual',
    headers: { 'accept-encoding': 'gzip, br' },
  });
  return {
    status: response.status,
    contentType: response.headers.get('content-type'),
    cacheControl: response.headers.get('cache-control'),
    contentEncoding: response.headers.get('content-encoding'),
    location: response.headers.get('location'),
    body: await response.text(),
  };
}

/** The fixed rows of the check table; paths are absolute from the origin. */
export function liveChecks({ basePath = BASE_PATH, commit }) {
  return [
    { name: 'course map', path: `${basePath}/`, status: 200, contentType: 'text/html' },
    {
      name: 'lesson page', path: `${basePath}/lessons/train-a-net/`, status: 200,
      contentType: 'text/html', cacheControl: PAGE_CACHE_CONTROL,
    },
    { name: 'unslashed lesson URL', path: `${basePath}/lessons/train-a-net`, status: 301, location: `${basePath}/lessons/train-a-net/` },
    { name: 'bare prefix', path: basePath, status: 301, location: `${basePath}/` },
    { name: 'lesson context', path: `${basePath}/lesson-context/train-a-net.json`, status: 200, contentType: 'application/json' },
    { name: 'version', path: `${basePath}/version.txt`, status: 200, contentType: 'text/plain', firstLine: commit },
    { name: 'missing lesson', path: `${basePath}/lessons/no-such-lesson/`, status: 404 },
  ];
}

export function chunkCheck(path) {
  return {
    name: 'first chunk', path, status: 200, contentType: /javascript/,
    cacheControl: ASSET_CACHE_CONTROL, contentEncoding: ['gzip', 'br'],
  };
}

export function stylesheetCheck(path) {
  return { name: 'stylesheet', path, status: 200, contentType: 'text/css', cacheControl: ASSET_CACHE_CONTROL };
}

export function fontCheck(path) {
  return { name: 'KaTeX font', path, status: 200, contentType: 'font/woff2', cacheControl: ASSET_CACHE_CONTROL };
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** @returns {string} */
export function firstChunkPath(html, basePath = BASE_PATH) {
  const match = new RegExp(`src="(${escapeRegExp(basePath)}/_next/static/chunks/[^"]+\\.js)"`).exec(html);
  if (match === null) throw new Error('No _next/static chunk in the page.');
  return match[1];
}

/** @returns {string} */
export function stylesheetPath(html, basePath = BASE_PATH) {
  const match = new RegExp(`href="(${escapeRegExp(basePath)}/_next/static/[^"]+\\.css)"`).exec(html);
  if (match === null) throw new Error('No _next/static stylesheet in the page.');
  return match[1];
}

/** @returns {string} */
export function katexFontPath(css, basePath = BASE_PATH) {
  let pattern = `url\\(["']?(${escapeRegExp(basePath)}/_next/static/media/KaTeX_[^"')]+\\.woff2)["']?\\)`;
  let match = new RegExp(pattern).exec(css);
  if (match !== null) return match[1];
  pattern = `url\\(["']?\\.\\./(media/KaTeX_[^"')]+\\.woff2)["']?\\)`;
  match = new RegExp(pattern).exec(css);
  if (match === null) throw new Error('No KaTeX woff2 font in the stylesheet.');
  return `${basePath}/_next/static/${match[1]}`;
}

function matchesType(actual, wanted) {
  if (actual === null) return false;
  return wanted instanceof RegExp ? wanted.test(actual) : actual.startsWith(wanted);
}

/** What a probe gets wrong against a check. Empty when it passes. */
export function problems(check, result) {
  const found = [];
  const firstLine = result.body.split('\n')[0];
  if (result.status !== check.status) found.push(`status ${result.status}, wanted ${check.status}`);
  if (check.contentType !== undefined && !matchesType(result.contentType, check.contentType)) {
    found.push(`content-type ${result.contentType}, wanted ${String(check.contentType)}`);
  }
  if (check.cacheControl !== undefined && result.cacheControl !== check.cacheControl) {
    found.push(`cache-control ${result.cacheControl}, wanted ${check.cacheControl}`);
  }
  if (check.location !== undefined && result.location !== check.location) {
    found.push(`location ${result.location}, wanted ${check.location}`);
  }
  if (check.contentEncoding !== undefined && !check.contentEncoding.includes(result.contentEncoding)) {
    found.push(`content-encoding ${result.contentEncoding}, wanted one of ${check.contentEncoding.join(', ')}`);
  }
  if (check.firstLine !== undefined && firstLine !== check.firstLine) {
    found.push(`first line "${firstLine}", wanted "${check.firstLine}"`);
  }
  return found;
}
