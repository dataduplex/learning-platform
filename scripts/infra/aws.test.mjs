import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  describeAws, findByName, latestSnapshot, parseFlags, sameJson, shellQuote, timestamp, writeSnapshot,
} from './aws.mjs';

describe('parseFlags', () => {
  it('takes a profile and exactly one mode', () => {
    expect(parseFlags(['--profile', 'nasb-dev', '--dry-run'])).toEqual({ profile: 'nasb-dev', dryRun: true, yes: false });
    expect(parseFlags(['--yes', '--profile', 'nasb-dev'])).toEqual({ profile: 'nasb-dev', dryRun: false, yes: true });
  });

  it('refuses a missing profile, no mode, both modes, and anything unknown', () => {
    expect(() => parseFlags(['--dry-run'])).toThrow(/--profile is required/);
    expect(() => parseFlags(['--profile', 'p'])).toThrow(/exactly one/);
    expect(() => parseFlags(['--profile', 'p', '--dry-run', '--yes'])).toThrow(/exactly one/);
    expect(() => parseFlags(['--profile', 'p', '--force'])).toThrow(/Unexpected argument "--force"/);
    expect(() => parseFlags(['--profile'])).toThrow(/Unexpected argument "--profile"/);
  });
});

describe('describeAws', () => {
  it('quotes only what the shell would split or expand', () => {
    expect(shellQuote('s3://bucket/prefix')).toBe('s3://bucket/prefix');
    expect(shellQuote('public, max-age=0')).toBe("'public, max-age=0'");
    expect(shellQuote("it's")).toBe("'it'\\''s'");
    expect(describeAws('nasb-dev', ['s3api', 'put-bucket-policy', '--policy', '{"a":1}']))
      .toBe(`aws --profile nasb-dev s3api put-bucket-policy --policy '{"a":1}'`);
  });
});

describe('snapshots', () => {
  it('sort by time, so the latest is the last', () => {
    const dir = mkdtempSync(join(tmpdir(), 'snapshots-'));
    writeFileSync(join(dir, '2026-10-09T10-00-00-000Z-dashboard-root.json'), '{"status":200}');
    writeFileSync(join(dir, '2026-10-09T11-00-00-000Z-dashboard-root.json'), '{"status":302}');
    writeFileSync(join(dir, '2026-10-09T12-00-00-000Z-other.json'), '{}');
    expect(latestSnapshot('dashboard-root.json', dir)).toBe(join(dir, '2026-10-09T11-00-00-000Z-dashboard-root.json'));
    expect(latestSnapshot('nothing.json', dir)).toBeNull();
    expect(latestSnapshot('x', join(dir, 'missing'))).toBeNull();
  });

  it('write under a timestamped name', () => {
    const dir = mkdtempSync(join(tmpdir(), 'snapshots-'));
    const path = writeSnapshot('live.js', 'var x;', dir);
    expect(path).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-live\.js$/);
    expect(latestSnapshot('live.js', dir)).toBe(path);
  });

  it('stamp with a name that sorts like the time it names', () => {
    expect(timestamp(new Date('2026-10-09T12:34:56.789Z'))).toBe('2026-10-09T12-34-56-789Z');
  });
});

describe('findByName', () => {
  it('finds an item by its Name, or null', () => {
    expect(findByName([{ Name: 'a', Id: '1' }, { Name: 'b', Id: '2' }], 'b')).toEqual({ Name: 'b', Id: '2' });
    expect(findByName([{ Name: 'a' }], 'z')).toBeNull();
    expect(findByName(undefined, 'z')).toBeNull();
  });
});

describe('sameJson', () => {
  it('ignores key order and nothing else', () => {
    expect(sameJson({ a: 1, b: [{ c: 2, d: 3 }] }, { b: [{ d: 3, c: 2 }], a: 1 })).toBe(true);
    expect(sameJson({ a: 1 }, { a: '1' })).toBe(false);
    expect(sameJson([1, 2], [2, 1])).toBe(false);
  });
});
