/** The path prefix the site is built for, inlined at build time. Empty at the root. */
export const BASE_PATH: string = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Prefixes an absolute path with the base path. */
export function withBasePath(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error(`withBasePath needs a path starting with "/", got "${path}".`);
  }
  return `${BASE_PATH}${path}`;
}
