// Compose public/sample-content.json — the demo bundle the player can render standalone
// at /?src=/sample-content.json (works locally and on the deployed player). Re-run after
// changing the library or the sample document:  node scripts/make-sample.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sampleDocument } from './sample-document.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const library = JSON.parse(fs.readFileSync(path.join(here, '..', 'library', 'activities-library.json'), 'utf8'));

const bundle = {
  project: { id: 'sample', name: 'Tufted Titmouse Activities Demo' },
  library,
  document: sampleDocument,
  publishedAt: '2026-01-01T00:00:00.000Z',
};

const out = path.join(here, '..', 'public', 'sample-content.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(bundle, null, 2));
console.log(`wrote ${out} (${Object.keys(sampleDocument.nodes).length} nodes, ${Object.keys(library.entries).length} types)`);
