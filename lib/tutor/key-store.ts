/**
 * The learner's own API key, kept in this browser only. Never logged, never sent
 * anywhere except to the Anthropic endpoint the SDK calls.
 */
const PREFIX = 'sk-ant-';
const MINIMUM_LENGTH = 40;

export function looksLikeKey(candidate: string): boolean {
  const trimmed = candidate.trim();
  return trimmed.startsWith(PREFIX) && trimmed.length >= MINIMUM_LENGTH;
}

export function readKey(storage: Storage, key: string): string | null {
  try {
    const stored = storage.getItem(key);
    return stored !== null && looksLikeKey(stored) ? stored : null;
  } catch {
    return null;
  }
}

/** Throws on a value that is not key-shaped; swallows a storage that refuses writes. */
export function writeKey(candidate: string, storage: Storage, key: string): void {
  const trimmed = candidate.trim();
  if (!looksLikeKey(trimmed)) {
    // The message must never echo the input: a mistyped key is still a secret.
    throw new Error('That does not look like an Anthropic API key.');
  }
  try {
    storage.setItem(key, trimmed);
  } catch {
    // Private browsing and full quotas both land here. The session still works.
  }
}

export function clearKey(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // Nothing to do: the key was never persisted.
  }
}
