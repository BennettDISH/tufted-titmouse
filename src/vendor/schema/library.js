import { z } from 'zod';
import { LibraryEntry } from './libraryEntry.js';
import { PreviewConfig } from './previewConfig.js';
import { FieldDefinition } from './fieldDefinition.js';
import { ThemeDefinition } from './theme.js';

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
export const Library = z
  .object({
    id: z.string().min(1),
    key: z.string().min(1),
    label: z.string().min(1),
    description: z.string().default(''),
    version: z.string().default('1.0.0'),
    preview: PreviewConfig.default({ mode: 'inprocess' }),
    entries: z.record(z.string(), LibraryEntry).default({}),
    // Themes v1: which tokens exist (user-defined, field-machinery schema), the named themes
    // holding token values, and which theme a project presents with. Living inside the library
    // means clone-and-diverge / publish bundles carry themes with no extra persistence.
    themeSchema: z.record(z.string(), FieldDefinition).default({}),
    themes: z.record(z.string(), ThemeDefinition).default({}),
    activeThemeKey: z.string().optional(),
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

/**
 * Return a copy of `library` with one type re-keyed from `oldKey` to `newKey`: the entries map
 * key and the entry's `key` are updated in place (preserving order), and every entry's
 * `allowedChildTypeKeys` reference is repointed. Pure — callers persist + migrate content.
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
