/**
 * "Ready" means drawn, not loaded. Some renderers mount after the assets load, so a flag set on load reports an
 * unknown backend and zero draw calls. Require the model assembled, the backend identified and two frames drawn.
 */
export function isReady({ assembled, backend, framesDrawn }) {
  return Boolean(assembled) && Boolean(backend) && backend !== 'unknown' && framesDrawn >= 2;
}

/**
 * Plain-data probe for tests and a verifier: copied on demand, no live objects, so it is safe to serialise
 * from `page.evaluate`. Install it before the UI framework mounts.
 * @param {{ session: any, versions: Record<string,string>, read: () => { assembled?: boolean, backend?: string, [k: string]: unknown } }} opts
 */
export function createProbe({ session, versions, read }) {
  return {
    snapshot() {
      const extra = read();
      const framesDrawn = session.framesDrawn;
      return JSON.parse(JSON.stringify({
        versions, steps: session.steps, framesDrawn, drawCalls: session.drawCalls,
        ready: isReady({ assembled: extra.assembled, backend: extra.backend, framesDrawn }),
        ...extra,
      }));
    },
  };
}

/** A zero-warning console gate: returns the messages that are not on the allow list. */
export function consoleGate(messages, allowed = []) {
  return messages.filter((m) => !allowed.some((a) => (a instanceof RegExp ? a.test(m) : m.includes(a))));
}
