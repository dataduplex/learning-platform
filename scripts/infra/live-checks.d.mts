export interface ProbeResult {
  readonly status: number;
  readonly contentType: string | null;
  readonly cacheControl: string | null;
  readonly contentEncoding: string | null;
  readonly location: string | null;
  readonly body: string;
}

export interface LiveCheck {
  readonly name: string;
  readonly path: string;
  readonly status: number;
  readonly contentType?: string | RegExp;
  readonly cacheControl?: string;
  readonly location?: string;
  /** Any one of these passes. */
  readonly contentEncoding?: readonly string[];
  readonly firstLine?: string | undefined;
}

export function probe(url: string, fetchImpl?: typeof fetch): Promise<ProbeResult>;
export function liveChecks({ basePath, lesson, commit }: {
  readonly basePath: string;
  readonly lesson: string;
  readonly commit?: string;
}): readonly LiveCheck[];

export function chunkCheck(path: string): LiveCheck;
export function stylesheetCheck(path: string): LiveCheck;
export function fontCheck(path: string): LiveCheck;

export function firstChunkPath(html: string, basePath: string): string;
export function stylesheetPath(html: string, basePath: string): string;
export function katexFontPath(css: string, basePath: string): string;

/** Empty when the result passes the check. */
export function problems(check: LiveCheck, result: ProbeResult): readonly string[];
