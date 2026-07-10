// Pure subtree helpers for content documents (no React) — used by the Pages editor's
// clipboard and selection-scoped preview, and by per-node publishing on the server.

const clone = (value) => JSON.parse(JSON.stringify(value ?? {}));

/** Collect a subtree (node + all descendants) as a plain map, deep-cloned. */
export function collectSubtree(doc, rootId) {
  const nodes = {};
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop();
    const n = doc.nodes[id];
    if (!n) continue;
    nodes[id] = clone(n);
    for (const c of n.childIds) stack.push(c);
  }
  return nodes;
}

/**
 * A document scoped to one node: that node's subtree, with the node as the (single) root.
 * Rendering this scoped document previews exactly what the node contributes — a leaf
 * shows only its own content, a branch everything below it, a top-level node its whole
 * site. This is also the shape per-node publishing snapshots: players always receive a
 * single-root document. Returns the original document unchanged when the id is
 * absent/unknown.
 */
export function scopeDocToNode(doc, nodeId) {
  if (!doc || !nodeId || !doc.nodes?.[nodeId]) return doc;
  const nodes = collectSubtree(doc, nodeId);
  nodes[nodeId] = { ...nodes[nodeId], parentId: null };
  return { rootId: nodeId, rootIds: [nodeId], nodes };
}
