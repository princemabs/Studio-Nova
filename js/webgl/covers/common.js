import * as THREE from "three";
import { createRandom } from "../../utils/math.js";

/** Uniforms shared by every cover scene (updated on resize). */
export const coverShared = {
  pixelRatio: { value: 1 },
};

const glowVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const glowFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float a = pow(clamp(1.0 - d, 0.0, 1.0), 2.4) * uIntensity;
  gl_FragColor = vec4(uColor * a, 1.0);
  #include <colorspace_fragment>
}
`;

/** Soft radial light used as a backdrop behind the hero object of each cover. */
export function createGlow(color, size, intensity, z = -3, y = 0) {
  const material = new THREE.ShaderMaterial({
    vertexShader: glowVertex,
    fragmentShader: glowFragment,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
  mesh.position.set(0, y, z);
  return mesh;
}

const dustVertex = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uSize;
attribute float aPhase;
varying float vAlpha;
void main() {
  vec3 p = position;
  p.y += sin(uTime * 0.4 + aPhase * 6.2831) * 0.12;
  p.x += cos(uTime * 0.3 + aPhase * 4.0) * 0.08;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uSize * uPixelRatio * (6.0 / -mvPosition.z) * (0.5 + aPhase);
  vAlpha = 0.3 + 0.7 * (0.5 + 0.5 * sin(uTime * (0.8 + aPhase) + aPhase * 10.0));
}
`;

const dustFragment = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vAlpha;
  gl_FragColor = vec4(uColor * a, 1.0);
  #include <colorspace_fragment>
}
`;

/** Floating specks of light that give each cover depth. */
export function createDust(count, spread, color, size = 2.2, seed = 1) {
  const random = createRandom(seed);
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (random() - 0.5) * spread;
    positions[i * 3 + 1] = (random() - 0.5) * spread * 0.6;
    positions[i * 3 + 2] = (random() - 0.75) * spread * 0.8;
    phases[i] = random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader: dustVertex,
    fragmentShader: dustFragment,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: coverShared.pixelRatio,
      uSize: { value: size },
      uColor: { value: new THREE.Color(color) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return {
    points,
    update(time) {
      material.uniforms.uTime.value = time;
    },
  };
}

/** Smoothly move a cover camera according to the card position (parallax). */
export function parallaxCamera(camera, base, state, strength = { x: 1.4, y: 0.6 }, target = new THREE.Vector3()) {
  camera.position.x = base.x - state.parallaxX * strength.x;
  camera.position.y = base.y + state.parallaxY * strength.y;
  camera.position.z = base.z;
  camera.lookAt(target);
}
