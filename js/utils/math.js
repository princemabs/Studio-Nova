export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export const lerp = (a, b, t) => a + (b - a) * t;

/** Frame-rate independent exponential smoothing. */
export const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt));

export const mapRange = (value, inMin, inMax, outMin, outMax, clamped = true) => {
  let t = (value - inMin) / (inMax - inMin);
  if (clamped) t = clamp(t);
  return outMin + (outMax - outMin) * t;
};

/** Deterministic pseudo random generator (mulberry32) — keeps shapes stable between reloads. */
export const createRandom = (seed = 1) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Approximate gaussian (Box–Muller) using the provided random source. */
export const gaussian = (random) => {
  const u = Math.max(random(), 1e-6);
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
