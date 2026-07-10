import React from 'react';
import { RenderDocument } from './renderNode.jsx';
import { getActiveTheme, themeToCssVars } from './themeVars.js';

/**
 * RenderDocument inside the library's active theme: tokens become `--theme-*` CSS
 * variables on the wrapper, exactly as every consumer (editor preview, the reference
 * player, any deployed site) must apply them. Use this instead of RenderDocument
 * unless you are supplying your own theming surface.
 *
 * @param {{
 *   doc: import('../schema/contentDocument.js').ContentDocument,
 *   registry: import('../schema/registry.js').Registry,
 *   library?: import('../schema/library.js').Library | null,
 *   selectedNodeId?: string | null,
 *   className?: string,
 * }} props
 */
export default function ThemedDocument({ doc, registry, library = null, selectedNodeId = null, className = 'preview-themed' }) {
  const theme = getActiveTheme(library);
  return (
    <div className={className} style={theme ? themeToCssVars(theme.tokens) : undefined}>
      <RenderDocument doc={doc} registry={registry} library={library} selectedNodeId={selectedNodeId} />
    </div>
  );
}
