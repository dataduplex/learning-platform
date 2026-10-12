import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const SNAPSHOT_DIR = 'scripts/infra/.snapshots';

/** `--profile <name>` and exactly one of `--dry-run` and `--yes`. */
export function parseFlags(argv) {
  const flags = { profile: undefined, dryRun: false, yes: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') flags.dryRun = true;
    else if (arg === '--yes') flags.yes = true;
    else if (arg === '--profile' && argv[i + 1] !== undefined) {
      flags.profile = argv[i + 1];
      i += 1;
    } else throw new Error(`Unexpected argument "${arg}". Usage: --profile <name> (--dry-run | --yes)`);
  }
  if (flags.profile === undefined) throw new Error('--profile is required.');
  if (flags.dryRun === flags.yes) throw new Error('Pass exactly one of --dry-run and --yes.');
  return flags;
}

export function shellQuote(arg) {
  return /^[\w./:=@%+-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, `'\\''`)}'`;
}

/** The invocation as the shell would take it. */
export function describeAws(profile, args) {
  return ['aws', '--profile', profile, ...args].map(shellQuote).join(' ');
}

/** Runs the CLI and returns its parsed JSON output, or null when it prints nothing. Throws on a non-zero exit. */
export function aws(profile, args, { input } = {}) {
  const result = spawnSync('aws', ['--profile', profile, '--output', 'json', ...args], {
    encoding: 'utf8',
    input,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${describeAws(profile, args)}\n${result.stderr.trim()}`);
  const text = result.stdout.trim();
  return text === '' ? null : JSON.parse(text);
}

/** Prints a write, and runs it unless this is a dry run. */
export function awsWrite(flags, args) {
  console.log(`${flags.dryRun ? 'would run' : 'running'}: ${describeAws(flags.profile, args)}`);
  return flags.dryRun ? null : aws(flags.profile, args);
}

export function timestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

/** A fresh, timestamped path under the snapshot directory. */
export function snapshotPath(name, dir = SNAPSHOT_DIR) {
  mkdirSync(dir, { recursive: true });
  return join(dir, `${timestamp()}-${name}`);
}

export function writeSnapshot(name, content, dir = SNAPSHOT_DIR) {
  const path = snapshotPath(name, dir);
  writeFileSync(path, content);
  return path;
}

/** The newest snapshot whose name ends with `suffix`, or null. */
export function latestSnapshot(suffix, dir = SNAPSHOT_DIR) {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return null;
  }
  const matching = names.filter((name) => name.endsWith(suffix)).sort();
  return matching.length === 0 ? null : join(dir, matching[matching.length - 1]);
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function findByName(items, name) {
  return (items ?? []).find((item) => item.Name === name) ?? null;
}

/** Structural equality that ignores key order. */
export function sameJson(a, b) {
  return canonical(a) === canonical(b);
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function showDiff(before, after) {
  const result = spawnSync('diff', ['-u', before, after], { encoding: 'utf8' });
  console.log(result.stdout === '' ? '(no differences)' : result.stdout);
}

export function fail(message) {
  console.error(message);
  process.exit(1);
}
