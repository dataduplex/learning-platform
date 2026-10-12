import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, normalize, resolve, sep } from 'node:path';
import { loadCourseRouting } from '../infra/load-course-routing.mjs';
import { ASSET_CACHE_CONTROL, BASE_PATH, PAGE_CACHE_CONTROL } from '../infra/targets.mjs';

const CONTENT_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
  '.wasm': 'application/wasm',
};

const portAt = process.argv.indexOf('--port');
const port = portAt === -1 ? 4322 : Number(process.argv[portAt + 1]);
const root = resolve('out');
const routeCourse = loadCourseRouting();

/** The path alone, decoded and without its query string, as the edge sees it. */
function routed(url) {
  return routeCourse({ uri: decodeURIComponent(new URL(url, 'http://localhost').pathname) });
}

async function serve(request, response) {
  const result = routed(request.url ?? '/');
  if (result.statusCode) {
    response.writeHead(result.statusCode, { location: result.headers.location.value });
    response.end();
    return;
  }
  if (!result.uri.startsWith(`${BASE_PATH}/`)) {
    response.writeHead(404, { 'content-type': 'text/plain' });
    response.end('Not found: outside the course prefix');
    return;
  }
  const key = result.uri.slice(BASE_PATH.length + 1);
  const file = resolve(root, normalize(key));
  const info = file.startsWith(root + sep) ? await stat(file).catch(() => null) : null;
  if (info === null || !info.isFile()) {
    response.writeHead(404, { 'content-type': 'application/xml' });
    response.end('<Error><Code>NoSuchKey</Code></Error>');
    return;
  }
  response.writeHead(200, {
    'content-type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
    'content-length': info.size,
    'cache-control': key.startsWith('_next/static/') ? ASSET_CACHE_CONTROL : PAGE_CACHE_CONTROL,
  });
  createReadStream(file).pipe(response);
}

createServer((request, response) => {
  serve(request, response).catch((error) => {
    response.writeHead(500, { 'content-type': 'text/plain' });
    response.end(String(error));
  });
}).listen(port, () => {
  console.log(`Serving out/ at http://localhost:${port}${BASE_PATH}/`);
});
