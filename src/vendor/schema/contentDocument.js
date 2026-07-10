import { z } from 'zod';
import { ContentNode } from './contentNode.js';

/**
 * A content document — one authored tree in relational form: a `rootId` plus an
 * id-keyed `nodes` map (later: one `project_nodes` table). This is the load-boundary
 * shape the renderer consumes.
 *
 * The refinement enforces referential integrity loudly at parse time: the root must
 * exist, and every `childIds` reference must resolve to a real node — so a broken tree
 * fails here, not silently mid-render.
 *
 * @typedef {object} ContentDocument
 */
export const ContentDocument = z
  .object({
    rootId: z.string().min(1),
    nodes: z.record(z.string(), ContentNode).default({}),
  })
  .strict()
  .superRefine((doc, ctx) => {
    if (!doc.nodes[doc.rootId]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `rootId "${doc.rootId}" is not present in nodes`,
        path: ['rootId'],
      });
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
