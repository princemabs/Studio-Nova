import { createRandom, gaussian } from "../utils/math.js";

/**
 * Builds the per-particle data for the morphing sculpture.
 * Every particle gets a position in each of the five shapes plus four random values.
 */
export function createParticleData(count, seed = 11) {
  const random = createRandom(seed);

  const position = new Float32Array(count * 3); // shape 0 — nova core
  const shape1 = new Float32Array(count * 4); // galaxy
  const shape2 = new Float32Array(count * 4); // tesseract (x, y, z, w)
  const shape3 = new Float32Array(count * 4); // wave field
  const shape4 = new Float32Array(count * 4); // portal ring
  const randoms = new Float32Array(count * 4);

  const tesseract = createTesseract();

  for (let i = 0; i < count; i++) {
    const rnd = [random(), random(), random(), random()];
    randoms.set(rnd, i * 4);

    writeVec3(position, i, novaCore(random, rnd[3]));
    writeVec4(shape1, i, galaxy(random, i));
    writeVec4(shape2, i, tesseractPoint(random, tesseract, i));
    writeVec4(shape3, i, waveField(random));
    writeVec4(shape4, i, portalRing(random));
  }

  return { position, shape1, shape2, shape3, shape4, randoms };
}

function writeVec3(array, i, [x, y, z]) {
  array[i * 3] = x;
  array[i * 3 + 1] = y;
  array[i * 3 + 2] = z;
}

function writeVec4(array, i, [x, y, z, w = 0]) {
  array[i * 4] = x;
  array[i * 4 + 1] = y;
  array[i * 4 + 2] = z;
  array[i * 4 + 3] = w;
}

/* ---------- 0 · Nova core: shell + dense core + two orbit rings ---------- */
function novaCore(random, type) {
  const R = 1.85;
  // Must match the thresholds used in getShape() in the vertex shader.
  if (type > 0.93) {
    const ringB = random() > 0.5;
    const radius = (ringB ? 3.0 : 2.55) + gaussian(random) * 0.035;
    const a = random() * Math.PI * 2;
    let x = Math.cos(a) * radius;
    let y = gaussian(random) * 0.025;
    let z = Math.sin(a) * radius;
    // tilt each ring differently
    const tiltX = ringB ? -0.35 : 0.45;
    const tiltZ = ringB ? 0.55 : -0.25;
    [y, z] = [y * Math.cos(tiltX) - z * Math.sin(tiltX), y * Math.sin(tiltX) + z * Math.cos(tiltX)];
    [x, y] = [x * Math.cos(tiltZ) - y * Math.sin(tiltZ), x * Math.sin(tiltZ) + y * Math.cos(tiltZ)];
    return [x, y, z];
  }
  if (type > 0.86) {
    const r = R * 0.38 * Math.cbrt(random());
    return randomOnSphere(random, r);
  }
  const r = R * (0.965 + random() * 0.07);
  return randomOnSphere(random, r);
}

function randomOnSphere(random, radius) {
  const u = random() * 2 - 1;
  const theta = random() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return [Math.cos(theta) * s * radius, u * radius, Math.sin(theta) * s * radius];
}

/* ---------- 1 · Spiral galaxy (xz plane, tilted in the shader) ---------- */
function galaxy(random, i) {
  if (random() < 0.14) {
    return [gaussian(random) * 0.32, gaussian(random) * 0.16, gaussian(random) * 0.32, 0];
  }
  const branches = 4;
  const radius = 0.25 + Math.pow(random(), 1.45) * 3.4;
  const branchAngle = ((i % branches) / branches) * Math.PI * 2;
  const spin = radius * 1.15;
  const spread = 0.12 + radius * 0.16;
  const rx = Math.pow(random(), 2.2) * (random() < 0.5 ? 1 : -1) * spread;
  const rz = Math.pow(random(), 2.2) * (random() < 0.5 ? 1 : -1) * spread;
  const ry = gaussian(random) * 0.05 * (1.2 - radius / 4);
  return [Math.cos(branchAngle + spin) * radius + rx, ry, Math.sin(branchAngle + spin) * radius + rz, 0];
}

/* ---------- 2 · Tesseract: points along the 32 edges of a 4D cube ---------- */
function createTesseract() {
  const vertices = [];
  for (let n = 0; n < 16; n++) {
    vertices.push([n & 1 ? 1 : -1, n & 2 ? 1 : -1, n & 4 ? 1 : -1, n & 8 ? 1 : -1]);
  }
  const edges = [];
  for (let a = 0; a < 16; a++) {
    for (let b = a + 1; b < 16; b++) {
      let diff = 0;
      for (let k = 0; k < 4; k++) if (vertices[a][k] !== vertices[b][k]) diff++;
      if (diff === 1) edges.push([a, b]);
    }
  }
  return { vertices, edges };
}

function tesseractPoint(random, { vertices, edges }, i) {
  // a few particles cluster on the corners so they glow like nodes
  if (random() < 0.05) {
    const v = vertices[Math.floor(random() * vertices.length)];
    return v.map((c) => c + gaussian(random) * 0.03);
  }
  const [a, b] = edges[i % edges.length];
  const t = random();
  const va = vertices[a];
  const vb = vertices[b];
  return va.map((c, k) => c + (vb[k] - c) * t + gaussian(random) * 0.01);
}

/* ---------- 3 · Neon wave field: a round grid of glowing lines ---------- */
function waveField(random) {
  const L = 4.4;
  const lines = 34;
  for (let attempt = 0; attempt < 12; attempt++) {
    const k = Math.floor(random() * lines);
    const fixed = -L + (k / (lines - 1)) * L * 2;
    const free = -L + random() * L * 2;
    const alongX = random() < 0.5;
    const x = alongX ? free : fixed;
    const z = alongX ? fixed : free;
    if (x * x + z * z <= L * L) return [x, 0, z, 0];
  }
  return [0, 0, 0, 0];
}

/* ---------- 4 · Portal ring: bright ring + accretion disk ---------- */
function portalRing(random) {
  const roll = random();
  const a = random() * Math.PI * 2;
  if (roll < 0.6) {
    const r = 2.35 + gaussian(random) * 0.07;
    return [Math.cos(a) * r, gaussian(random) * 0.035, Math.sin(a) * r, 0.15 + random() * 0.2];
  }
  if (roll < 0.85) {
    const r = 1.25 + Math.pow(random(), 0.7) * 2.7;
    return [Math.cos(a) * r, gaussian(random) * 0.05 * (r / 3), Math.sin(a) * r, 0.45 + (r / 4) * 0.4];
  }
  const r = 1.38 + gaussian(random) * 0.03;
  return [Math.cos(a) * r, gaussian(random) * 0.02, Math.sin(a) * r, 1];
}
