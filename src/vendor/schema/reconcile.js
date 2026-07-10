// Reconcile content data to a schema (a field-name → definition map): keep declared fields
// (recursing into nested groups/lists), default any missing ones, and drop undeclared keys.
// Used both to seed new nodes from a template and to migrate existing content after a schema
// change, so content JSON stays valid as the schema evolves. Pure JS — safe on server + client.

/** The theme-sourced subset of a schema (top-level only — nested fields can't be theme-sourced). */
export function themeFieldsOf(fields) {
  return Object.fromEntries(Object.entries(fields ?? {}).filter(([, f]) => f?.themeField));
}

export function defaultForField(field) {
  switch (field.type) {
    case 'number': return 0;
    case 'boolean': return false;
    case 'enum': return field.options?.[0]?.value ?? '';
    case 'array': return [];
    case 'object': return reconcileData(field.fields ?? {}, {});
    default: return ''; // string / text / richtext / image / color
  }
}

function reconcileValue(field, value) {
  if (field.type === 'object') {
    const obj = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return reconcileData(field.fields ?? {}, obj);
  }
  if (field.type === 'array') {
    const items = Array.isArray(value) ? value : [];
    if (field.itemSchema) {
      return items.map((it) => reconcileData(field.itemSchema, it && typeof it === 'object' && !Array.isArray(it) ? it : {}));
    }
    return items; // primitive items — kept as-is
  }
  // scalar — keep the existing value; a genuine wrong-type value is still caught by validation
  return value;
}

/**
 * @param {Record<string, any>} fields  the schema (field name → field definition)
 * @param {Record<string, any>} source  existing data, or a template, to draw values from
 * @param {{ dropThemeFields?: boolean }} [options]  dropThemeFields: omit theme-sourced fields
 *   from the output — used ONLY at node-data boundaries (their values live per-theme, resolved
 *   at render). Templates must NOT drop them: the template value is the theme fallback tier.
 * @returns {Record<string, any>} a data object containing exactly the schema's keys
 */
export function reconcileData(fields, source = {}, { dropThemeFields = false } = {}) {
  const s = source && typeof source === 'object' ? source : {};
  const out = {};
  for (const [name, field] of Object.entries(fields ?? {})) {
    if (dropThemeFields && field?.themeField) continue;
    out[name] = name in s ? reconcileValue(field, s[name]) : defaultForField(field);
  }
  return out;
}
