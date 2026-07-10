// The authoritative data shapes for the platform (plan §2; relational model adopted
// from vue-lpp). Each shape has one definition here — a documented Zod schema that
// doubles as its runtime validator. Everything downstream imports from this barrel.

export { FieldType, FieldOption, FieldDefinition } from './fieldDefinition.js';
export { LibraryEntry } from './libraryEntry.js';
export { Library, FontDefinition, findEntry, rekeyLibraryType } from './library.js';
export { diffLibraryStructure, applyStructure, missingContentTypes } from './librarySync.js';
export { ThemeDefinition } from './theme.js';
export { PreviewMode, PreviewConfig } from './previewConfig.js';
export { ContentNode, NodeSettings, NodeEditor } from './contentNode.js';
export { ContentDocument, docRoots, normalizeRoots } from './contentDocument.js';
export { Registry, RenderComponent } from './registry.js';
