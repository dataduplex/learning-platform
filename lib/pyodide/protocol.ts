/** The subset of Worker this client needs, so tests can supply a fake. */
export interface WorkerLike {
  postMessage(message: unknown): void;
  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
  removeEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
  terminate(): void;
}

export interface RunRequest {
  id: number;
  code: string;
}

export type RunReply =
  | { id: number; ok: true; stdout: string; value: string | null }
  | { id: number; ok: false; error: string };

export function isRunReply(value: unknown): value is RunReply {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'number' && typeof candidate.ok === 'boolean';
}
