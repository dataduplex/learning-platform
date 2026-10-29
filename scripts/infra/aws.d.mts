export const SNAPSHOT_DIR: string;

export interface Flags {
  readonly profile: string;
  readonly dryRun: boolean;
  readonly yes: boolean;
}

export function parseFlags(argv: readonly string[]): Flags;
export function shellQuote(arg: string): string;
export function describeAws(profile: string, args: readonly string[]): string;
/** Parsed JSON output, or null when the CLI prints nothing. */
export function aws(profile: string, args: readonly string[], options?: { readonly input?: string }): unknown;
/** Null on a dry run. */
export function awsWrite(flags: Flags, args: readonly string[]): unknown;

export function timestamp(date?: Date): string;
export function snapshotPath(name: string, dir?: string): string;
export function writeSnapshot(name: string, content: string | Uint8Array, dir?: string): string;
export function latestSnapshot(suffix: string, dir?: string): string | null;
export function readJson(path: string): unknown;

export function findByName<T extends { readonly Name?: unknown }>(
  items: readonly T[] | null | undefined,
  name: string,
): T | null;
export function sameJson(a: unknown, b: unknown): boolean;
export function showDiff(before: string, after: string): void;
export function fail(message: string): never;
