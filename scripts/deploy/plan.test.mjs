import { describe, expect, it } from 'vitest';
import { deployPlan, describeStep, substitute } from './plan.mjs';

const inputs = {
  commit: 'abc123',
  deployedAt: '2026-10-09T12:00:00.000Z',
  bucket: 'tvp-engineer-learning-dev',
  prefix: 'engineer/learning/ai/math',
  distributionId: 'E2EM88PLKUPPT8',
  profile: 'nasb-dev',
  courseUrl: 'https://dev.samsungtv.plus/engineer/learning/ai/math/',
};
const plan = deployPlan(inputs);
const TARGET = 's3://tvp-engineer-learning-dev/engineer/learning/ai/math';

describe('deployPlan', () => {
  it('runs the steps of the design in order', () => {
    expect(plan.map((step) => step.title)).toEqual([
      'Verify the tree at the root path',
      'Build with the base path',
      'Stamp the build',
      'Upload hashed assets first, immutable for a year',
      'Upload everything else, revalidated on every request, deleting stale keys',
      'Invalidate the course paths',
      'Wait for the invalidation to complete',
      'Confirm the deployed commit',
    ]);
  });

  it('verifies at the root, then builds with the base path', () => {
    expect(plan[0].argv).toEqual(['npm', 'run', 'verify']);
    expect(plan[0].env).toBeUndefined();
    expect(plan[1].argv).toEqual(['npm', 'run', 'build']);
    expect(plan[1].env).toEqual({ NEXT_PUBLIC_BASE_PATH: '/engineer/learning/ai/math' });
  });

  it('stamps the build with the commit and the time, one per line', () => {
    expect(plan[2]).toEqual({
      kind: 'write', title: 'Stamp the build', path: 'out/version.txt', content: 'abc123\n2026-10-09T12:00:00.000Z\n',
    });
  });

  it('uploads the hashed assets before the pages, immutable and never deleted', () => {
    expect(plan[3].argv).toEqual([
      'aws', '--profile', 'nasb-dev', 's3', 'sync', 'out/_next/static', `${TARGET}/_next/static`,
      '--cache-control', 'public, max-age=31536000, immutable',
    ]);
    expect(plan[3].argv).not.toContain('--delete');
    expect(plan[4].argv).toEqual([
      'aws', '--profile', 'nasb-dev', 's3', 'sync', 'out', TARGET,
      '--exclude', '_next/static/*', '--cache-control', 'public, max-age=0, must-revalidate', '--delete',
    ]);
  });

  it('invalidates the course paths, captures the id, and waits on it', () => {
    expect(plan[5].argv).toEqual([
      'aws', '--profile', 'nasb-dev', 'cloudfront', 'create-invalidation', '--distribution-id', 'E2EM88PLKUPPT8',
      '--paths', '/engineer/learning/ai/math/*', '--query', 'Invalidation.Id', '--output', 'text',
    ]);
    expect(plan[5].capture).toBe('invalidationId');
    expect(plan[6].argv).toEqual([
      'aws', '--profile', 'nasb-dev', 'cloudfront', 'wait', 'invalidation-completed',
      '--distribution-id', 'E2EM88PLKUPPT8', '--id', '${invalidationId}',
    ]);
  });

  it('confirms the commit from the live version file', () => {
    expect(plan[7]).toEqual({
      kind: 'fetch',
      title: 'Confirm the deployed commit',
      url: 'https://dev.samsungtv.plus/engineer/learning/ai/math/version.txt',
      firstLine: 'abc123',
    });
  });

  it('passes the profile to every aws command', () => {
    const awsSteps = plan.filter((step) => step.kind === 'run' && step.argv[0] === 'aws');
    expect(awsSteps).toHaveLength(4);
    for (const step of awsSteps) expect(step.argv.slice(1, 3)).toEqual(['--profile', 'nasb-dev']);
  });
});

describe('substitute', () => {
  it('fills captured values and refuses a missing one', () => {
    expect(substitute(['--id', '${invalidationId}'], { invalidationId: 'I1' })).toEqual(['--id', 'I1']);
    expect(() => substitute(['${nothing}'], {})).toThrow(/Nothing was captured as nothing/);
  });
});

describe('describeStep', () => {
  it('shows each kind of step as one line', () => {
    expect(describeStep(plan[1])).toBe('NEXT_PUBLIC_BASE_PATH=/engineer/learning/ai/math npm run build');
    expect(describeStep(plan[2])).toBe('write out/version.txt (2 lines)');
    expect(describeStep(plan[4])).toContain("'public, max-age=0, must-revalidate'");
    expect(describeStep(plan[5])).toMatch(/^aws --profile nasb-dev cloudfront create-invalidation .* -> invalidationId$/);
    expect(describeStep(plan[7]))
      .toBe('fetch https://dev.samsungtv.plus/engineer/learning/ai/math/version.txt and expect its first line to be abc123');
  });
});
