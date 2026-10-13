import {
  aws, awsWrite, describeAws, fail, findByName, latestSnapshot, parseFlags, sameJson, showDiff, writeSnapshot,
} from './aws.mjs';
import { findCachePolicy } from './create-cache-policy.mjs';
import { listedOacs } from './create-oac.mjs';
import { withCourse } from './distribution-config.mjs';
import { probe } from './live-checks.mjs';
import {
  BASE_PATH, BUCKET_DOMAIN, CACHE_POLICY_NAME, DISTRIBUTION_ID, OAC_NAME, ORIGIN_ID, ORIGIN_URL,
} from './targets.mjs';

const pretty = (value) => `${JSON.stringify(value, null, 2)}\n`;

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const { profile } = flags;

  const { ETag, DistributionConfig: config } = aws(profile, ['cloudfront', 'get-distribution-config', '--id', DISTRIBUTION_ID]);
  const snapshot = writeSnapshot(`distribution-${DISTRIBUTION_ID}.json`, pretty(config));
  writeSnapshot(`distribution-${DISTRIBUTION_ID}.etag`, `${ETag}\n`);
  console.log(`Saved the current configuration (ETag ${ETag}) to ${snapshot}`);

  // The first measurement is the one check-live.mjs compares against, so later runs keep it.
  const existingPin = latestSnapshot('dashboard-root.json');
  if (existingPin === null) {
    const root = await probe(`${ORIGIN_URL}/`);
    const pin = writeSnapshot('dashboard-root.json', pretty({ status: root.status, location: root.location, contentType: root.contentType }));
    console.log(`Pinned GET / as ${root.status} ${root.location ?? ''} in ${pin}`);
  } else {
    console.log(`Keeping the dashboard-root pin ${existingPin}; delete it to measure again.`);
  }

  const oac = findByName(listedOacs(aws(profile, ['cloudfront', 'list-origin-access-controls'])), OAC_NAME);
  if (oac === null) fail(`No origin access control named ${OAC_NAME}: run create-oac.mjs first.`);
  const policy = findCachePolicy(aws(profile, ['cloudfront', 'list-cache-policies', '--type', 'custom']), CACHE_POLICY_NAME);
  if (policy === null) fail(`No cache policy named ${CACHE_POLICY_NAME}: run create-cache-policy.mjs first.`);

  const next = withCourse(config, {
    originId: ORIGIN_ID, bucketDomain: BUCKET_DOMAIN, oacId: oac.Id, pathPattern: `${BASE_PATH}/*`, cachePolicyId: policy.Id,
  });
  const candidate = writeSnapshot(`distribution-${DISTRIBUTION_ID}-candidate.json`, pretty(next));
  console.log('Diff against the current configuration:');
  showDiff(snapshot, candidate);
  if (sameJson(next, config)) {
    console.log('Already configured; nothing to change.');
    return;
  }

  const restore = describeAws(profile, [
    'cloudfront', 'update-distribution', '--id', DISTRIBUTION_ID,
    '--if-match', '<ETag from get-distribution-config>', '--distribution-config', `file://${snapshot}`,
  ]);
  if (flags.dryRun) {
    console.log(`Would update ${DISTRIBUTION_ID} and wait for it to deploy. Restore: ${restore}`);
    return;
  }

  awsWrite(flags, [
    'cloudfront', 'update-distribution', '--id', DISTRIBUTION_ID, '--if-match', ETag, '--distribution-config', `file://${candidate}`,
  ]);
  console.log('Accepted. Waiting for the distribution to deploy, which takes a few minutes.');
  aws(profile, ['cloudfront', 'wait', 'distribution-deployed', '--id', DISTRIBUTION_ID]);
  console.log(`Deployed. Restore: ${restore}`);
}

if (process.argv[1]?.endsWith('update-distribution.mjs')) await main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
