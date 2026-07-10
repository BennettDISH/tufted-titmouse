// Advisory validation rules (minLength/maxLength/pattern, min/max, minItems/maxItems).
// These check FILLED-IN values only — presence is `required`'s job, and empty values
// ('' / []) are "not filled in", so a rule never nags an untouched optional field.
// Deliberately NOT part of the render-time §4.4 contract: adding a rule to a schema must
// never break existing content (the Trap 3 invariant). The editor surfaces violations
// as inline warnings. Pure JS — safe on server + client.

/** Field kinds whose value is free text the length/pattern rules apply to. */
const TEXT_KINDS = new Set(['string', 'text', 'richtext']);

/**
 * Check one field's value against the field's validation rules.
 *
 * @param {import('../schema/fieldDefinition.js').FieldDefinition} field
 * @param {unknown} value
 * @returns {string | null} the first violation message, or null when the value passes
 */
export function ruleViolation(field, value) {
  if (!field) return null;

  if (TEXT_KINDS.has(field.type) && typeof value === 'string' && value !== '') {
    if (field.minLength !== undefined && value.length < field.minLength) {
      return `At least ${field.minLength} character${field.minLength === 1 ? '' : 's'} (currently ${value.length}).`;
    }
    if (field.maxLength !== undefined && value.length > field.maxLength) {
      return `At most ${field.maxLength} character${field.maxLength === 1 ? '' : 's'} (currently ${value.length}).`;
    }
    if (field.pattern !== undefined) {
      let re;
      try {
        re = new RegExp(`^(?:${field.pattern})$`);
      } catch {
        return null; // invalid regex is a schema problem (caught at library save), not a content one
      }
      if (!re.test(value)) return field.patternHint || `Must match pattern: ${field.pattern}`;
    }
  }

  if (field.type === 'number' && typeof value === 'number' && Number.isFinite(value)) {
    if (field.min !== undefined && value < field.min) return `Must be at least ${field.min}.`;
    if (field.max !== undefined && value > field.max) return `Must be at most ${field.max}.`;
  }

  if (field.type === 'array' && Array.isArray(value)) {
    if (field.maxItems !== undefined && value.length > field.maxItems) {
      return `At most ${field.maxItems} item${field.maxItems === 1 ? '' : 's'} (currently ${value.length}).`;
    }
    if (field.minItems !== undefined && value.length > 0 && value.length < field.minItems) {
      return `At least ${field.minItems} item${field.minItems === 1 ? '' : 's'} (currently ${value.length}).`;
    }
  }

  return null;
}

/** Whether a field definition carries any validation rule (drives editor chips/summaries). */
export function hasRules(field) {
  return ['minLength', 'maxLength', 'pattern', 'min', 'max', 'minItems', 'maxItems']
    .some((k) => field?.[k] !== undefined);
}
