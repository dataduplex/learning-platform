import { describe, expect, it } from 'vitest';
import { listedOacs, oacConfig } from './create-oac.mjs';

describe('oacConfig', () => {
  it('is an S3 control that always signs with sigv4', () => {
    expect(oacConfig('oac-tvp-engineer-learning-dev')).toEqual({
      Name: 'oac-tvp-engineer-learning-dev',
      Description: 'CloudFront reads the course export from its private bucket',
      SigningProtocol: 'sigv4',
      SigningBehavior: 'always',
      OriginAccessControlOriginType: 's3',
    });
  });
});

describe('listedOacs', () => {
  it('unwraps the listing and tolerates an empty one', () => {
    const items = [{ Id: 'E1', Name: 'a' }];
    expect(listedOacs({ OriginAccessControlList: { Quantity: 1, Items: items } })).toBe(items);
    expect(listedOacs({ OriginAccessControlList: { Quantity: 0 } })).toEqual([]);
    expect(listedOacs(null)).toEqual([]);
  });
});
