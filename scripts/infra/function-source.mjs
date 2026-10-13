import { evaluateEdgeSource } from './load-course-routing.mjs';

const HANDLER = 'function handler(';
const ALLOWLIST_HANDLER = 'function allowlistHandler(';

/** The cloudfront-js-1.0 limit on a function's source. */
export const EDGE_SIZE_LIMIT = 10 * 1024;

/** An RFC 5737 documentation address: on nobody's allowlist. */
export const DENIED_ADDRESS = '192.0.2.1';

export const COMBINED_HANDLER = `function handler(event) {
  var result = allowlistHandler(event);
  if (result.statusCode) return result;
  return routeCourse(result);
}`;

/**
 * Keeps every byte of the live source, renaming its one handler, then appends the
 * routing and a handler that runs the allowlist first and the routing second.
 */
export function spliceRouting(liveSource, routingSource) {
  if (liveSource.includes(ALLOWLIST_HANDLER) || liveSource.includes('routeCourse')) {
    throw new Error('The live source already carries the course routing.');
  }
  const at = liveSource.indexOf(HANDLER);
  if (at === -1) throw new Error('The live source declares no "function handler(".');
  if (liveSource.indexOf(HANDLER, at + 1) !== -1) {
    throw new Error('The live source declares "function handler(" more than once.');
  }
  const renamed = liveSource.slice(0, at) + ALLOWLIST_HANDLER + liveSource.slice(at + HANDLER.length);
  return `${renamed.trimEnd()}\n\n${routingSource.trim()}\n\n${COMBINED_HANDLER}\n`;
}

/** The first quoted IPv4 prefix before the handler, completed to an address that starts with it. */
export function firstAllowedAddress(liveSource) {
  const beforeHandler = liveSource.slice(0, liveSource.indexOf(HANDLER));
  const match = /['"](\d{1,3}(?:\.\d{1,3}){2,3}\.?)['"]/.exec(beforeHandler);
  if (match === null) throw new Error('No quoted IPv4 prefix before the handler.');
  const parts = match[1].replace(/\.$/, '').split('.');
  while (parts.length < 4) parts.push('1');
  return parts.join('.');
}

export function viewerEvent(ip, uri) {
  return {
    version: '1.0',
    context: { eventType: 'viewer-request' },
    viewer: { ip },
    request: { method: 'GET', uri, querystring: {}, headers: {}, cookies: {} },
  };
}

/** The six checks that gate publishing: the allowlist still admits and denies, and the four course rows route. */
export function functionChecks({ allowed, denied, basePath }) {
  return [
    { name: 'allowed address, dashboard root', event: viewerEvent(allowed, '/'), expect: { request: '/' } },
    { name: 'denied address, course page', event: viewerEvent(denied, `${basePath}/`), expect: { response: 403 } },
    { name: 'bare prefix', event: viewerEvent(allowed, basePath), expect: { response: 301, location: `${basePath}/` } },
    { name: 'directory URL', event: viewerEvent(allowed, `${basePath}/`), expect: { request: `${basePath}/index.html` } },
    {
      name: 'unslashed page',
      event: viewerEvent(allowed, `${basePath}/lessons/train-a-net`),
      expect: { response: 301, location: `${basePath}/lessons/train-a-net/` },
    },
    {
      name: 'file',
      event: viewerEvent(allowed, `${basePath}/_next/static/chunks/main-app.js`),
      expect: { request: `${basePath}/_next/static/chunks/main-app.js` },
    },
  ];
}

/**
 * Compares a function's output, `{ request }` or `{ response }` as test-function
 * returns it, with a check's expectation. Null when they agree.
 */
export function mismatch(output, expected) {
  if ('request' in expected) {
    if (!output.request) return `expected a request, got ${JSON.stringify(output)}`;
    if (output.request.uri !== expected.request) return `expected uri ${expected.request}, got ${output.request.uri}`;
    return null;
  }
  if (!output.response) return `expected a response, got ${JSON.stringify(output)}`;
  if (output.response.statusCode !== expected.response) {
    return `expected status ${expected.response}, got ${output.response.statusCode}`;
  }
  const location = output.response.headers?.location?.value;
  if (expected.location !== undefined && location !== expected.location) {
    return `expected location ${expected.location}, got ${location}`;
  }
  return null;
}

/** Runs the combined source's handler here and shapes the result as test-function does. */
export function runLocally(combinedSource, event) {
  const result = evaluateEdgeSource(combinedSource).handler(event);
  return result.statusCode ? { response: result } : { request: result };
}
