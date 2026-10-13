import { aws, awsWrite, describeAws, fail, parseFlags } from './aws.mjs';
import { CACHE_POLICY_NAME } from './targets.mjs';

/** The objects' own Cache-Control decides; nothing from the viewer reaches the key or the bucket. */
export function cachePolicyConfig(name) {
  return {
    Name: name,
    Comment: 'Course export: origin Cache-Control decides; no headers, cookies or query strings in the key',
    MinTTL: 0,
    DefaultTTL: 0,
    MaxTTL: 31536000,
    ParametersInCacheKeyAndForwardedToOrigin: {
      EnableAcceptEncodingGzip: true,
      EnableAcceptEncodingBrotli: true,
      HeadersConfig: { HeaderBehavior: 'none' },
      CookiesConfig: { CookieBehavior: 'none' },
      QueryStringsConfig: { QueryStringBehavior: 'none' },
    },
  };
}

/** The summary of the policy named `name` in a list-cache-policies listing, or null. */
export function findCachePolicy(listing, name) {
  const items = listing?.CachePolicyList?.Items ?? [];
  const found = items.find((item) => item.CachePolicy?.CachePolicyConfig?.Name === name);
  return found === undefined ? null : found.CachePolicy;
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const listing = aws(flags.profile, ['cloudfront', 'list-cache-policies', '--type', 'custom']);
  const existing = findCachePolicy(listing, CACHE_POLICY_NAME);
  if (existing !== null) {
    console.log(`Cache policy ${CACHE_POLICY_NAME} exists: ${existing.Id}. Nothing to do.`);
    return;
  }
  const created = awsWrite(flags, [
    'cloudfront', 'create-cache-policy', '--cache-policy-config', JSON.stringify(cachePolicyConfig(CACHE_POLICY_NAME)),
  ]);
  const id = created?.CachePolicy?.Id ?? '<id>';
  if (created !== null) console.log(`Created ${CACHE_POLICY_NAME}: ${id}`);
  const restore = describeAws(flags.profile, [
    'cloudfront', 'delete-cache-policy', '--id', id, '--if-match', '<ETag from get-cache-policy>',
  ]);
  console.log(`Restore: ${restore}`);
}

if (process.argv[1]?.endsWith('create-cache-policy.mjs')) await main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
