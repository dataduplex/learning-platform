import { describe, expect, it } from 'vitest';
import { cachePolicyConfig, findCachePolicy } from './create-cache-policy.mjs';

describe('cachePolicyConfig', () => {
  it('honours the origin and keys on nothing from the viewer', () => {
    const config = cachePolicyConfig('tvp-engineer-learning-course');
    expect(config.Name).toBe('tvp-engineer-learning-course');
    expect(config.Comment.length).toBeLessThanOrEqual(128);
    expect([config.MinTTL, config.DefaultTTL, config.MaxTTL]).toEqual([0, 0, 31536000]);
    expect(config.ParametersInCacheKeyAndForwardedToOrigin).toEqual({
      EnableAcceptEncodingGzip: true,
      EnableAcceptEncodingBrotli: true,
      HeadersConfig: { HeaderBehavior: 'none' },
      CookiesConfig: { CookieBehavior: 'none' },
      QueryStringsConfig: { QueryStringBehavior: 'none' },
    });
  });
});

describe('findCachePolicy', () => {
  const listing = {
    CachePolicyList: {
      Quantity: 2,
      Items: [
        { Type: 'custom', CachePolicy: { Id: 'A1', CachePolicyConfig: { Name: 'other' } } },
        { Type: 'custom', CachePolicy: { Id: 'B2', CachePolicyConfig: { Name: 'tvp-engineer-learning-course' } } },
      ],
    },
  };

  it('returns the summary of the policy with that name, or null', () => {
    expect(findCachePolicy(listing, 'tvp-engineer-learning-course')?.Id).toBe('B2');
    expect(findCachePolicy(listing, 'missing')).toBeNull();
    expect(findCachePolicy({ CachePolicyList: { Quantity: 0 } }, 'x')).toBeNull();
    expect(findCachePolicy(null, 'x')).toBeNull();
  });
});
