import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fail } from '../infra/aws.mjs';
import { ACCOUNT_ID, BUCKET, COURSE_URL, DISTRIBUTION_ID, PREFIX } from '../infra/targets.mjs';
import { deployPlan, describeStep, substitute } from './plan.mjs';

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const profileAt = argv.indexOf('--profile');
const profile = profileAt === -1 ? undefined : argv[profileAt + 1];
if (profile === undefined) fail('Usage: npm run deploy -- --profile <name> [--dry-run]');

/** Runs a command for its trimmed output; a non-zero exit is an error. */
function output(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.error) fail(result.error.message);
  if (result.status !== 0) fail(`${command} ${args.join(' ')} failed:\n${result.stderr}`);
  return result.stdout.trim();
}

const version = output('aws', ['--version']);
if (!/^aws-cli\/2\./.test(version)) fail(`The deploy needs AWS CLI v2; found "${version}".`);
const account = output('aws', ['--profile', profile, 'sts', 'get-caller-identity', '--query', 'Account', '--output', 'text']);
if (account !== ACCOUNT_ID) fail(`Profile ${profile} is account ${account}, not ${ACCOUNT_ID}.`);
if (output('git', ['status', '--porcelain']) !== '') fail('The working tree is not clean.');
const branch = output('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
if (branch !== 'main') fail(`Deploys come from main; this is ${branch}.`);
const commit = output('git', ['rev-parse', 'HEAD']);

const plan = deployPlan({
  commit,
  deployedAt: new Date().toISOString(),
  bucket: BUCKET,
  prefix: PREFIX,
  distributionId: DISTRIBUTION_ID,
  profile,
  courseUrl: COURSE_URL,
});

if (dryRun) {
  console.log(`Plan for ${commit}:`);
  for (const step of plan) console.log(`  ${describeStep(step)}`);
  process.exit(0);
}

const captured = {};
for (const step of plan) {
  console.log(`\n== ${step.title}\n${describeStep(step)}`);
  if (step.kind === 'write') {
    writeFileSync(step.path, step.content);
    continue;
  }
  if (step.kind === 'fetch') {
    const response = await fetch(step.url, { cache: 'no-store' });
    const firstLine = (await response.text()).split('\n')[0];
    if (response.status !== 200 || firstLine !== step.firstLine) {
      fail(`${step.url} answered ${response.status} with "${firstLine}"; wanted ${step.firstLine}.`);
    }
    continue;
  }
  const [command, ...args] = substitute(step.argv, captured);
  const result = spawnSync(command, args, {
    stdio: step.capture === undefined ? 'inherit' : ['inherit', 'pipe', 'inherit'],
    encoding: 'utf8',
    env: { ...process.env, ...step.env },
  });
  if (result.status !== 0) fail(`"${step.title}" failed with exit code ${result.status}.`);
  if (step.capture !== undefined) {
    captured[step.capture] = result.stdout.trim();
    console.log(`${step.capture} = ${captured[step.capture]}`);
  }
}

console.log(`\nDeployed ${commit} to ${COURSE_URL}`);
