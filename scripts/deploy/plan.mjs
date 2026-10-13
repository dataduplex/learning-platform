import { ASSET_CACHE_CONTROL, PAGE_CACHE_CONTROL } from '../infra/targets.mjs';

/**
 * The ordered steps of a deploy, as data. A `run` step is an argv with an optional
 * environment and an optional `capture`, the name under which its trimmed stdout is
 * kept for a later argv to reference as `${name}`. A `write` step creates a file. A
 * `fetch` step reads a URL back and compares its first line.
 */
export function deployPlan({ commit, deployedAt, bucket, prefix, distributionId, profile, courseUrl }) {
  const aws = (...args) => ['aws', '--profile', profile, ...args];
  const target = `s3://${bucket}/${prefix}`;
  return [
    { kind: 'run', title: 'Verify the tree at the root path', argv: ['npm', 'run', 'verify'] },
    {
      kind: 'run',
      title: 'Build with the base path',
      argv: ['npm', 'run', 'build'],
      env: { NEXT_PUBLIC_BASE_PATH: `/${prefix}` },
    },
    { kind: 'write', title: 'Stamp the build', path: 'out/version.txt', content: `${commit}\n${deployedAt}\n` },
    {
      kind: 'run',
      title: 'Upload hashed assets first, immutable for a year',
      argv: aws('s3', 'sync', 'out/_next/static', `${target}/_next/static`,
        '--cache-control', ASSET_CACHE_CONTROL),
    },
    {
      kind: 'run',
      title: 'Upload everything else, revalidated on every request, deleting stale keys',
      argv: aws('s3', 'sync', 'out', target, '--exclude', '_next/static/*',
        '--cache-control', PAGE_CACHE_CONTROL, '--delete'),
    },
    {
      kind: 'run',
      title: 'Invalidate the course paths',
      argv: aws('cloudfront', 'create-invalidation', '--distribution-id', distributionId,
        '--paths', `/${prefix}/*`, '--query', 'Invalidation.Id', '--output', 'text'),
      capture: 'invalidationId',
    },
    {
      kind: 'run',
      title: 'Wait for the invalidation to complete',
      argv: aws('cloudfront', 'wait', 'invalidation-completed', '--distribution-id', distributionId,
        '--id', '${invalidationId}'),
    },
    { kind: 'fetch', title: 'Confirm the deployed commit', url: `${courseUrl}version.txt`, firstLine: commit },
  ];
}

/** Fills `${name}` references in an argv from captured values. */
export function substitute(argv, captured) {
  return argv.map((arg) => arg.replace(/\$\{(\w+)\}/g, (_, name) => {
    if (!(name in captured)) throw new Error(`Nothing was captured as ${name}.`);
    return captured[name];
  }));
}

/** One line per step, the form a dry run prints. */
export function describeStep(step) {
  if (step.kind === 'write') return `write ${step.path} (${step.content.split('\n').filter(Boolean).length} lines)`;
  if (step.kind === 'fetch') return `fetch ${step.url} and expect its first line to be ${step.firstLine}`;
  const env = Object.entries(step.env ?? {}).map(([key, value]) => `${key}=${value} `).join('');
  const capture = step.capture === undefined ? '' : ` -> ${step.capture}`;
  return `${env}${step.argv.map(quote).join(' ')}${capture}`;
}

function quote(arg) {
  return /^[\w./:=@%+${}*-]+$/.test(arg) ? arg : `'${arg}'`;
}
