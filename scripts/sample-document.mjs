// The demo document: one node of every type in the (currently stub) personal library.
// Used by make-sample.mjs (writes public/sample-content.json for /?src=/sample-content.json)
// and render-check.jsx (SSR sanity). Keep it exercising every type in the library — when a
// personal activity gets ported, add it here.

const node = (id, parentId, typeKey, name, data, childIds = []) => ({
  id, parentId, childIds, name, facet: 'pages', meta: {},
  settings: { locked: false, lockChildren: false },
  editor: { typeKey, data },
});

export const sampleDocument = {
  rootId: 'root',
  nodes: {
    root: node('root', null, 'activitySet', 'Demo set', {
      title: 'Tufted Titmouse Sandbox',
      intro: 'The personal activity pack. Client-grade activities live in kingfisher; the wild experiments land here.',
    }),
  },
};
