// The renderer library (plan §2.4, layer 3 of §6): walks a relational content document,
// validates each node against its library entry (plan §4.4), looks up `editor.typeKey` in
// the registry, and renders it and its children recursively. Depends only on React + the
// shapes / validation — no editor or harness imports — so it stays cleanly extractable as
// the future `@<scope>/visual-renderer` package.
//
// This is the COMPLETE consumer surface: everything a site or player needs to render a
// published `{ document, library }` bundle with full fidelity — the recursive walk, the
// generic fallback, theme CSS-var application (ThemedDocument / themeVars), and the
// theme-sourced value merge (themeValues, applied inside renderNode automatically).

export { renderNode, RenderDocument } from './renderNode.jsx';
export { default as GenericNode } from './GenericNode.jsx';
export { default as ThemedDocument } from './ThemedDocument.jsx';
export { getActiveTheme, themeToCssVars } from './themeVars.js';
export { resolveTypeValues, optionsFromThemeToken } from './themeValues.js';
