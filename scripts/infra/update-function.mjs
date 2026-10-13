import { readFileSync } from 'node:fs';
import {
  aws, awsWrite, describeAws, fail, parseFlags, showDiff, snapshotPath, writeSnapshot,
} from './aws.mjs';
import {
  DENIED_ADDRESS, EDGE_SIZE_LIMIT, firstAllowedAddress, functionChecks, mismatch, runLocally, spliceRouting,
} from './function-source.mjs';
import { readCourseRoutingSource } from './load-course-routing.mjs';
import { BASE_PATH, FUNCTION_NAME } from './targets.mjs';

/** describe-function answers for the DEVELOPMENT stage unless a stage is named. */
function describeStage(profile, stage) {
  const args = ['cloudfront', 'describe-function', '--name', FUNCTION_NAME];
  if (stage !== undefined) args.push('--stage', stage);
  return aws(profile, args);
}

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const { profile } = flags;

  const live = describeStage(profile, 'LIVE');
  const development = describeStage(profile);
  if (live.ETag !== development.ETag) {
    fail(`DEVELOPMENT (${development.ETag}) differs from LIVE (${live.ETag}): unpublished work would be lost. If an earlier run of this script left its candidate there, run the restore command that run printed (update-function with the saved LIVE snapshot); otherwise publish or discard the work first.`);
  }
  const functionConfig = JSON.stringify(live.FunctionSummary.FunctionConfig);

  const snapshot = snapshotPath(`${FUNCTION_NAME}-live.js`);
  aws(profile, ['cloudfront', 'get-function', '--name', FUNCTION_NAME, '--stage', 'LIVE', snapshot]);
  const liveSource = readFileSync(snapshot, 'utf8');
  console.log(`Saved the LIVE source (${Buffer.byteLength(liveSource)} bytes, ETag ${live.ETag}) to ${snapshot}`);

  const combined = spliceRouting(liveSource, readCourseRoutingSource());
  const size = Buffer.byteLength(combined);
  if (size > EDGE_SIZE_LIMIT) fail(`The combined source is ${size} bytes, over the ${EDGE_SIZE_LIMIT} byte limit.`);
  const candidate = writeSnapshot(`${FUNCTION_NAME}-candidate.js`, combined);
  console.log(`Candidate source (${size} bytes) at ${candidate}. Diff against LIVE:`);
  showDiff(snapshot, candidate);

  const checks = functionChecks({ allowed: firstAllowedAddress(liveSource), denied: DENIED_ADDRESS, basePath: BASE_PATH });
  for (const check of checks) {
    const problem = mismatch(runLocally(combined, check.event), check.expect);
    if (problem !== null) fail(`Local rehearsal "${check.name}" failed: ${problem}`);
  }
  console.log(`All ${checks.length} checks pass locally.`);

  const restore = describeAws(profile, [
    'cloudfront', 'update-function', '--name', FUNCTION_NAME, '--if-match', '<current ETag from describe-function>',
    '--function-config', functionConfig, '--function-code', `fileb://${snapshot}`,
  ]);
  const restoreNote = `Restore: ${restore}, then publish-function --name ${FUNCTION_NAME} --if-match <the ETag update-function returns>`;

  const update = [
    'cloudfront', 'update-function', '--name', FUNCTION_NAME, '--if-match', development.ETag,
    '--function-config', functionConfig, '--function-code', `fileb://${candidate}`,
  ];

  if (flags.dryRun) {
    console.log(`Would update ${FUNCTION_NAME}, run the ${checks.length} checks on DEVELOPMENT, and publish.`);
    console.log(describeAws(profile, update));
    console.log(`${describeAws(profile, [
      'cloudfront', 'test-function', '--name', FUNCTION_NAME, '--if-match', '<ETag from update-function>',
      '--stage', 'DEVELOPMENT', '--event-object', 'fileb://<event file>',
    ])} (${checks.length} times, one per check)`);
    console.log(describeAws(profile, [
      'cloudfront', 'publish-function', '--name', FUNCTION_NAME, '--if-match', '<ETag from update-function>',
    ]));
    console.log(restoreNote);
    return;
  }

  try {
    const { ETag: etag } = awsWrite(flags, update);

    for (const check of checks) {
      const eventFile = writeSnapshot(`event-${slug(check.name)}.json`, JSON.stringify(check.event));
      const { TestResult: result } = aws(profile, [
        'cloudfront', 'test-function', '--name', FUNCTION_NAME, '--if-match', etag, '--stage', 'DEVELOPMENT',
        '--event-object', `fileb://${eventFile}`,
      ]);
      if (result.FunctionErrorMessage) {
        fail(`"${check.name}" threw on DEVELOPMENT: ${result.FunctionErrorMessage}\nLIVE is unchanged. ${restoreNote}`);
      }
      const problem = mismatch(JSON.parse(result.FunctionOutput), check.expect);
      if (problem !== null) fail(`"${check.name}" failed on DEVELOPMENT: ${problem}\nLIVE is unchanged. ${restoreNote}`);
      console.log(`${check.name}: ok (${result.ComputeUtilization}% of the compute budget)`);
    }

    awsWrite(flags, ['cloudfront', 'publish-function', '--name', FUNCTION_NAME, '--if-match', etag]);
    console.log(`Published ${FUNCTION_NAME}. ${restoreNote}`);
  } catch (error) {
    console.error(restoreNote);
    throw error;
  }
}

if (process.argv[1]?.endsWith('update-function.mjs')) await main();
