// Resolve theme-sourced field values (stage 2). A schema field flagged `themeField: true`
// has no value in node data — its value lives per-theme per-type in
// `theme.typeValues[typeKey][fieldName]`. The renderer merges the resolved map OVER node
// data, so content JSON can never shadow the theme. Site consumers of the published bundle
// must do the same merge (or use this module).

import { themeFieldsOf, defaultForField } from '../schema/reconcile.js';
import { getActiveTheme } from './themeVars.js';

/**
 * Resolve the theme-sourced values for one content type under the library's active theme.
 * Fallback chain per field (vue-lpp parity — `??`, so '' and 0 are real values):
 *   activeTheme.typeValues[typeKey][name]  ??  entry.template[name]  ??  defaultForField(field)
 *
 * Only the schema's themeField subset is walked, so stale keys in `typeValues` (a deleted
 * field, an un-flagged field) are inert.
 *
 * @param {import('../schema/library.js').Library} library
 * @param {string} typeKey
 * @returns {Record<string, unknown>} fieldName → resolved value ({} when nothing to resolve)
 */
export function resolveTypeValues(library, typeKey) {
  const entry = library?.entries?.[typeKey];
  const fields = themeFieldsOf(entry?.schema);
  const names = Object.keys(fields);
  if (!names.length) return {};

  const theme = getActiveTheme(library);
  const themed = theme?.typeValues?.[typeKey] ?? {};
  const template = entry?.template ?? {};

  const out = {};
  for (const name of names) {
    out[name] = themed[name] ?? template[name] ?? defaultForField(fields[name]);
  }
  return out;
}

/**
 * Resolve an enum's options from a theme token (an array token in the active theme).
 * Accepts entries as strings or `{ value, label? }` objects; anything else is skipped.
 *
 * @param {import('../schema/library.js').Library} library
 * @param {string} tokenName  top-level key in the active theme's `tokens`
 * @returns {Array<{ value: string, label?: string }>}
 */
export function optionsFromThemeToken(library, tokenName) {
  const token = getActiveTheme(library)?.tokens?.[tokenName];
  if (!Array.isArray(token)) return [];
  const options = [];
  for (const item of token) {
    if (typeof item === 'string') options.push({ value: item });
    else if (item && typeof item === 'object' && typeof item.value === 'string') {
      options.push({ value: item.value, ...(item.label ? { label: String(item.label) } : {}) });
    }
  }
  return options;
}
