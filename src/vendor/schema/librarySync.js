// Library re-sync: move STRUCTURE (entries + themeSchema — the type system) between a
// global library and a project's snapshot, in either direction, without touching the
// PROJECT-OWNED parts (themes/activeThemeKey = branding, preview = deployment target,
// label/description = local naming, id/key/version = identity). Pure JS — the entire
// decision surface lives here so it is unit-testable; server/store.js orchestrates.

import { reconcileData } from './reconcile.js';

const json = (v) => JSON.stringify(v ?? null);

/**
 * Key-level structural diff between two libraries' entries + themeSchema.
 * Both sides are expected to be Zod-normalized (anything read from storage is), so
 * JSON comparison is order-stable for shape noise and order-SENSITIVE where order is
 * persisted product state (field order — Trap 1; entry order — type cards).
 *
 * @param {import('./library.js').Library} from  the side being updated (e.g. the project snapshot)
 * @param {import('./library.js').Library} to    the side providing structure (e.g. the global)
 * @returns {{
 *   addedTypes: string[], removedTypes: string[], changedTypes: string[],
 *   orderChanged: boolean, themeSchemaChanged: boolean, identical: boolean,
 * }}
 */
export function diffLibraryStructure(from, to) {
  const a = from?.entries ?? {};
  const b = to?.entries ?? {};
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  const aSet = new Set(aKeys);
  const bSet = new Set(bKeys);

  const addedTypes = bKeys.filter((k) => !aSet.has(k));
  const removedTypes = aKeys.filter((k) => !bSet.has(k));
  const changedTypes = bKeys.filter((k) => aSet.has(k) && json(a[k]) !== json(b[k]));
  // A pure reorder (same keys, different sequence) must not read as "in sync".
  const sharedA = aKeys.filter((k) => bSet.has(k));
  const sharedB = bKeys.filter((k) => aSet.has(k));
  const orderChanged = json(sharedA) !== json(sharedB);
  const themeSchemaChanged = json(from?.themeSchema ?? {}) !== json(to?.themeSchema ?? {});

  return {
    addedTypes,
    removedTypes,
    changedTypes,
    orderChanged,
    themeSchemaChanged,
    identical:
      !addedTypes.length && !removedTypes.length && !changedTypes.length &&
      !orderChanged && !themeSchemaChanged,
  };
}

/**
 * Per-type sync status for a project snapshot vs its source global — drives the type-card
 * badges. 'insync' = identical to global, 'differs' = forked here or updated in global
 * (indistinguishable without history; both mean "Update replaces local"), 'local' = only
 * in this snapshot. Types only in the GLOBAL are not statuses here (no card to badge) —
 * read them off diffLibraryStructure().addedTypes.
 *
 * @returns {Record<string, 'insync' | 'differs' | 'local'>}
 */
export function typeSyncStatus(local, global) {
  const l = local?.entries ?? {};
  const g = global?.entries ?? {};
  const statuses = {};
  for (const key of Object.keys(l)) {
    statuses[key] = !g[key] ? 'local' : json(l[key]) !== json(g[key]) ? 'differs' : 'insync';
  }
  return statuses;
}

/**
 * Graft `source`'s structure onto `target`: entries + themeSchema move; everything
 * project-owned stays `target`'s. The target's themes' token VALUES are reconciled to
 * the incoming themeSchema (new tokens defaulted, removed tokens dropped) — in BOTH
 * sync directions, so nobody ends up with tokens their schema no longer declares.
 * `typeValues` are left as-is: stale entries are inert at render, and Theme Studio
 * reconciles them lazily (the rekey philosophy — don't destroy dormant data).
 *
 * @param {import('./library.js').Library} target
 * @param {import('./library.js').Library} source
 * @returns {import('./library.js').Library} a new library; inputs are not mutated
 */
export function applyStructure(target, source) {
  const themeSchema = source?.themeSchema ?? {};
  const themes = {};
  for (const [k, theme] of Object.entries(target?.themes ?? {})) {
    themes[k] = { ...theme, tokens: reconcileData(themeSchema, theme.tokens ?? {}) };
  }
  return {
    ...target,
    entries: source?.entries ?? {},
    themeSchema,
    themes,
  };
}

/**
 * Type keys referenced by content but absent from `entries` — the pull safety gate.
 * A pull that removes a content-used type would make the renderer throw for the whole
 * document, so the server refuses when this is non-empty.
 *
 * @param {Record<string, unknown>} entries
 * @param {Array<string | null | undefined>} usedTypeKeys
 * @returns {string[]}
 */
export function missingContentTypes(entries, usedTypeKeys) {
  const have = new Set(Object.keys(entries ?? {}));
  const missing = [];
  for (const key of usedTypeKeys ?? []) {
    if (key && !have.has(key) && !missing.includes(key)) missing.push(key);
  }
  return missing;
}
