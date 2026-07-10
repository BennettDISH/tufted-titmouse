// Refresh src/vendor/ from a local content-platform checkout. The vendored modules are
// the CMS's pure core (schemas, validation, renderer, protocol) — the player renders with
// EXACTLY the code the editor previews with, so the two can't drift in behavior, only in
// vintage. Re-run this after the CMS core changes; review the diff like any other change.
//
//   node scripts/sync-vendor.mjs [path-to-content-platform]   (default: ../content-platform)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const source = path.resolve(root, process.argv[2] ?? '../content-platform');
const vendorDir = path.join(root, 'src', 'vendor');

const COPY = [
  'src/schema',
  'src/validation',
  'src/renderer',
  'src/embed/protocol.js',
];

if (!fs.existsSync(path.join(source, 'src', 'schema'))) {
  console.error(`content-platform not found at ${source}`);
  process.exit(1);
}

fs.rmSync(vendorDir, { recursive: true, force: true });
for (const rel of COPY) {
  const from = path.join(source, rel);
  const to = path.join(vendorDir, rel.replace(/^src[\\/]/, ''));
  fs.cpSync(from, to, { recursive: true });
  console.log(`vendored ${rel}`);
}

const stamp = `Vendored from content-platform on ${new Date().toISOString()}\nSource: ${COPY.join(', ')}\nRefresh with: npm run sync-vendor\n`;
fs.writeFileSync(path.join(vendorDir, 'VENDORED.txt'), stamp);
console.log('done — review the git diff before committing.');
