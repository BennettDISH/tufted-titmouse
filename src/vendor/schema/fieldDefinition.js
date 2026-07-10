import { z } from 'zod';

/**
 * The kinds a schema field can be. Scalars cover the common cases; `enum`, `array`,
 * and `object` make the schema recursive so a field can describe structured content.
 *
 * @typedef {('string'|'text'|'richtext'|'number'|'boolean'|'image'|'video'|'file'|'color'|'enum'|'array'|'object')} FieldType
 */
export const FieldType = z.enum([
  'string', 'text', 'richtext', 'number', 'boolean', 'image', 'video', 'file', 'color', 'enum', 'array', 'object',
]);

/** Primitive item type for an `array` of simple values. */
export const ItemType = z.enum(['string', 'text', 'number', 'color', 'boolean']);

/** One selectable choice for an `enum` field. */
export const FieldOption = z
  .object({
    value: z.string(),
    label: z.string().optional(),
  })
  .strict();

/** Conditional visibility: show the field only when `field`'s value is one of `values`. */
export const ShowWhen = z
  .object({
    field: z.string(),
    values: z.array(z.union([z.string(), z.number(), z.boolean()])),
  })
  .strict();

/**
 * A single schema field — one entry in a library entry's `schema` map. It describes a
 * field's shape and how the content editor should present it, never a value:
 *   - `type`            — the field kind (see {@link FieldType}).
 *   - `label` / `hint` / `placeholder` — editor presentation.
 *   - `required`        — a node's `data` must supply it.
 *   - `readOnly`        — shown disabled in the content editor.
 *   - `hidden`          — omitted from the content editor (still valid in the data/renderer).
 *   - `editorTab`       — groups fields into tabs in the content editor.
 *   - `expandedByDefault` — open structured (array/object) fields on load.
 *   - `showWhen`        — conditional visibility.
 * Structured kinds extend it recursively:
 *   - `enum`   → `options`,
 *   - `array`  → `itemType` (primitive items) OR `itemSchema` (object items),
 *   - `object` → `fields`.
 *
 * @typedef {object} FieldDefinition
 */
export const FieldDefinition = z.lazy(() =>
  z
    .object({
      type: FieldType,
      label: z.string().optional(),
      hint: z.string().optional(),
      placeholder: z.string().optional(),
      required: z.boolean().default(false),
      readOnly: z.boolean().default(false),
      hidden: z.boolean().optional(),
      editorTab: z.string().optional(),
      expandedByDefault: z.boolean().optional(),
      showWhen: ShowWhen.optional(),
      // Theme-sourced field (stage 2): the value lives per-theme per-type
      // (ThemeDefinition.typeValues[typeKey][fieldName]), not in node data. Hidden from the
      // content editor, edited in Theme Studio, resolved at render (renderer/themeValues.js).
      themeField: z.boolean().optional(),
      options: z.array(FieldOption).optional(), // enum
      optionsFromToken: z.string().optional(), // enum options sourced from a theme token (array)
      itemType: ItemType.optional(), // array of primitives
      itemSchema: z.record(z.string(), FieldDefinition).optional(), // array of objects
      fields: z.record(z.string(), FieldDefinition).optional(), // object
      // Validation rules — advisory, surfaced as editor warnings on filled-in values (never
      // render-blocking, so adding a rule can't break existing content — the Trap 3 invariant).
      minLength: z.number().int().nonnegative().optional(), // string/text/richtext
      maxLength: z.number().int().nonnegative().optional(),
      pattern: z.string().optional(), // regex the whole value must match
      patternHint: z.string().optional(), // friendly message when the pattern fails
      min: z.number().optional(), // number
      max: z.number().optional(),
      minItems: z.number().int().nonnegative().optional(), // array
      maxItems: z.number().int().nonnegative().optional(),
    })
    .strict()
    .superRefine((field, ctx) => {
      if (field.type === 'enum' && !field.optionsFromToken && !(field.options && field.options.length)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'enum field requires a non-empty `options` (or an `optionsFromToken`)', path: ['options'] });
      }
      if (field.type === 'array' && !field.itemSchema && !field.itemType) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'array field requires an `itemType` or an `itemSchema`', path: ['itemType'] });
      }
      if (field.type === 'object' && !field.fields) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'object field requires `fields`', path: ['fields'] });
      }
      if (field.pattern !== undefined) {
        try {
          new RegExp(field.pattern);
        } catch {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: '`pattern` is not a valid regular expression', path: ['pattern'] });
        }
      }
    })
);
