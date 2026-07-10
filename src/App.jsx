import React, { useEffect, useState } from 'react';
import ThemedDocument from './vendor/renderer/ThemedDocument.jsx';
import { buildReadyMessage, isContentEvent } from './vendor/embed/protocol.js';
import { registry } from './registry.js';

// The player runtime. Three ways in, identical rendering (docs/PLAYER-PROTOCOL.md in the
// content-platform repo is the contract):
//   /p/<slug-or-id>                 the published SITE — fetch that project's bundle from the CMS
//   /?src=<public content URL>      standalone — fetch a published bundle from an explicit URL
//   /?embed=1&hostOrigin=<cms>      embedded — cms:ready handshake, render pushed drafts
// Everything under src/vendor/ is the CMS's own pure core (synced, not rewritten), so
// the editor preview and the deployed site cannot disagree about rendering semantics.

// The CMS this player serves content for (override per-deploy with VITE_CMS_URL).
const CMS_URL = (import.meta.env.VITE_CMS_URL || 'https://content-platform-production-4c97.up.railway.app').replace(/\/$/, '');
// Optional: a project slug/id this deployment serves at its ROOT — set VITE_DEFAULT_PROJECT
// when a player is dedicated to one site (client custom domains: clientx.com/ = their site).
const DEFAULT_PROJECT = import.meta.env.VITE_DEFAULT_PROJECT || '';

/** Render failures stay visible in-frame — the protocol has no error channel. */
class PlayerBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) this.setState({ error: null });
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '1rem', fontFamily: 'monospace', fontSize: 13, color: '#b3261e', whiteSpace: 'pre-wrap' }}>
          <strong>Player render error</strong>
          {'\n'}{this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}

const note = (text) => (
  <div style={{ padding: '1.2rem', fontFamily: 'system-ui, sans-serif', fontSize: 14, color: '#5c6b6d' }}>{text}</div>
);

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const hostOrigin = params.get('hostOrigin') ?? '';
  // Pretty per-project URLs: /p/<slug-or-id> resolves against the CMS public content API;
  // a bare / falls back to this deployment's default project (if configured).
  const pathMatch = window.location.pathname.match(/^\/p\/([^/]+)\/?$/);
  const identifier = pathMatch?.[1] ?? (window.location.pathname === '/' && !hostOrigin ? DEFAULT_PROJECT : '');
  const src =
    params.get('src') ??
    (identifier ? `${CMS_URL}/api/public/projects/${encodeURIComponent(identifier)}/content` : '');

  const [bundle, setBundle] = useState(null); // { document, library, selectedNodeId? }
  const [status, setStatus] = useState(hostOrigin ? 'waiting' : src ? 'loading' : 'idle');

  // Embedded mode: handshake with the CMS host, render every pushed payload.
  useEffect(() => {
    if (!hostOrigin) return undefined;
    function onMessage(event) {
      if (!isContentEvent(event, hostOrigin)) return;
      setBundle({
        document: event.data.payload.document,
        library: event.data.payload.library ?? null,
        selectedNodeId: event.data.selectedNodeId ?? null,
      });
      setStatus('ready');
    }
    window.addEventListener('message', onMessage);
    window.parent.postMessage(buildReadyMessage(), hostOrigin);
    return () => window.removeEventListener('message', onMessage);
  }, [hostOrigin]);

  // Standalone mode: fetch a published bundle (the CMS public content API shape).
  useEffect(() => {
    if (hostOrigin || !src) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json = await res.json();
        if (cancelled) return;
        if (!json?.document) throw new Error('response has no document');
        setBundle({ document: json.document, library: json.library ?? null, selectedNodeId: null });
        if (json.project?.name) document.title = json.project.name; // the tab reads as the site
        setStatus('ready');
      } catch (err) {
        if (!cancelled) {
          setBundle(null);
          setStatus(`error: could not load content from ?src= (${err.message})`);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [hostOrigin, src]);

  if (!bundle) {
    if (status === 'waiting') return note('Waiting for content from the editor…');
    if (status === 'loading') return note('Loading content…');
    if (status.startsWith('error')) return note(status);
    return note('No content source. Open with ?src=<public content URL> or embed from the editor.');
  }
  if (!bundle.document?.rootId) return note('This project has no content yet.');

  return (
    <PlayerBoundary resetKey={bundle.document}>
      <ThemedDocument
        doc={bundle.document}
        registry={registry}
        library={bundle.library}
        selectedNodeId={bundle.selectedNodeId}
        className="player-themed"
      />
    </PlayerBoundary>
  );
}
