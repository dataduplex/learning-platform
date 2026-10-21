/** Prefixes an absolute path with the path prefix the site is built for. Empty at the root. */
export function withBasePath(basePath: string, path: string): string {
  if (!path.startsWith('/')) {
    throw new Error(`withBasePath needs a path starting with "/", got "${path}".`);
  }
  return `${basePath}${path}`;
}
