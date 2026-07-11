import React from 'react';
import { findEntry } from '../schema/library.js';
import { validateNodeData } from '../validation/validateNodeData.js';
import { resolveTypeValues } from './themeValues.js';
import { themeToCssVars } from './themeVars.js';
import GenericNode from './GenericNode.jsx';

/**
 * Render one node of a relational content document and its subtree (plan §2.4). The same
 * recursive walk runs in the editor preview and (for `inprocess` libraries) the site.
 *
 * For each node it:
 *   1. validates `editor.data` against the node's library entry schema (plan §4.4) — drift
 *      throws loudly, before anything renders;
 *   2. looks up `editor.typeKey` in the registry; if a dedicated component exists it's used,
 *      otherwise a generic, schema-driven {@link GenericNode} renders the data so any custom
 *      type/field is still visible;
 *   3. renders with `editor.data` as props + a `renderChildren` helper;
 *   4. `renderChildren()` resolves `childIds` against the document's node map and recurses.
 *
 * @param {import('../schema/contentNode.js').ContentNode} node
 * @param {{ doc: import('../schema/contentDocument.js').ContentDocument, registry: import('../schema/registry.js').Registry, library: import('../schema/library.js').Library | null }} ctx
 * @param {string} keyPath stable React key (the node id)
 */
export function renderNode(node, ctx, keyPath) {
  const { doc, registry, library } = ctx;
  const typeKey = node.editor.typeKey;

  // 1. Field-validation contract (plan §4.4).
  const entry = library ? findEntry(library, typeKey) : null;
  if (library && !entry) {
    throw new Error(`Library has no entry for type "${typeKey}" (node "${node.id}").`);
  }
  if (entry) validateNodeData({ node, entry, components: library?.entries });

  // 4. Children resolved from the flat node map by id.
  const renderChildren = () =>
    (node.childIds ?? []).map((childId) => {
      const child = doc.nodes[childId];
      if (!child) {
        throw new Error(`Node "${node.id}" references a missing child "${childId}".`);
      }
      return renderNode(child, ctx, childId);
    });

  // 2 & 3. Dedicated component if registered, else the generic schema-driven preview.
  // Theme-sourced values merge OVER node data: those keys never legitimately live in
  // content, so a stale/hand-edited key can't shadow the active theme.
  const data = { ...(node.editor.data ?? {}), ...resolveTypeValues(library, typeKey) };
  const Component = registry[typeKey];
  let rendered = Component
    ? <Component key={keyPath ?? node.id} {...data} renderChildren={renderChildren} />
    : <GenericNode key={keyPath ?? node.id} node={node} entry={entry} data={data} renderChildren={renderChildren} />;

  // Per-page theme overrides (meta.themeOverrides): re-declare the --theme-* variables on
  // a zero-layout wrapper so the override cascades this subtree only — everywhere this
  // renderer runs (editor preview, players, published sites), with the global theme intact.
  const themeOverrides = node.meta?.themeOverrides;
  if (themeOverrides && typeof themeOverrides === 'object' && Object.keys(themeOverrides).length) {
    rendered = (
      <div key={keyPath ?? node.id} style={{ display: 'contents', ...themeToCssVars(themeOverrides) }}>
        {rendered}
      </div>
    );
  }

  // Editor-selection highlight (embedded preview): a plain outlined wrapper — outline
  // doesn't shift layout, though the extra div can affect flex/grid parents (accepted
  // for preview surfaces; hosts that care render without selectedNodeId).
  if (ctx.selectedNodeId && ctx.selectedNodeId === node.id) {
    return (
      <div key={keyPath ?? node.id} data-selected-node="" style={{ outline: '2px solid #008da3', outlineOffset: 2 }}>
        {rendered}
      </div>
    );
  }
  return rendered;
}

/**
 * Render a whole relational document from its root. The recursive walk (and therefore any
 * validation throw) happens inside this component's render, so errors propagate to the
 * nearest error boundary rather than crashing the host.
 *
 * @param {{ doc: import('../schema/contentDocument.js').ContentDocument, registry: import('../schema/registry.js').Registry, library?: import('../schema/library.js').Library | null, selectedNodeId?: string | null }} props
 */
export function RenderDocument({ doc, registry, library = null, selectedNodeId = null }) {
  const root = doc.nodes[doc.rootId];
  if (!root) throw new Error(`Document rootId "${doc.rootId}" is not present in nodes.`);
  return renderNode(root, { doc, registry, library, selectedNodeId }, root.id);
}
