import { z } from 'zod';

/**
 * Build a Zod validator for one field definition's VALUE. Recursive for the structured
 * kinds (`object` → nested fields, `array` → items, `enum` → options, `component` → the
 * referenced entry's schema).
 *
 * @param {import('../schema/fieldDefinition.js').FieldDefinition} field
 * @param {Record<string, { schema?: object }>} [components] library entries, for resolving
 *   component slots — optional so library-blind callers still get shape validation.
 */
function fieldToZod(field, components) {
  switch (field.type) {
    case 'string':
    case 'text':
    case 'richtext':
    case 'image':
    case 'video':
    case 'audio':
    case 'file':
    case 'color':
      return z.string();
    case 'number':
      return z.number();
    case 'boolean':
      return z.boolean();
    case 'enum': {
      // Theme-sourced options can't be known statically — accept any string (the editor
      // constrains choices; drift here is a content concern, not a type error).
      if (field.optionsFromToken) return z.string();
      const values = (field.options ?? []).map((o) => o.value);
      return values.length ? z.enum(values) : z.never();
    }
    case 'object':
      return buildObjectSchema(field.fields ?? {}, undefined, components);
    case 'array':
      // Array of objects (itemSchema) or of primitives (itemType).
      if (field.itemSchema) return z.array(buildObjectSchema(field.itemSchema, undefined, components));
      return z.array(fieldToZod({ type: field.itemType ?? 'string' }, components));
    case 'component':
      // A slot holding a reusable entry: { componentKey, data }. With the components map
      // available the inner data validates against that entry's schema; without it the
      // shape alone is enforced (library-blind callers).
      return z
        .object({
          componentKey: z.string(),
          data: z.record(z.string(), z.unknown()).default({}),
        })
        .strict()
        .superRefine((value, ctx) => {
          const compSchema = components?.[value.componentKey]?.schema;
          if (!compSchema) return;
          const result = buildObjectSchema(compSchema, value.data ?? {}, components).safeParse(value.data ?? {});
          if (!result.success) {
            for (const issue of result.error.issues) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue.message, path: ['data', ...issue.path] });
            }
          }
        });
    default:
      return z.unknown();
  }
}

/** Whether a field is actually shown: not hidden or theme-sourced, and any showWhen met.
 *  A themeField's value lives per-theme, never in node data — so it is never required here. */
function isActive(field, data) {
  if (field.hidden || field.themeField) return false;
  if (field.showWhen?.field) return (field.showWhen.values ?? []).includes(data?.[field.showWhen.field]);
  return true;
}

/**
 * Build a strict object schema from a field map: undeclared keys are rejected (drift
 * safeguard, plan §4.4), and a field is enforced as REQUIRED only when it's actually
 * shown — not hidden, and any showWhen condition satisfied (Trap 7: "required when
 * visible"). When `data` is omitted (nested schemas), `required` is taken at face value.
 *
 * @param {Record<string, import('../schema/fieldDefinition.js').FieldDefinition>} fields
 * @param {Record<string, unknown>} [data] node data, used to evaluate field visibility
 * @param {Record<string, { schema?: object }>} [components] library entries for component slots
 */
function buildObjectSchema(fields, data, components) {
  const shape = {};
  for (const [name, field] of Object.entries(fields)) {
    let valueSchema = fieldToZod(field, components);
    const required = field.required && (data === undefined || isActive(field, data));
    if (!required) valueSchema = valueSchema.optional();
    shape[name] = valueSchema;
  }
  return z.object(shape).strict();
}

/**
 * Validate a node's authored `editor.data` against its library entry's `schema` at
 * render time (plan §4.4 — the one required safeguard). Throws a loud, clear error on
 * drift: an undeclared field, a missing required field, or a wrong value type.
 *
 * Pass `components` (the library's entries map) when available so component slots
 * deep-validate against their entry's schema; without it slots check shape only.
 *
 * @param {{
 *   node: import('../schema/contentNode.js').ContentNode,
 *   entry: import('../schema/libraryEntry.js').LibraryEntry,
 *   components?: Record<string, { schema?: object }>,
 * }} args
 */
export function validateNodeData({ node, entry, components }) {
  const data = node.editor?.data ?? {};
  const dataSchema = buildObjectSchema(entry.schema ?? {}, data, components);
  const result = dataSchema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  • ${issue.path.join('.') || '(data)'}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Content drift in node "${node.id}" (type "${node.editor.typeKey}"):\n${issues}`
    );
  }
}
