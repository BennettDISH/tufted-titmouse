import { z } from 'zod';
import { ContentNode } from './contentNode.js';

/**
 * A content document — authored trees in relational form: root pointers plus an id-keyed
 * `nodes` map (persisted as one `project_nodes` table). This is the load-boundary shape
 * the renderer consumes.
 *
 * A document can hold SEVERAL top-level trees (`rootIds`) — one project, many sites —
 * each publishable at its own address. `rootId` remains as the FIRST root so every
 * existing consumer (players, published snapshots, scoped previews) keeps working: those
 * are always single-root documents where the two fields agree.
 *
 * The refinement enforces referential integrity loudly at parse time: every root must
 * exist, and every `childIds` reference must resolve to a real node — so a broken tree
 * fails here, not silently mid-render.
 *
 * @typedef {object} ContentDocument
 */
export const ContentDocument = z
  .object({
    rootId: z.string().min(1).nullable().optional(),
    rootIds: z.array(z.string().min(1)).optional(),
    nodes: z.record(z.string(), ContentNode).default({}),
  })
  .strict()
  .superRefine((doc, ctx) => {
    for (const rootId of docRoots(doc)) {
      if (!doc.nodes[rootId]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `root "${rootId}" is not present in nodes`,
          path: ['rootIds'],
        });
      }
    }
    for (const [id, node] of Object.entries(doc.nodes)) {
      for (const childId of node.childIds) {
        if (!doc.nodes[childId]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `node "${id}" references a missing child "${childId}"`,
            path: ['nodes', id, 'childIds'],
          });
        }
      }
    }
  });

/** The document's top-level trees, whichever field carries them (single-root docs only set rootId). */
export function docRoots(doc) {
  if (Array.isArray(doc?.rootIds)) return doc.rootIds;
  return doc?.rootId ? [doc.rootId] : [];
}

/** Both root fields present and agreeing: rootId = first root. Persist/serve this shape. */
export function normalizeRoots(doc) {
  const roots = docRoots(doc);
  return { ...doc, rootId: roots[0] ?? null, rootIds: roots };
}
