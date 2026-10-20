/**
 * Fixed-step accumulator. `advance(dt, onStep)` runs zero or more steps of `step` seconds and returns how many ran.
 * `alpha` (0 to 1) is how far the next step has progressed: draw at `lerp(previous, current, alpha)`.
 * A display faster than the step runs no step on most frames (144 Hz over a 60 Hz step: 7 of 12 frames).
 */
export function createFixedLoop({ step = 1 / 60, maxSteps = 5 } = {}) {
  const EPS = 1e-9;
  let acc = 0;
  return {
    step,
    get alpha() { return Math.min(1, Math.max(0, acc / step)); },
    advance(dt, onStep) {
      acc += dt;
      let n = 0;
      while (acc >= step - EPS && n < maxSteps) { onStep(step); acc -= step; n++; }
      if (acc >= step) acc %= step; // drop the backlog after a long stall instead of spiralling
      return n;
    },
  };
}
