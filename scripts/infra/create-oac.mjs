import { aws, awsWrite, describeAws, fail, findByName, parseFlags } from './aws.mjs';
import { OAC_NAME } from './targets.mjs';

export function oacConfig(name) {
  return {
    Name: name,
    Description: 'CloudFront reads the course export from its private bucket',
    SigningProtocol: 'sigv4',
    SigningBehavior: 'always',
    OriginAccessControlOriginType: 's3',
  };
}

export function listedOacs(listing) {
  return listing?.OriginAccessControlList?.Items ?? [];
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const listing = aws(flags.profile, ['cloudfront', 'list-origin-access-controls']);
  const existing = findByName(listedOacs(listing), OAC_NAME);
  if (existing !== null) {
    console.log(`Origin access control ${OAC_NAME} exists: ${existing.Id}. Nothing to do.`);
    return;
  }
  const created = awsWrite(flags, [
    'cloudfront', 'create-origin-access-control',
    '--origin-access-control-config', JSON.stringify(oacConfig(OAC_NAME)),
  ]);
  const id = created?.OriginAccessControl?.Id ?? '<id>';
  if (created !== null) console.log(`Created ${OAC_NAME}: ${id}`);
  const restore = describeAws(flags.profile, [
    'cloudfront', 'delete-origin-access-control', '--id', id, '--if-match', '<ETag from get-origin-access-control>',
  ]);
  console.log(`Restore: ${restore}`);
}

if (process.argv[1]?.endsWith('create-oac.mjs')) await main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
