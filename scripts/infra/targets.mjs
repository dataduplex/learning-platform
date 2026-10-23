// Fixed identities of the deployment. Live state is read from the account at run time.
export const ACCOUNT_ID = '925653736308';
export const REGION = 'us-east-1';
export const BUCKET = 'tvp-engineer-learning-dev';
export const BUCKET_DOMAIN = `${BUCKET}.s3.${REGION}.amazonaws.com`;
export const DISTRIBUTION_ID = 'E2EM88PLKUPPT8';
export const DISTRIBUTION_ARN = `arn:aws:cloudfront::${ACCOUNT_ID}:distribution/${DISTRIBUTION_ID}`;
export const FUNCTION_NAME = 'engineer-dashboard-filter';
export const OAC_NAME = 'oac-tvp-engineer-learning-dev';
export const CACHE_POLICY_NAME = 'tvp-engineer-learning-course';
export const ORIGIN_ID = 'course-bucket';
export const HOST = 'dev.samsungtv.plus';
export const ORIGIN_URL = `https://${HOST}`;
export const PAGE_CACHE_CONTROL = 'public, max-age=0, must-revalidate';
export const ASSET_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/**
 * One row per course served from the bucket, keyed by course id.
 * sampleLesson names one authored lesson, the course's sample page.
 */
export const COURSES = {
  'llm-math': { prefix: 'engineer/learning/ai/math', sampleLesson: 'train-a-net' },
};

/** Every course prefix as the edge sees it, with its leading slash. */
export function basePaths() {
  return Object.values(COURSES).map((course) => `/${course.prefix}`);
}

/** The deployment identities of one course: its row plus the paths built from it. */
export function courseTarget(id) {
  const course = COURSES[id];
  if (course === undefined) {
    throw new Error(`No course "${id}" in the course table; known: ${Object.keys(COURSES).join(', ')}.`);
  }
  const basePath = `/${course.prefix}`;
  return {
    id,
    prefix: course.prefix,
    BASE_PATH: basePath,
    COURSE_URL: `${ORIGIN_URL}${basePath}/`,
    PATH_PATTERN: `${basePath}/*`,
    SAMPLE_LESSON: course.sampleLesson,
  };
}

/** The course named by `--course <id>` in an argv. */
export function courseFromArgv(argv) {
  const at = argv.indexOf('--course');
  const id = at === -1 ? undefined : argv[at + 1];
  if (id === undefined) {
    throw new Error(`--course <id> is required; known: ${Object.keys(COURSES).join(', ')}.`);
  }
  return courseTarget(id);
}
