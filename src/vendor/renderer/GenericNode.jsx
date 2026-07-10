import React from 'react';

// A generic, schema-driven preview for content types that have no dedicated component.
// It renders a node's authored data (recursively for groups/lists) so anything you build
// is visible — even before a real renderer component exists for it. Self-contained styles.

const S = {
  card: { border: '1px dashed #94a3b8', borderRadius: 8, padding: '0.6rem 0.85rem', margin: '0.5rem 0', background: '#fff' },
  head: { display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.35rem' },
  type: { fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b' },
  name: { fontSize: 13, fontWeight: 600, color: '#0f172a' },
  field: { display: 'flex', gap: '0.5rem', fontSize: 13, padding: '0.1rem 0', alignItems: 'flex-start' },
  label: { color: '#64748b', minWidth: 90, flexShrink: 0 },
  value: { color: '#0f172a', whiteSpace: 'pre-wrap', minWidth: 0 },
  empty: { color: '#cbd5e1' },
  group: { borderLeft: '2px solid #e2e8f0', paddingLeft: '0.6rem' },
  list: { margin: '0.1rem 0', paddingLeft: '1.1rem' },
  swatch: (c) => ({ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: c, border: '1px solid #cbd5e1', verticalAlign: 'middle', marginRight: 4 }),
  img: { maxWidth: 180, maxHeight: 120, borderRadius: 6, display: 'block' },
};

function Value({ field, value }) {
  const type = field?.type;

  if (type === 'object' || (!type && value && typeof value === 'object' && !Array.isArray(value))) {
    const fields = field?.fields ?? {};
    const entries = Object.entries(value ?? {});
    if (!entries.length) return <span style={S.empty}>(empty)</span>;
    return (
      <div style={S.group}>
        {entries.map(([k, v]) => (
          <div style={S.field} key={k}>
            <span style={S.label}>{fields[k]?.label ?? k}</span>
            <span style={S.value}><Value field={fields[k]} value={v} /></span>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'array' || (!type && Array.isArray(value))) {
    const items = Array.isArray(value) ? value : [];
    if (!items.length) return <span style={S.empty}>(none)</span>;
    const itemField = field?.itemSchema ? { type: 'object', fields: field.itemSchema } : { type: field?.itemType };
    return <ol style={S.list}>{items.map((it, i) => <li key={i}><Value field={itemField} value={it} /></li>)}</ol>;
  }

  if (type === 'boolean' || typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>;
  if (type === 'image' && value) return <img style={S.img} src={String(value)} alt="" />;
  if (type === 'video' && value) return <video style={S.img} src={String(value)} controls preload="metadata" />;
  if (type === 'file' && value) return <a href={String(value)} target="_blank" rel="noreferrer">{String(value).split('/').pop()}</a>;
  if (type === 'color' && value) return <span><span style={S.swatch(String(value))} />{String(value)}</span>;
  if (value === undefined || value === null || value === '') return <span style={S.empty}>—</span>;
  return <span>{String(value)}</span>;
}

export default function GenericNode({ node, entry, data: mergedData, renderChildren }) {
  const schema = entry?.schema ?? {};
  const data = mergedData ?? node.editor?.data ?? {};
  const names = Object.keys(schema).length ? Object.keys(schema) : Object.keys(data);
  return (
    <div style={S.card}>
      <div style={S.head}>
        <span style={S.type}>{entry?.label ?? node.editor.typeKey}</span>
        {node.name ? <span style={S.name}>{node.name}</span> : null}
      </div>
      {names.map((name) => {
        const field = schema[name];
        if (field?.hidden) return null;
        return (
          <div style={S.field} key={name}>
            <span style={S.label}>{field?.label ?? name}</span>
            <span style={S.value}><Value field={field} value={data[name]} /></span>
          </div>
        );
      })}
      {renderChildren()}
    </div>
  );
}
