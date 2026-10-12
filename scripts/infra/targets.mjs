// Fixed identities of the deployment. Live state is read from the account at run time.
export const ACCOUNT_ID = '925653736308';
export const REGION = 'us-east-1';
export const BUCKET = 'tvp-engineer-learning-dev';
export const BUCKET_DOMAIN = `${BUCKET}.s3.${REGION}.amazonaws.com`;
export const PREFIX = 'engineer/learning/ai/math';
export const BASE_PATH = `/${PREFIX}`;
export const DISTRIBUTION_ID = 'E2EM88PLKUPPT8';
export const DISTRIBUTION_ARN = `arn:aws:cloudfront::${ACCOUNT_ID}:distribution/${DISTRIBUTION_ID}`;
export const FUNCTION_NAME = 'engineer-dashboard-filter';
export const OAC_NAME = 'oac-tvp-engineer-learning-dev';
export const CACHE_POLICY_NAME = 'tvp-engineer-learning-course';
export const ORIGIN_ID = 'course-bucket';
export const HOST = 'dev.samsungtv.plus';
export const ORIGIN_URL = `https://${HOST}`;
export const COURSE_URL = `${ORIGIN_URL}${BASE_PATH}/`;
export const PAGE_CACHE_CONTROL = 'public, max-age=0, must-revalidate';
export const ASSET_CACHE_CONTROL = 'public, max-age=31536000, immutable';
