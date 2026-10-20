/**
 * Axis conventions for a flight game that loads glTF models into a three.js-style scene (right-handed, +Y up).
 * - A glTF model nose points down +Z; a camera with no rotation looks down -Z.
 * - pitch > 0 is nose down; yaw > 0 turns the nose toward +X.
 * Write these down once and share them between the app, its tests and the verifier's own steering code.
 */
export const NOSE = [0, 0, 1];

/** Unit vector the nose points along. */
export function noseDirection({ yaw, pitch }) {
  return [Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
}

/**
 * The same orientation as a quaternion [x, y, z, w] (yaw about +Y, then pitch about the local X; right-handed).
 * Copy it straight into `quaternion` (three.js) or `rotationQuaternion` (Babylon.js with `useRightHandedSystem`):
 * no conjugate, no axis swap.
 */
export function orientation({ yaw, pitch }) {
  const [sy, cy, sp, cp] = [Math.sin(yaw / 2), Math.cos(yaw / 2), Math.sin(pitch / 2), Math.cos(pitch / 2)];
  // q = qYaw * qPitch, qYaw = [0, sy, 0, cy], qPitch = [sp, 0, 0, cp]
  return [cy * sp, sy * cp, -sy * sp, cy * cp];
}

/** Rotate vector v by quaternion q = [x, y, z, w]. */
export function qRotate(q, v) {
  const [x, y, z, w] = q;
  const t = [2 * (y * v[2] - z * v[1]), 2 * (z * v[0] - x * v[2]), 2 * (x * v[1] - y * v[0])];
  return [v[0] + w * t[0] + (y * t[2] - z * t[1]), v[1] + w * t[1] + (z * t[0] - x * t[2]), v[2] + w * t[2] + (x * t[1] - y * t[0])];
}

/** Where a camera rotated by `yaw` about +Y looks: its local -Z. Equals the nose direction only when yawed pi further. */
export function cameraLookDirection(cameraYaw) {
  return [-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw)];
}

/** Camera behind and above a ship, looking along its nose. `cameraYaw` is the rotation to give a camera object. */
export function chaseCamera(ship, distance, height) {
  const f = noseDirection(ship);
  return {
    position: [ship.position[0] - f[0] * distance, ship.position[1] - f[1] * distance + height, ship.position[2] - f[2] * distance],
    cameraYaw: ship.yaw + Math.PI,
  };
}

/** One steering step. Inputs are -1..1; rates in radians per second. */
export function steer(ship, { pitch = 0, yaw = 0 }, dt, rate = 1.5) {
  return { ...ship, pitch: ship.pitch + pitch * rate * dt, yaw: ship.yaw + yaw * rate * dt };
}

/**
 * Critically damped spring toward `target` (a SmoothDamp). Returns { value, velocity }.
 * Stable for any dt, so a camera built on it does not blow up at a slow frame or a long hit-stop.
 */
export function smoothDamp(current, target, velocity, smoothTime, dt) {
  const omega = 2 / Math.max(1e-4, smoothTime);
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target;
  const temp = (velocity + omega * change) * dt;
  return { value: target + (change + temp) * exp, velocity: (velocity - omega * temp) * exp };
}
