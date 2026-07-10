import { z } from 'zod';

/** Host/tool behavior for a node (not content). */
export const NodeSettings = z
  .object({
    locked: z.boolean().default(false),
    lockChildren: z.boolean().default(false),
  })
  .strict();

/**
 * The authored side of a node: which library entry it is, and its filled-in content.
 *   - `typeKey` — the library entry / registry key.
 *   - `data`    — the authored field values (validated against the entry's `schema`).
 *   - `mode`    — optional authoring hint, faithful to vue-lpp.
 */
export const NodeEditor = z
  .object({
    typeKey: z.string().min(1),
    data: z.record(z.string(), z.unknown()).default({}),
    mode: z.string().optional(),
  })
  .strict();

/**
 * A content node — one instance in the relational content tree (vue-lpp's universal node
 * shape). STRUCTURE and CONTENT stay separate, now by relational role:
 *   - STRUCTURE: `id`, `parentId`, `childIds` — the tree lives in id pointers, not nesting.
 *   - HOST:      `settings` (lock behavior), plus optional `meta` / `nodeType` / `facet`.
 *   - CONTENT:   `editor.data` — the authored values, fenced into the editor envelope.
 *
 * Nodes live in a {@link ContentDocument}'s flat `nodes` map; a renderer rebuilds the
 * nested view by following `childIds` (vue-lpp's "build descendants from the tree").
 *
 * @typedef {object} ContentNode
 */
export const ContentNode = z
  .object({
    id: z.string().min(1),
    parentId: z.string().nullable().default(null),
    childIds: z.array(z.string()).default([]),
    name: z.string().default(''),
    nodeType: z.string().optional(),
    facet: z.string().default('pages'),
    meta: z.record(z.string(), z.unknown()).default({}),
    settings: NodeSettings.default({ locked: false, lockChildren: false }),
    editor: NodeEditor,
  })
  .strict();
