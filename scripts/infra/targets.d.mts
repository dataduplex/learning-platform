export const ACCOUNT_ID: string;
export const REGION: string;
export const BUCKET: string;
export const BUCKET_DOMAIN: string;
export const DISTRIBUTION_ID: string;
export const DISTRIBUTION_ARN: string;
export const FUNCTION_NAME: string;
export const OAC_NAME: string;
export const CACHE_POLICY_NAME: string;
export const ORIGIN_ID: string;
export const HOST: string;
export const ORIGIN_URL: string;
export const PAGE_CACHE_CONTROL: string;
export const ASSET_CACHE_CONTROL: string;

export interface CourseRow {
  readonly prefix: string;
  readonly sampleLesson: string;
}

export const COURSES: Readonly<Record<string, CourseRow>>;

export interface CourseTarget {
  readonly id: string;
  readonly prefix: string;
  readonly BASE_PATH: string;
  readonly COURSE_URL: string;
  readonly PATH_PATTERN: string;
  readonly SAMPLE_LESSON: string;
}

export function basePaths(): readonly string[];
export function courseTarget(id: string): CourseTarget;
export function courseFromArgv(argv: readonly string[]): CourseTarget;
