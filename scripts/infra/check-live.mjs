import { execFileSync } from 'node:child_process';
import { fail, latestSnapshot, readJson } from './aws.mjs';
import {
  chunkCheck, firstChunkPath, fontCheck, katexFontPath, liveChecks, probe, problems, stylesheetCheck, stylesheetPath,
} from './live-checks.mjs';
import { BASE_PATH, ORIGIN_URL } from './targets.mjs';

const originAt = process.argv.indexOf('--origin');
if (originAt !== -1 && process.argv[originAt + 1] === undefined) {
  fail('--origin needs a value, for example --origin http://localhost:4322');
}
const origin = originAt === -1 ? ORIGIN_URL : process.argv[originAt + 1];
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

const rows = [];
let failed = false;

function record(name, path, status, verdict, ok) {
  rows.push({ check: name, path, status, result: verdict });
  if (!ok) failed = true;
}

async function run(check) {
  const result = await probe(`${origin}${check.path}`);
  const found = problems(check, result);
  record(check.name, check.path, result.status, found.length === 0 ? 'ok' : found.join('; '), found.length === 0);
  return result;
}

for (const check of liveChecks({ commit })) await run(check);

const page = await probe(`${origin}${BASE_PATH}/lessons/train-a-net/`);
if (page.status !== 200) {
  console.table(rows);
  fail(`The lesson page answered ${page.status}; the asset rows need a 200 page to read.`);
}
await run(chunkCheck(firstChunkPath(page.body)));
const css = await run(stylesheetCheck(stylesheetPath(page.body)));
await run(fontCheck(katexFontPath(css.body)));

const pin = latestSnapshot('dashboard-root.json');
if (pin === null) {
  record('dashboard root', '/', '-', 'no pin: update-distribution.mjs --dry-run records one', false);
} else {
  const before = readJson(pin);
  const now = await probe(`${origin}/`);
  const same = now.status === before.status && now.location === before.location;
  const verdict = same
    ? `ok, as pinned in ${pin}`
    : `was ${before.status} ${before.location ?? ''}, now ${now.status} ${now.location ?? ''}`;
  record('dashboard root', '/', now.status, verdict, same);
}
record('off-allowlist 403', `${BASE_PATH}/`, '-', 'manual: request it from an address off the allowlist', true);

console.table(rows);
process.exit(failed ? 1 : 0);
