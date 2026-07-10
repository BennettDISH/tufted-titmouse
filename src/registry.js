import { activitiesPack } from './packs/activities/index.jsx';

// All packs this player serves, merged into one typeKey → component map. A type with no
// component here still renders (the vendored GenericNode draws it schema-generically),
// so authors can define new types in the CMS before the pack catches up.
export const registry = {
  ...activitiesPack,
};
