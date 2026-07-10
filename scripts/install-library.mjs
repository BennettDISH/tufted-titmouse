// Install (or update) this player's library contract on a content-platform CMS.
// "Uploading the library" = running this. Existing projects are NOT touched — they pull
// the update from their Library tab when they want it (library re-sync).
//
//   CMS_URL=https://your-cms.example CMS_SERVICE_TOKEN=cms_st_... node scripts/install-library.mjs [--target-url https://this-player.example]
//
// --target-url sets the library's renderer URL (this player's deployed origin) so new
// projects preview through this player out of the box.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const library = JSON.parse(fs.readFileSync(path.join(here, '..', 'library', 'activities-library.json'), 'utf8'));

const CMS_URL = (process.env.CMS_URL || '').replace(/\/$/, '');
// The CMS service token (admin-level) — global library installs are admin-only.
const TOKEN = process.env.CMS_SERVICE_TOKEN || '';
if (!CMS_URL || !TOKEN) {
  console.error('Set CMS_URL and CMS_SERVICE_TOKEN env vars.');
  process.exit(2);
}

const targetFlag = process.argv.indexOf('--target-url');
if (targetFlag !== -1 && process.argv[targetFlag + 1]) {
  library.preview = { ...library.preview, mode: 'hosted', targetUrl: process.argv[targetFlag + 1] };
}
if (!library.preview?.targetUrl) {
  console.error('This library has no renderer URL yet — pass --target-url https://<deployed player origin>.');
  process.exit(2);
}

const res = await fetch(`${CMS_URL}/api/libraries/${library.id}`, {
  method: 'PUT',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(library),
});
const json = await res.json().catch(() => null);
if (!res.ok) {
  console.error(`FAILED ${res.status}:`, json?.error ?? res.statusText);
  process.exit(1);
}
console.log(`Installed "${json.library.label}" (${json.library.id}) on ${CMS_URL}`);
console.log(`Renderer URL: ${json.library.preview?.targetUrl ?? '(not set — pass --target-url)'}`);
