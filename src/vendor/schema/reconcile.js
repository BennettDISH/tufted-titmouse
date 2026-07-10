// Reconcile content data to a schema (a field-name → definition map): keep declared fields
// (recursing into nested groups/lists/component slots), default any missing ones, and drop
// undeclared keys. Used both to seed new nodes from a template and to migrate existing content
// after a schema change, so content JSON stays valid as the schema evolves. Pure JS — safe on
// server + client.

/** The theme-sourced subset of a schema (top-level only — nested fields can't be theme-sourced). */
export function themeFieldsOf(fields) {
  return Object.fromEntries(Object.entries(fields ?? {}).filter(([, f]) => f?.themeField));
}

/** A component slot's starting value: the pinned kind (or first allowed), seeded from that
 *  entry's template when the components map is on hand. The stack guard stops a component
 *  that (transitively) embeds itself from recursing forever — the cycle seeds empty. */
function expandComponent(key, inner, options) {
  const comp = options?.components?.[key];
  const stack = options?._componentStack ?? [];
  if (!comp || stack.includes(key)) return inner;
  const nested = { ...options, _componentStack: [...stack, key] };
  return reconcileData(comp.schema ?? {}, inner, nested);
}

function defaultComponentValue(field, options) {
  const key = field.componentKey ?? field.allowedComponents?.[0] ?? '';
  const comp = options?.components?.[key];
  return { componentKey: key, data: expandComponent(key, comp?.template ?? {}, options) };
}

export function defaultForField(field, options) {
  switch (field.type) {
    case 'number': return 0;
    case 'boolean': return false;
    case 'enum': return field.options?.[0]?.value ?? '';
    case 'array': return [];
    case 'object': return reconcileData(field.fields ?? {}, {}, options);
    case 'component': return defaultComponentValue(field, options);
    default: return ''; // string / text / richtext / image / video / audio / file / color
  }
}

function reconcileValue(field, value, options) {
  if (field.type === 'object') {
    const obj = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return reconcileData(field.fields ?? {}, obj, options);
  }
  if (field.type === 'array') {
    const items = Array.isArray(value) ? value : [];
    if (field.itemSchema) {
      return items.map((it) => reconcileData(field.itemSchema, it && typeof it === 'object' && !Array.isArray(it) ? it : {}, options));
    }
    return items; // primitive items — kept as-is
  }
  if (field.type === 'component') {
    const obj = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const componentKey = typeof obj.componentKey === 'string' && obj.componentKey ? obj.componentKey : (field.componentKey ?? field.allowedComponents?.[0] ?? '');
    const inner = obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data) ? obj.data : {};
    // With the components map, the slot's data reconciles to that entry's schema (so a
    // component's schema can evolve too); without it the authored data passes through.
    return { componentKey, data: expandComponent(componentKey, inner, options) };
  }
  // scalar — keep the existing value; a genuine wrong-type value is still caught by validation
  return value;
}

/**
 * @param {Record<string, any>} fields  the schema (field name → field definition)
 * @param {Record<string, any>} source  existing data, or a template, to draw values from
 * @param {{ dropThemeFields?: boolean, components?: Record<string, any> }} [options]
 *   dropThemeFields: omit theme-sourced fields from the output — used ONLY at node-data
 *   boundaries (their values live per-theme, resolved at render). Templates must NOT drop
 *   them: the template value is the theme fallback tier.
 *   components: the library's entries map, so component slots reconcile/seed against the
 *   referenced entry's schema + template.
 * @returns {Record<string, any>} a data object containing exactly the schema's keys
 */
export function reconcileData(fields, source = {}, options = {}) {
  const { dropThemeFields = false } = options;
  const s = source && typeof source === 'object' ? source : {};
  const out = {};
  for (const [name, field] of Object.entries(fields ?? {})) {
    if (dropThemeFields && field?.themeField) continue;
    out[name] = name in s ? reconcileValue(field, s[name], options) : defaultForField(field, options);
  }
  return out;
}
