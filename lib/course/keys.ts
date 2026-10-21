/** The localStorage keys a course writes, all under its own prefix. */
export function progressStorageKey(prefix: string): string {
  return `${prefix}:progress:v1`;
}

export function tutorKeyStorageKey(prefix: string): string {
  return `${prefix}:tutor-key`;
}

export function themeStorageKey(prefix: string): string {
  return `${prefix}:theme`;
}
