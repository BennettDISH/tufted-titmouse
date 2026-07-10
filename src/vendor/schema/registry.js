import { z } from 'zod';

/**
 * A render component — the React component a node's `editor.typeKey` resolves to (plan
 * §2.4). In real projects this lives OUTSIDE the tool, in a GitHub repo; here it's the
 * shape the in-process renderer expects of every registry entry.
 *
 * The renderer calls a component with a single props object:
 *   - every field from the node's `editor.data`, spread as individual props, and
 *   - `renderChildren` — a zero-arg helper that renders this node's children (resolved
 *     from `childIds` against the document).
 *
 * Zod can only assert "is a component" structurally; the prop contract is upheld by
 * convention + the field-validation contract (Step 3). `z.custom` lets the component
 * pass through untouched.
 *
 * @typedef {(props: Record<string, unknown> & { renderChildren: () => import('react').ReactNode }) => import('react').ReactNode} RenderComponent
 */
export const RenderComponent = z.custom(
  (value) => typeof value === 'function' || (typeof value === 'object' && value !== null),
  {
    message:
      'registry entry must be a React component (a function, or a memo/forwardRef component object)',
  }
);

/**
 * The component registry — the bridge from type keys to React components (plan §2.4):
 * a map from a `typeKey` to the component that renders nodes of that type. A node whose
 * `typeKey` is absent is a loud error, not a silent blank.
 *
 * @typedef {Record<string, RenderComponent>} Registry
 */
export const Registry = z.record(z.string(), RenderComponent);
