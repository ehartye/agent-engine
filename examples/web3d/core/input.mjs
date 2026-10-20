/**
 * Held keys plus one-read latches. A key that goes down and up between two frames is invisible to a
 * once-per-frame poll of `isHeld`; the latch keeps it until `clearLatches`.
 */
export function createInput() {
  const held = new Set();
  const latched = new Set();
  return {
    down(name) { held.add(name); latched.add(name); },
    up(name) { held.delete(name); },
    isHeld: (name) => held.has(name),
    /** @returns {Set<string>} a copy of the taps waiting to be read */
    takeSnapshot: () => new Set(latched),
    clearLatches(names) { if (names) for (const n of names) latched.delete(n); else latched.clear(); },
  };
}
