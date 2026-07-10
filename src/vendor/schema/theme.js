import { z } from 'zod';

/**
 * One named theme — a set of token VALUES conforming to the library's `themeSchema`
 * (which tokens exist is user-defined, edited in the Theme Studio's schema pane).
 * Tokens resolve to CSS custom properties (`--theme-*`) on the preview/site wrapper.
 *
 * @typedef {object} ThemeDefinition
 */
export const ThemeDefinition = z
  .object({
    key: z.string().min(1),
    label: z.string().min(1),
    tokens: z.record(z.string(), z.unknown()).default({}),
    // Stage 2: per-type values for themeField-flagged schema fields —
    // { [typeKey]: { [fieldName]: value } }. Resolved at render with
    // `theme.typeValues[typeKey][name] ?? entry.template[name] ?? default`.
    typeValues: z.record(z.string(), z.record(z.string(), z.unknown())).default({}),
  })
  .strict();
