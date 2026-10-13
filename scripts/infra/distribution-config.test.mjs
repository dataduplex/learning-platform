import { describe, expect, it } from 'vitest';
import { courseBehaviour, courseOrigin, defaultViewerRequestFunction, withCourse } from './distribution-config.mjs';

const FUNCTION_ARN = 'arn:aws:cloudfront::925653736308:function/engineer-dashboard-filter';
const course = {
  originId: 'course-bucket',
  bucketDomain: 'tvp-engineer-learning-dev.s3.us-east-1.amazonaws.com',
  oacId: 'E1OAC',
  pathPattern: '/engineer/learning/ai/math/*',
  cachePolicyId: 'P1',
};

function dashboardConfig() {
  return {
    CallerReference: 'x',
    Aliases: { Quantity: 1, Items: ['dev.samsungtv.plus'] },
    DefaultRootObject: '',
    Origins: {
      Quantity: 1,
      Items: [{ Id: 'alb-origin', DomainName: 'alb.example.test', CustomOriginConfig: { HTTPPort: 80, OriginProtocolPolicy: 'http-only' } }],
    },
    DefaultCacheBehavior: {
      TargetOriginId: 'alb-origin',
      ViewerProtocolPolicy: 'redirect-to-https',
      CachePolicyId: '4135ea2d-6df8-44a3-9df3-4b5a84be39ad',
      OriginRequestPolicyId: '216adef6-5c7f-47e4-b989-5492eafa07d3',
      FunctionAssociations: { Quantity: 1, Items: [{ FunctionARN: FUNCTION_ARN, EventType: 'viewer-request' }] },
    },
    CacheBehaviors: { Quantity: 0 },
    Comment: 'Engineer Dashboard: IP allowlist at the edge, ALB origin',
    Enabled: true,
  };
}

const withoutCourseKeys = (config) => Object.fromEntries(
  Object.entries(config).filter(([key]) => key !== 'Origins' && key !== 'CacheBehaviors'),
);

describe('withCourse', () => {
  it('adds the origin and the behaviour, counts them, and changes nothing else', () => {
    const before = dashboardConfig();
    const after = withCourse(before, course);
    expect(after.Origins.Quantity).toBe(2);
    expect(after.Origins.Items[0]).toBe(before.Origins.Items[0]);
    expect(after.Origins.Items[1]).toEqual(courseOrigin(course));
    expect(after.CacheBehaviors).toEqual({ Quantity: 1, Items: [courseBehaviour({ ...course, functionArn: FUNCTION_ARN })] });
    expect(withoutCourseKeys(after)).toEqual(withoutCourseKeys(dashboardConfig()));
    expect(after.DefaultCacheBehavior).toBe(before.DefaultCacheBehavior);
  });

  it('is idempotent, and replaces a stale copy of either rather than adding a second', () => {
    const once = withCourse(dashboardConfig(), course);
    expect(withCourse(once, course)).toEqual(once);
    const stale = dashboardConfig();
    stale.Origins = { Quantity: 2, Items: [...stale.Origins.Items, { Id: 'course-bucket', DomainName: 'old.example.test' }] };
    stale.CacheBehaviors = { Quantity: 1, Items: [{ PathPattern: course.pathPattern, TargetOriginId: 'course-bucket', Compress: false }] };
    expect(withCourse(stale, course)).toEqual(once);
  });

  it('refuses a configuration whose default behaviour runs no viewer-request function', () => {
    const bare = dashboardConfig();
    bare.DefaultCacheBehavior.FunctionAssociations = { Quantity: 0 };
    expect(() => withCourse(bare, course)).toThrow(/no viewer-request function/);
  });
});

describe('courseOrigin', () => {
  it('is an S3 origin behind the access control, with no origin path and no legacy identity', () => {
    expect(courseOrigin(course)).toEqual({
      Id: 'course-bucket',
      DomainName: 'tvp-engineer-learning-dev.s3.us-east-1.amazonaws.com',
      OriginPath: '',
      CustomHeaders: { Quantity: 0 },
      S3OriginConfig: { OriginAccessIdentity: '' },
      OriginAccessControlId: 'E1OAC',
      ConnectionAttempts: 3,
      ConnectionTimeout: 10,
      OriginShield: { Enabled: false },
    });
  });
});

describe('courseBehaviour', () => {
  const behaviour = courseBehaviour({ ...course, functionArn: FUNCTION_ARN });

  it('redirects to HTTPS, allows GET, HEAD and OPTIONS, compresses, and runs the same function', () => {
    expect(behaviour.PathPattern).toBe('/engineer/learning/ai/math/*');
    expect(behaviour.TargetOriginId).toBe('course-bucket');
    expect(behaviour.ViewerProtocolPolicy).toBe('redirect-to-https');
    expect(behaviour.AllowedMethods).toEqual({
      Quantity: 3, Items: ['GET', 'HEAD', 'OPTIONS'], CachedMethods: { Quantity: 2, Items: ['GET', 'HEAD'] },
    });
    expect(behaviour.Compress).toBe(true);
    expect(behaviour.FunctionAssociations).toEqual({
      Quantity: 1, Items: [{ FunctionARN: FUNCTION_ARN, EventType: 'viewer-request' }],
    });
  });

  it('uses the course cache policy and no origin request or response headers policy', () => {
    expect(behaviour.CachePolicyId).toBe('P1');
    expect(behaviour).not.toHaveProperty('OriginRequestPolicyId');
    expect(behaviour).not.toHaveProperty('ResponseHeadersPolicyId');
    expect(behaviour).not.toHaveProperty('ForwardedValues');
  });
});

describe('defaultViewerRequestFunction', () => {
  it('reads the function the default behaviour runs', () => {
    expect(defaultViewerRequestFunction(dashboardConfig())).toBe(FUNCTION_ARN);
  });
});
