import { z } from 'zod';
import { LibraryEntry } from './libraryEntry.js';
import { PreviewConfig } from './previewConfig.js';
import { FieldDefinition } from './fieldDefinition.js';
import { ThemeDefinition } from './theme.js';
import { ContentDocument } from './contentDocument.js';

/**
 * A library — a bundle of node-type definitions plus how its content is rendered
 * (plan §3; vue-lpp's library pack, flattened per this build's decision). A project
 * snapshots one of these and diverges.
 *
 *   - `entries` — ALL node-type definitions under one umbrella, keyed by type key.
 *                 (Grouping into wrappers/activities/components is deferred.)
 *   - `preview` — the per-library renderer mode (see {@link PreviewConfig}).
 *
 * @typedef {object} Library
 */
/** One loadable font family: uploaded font files (→ @font-face) or a hosted stylesheet
 *  URL (→ @import, e.g. Google Fonts). `family` is the name themes reference in font
 *  tokens; `fallback` is the stack appended after it (e.g. "sans-serif"). */
export const FontDefinition = z
  .object({
    family: z.string().min(1),
    source: z.enum(['files', 'stylesheet']).default('files'),
    files: z
      .array(
        z
          .object({
            url: z.string().min(1),
            weight: z.string().optional(), // '400', '700', or a variable range '100 900'
            style: z.string().optional(), // 'normal' | 'italic'
          })
          .strict()
      )
      .optional(),
    url: z.string().optional(), // stylesheet source
    fallback: z.string().optional(),
  })
  .strict();

export const Library = z
  .object({
    id: z.string().min(1),
    key: z.string().min(1),
    label: z.string().min(1),
    description: z.string().default(''),
    version: z.string().default('1.0.0'),
    preview: PreviewConfig.default({ mode: 'inprocess' }),
    entries: z.record(z.string(), LibraryEntry).default({}),
    // Loadable fonts: design assets like themes — they live in the library so publish
    // bundles stay self-contained, and they stay put on library pull/push (design side).
    fonts: z.array(FontDefinition).default([]),
    // Themes v1: which tokens exist (user-defined, field-machinery schema), the named themes
    // holding token values, and which theme a project presents with. Living inside the library
    // means clone-and-diverge / publish bundles carry themes with no extra persistence.
    themeSchema: z.record(z.string(), FieldDefinition).default({}),
    themes: z.record(z.string(), ThemeDefinition).default({}),
    activeThemeKey: z.string().optional(),
    // Starter content: a content document new projects are seeded with (instead of starting
    // empty). Authored in a normal project, then promoted via "set as starter".
    starterDocument: ContentDocument.optional(),
  })
  .strict();

/**
 * Resolve a library entry by its type key — the lookup the field-validation contract
 * (Step 3) uses to find a node's definition.
 *
 * @param {Library} library
 * @param {string} typeKey
 * @returns {LibraryEntry | undefined}
 */
export function findEntry(library, typeKey) {
  return library?.entries?.[typeKey];
}

/** Repoint component-slot references (componentKey / allowedComponents) throughout a field
 *  map, recursing into nested groups and list item schemas. Pure; untouched maps return as-is. */
function rekeySchemaComponentRefs(fields, oldKey, newKey) {
  if (!fields) return fields;
  let changed = false;
  const out = {};
  for (const [name, field] of Object.entries(fields)) {
    let next = field;
    if (field?.componentKey === oldKey) next = { ...next, componentKey: newKey };
    if (Array.isArray(field?.allowedComponents) && field.allowedComponents.includes(oldKey)) {
      next = { ...next, allowedComponents: field.allowedComponents.map((k) => (k === oldKey ? newKey : k)) };
    }
    const nestedFields = rekeySchemaComponentRefs(field?.fields, oldKey, newKey);
    if (nestedFields !== field?.fields) next = { ...next, fields: nestedFields };
    const nestedItems = rekeySchemaComponentRefs(field?.itemSchema, oldKey, newKey);
    if (nestedItems !== field?.itemSchema) next = { ...next, itemSchema: nestedItems };
    if (next !== field) changed = true;
    out[name] = next;
  }
  return changed ? out : fields;
}

/**
 * Return a copy of `library` with one type re-keyed from `oldKey` to `newKey`: the entries map
 * key and the entry's `key` are updated in place (preserving order), and every entry's
 * `allowedChildTypeKeys` and component-slot references are repointed. Pure — callers persist
 * + migrate content.
 *
 * @param {Library} library
 * @param {string} oldKey
 * @param {string} newKey
 * @returns {Library}
 */
export function rekeyLibraryType(library, oldKey, newKey) {
  const entries = {};
  for (const [k, e] of Object.entries(library?.entries ?? {})) {
    const isTarget = k === oldKey;
    const key = isTarget ? newKey : k;
    const base = isTarget ? { ...e, key: newKey } : e;
    entries[key] = {
      ...base,
      allowedChildTypeKeys: (base.allowedChildTypeKeys ?? []).map((c) => (c === oldKey ? newKey : c)),
      schema: rekeySchemaComponentRefs(base.schema, oldKey, newKey),
    };
  }
  // Themes carry per-type values (typeValues[typeKey]) — repoint those too, or a rename
  // silently orphans the renamed type's theme styling.
  let themes = library?.themes;
  if (themes) {
    themes = Object.fromEntries(
      Object.entries(themes).map(([tk, theme]) => {
        const tv = theme?.typeValues;
        if (!tv || !(oldKey in tv)) return [tk, theme];
        const typeValues = Object.fromEntries(
          Object.entries(tv).map(([typeKey, values]) => [typeKey === oldKey ? newKey : typeKey, values])
        );
        return [tk, { ...theme, typeValues }];
      })
    );
    return { ...library, entries, themes };
  }
  return { ...library, entries };
}
