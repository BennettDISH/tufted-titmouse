import { z } from 'zod';
import { FieldDefinition } from './fieldDefinition.js';

/**
 * A library entry — the reusable definition for one node type (vue-lpp's entry shape,
 * flattened: every entry lives in one umbrella `entries` map, keyed by `key`).
 *
 *   - `key`                  — the type string. A node references it via `editor.typeKey`,
 *                              and the registry resolves it to a component.
 *   - `allowAtRoot`          — may this type be a document's root node?
 *   - `allowedChildTypeKeys` — which type keys it may contain (replaces our old
 *                              `allowedChildren`). The nesting-rule data; enforcing it is
 *                              the tree editor's job later, not this schema's.
 *   - `schema`               — the editable fields this type carries (field name → field def).
 *   - `template`             — default `data` to seed a new node of this type.
 *
 * `category` / `nodeType` are optional, deferred-organization metadata — nothing
 * structures around them yet.
 *
 * @typedef {object} LibraryEntry
 */
export const LibraryEntry = z
  .object({
    key: z.string().min(1),
    label: z.string().min(1),
    description: z.string().default(''),
    allowAtRoot: z.boolean().default(false),
    allowedChildTypeKeys: z.array(z.string()).default([]),
    schema: z.record(z.string(), FieldDefinition).default({}),
    template: z.record(z.string(), z.unknown()).default({}),
    icon: z.string().optional(),
    category: z.string().optional(),
    nodeType: z.string().optional(),
    // Handoff notes for AI generation: what this type is for and how to fill it well
    // (e.g. "hero image should be wide and scenic; flip cards pair a question with a
    // one-sentence answer"). Lives in the library DATA so it clones/syncs with the type.
    aiGuidance: z.string().optional(),
  })
  .strict();
