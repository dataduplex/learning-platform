export function courseOrigin({ originId, bucketDomain, oacId }) {
  return {
    Id: originId,
    DomainName: bucketDomain,
    OriginPath: '',
    CustomHeaders: { Quantity: 0 },
    S3OriginConfig: { OriginAccessIdentity: '' },
    OriginAccessControlId: oacId,
    ConnectionAttempts: 3,
    ConnectionTimeout: 10,
    OriginShield: { Enabled: false },
  };
}

export function courseBehaviour({ originId, pathPattern, cachePolicyId, functionArn }) {
  return {
    PathPattern: pathPattern,
    TargetOriginId: originId,
    TrustedSigners: { Enabled: false, Quantity: 0 },
    TrustedKeyGroups: { Enabled: false, Quantity: 0 },
    ViewerProtocolPolicy: 'redirect-to-https',
    AllowedMethods: {
      Quantity: 3,
      Items: ['GET', 'HEAD', 'OPTIONS'],
      CachedMethods: { Quantity: 2, Items: ['GET', 'HEAD'] },
    },
    SmoothStreaming: false,
    Compress: true,
    LambdaFunctionAssociations: { Quantity: 0 },
    FunctionAssociations: { Quantity: 1, Items: [{ FunctionARN: functionArn, EventType: 'viewer-request' }] },
    FieldLevelEncryptionId: '',
    CachePolicyId: cachePolicyId,
  };
}

/** The viewer-request function the default behaviour runs. */
export function defaultViewerRequestFunction(config) {
  const items = config.DefaultCacheBehavior?.FunctionAssociations?.Items ?? [];
  const association = items.find((item) => item.EventType === 'viewer-request');
  if (association === undefined) throw new Error('The default behaviour runs no viewer-request function.');
  return association.FunctionARN;
}

/**
 * A copy of the configuration with the course origin and behaviour in place. An
 * earlier origin with the same id or behaviour with the same pattern is replaced.
 * Every other key is the same object.
 */
export function withCourse(config, { originId, bucketDomain, oacId, pathPattern, cachePolicyId }) {
  const functionArn = defaultViewerRequestFunction(config);
  const origins = (config.Origins?.Items ?? []).filter((origin) => origin.Id !== originId);
  origins.push(courseOrigin({ originId, bucketDomain, oacId }));
  const behaviours = (config.CacheBehaviors?.Items ?? []).filter((behaviour) => behaviour.PathPattern !== pathPattern);
  behaviours.push(courseBehaviour({ originId, pathPattern, cachePolicyId, functionArn }));
  return {
    ...config,
    Origins: { Quantity: origins.length, Items: origins },
    CacheBehaviors: { Quantity: behaviours.length, Items: behaviours },
  };
}
