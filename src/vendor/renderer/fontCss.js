// Turn a library's `fonts` list into loadable CSS. Pure string-building (no DOM), so the
// same output serves SSR, the editor preview, and every hosted player. ThemedDocument
// injects the result in a <style> tag — one implementation, fonts everywhere.

const FORMATS = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' };

/** `format(...)` hint from a URL's extension; unknown extensions omit the hint. */
function formatOf(url) {
  const ext = String(url).split(/[?#]/)[0].split('.').pop()?.toLowerCase();
  return FORMATS[ext] ?? null;
}

/** Family names and urls land inside quoted CSS strings — strip the characters that
 *  could break out of them. */
const cssString = (s) => String(s).replace(/["\\\n\r]/g, '');
const cssUrl = (s) => String(s).replace(/[)"'\s\\]/g, encodeURIComponent);

/**
 * CSS that loads every font in the list: `@import` for stylesheet sources (they must come
 * first — CSS ignores later @imports), then one `@font-face` per uploaded file.
 *
 * @param {Array<import('../schema/library.js').FontDefinition>} fonts
 * @returns {string} CSS text ('' when there is nothing to load)
 */
export function fontCss(fonts) {
  const imports = [];
  const faces = [];
  for (const font of fonts ?? []) {
    if (!font?.family) continue;
    if (font.source === 'stylesheet') {
      if (font.url) imports.push(`@import url("${cssUrl(font.url)}");`);
      continue;
    }
    for (const file of font.files ?? []) {
      if (!file?.url) continue;
      const fmt = formatOf(file.url);
      faces.push(
        [
          '@font-face {',
          `  font-family: "${cssString(font.family)}";`,
          `  src: url("${cssUrl(file.url)}")${fmt ? ` format("${fmt}")` : ''};`,
          file.weight ? `  font-weight: ${cssString(file.weight)};` : null,
          file.style ? `  font-style: ${cssString(file.style)};` : null,
          '  font-display: swap;',
          '}',
        ]
          .filter(Boolean)
          .join('\n')
      );
    }
  }
  return [...imports, ...faces].join('\n');
}

/** The registered family names, for pickers/suggestions in theming UIs. */
export function fontFamilies(fonts) {
  return (fonts ?? []).map((f) => f?.family).filter(Boolean);
}

/** A ready-to-use CSS font-family value for one registered font (family + its fallback). */
export function fontStack(font) {
  if (!font?.family) return '';
  const family = /[^a-zA-Z0-9-]/.test(font.family) ? `"${cssString(font.family)}"` : font.family;
  return font.fallback ? `${family}, ${font.fallback}` : family;
}
