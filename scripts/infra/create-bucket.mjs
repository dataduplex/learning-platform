import { aws, awsWrite, describeAws, fail, parseFlags, sameJson } from './aws.mjs';
import { BUCKET, COURSES, DISTRIBUTION_ARN, REGION } from './targets.mjs';

export const PUBLIC_ACCESS_BLOCK = {
  BlockPublicAcls: true,
  IgnorePublicAcls: true,
  BlockPublicPolicy: true,
  RestrictPublicBuckets: true,
};

export const OWNERSHIP_CONTROLS = { Rules: [{ ObjectOwnership: 'BucketOwnerEnforced' }] };

export const ENCRYPTION = {
  Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' }, BucketKeyEnabled: false }],
};

export const VERSIONING = { Status: 'Enabled' };

export const LIFECYCLE = {
  Rules: [{
    ID: 'course-housekeeping',
    Status: 'Enabled',
    Filter: { Prefix: '' },
    NoncurrentVersionExpiration: { NoncurrentDays: 30 },
    AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 },
  }],
};

/** Reads for one distribution: objects under every course prefix, and the listing that turns a missing key into a 404. */
export function bucketPolicy({ bucket, prefixes, distributionArn }) {
  return {
    Version: '2012-10-17',
    Statement: [{
      Sid: 'AllowCloudFrontServicePrincipalRead',
      Effect: 'Allow',
      Principal: { Service: 'cloudfront.amazonaws.com' },
      Action: ['s3:GetObject', 's3:ListBucket'],
      Resource: [...prefixes.map((prefix) => `arn:aws:s3:::${bucket}/${prefix}/*`), `arn:aws:s3:::${bucket}`],
      Condition: { StringEquals: { 'AWS:SourceArn': distributionArn } },
    }],
  };
}

/** Each setting: the s3api call that applies it, the call that reads it back, and the value wanted. */
export function bucketSettings(target) {
  const policy = bucketPolicy(target);
  return [
    {
      name: 'public access block',
      put: ['put-public-access-block', '--public-access-block-configuration', JSON.stringify(PUBLIC_ACCESS_BLOCK)],
      get: ['get-public-access-block'],
      read: (out) => out.PublicAccessBlockConfiguration,
      want: PUBLIC_ACCESS_BLOCK,
    },
    {
      name: 'object ownership',
      put: ['put-bucket-ownership-controls', '--ownership-controls', JSON.stringify(OWNERSHIP_CONTROLS)],
      get: ['get-bucket-ownership-controls'],
      read: (out) => out.OwnershipControls,
      want: OWNERSHIP_CONTROLS,
    },
    {
      name: 'encryption',
      put: ['put-bucket-encryption', '--server-side-encryption-configuration', JSON.stringify(ENCRYPTION)],
      get: ['get-bucket-encryption'],
      read: (out) => out.ServerSideEncryptionConfiguration,
      want: ENCRYPTION,
    },
    {
      name: 'versioning',
      put: ['put-bucket-versioning', '--versioning-configuration', JSON.stringify(VERSIONING)],
      get: ['get-bucket-versioning'],
      read: (out) => ({ Status: out.Status }),
      want: VERSIONING,
    },
    {
      name: 'lifecycle',
      put: ['put-bucket-lifecycle-configuration', '--lifecycle-configuration', JSON.stringify(LIFECYCLE)],
      get: ['get-bucket-lifecycle-configuration'],
      read: (out) => ({ Rules: out.Rules }),
      want: LIFECYCLE,
    },
    {
      name: 'policy',
      put: ['put-bucket-policy', '--policy', JSON.stringify(policy)],
      get: ['get-bucket-policy'],
      read: (out) => JSON.parse(out.Policy),
      want: policy,
    },
  ];
}

function bucketExists(profile) {
  try {
    aws(profile, ['s3api', 'head-bucket', '--bucket', BUCKET, '--region', REGION]);
    return true;
  } catch (error) {
    if (/\(404\)/.test(error.message)) return false;
    if (/\(403\)/.test(error.message)) {
      fail(`Bucket ${BUCKET} exists but this account cannot read it: another owner holds the name.`);
    }
    throw error;
  }
}

function currentSetting(profile, setting) {
  try {
    return setting.read(aws(profile, ['s3api', ...setting.get, '--bucket', BUCKET, '--region', REGION]));
  } catch {
    return null;
  }
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const exists = bucketExists(flags.profile);
  if (exists) console.log(`Bucket ${BUCKET} exists; comparing its settings.`);
  else awsWrite(flags, ['s3api', 'create-bucket', '--bucket', BUCKET, '--region', REGION]);

  const target = { bucket: BUCKET, prefixes: Object.values(COURSES).map((course) => course.prefix), distributionArn: DISTRIBUTION_ARN };
  for (const setting of bucketSettings(target)) {
    const current = exists ? currentSetting(flags.profile, setting) : null;
    if (current !== null && sameJson(current, setting.want)) {
      console.log(`${setting.name}: already as intended`);
      continue;
    }
    console.log(`${setting.name}: ${current === null ? 'absent' : 'differs'}`);
    console.log(`  wanted ${JSON.stringify(setting.want)}`);
    if (current !== null) console.log(`  found  ${JSON.stringify(current)}`);
    awsWrite(flags, ['s3api', ...setting.put, '--bucket', BUCKET, '--region', REGION]);
  }

  const deleteBucket = describeAws(flags.profile, ['s3api', 'delete-bucket', '--bucket', BUCKET, '--region', REGION]);
  console.log(`Restore: delete every object version under s3://${BUCKET}, then ${deleteBucket}`);
}

if (process.argv[1]?.endsWith('create-bucket.mjs')) await main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
