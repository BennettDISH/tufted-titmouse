// SSR sanity check: render a real bundle through the actual pack + vendored renderer and
// assert the output contains what authors wrote. Catches pack crashes and wiring mistakes
// without a browser. Run with:  npm run check -- [public content URL]
// With no URL it renders scripts/sample-document.mjs (every type in the library) against
// library/activities-library.json — the same bundle make-sample.mjs publishes for browsers.

import { renderToString } from 'react-dom/server';
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ThemedDocument from '../src/vendor/renderer/ThemedDocument.jsx';
import { registry } from '../src/registry.js';
import { sampleDocument } from './sample-document.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

let bundle;
const srcUrl = process.argv[2];
if (srcUrl) {
  const res = await fetch(srcUrl);
  if (!res.ok) {
    console.error(`FAIL fetch ${srcUrl}: ${res.status}`);
    process.exit(1);
  }
  bundle = await res.json();
  console.log(`rendering live bundle: ${srcUrl}`);
} else {
  const library = JSON.parse(fs.readFileSync(path.join(here, '..', 'library', 'activities-library.json'), 'utf8'));
  bundle = { document: sampleDocument, library };
  console.log('rendering the sample document (every library type)');
}

let failures = 0;
const check = (ok, name) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failures += 1;
};

let html = '';
try {
  html = renderToString(
    <ThemedDocument doc={bundle.document} registry={registry} library={bundle.library} className="player-themed" />
  );
  check(true, 'renders without throwing');
} catch (err) {
  check(false, `renders without throwing — ${err.message}`);
  process.exit(1);
}

check(html.includes('--theme-'), 'theme tokens applied as CSS vars');

// Every library type used in the document must have a dedicated component registered —
// GenericNode fallback means the pack and library drifted apart.
const usedTypes = new Set(Object.values(bundle.document.nodes).map((n) => n.editor?.typeKey));
for (const t of usedTypes) {
  check(Boolean(registry[t]), `pack has a component for "${t}"`);
}
if (bundle.library?.entries) {
  for (const t of Object.keys(bundle.library.entries)) {
    check(usedTypes.has(t), `sample document exercises "${t}"`);
  }
}

// Every authored top-level string should appear in the output (pack components must not
// drop content). Exceptions: strings that only render after user interaction — the
// matching result messages appear after Submit.
const SKIP_FIELDS = new Set(['matching.successMessage', 'matching.partialMessage']);
const texts = [];
for (const nodeItem of Object.values(bundle.document.nodes)) {
  const typeKey = nodeItem.editor?.typeKey;
  for (const [k, v] of Object.entries(nodeItem.editor?.data ?? {})) {
    if (SKIP_FIELDS.has(`${typeKey}.${k}`)) continue;
    if (typeof v === 'string' && v.trim() && !v.startsWith('#') && !v.startsWith('http') && !v.startsWith('<')) {
      texts.push(v.split('\n')[0].slice(0, 40));
    }
  }
}
const escape = (s) => s.replace(/&/g, '&amp;').replace(/'/g, '&#x27;').replace(/"/g, '&quot;');
for (const t of texts) {
  check(html.includes(escape(t)) || html.includes(t), `output contains "${t}"`);
}

// Interaction-nested content that must be there on first paint: every matching pair,
// the first compare-slider theme's concepts and center text, the first speed-sort word.
const match1 = bundle.document.nodes.match1?.editor?.data;
for (const p of match1?.pairs ?? []) {
  check(html.includes(escape(p.source)) || html.includes(p.source), `matching shows pair source "${p.source}"`);
  const target = p.target.slice(0, 40);
  check(html.includes(escape(target)) || html.includes(target), `matching shows pair target "${target}"`);
}
const theme0 = bundle.document.nodes.slider1?.editor?.data?.themes?.[0];
if (theme0) {
  check(html.includes(escape(theme0.leftConcept)), `slider shows left concept "${theme0.leftConcept}"`);
  check(html.includes(escape(theme0.rightConcept)), `slider shows right concept "${theme0.rightConcept}"`);
  check(html.includes(escape(theme0.center.slice(0, 40))), 'slider starts on the balanced description');
}
const round0 = bundle.document.nodes.sort1?.editor?.data?.rounds?.[0];
if (round0) {
  check(html.includes(escape(round0.words[0].text)), `speed sort shows first word "${round0.words[0].text}"`);
  check(html.includes(escape(round0.leftCategory)), `speed sort shows left category "${round0.leftCategory}"`);
  check(html.includes(escape(round0.rightCategory)), `speed sort shows right category "${round0.rightCategory}"`);
}

console.log(`\n${failures === 0 ? 'ALL GREEN' : `${failures} FAILURES`} (${html.length} chars of HTML)`);
process.exit(failures ? 1 : 0);
