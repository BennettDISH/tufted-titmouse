// The CMS ⇄ player postMessage protocol — TWO message types, nothing else
// (vue-lpp parity; the full contract is documented in docs/PLAYER-PROTOCOL.md):
//
//   player → host   { type: 'cms:ready' }
//   host → player   { type: 'cms:content', payload: { document, library }, selectedNodeId? }
//
// The host never posts before it has seen `cms:ready`; an iframe reload re-sends
// `cms:ready`, which is the whole retry mechanism. Pure JS — shared + unit-tested.

export const READY_TYPE = 'cms:ready';
export const CONTENT_TYPE = 'cms:content';

/** The player's handshake message. */
export function buildReadyMessage() {
  return { type: READY_TYPE };
}

/**
 * The host's content message. `selectedNodeId` is included only when truthy.
 *
 * @param {{ document: object, library: object | null }} payload  the SAME bundle shape the
 *   public content API serves — preview === production by construction
 * @param {string | null} [selectedNodeId]
 */
export function buildContentMessage(payload, selectedNodeId = null) {
  return {
    type: CONTENT_TYPE,
    payload,
    ...(selectedNodeId ? { selectedNodeId } : {}),
  };
}

/**
 * Host-side validation of an incoming `cms:ready` MessageEvent: exact type, exact
 * player origin, and the event source must be the embedded iframe's contentWindow
 * (rejects spoofed origins and messages from any other frame).
 *
 * @param {MessageEvent} event
 * @param {{ origin: string, source: Window | null }} expected
 */
export function isReadyEvent(event, { origin, source }) {
  return (
    event?.data?.type === READY_TYPE &&
    !!origin && event.origin === origin &&
    !!source && event.source === source
  );
}

/**
 * Player-side validation of an incoming `cms:content` MessageEvent against the CMS
 * origin it was embedded with (the `?hostOrigin=` query param).
 *
 * @param {MessageEvent} event
 * @param {string} hostOrigin
 */
export function isContentEvent(event, hostOrigin) {
  return (
    event?.data?.type === CONTENT_TYPE &&
    !!hostOrigin && event.origin === hostOrigin &&
    !!event.data.payload && typeof event.data.payload === 'object'
  );
}
