import { z } from 'zod';

/**
 * How a library's content is previewed/rendered — modeled as a per-library mode so the
 * renderer choice is never a global bet (vue-lpp's `library.preview`, generalized):
 *   - `inprocess` — the in-process React renderer in this repo. Default; ideal for
 *                   content-shaped libraries. Preview === production, no second deploy.
 *   - `hosted`    — an external runtime player loaded in an iframe and fed the content
 *                   over postMessage (vue-lpp's approach). For heavy, app-shaped libraries.
 *
 * @typedef {('inprocess'|'hosted')} PreviewMode
 */
export const PreviewMode = z.enum(['inprocess', 'hosted']);

/**
 * The preview configuration carried on a {@link Library}. `targetUrl` / `embedPath` only
 * apply to `hosted`; an `inprocess` library needs neither.
 *
 * @typedef {object} PreviewConfig
 */
export const PreviewConfig = z
  .object({
    mode: PreviewMode.default('inprocess'),
    targetUrl: z.string().optional(),
    embedPath: z.string().default('/?embed=1'),
  })
  .strict()
  .superRefine((cfg, ctx) => {
    if (cfg.mode === 'hosted' && !cfg.targetUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'hosted preview requires a `targetUrl`',
        path: ['targetUrl'],
      });
    }
  });
