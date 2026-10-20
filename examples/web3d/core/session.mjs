import { createFixedLoop } from './fixed-loop.mjs';
import { createInput } from './input.mjs';

const NO_TAPS = new Set();

/**
 * The game as a plain object, outside any UI framework: one fixed-step loop, input, pause, hit-stop and the
 * counters a probe reports. A framework's per-frame hook calls `frameUpdate(delta)` once and draws at the alpha.
 *
 * - A tap is handed to the first step that runs after it. Latches are cleared only after a step ran (or while
 *   paused), so a frame that runs no step (a fast display, a hit-stop) does not lose the tap, and a tap made while
 *   a menu is open does not fire when it closes.
 * - `framesDrawn` is set by the renderer after it draws; `frameUpdate` runs before that frame is drawn.
 * - An engine that owns the fixed step (Babylon.js deterministic lockstep) calls `runStep(dt)` from its before-step
 *   hook instead, and `endFrame(delta)` once per rendered frame; the tap rules are the same.
 *
 * @param {{ step?: number, onStep: (dt: number, ctx: { held: (name: string) => boolean, taps: Set<string> }) => void }} opts
 */
export function createSession({ step = 1 / 60, onStep }) {
  const loop = createFixedLoop({ step });
  const input = createInput();
  let pending = null;    // taps for the first step of the current frame (engine-driven stepping)
  let ranThisFrame = false;
  const session = {
    loop, input, paused: false, hitStop: 0, steps: 0, framesDrawn: 0, drawCalls: 0,
    /** @returns {number} interpolation alpha for drawing */
    frameUpdate(delta) {
      if (session.hitStop > 0) { session.hitStop = Math.max(0, session.hitStop - delta); delta = 0; }
      let taps = input.takeSnapshot();
      const n = session.paused ? 0 : loop.advance(delta, (dt) => {
        onStep(dt, { held: input.isHeld, taps });
        taps = NO_TAPS; // later steps in the same frame must not see the tap again
        session.steps++;
      });
      if (n > 0 || session.paused) input.clearLatches();
      return loop.alpha;
    },
    /** One engine-owned step. Does nothing while paused or in a hit-stop. */
    runStep(dt) {
      if (session.paused || session.hitStop > 0) return;
      pending ??= input.takeSnapshot();
      onStep(dt, { held: input.isHeld, taps: pending });
      pending = NO_TAPS;
      ranThisFrame = true;
      session.steps++;
    },
    /** Once per rendered frame, after the engine's steps. */
    endFrame(delta = 0) {
      if (session.hitStop > 0) session.hitStop = Math.max(0, session.hitStop - delta);
      if (ranThisFrame || session.paused) input.clearLatches();
      pending = null; ranThisFrame = false;
    },
    /** Call after the renderer drew a frame. */
    markDrawn(renderCallCount) { session.framesDrawn = renderCallCount; },
  };
  return session;
}
