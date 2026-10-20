// The rules, with no renderer and no UI framework: a ship that flies along its nose, shots that sweep through targets.
// Every view (React Three Fiber, Babylon.js) reads `state` and draws it.
import { createSession } from './session.mjs';
import { noseDirection, steer } from './flight.mjs';
import { segmentSphereHit } from './sweep.mjs';
import { mulberry32 } from './rng.mjs';

export const SHIP_SPEED = 20;  // m/s along the nose
export const SHOT_SPEED = 120; // m/s
export const SHOT_RADIUS = 0.3;
const SHOT_LIFE = 3;           // s

const clonePose = (p) => ({ position: [...p.position], yaw: p.yaw, pitch: p.pitch });

/** @param {{ seed?: number, targets?: { c: number[], r: number }[], count?: number }} opts */
export function createGame({ seed = 1, targets, count = 40 } = {}) {
  const rng = mulberry32(seed);
  const rocks = (targets ?? Array.from({ length: count }, () => ({
    c: [(rng() - 0.5) * 200, (rng() - 0.5) * 60, 60 + rng() * 400], r: 2 + rng() * 6,
  }))).map((t) => ({ ...t, alive: true }));
  const state = {
    ship: { position: [0, 0, 0], yaw: 0, pitch: 0 }, prev: null, shots: [], rocks, fired: 0, hits: 0,
  };
  state.prev = clonePose(state.ship);

  const session = createSession({
    onStep(dt, { held, taps }) {
      state.prev = clonePose(state.ship);
      const pitch = (held('down') ? 1 : 0) - (held('up') ? 1 : 0); // pitch > 0 is nose down
      const yaw = (held('right') ? 1 : 0) - (held('left') ? 1 : 0); // yaw > 0 turns toward +X
      const steered = steer(state.ship, { pitch, yaw }, dt);
      const nose = noseDirection(steered);
      state.ship = { ...steered, position: steered.position.map((v, i) => v + nose[i] * SHIP_SPEED * dt) };
      if (taps.has('fire')) {
        state.fired++;
        state.shots.push({ p: [...state.ship.position], v: nose.map((n) => n * SHOT_SPEED), life: SHOT_LIFE });
      }
      for (const s of state.shots) {
        const next = s.p.map((v, i) => v + s.v[i] * dt);
        for (const rock of rocks) {
          if (rock.alive && segmentSphereHit(s.p, next, rock.c, rock.r + SHOT_RADIUS) !== null) {
            rock.alive = false; s.life = 0; state.hits++; break;
          }
        }
        s.p = next; s.life -= dt;
      }
      state.shots = state.shots.filter((s) => s.life > 0);
    },
  });
  return { session, state };
}
