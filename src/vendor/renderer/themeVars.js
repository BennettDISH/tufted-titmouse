// Resolve a library's themes into CSS custom properties for the preview/site wrapper.

const kebab = (s) =>
  String(s)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase();

/** The theme a document presents with: the active one, else the first defined, else null. */
export function getActiveTheme(library) {
  const themes = library?.themes ?? {};
  if (library?.activeThemeKey && themes[library.activeThemeKey]) return themes[library.activeThemeKey];
  const first = Object.values(themes)[0];
  return first ?? null;
}

/**
 * Flatten a theme's tokens into `--theme-*` CSS variables. Nested groups join with `-`
 * (`button.radius` → `--theme-button-radius`); strings/numbers/booleans are emitted
 * (booleans as 0/1 so CSS can branch on them); arrays are skipped.
 */
export function themeToCssVars(tokens, prefix = '--theme') {
  const vars = {};
  for (const [name, value] of Object.entries(tokens ?? {})) {
    const key = `${prefix}-${kebab(name)}`;
    if (value === null || value === undefined || Array.isArray(value)) continue;
    if (typeof value === 'object') Object.assign(vars, themeToCssVars(value, key));
    else if (typeof value === 'boolean') vars[key] = value ? '1' : '0';
    else vars[key] = String(value);
  }
  return vars;
}
