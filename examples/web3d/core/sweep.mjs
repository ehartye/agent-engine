/**
 * First time (0 to 1) the segment p0 -> p1 enters the sphere (center c, radius r), or null.
 * Returns 0 when p0 is already inside. Vectors are [x, y, z]. No setup, no handles, deterministic.
 */
export function segmentSphereHit(p0, p1, c, r) {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const f = [p0[0] - c[0], p0[1] - c[1], p0[2] - c[2]];
  const cc = f[0] * f[0] + f[1] * f[1] + f[2] * f[2] - r * r;
  if (cc <= 0) return 0;
  const a = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
  const b = f[0] * d[0] + f[1] * d[1] + f[2] * d[2];
  if (a === 0 || b >= 0) return null; // not moving, or moving away
  const disc = b * b - a * cc;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / a;
  return t <= 1 ? t : null;
}

/** The shortcut that tunnels: tests only where the shot ended up. */
export function endpointHit(_p0, p1, c, r) {
  const x = p1[0] - c[0], y = p1[1] - c[1], z = p1[2] - c[2];
  return x * x + y * y + z * z <= r * r;
}
