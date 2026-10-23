import { describe, expect, it } from 'vitest';
import { LIFECYCLE, PUBLIC_ACCESS_BLOCK, bucketPolicy, bucketSettings } from './create-bucket.mjs';

const target = {
  bucket: 'tvp-engineer-learning-dev',
  prefixes: ['engineer/learning/ai/math'],
  distributionArn: 'arn:aws:cloudfront::925653736308:distribution/E2EM88PLKUPPT8',
};

describe('bucketPolicy', () => {
  it('lets the distribution, and only it, read objects under the prefix and list the bucket', () => {
    const policy = bucketPolicy(target);
    expect(policy.Statement).toHaveLength(1);
    const [statement] = policy.Statement;
    expect(statement.Effect).toBe('Allow');
    expect(statement.Principal).toEqual({ Service: 'cloudfront.amazonaws.com' });
    expect(statement.Action).toEqual(['s3:GetObject', 's3:ListBucket']);
    expect(statement.Resource).toEqual([
      'arn:aws:s3:::tvp-engineer-learning-dev/engineer/learning/ai/math/*',
      'arn:aws:s3:::tvp-engineer-learning-dev',
    ]);
    expect(statement.Condition).toEqual({ StringEquals: { 'AWS:SourceArn': target.distributionArn } });
  });

  it('grants one object resource per course prefix', () => {
    const policy = bucketPolicy({ ...target, prefixes: ['engineer/learning/ai/math', 'engineer/learning/streaming'] });
    expect(policy.Statement[0].Resource).toEqual([
      'arn:aws:s3:::tvp-engineer-learning-dev/engineer/learning/ai/math/*',
      'arn:aws:s3:::tvp-engineer-learning-dev/engineer/learning/streaming/*',
      'arn:aws:s3:::tvp-engineer-learning-dev',
    ]);
  });
});

describe('bucketSettings', () => {
  it('cover the six settings of the design, each with a put and a get', () => {
    const settings = bucketSettings(target);
    expect(settings.map((setting) => setting.name))
      .toEqual(['public access block', 'object ownership', 'encryption', 'versioning', 'lifecycle', 'policy']);
    for (const setting of settings) {
      expect(setting.put[0]).toMatch(/^put-/);
      expect(setting.get[0]).toMatch(/^get-/);
      expect(JSON.parse(setting.put[2])).toEqual(setting.want);
    }
  });

  it('block all four kinds of public access, keep 30 days of old versions and 7 days of half uploads', () => {
    expect(Object.values(PUBLIC_ACCESS_BLOCK)).toEqual([true, true, true, true]);
    expect(LIFECYCLE.Rules[0].NoncurrentVersionExpiration.NoncurrentDays).toBe(30);
    expect(LIFECYCLE.Rules[0].AbortIncompleteMultipartUpload.DaysAfterInitiation).toBe(7);
  });

  it('read each setting back into the shape they put', () => {
    const [block, ownership, encryption, versioning, lifecycle, policy] = bucketSettings(target);
    expect(block.read({ PublicAccessBlockConfiguration: PUBLIC_ACCESS_BLOCK })).toEqual(block.want);
    expect(ownership.read({ OwnershipControls: ownership.want })).toEqual(ownership.want);
    expect(encryption.read({ ServerSideEncryptionConfiguration: encryption.want })).toEqual(encryption.want);
    expect(versioning.read({ Status: 'Enabled', MFADelete: 'Disabled' })).toEqual(versioning.want);
    expect(lifecycle.read({ Rules: LIFECYCLE.Rules })).toEqual(lifecycle.want);
    expect(policy.read({ Policy: JSON.stringify(bucketPolicy(target)) })).toEqual(policy.want);
  });
});
