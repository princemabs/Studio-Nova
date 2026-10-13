import { simplexNoise, rotate2d } from "./noise.js";

/*
 * The "nova" sculpture: every particle stores its position in five shapes.
 * The shader morphs between any two of them (uFrom → uTo) with a per-particle
 * stagger and a burst of noise, so transitions feel organic instead of linear.
 *
 *  0 — Nova core (sphere + orbit rings)      → hero / intro
 *  1 — Spiral galaxy                         → work
 *  2 — Tesseract (4D hyper-cube)             → about
 *  3 — Neon wave field                       → services
 *  4 — Portal ring / accretion disk          → contact
 */
export const particlesVertex = /* glsl */ `
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
uniform float uFrom;
uniform float uTo;
uniform float uProgress;
uniform float uForm;
uniform float uOpacity;
uniform float uTurbulence;
uniform vec3 uMouse;
uniform float uMouseStrength;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;

attribute vec4 aShape1;
attribute vec4 aShape2;
attribute vec4 aShape3;
attribute vec4 aShape4;
attribute vec4 aRandom;

varying vec3 vColor;
varying float vAlpha;

${simplexNoise}
${rotate2d}

vec4 getShape(float id) {
  if (id < 0.5) return vec4(position, aRandom.w > 0.86 ? (aRandom.w > 0.93 ? 2.0 : 1.0) : 0.0);
  if (id < 1.5) return aShape1;
  if (id < 2.5) return aShape2;
  if (id < 3.5) return aShape3;
  return aShape4;
}

// Gives every shape its own life. "tone" is a 0–1 value used for colouring.
vec3 animateShape(float id, vec4 s, out float tone) {
  if (id < 0.5) {
    vec3 p = s.xyz;
    if (s.w > 1.5) {
      // orbit rings
      p.xz = rot2(uTime * 0.35) * p.xz;
      tone = 0.95;
    } else {
      p *= 1.0 + 0.035 * sin(uTime * 1.4 + s.y * 2.5);
      p.xz = rot2(uTime * 0.12) * p.xz;
      tone = s.w > 0.5 ? 0.1 : 0.3 + 0.4 * (s.y * 0.26 + 0.5);
    }
    return p;
  }

  if (id < 1.5) {
    // spiral galaxy: inner arms spin faster than the outer ones
    vec3 p = s.xyz;
    float r = length(p.xz);
    p.xz = rot2(uTime * 0.3 / (0.4 + r * 0.45)) * p.xz;
    p.yz = rot2(-1.0) * p.yz;
    tone = clamp(r / 3.6, 0.0, 1.0);
    return p;
  }

  if (id < 2.5) {
    // tesseract: rotate through the 4th dimension, then project to 3D
    vec4 p = s;
    p.xw = rot2(uTime * 0.36) * p.xw;
    p.yw = rot2(uTime * 0.23) * p.yw;
    p.xz = rot2(uTime * 0.1) * p.xz;
    float k = 1.0 / (2.35 - p.w);
    tone = clamp(p.w * 0.5 + 0.5, 0.0, 1.0);
    return p.xyz * k * 1.75;
  }

  if (id < 3.5) {
    // neon wave field — a grid rippling like the screen in the hero film
    vec3 p = s.xyz;
    float t = uTime * 0.9;
    float h = sin(p.x * 0.9 + t) * 0.3
            + cos(p.z * 1.1 + t * 0.8) * 0.22
            + sin((p.x + p.z) * 0.55 - t * 1.25) * 0.18;
    p.y += h;
    p.yz = rot2(-0.5) * p.yz;
    tone = clamp(h * 1.15 + 0.5, 0.0, 1.0);
    return p;
  }

  // portal ring / accretion disk
  vec3 p = s.xyz;
  float r = length(p.xz);
  p.xz = rot2(uTime * 0.5 / (0.4 + r * 0.35)) * p.xz;
  p.yz = rot2(-1.12) * p.yz;
  tone = s.w;
  return p;
}

void main() {
  // Per-particle staggered progress
  float stagger = 0.45;
  float local = clamp(uProgress * (1.0 + stagger) - aRandom.x * stagger, 0.0, 1.0);
  float eased = local * local * (3.0 - 2.0 * local);

  float toneA;
  float toneB;
  vec3 a = animateShape(uFrom, getShape(uFrom), toneA);
  vec3 b = animateShape(uTo, getShape(uTo), toneB);
  vec3 pos = mix(a, b, eased);
  float tone = mix(toneA, toneB, eased);

  // Breathing noise — swells mid-transition and while the page scrolls fast
  float transition = sin(local * 3.14159265);
  float amp = 0.045 + transition * 0.6 + uTurbulence * 0.3;
  vec3 np = pos * 0.55 + vec3(uTime * 0.12);
  pos += vec3(snoise(np), snoise(np + 17.31), snoise(np + 41.57)) * amp;

  // Arrival after the hero dive: particles rush in from far away
  float form = clamp(uForm * 1.4 - aRandom.y * 0.4, 0.0, 1.0);
  form = 1.0 - pow(1.0 - form, 3.0);
  vec3 scattered = normalize(aRandom.xyz - 0.5 + 0.0001) * (7.0 + aRandom.w * 18.0);
  scattered.z += 4.0;
  pos = mix(scattered, pos, form);

  // Cursor repulsion
  vec3 away = pos - uMouse;
  float dist = length(away);
  float force = smoothstep(1.7, 0.0, dist) * uMouseStrength;
  pos += normalize(away + vec3(0.0001)) * force * 0.8;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float size = uSize * (0.35 + aRandom.z * 0.95) * (1.0 + force * 1.4);
  gl_PointSize = min(size * uPixelRatio * (12.0 / -mvPosition.z), 42.0 * uPixelRatio);

  float sparkle = step(0.965, aRandom.z);
  vec3 color = mix(uColorA, uColorB, tone);
  color = mix(color, uColorC, sparkle * 0.85);
  color += force * 0.35;
  vColor = color;

  float twinkle = 0.7 + 0.3 * sin(uTime * (1.5 + aRandom.z * 3.0) + aRandom.y * 6.2831);
  float depthFade = smoothstep(28.0, 6.0, -mvPosition.z);
  vAlpha = uOpacity * twinkle * (0.55 + sparkle * 0.45) * mix(0.3, 1.0, depthFade) * (0.25 + 0.75 * form);
}
`;

export const particlesFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float glow = smoothstep(0.5, 0.0, d);
  float core = smoothstep(0.16, 0.0, d);
  float alpha = (glow * glow * 0.75 + core * 0.85) * vAlpha;
  if (alpha < 0.003) discard;
  gl_FragColor = vec4(vColor, alpha);
  #include <colorspace_fragment>
}
`;

/* ---------------- Starfield + warp streaks ---------------- */
export const starsVertex = /* glsl */ `
uniform float uTime;
uniform float uTravel;
uniform float uPixelRatio;
uniform float uWarp;
uniform float uOpacity;
attribute vec2 aData; // x: size, y: phase

varying float vAlpha;
varying float vTint;

const float DEPTH = 80.0;

void main() {
  vec3 p = position;
  p.z = mod(p.z + uTravel, DEPTH) - DEPTH + 10.0;

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float twinkle = 0.55 + 0.45 * sin(uTime * (0.5 + aData.y * 2.0) + aData.y * 12.0);
  gl_PointSize = min(aData.x * uPixelRatio * (30.0 / -mvPosition.z), 6.0 * uPixelRatio);

  float fade = smoothstep(0.5, 6.0, -mvPosition.z) * smoothstep(70.0, 40.0, -mvPosition.z);
  vAlpha = twinkle * fade * uOpacity * (1.0 - uWarp * 0.6);
  vTint = aData.y;
}
`;

export const starsFragment = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
varying float vAlpha;
varying float vTint;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(mix(uColorA, uColorB, vTint), a);
  #include <colorspace_fragment>
}
`;

export const warpVertex = /* glsl */ `
uniform float uTravel;
uniform float uWarp;
attribute float aEnd;   // 0 = head, 1 = tail
attribute float aPhase;

varying float vAlpha;
varying float vTint;

const float DEPTH = 80.0;

void main() {
  vec3 p = position;
  p.z = mod(p.z + uTravel, DEPTH) - DEPTH + 10.0;
  p.z -= aEnd * uWarp * (3.0 + aPhase * 10.0);

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float fade = smoothstep(0.5, 5.0, -mvPosition.z) * smoothstep(75.0, 30.0, -mvPosition.z);
  vAlpha = uWarp * fade * (1.0 - aEnd);
  vTint = aPhase;
}
`;

export const warpFragment = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
varying float vAlpha;
varying float vTint;

void main() {
  gl_FragColor = vec4(mix(uColorA, uColorB, vTint), vAlpha);
  #include <colorspace_fragment>
}
`;
