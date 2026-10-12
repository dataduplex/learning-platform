// lib/base-path.ts
/** The path prefix the site is built for, inlined at build time. Empty at the root. */
export const BASE_PATH: string = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Prefixes a path the app builds by hand. */
export function withBasePath(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error(`withBasePath needs a path starting with "/", got "${path}".`);
  }
  return `${BASE_PATH}${path}`;
}
