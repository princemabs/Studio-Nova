import * as THREE from "three";
import { simplexNoise } from "../shaders/noise.js";
import { createDust, parallaxCamera } from "./common.js";

const terrainVertex = /* glsl */ `
uniform float uOffset;
varying vec2 vGrid;
varying float vHeight;
varying float vDepth;

${simplexNoise}

float heightAt(vec2 g) {
  float valley = smoothstep(1.3, 6.5, abs(g.x));
  float n = snoise(vec3(g * 0.16, 0.0)) * 0.5 + 0.5;
  float n2 = snoise(vec3(g * 0.45, 3.0)) * 0.5 + 0.5;
  return valley * (n * 2.6 + n2 * 0.6 + 0.3);
}

void main() {
  vec3 p = position;
  vec2 g = vec2(p.x, p.z - uOffset);
  float h = heightAt(g);
  p.y += h;
  vGrid = g;
  vHeight = h;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  vDepth = -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const terrainFragment = /* glsl */ `
uniform vec3 uLineA;
uniform vec3 uLineB;
uniform vec3 uFog;
varying vec2 vGrid;
varying float vHeight;
varying float vDepth;

void main() {
  vec2 w = max(fwidth(vGrid), vec2(0.0001));
  vec2 cell = abs(fract(vGrid - 0.5) - 0.5);
  vec2 a = cell / w;
  float line = 1.0 - min(min(a.x, a.y), 1.0);
  vec2 b = cell / (w * 5.0);
  float halo = (1.0 - min(min(b.x, b.y), 1.0)) * 0.3;

  vec3 lineColor = mix(uLineA, uLineB, clamp(vHeight / 2.8, 0.0, 1.0));
  vec3 color = vec3(0.012, 0.0, 0.03) + lineColor * (line * 1.8 + halo);
  color = mix(color, uFog, smoothstep(6.0, 44.0, vDepth));

  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}
`;

const skyVertex = /* glsl */ `
varying float vWorldY;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldY = world.y;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const skyFragment = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uHorizon;
varying float vWorldY;
void main() {
  vec3 color = mix(uHorizon, uTop, smoothstep(-1.0, 16.0, vWorldY));
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}
`;

const sunVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const sunFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uTop;
uniform vec3 uBottom;
varying vec2 vUv;
void main() {
  vec2 p = vUv - 0.5;
  float d = length(p) * 2.0;
  float disc = 1.0 - smoothstep(0.62, 0.635, d);
  float y = (p.y / 0.635) * 0.5 + 0.5;
  float band = fract(y * 11.0 - uTime * 0.35);
  float thickness = smoothstep(0.55, 0.0, y) * 0.7;
  float cut = y < 0.55 ? step(thickness, band) : 1.0;
  vec3 color = mix(uBottom, uTop, smoothstep(0.05, 0.95, y));
  float glow = smoothstep(1.0, 0.6, d) * 0.35;
  gl_FragColor = vec4(color * (disc * cut * 1.4 + glow), 1.0);
  #include <colorspace_fragment>
}
`;

/** 04 — Waveform: an endless neon synthwave valley under a striped sun. */
export class WaveCover {
  constructor() {
    this.background = new THREE.Color("#0c0420");
    this.tint = "#ff4f9a";
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 16 / 10, 0.1, 120);
    this.cameraBase = new THREE.Vector3(0, 1.15, 6);
    this.lookTarget = new THREE.Vector3(0, 1.3, -20);

    const horizon = new THREE.Color("#4d0f4a");

    const sky = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 60),
      new THREE.ShaderMaterial({
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        uniforms: { uTop: { value: new THREE.Color("#0c0420") }, uHorizon: { value: horizon } },
        depthWrite: false,
      })
    );
    sky.position.set(0, 24, -55);
    this.scene.add(sky);

    this.sunMaterial = new THREE.ShaderMaterial({
      vertexShader: sunVertex,
      fragmentShader: sunFragment,
      uniforms: {
        uTime: { value: 0 },
        uTop: { value: new THREE.Color("#ffd36b").multiplyScalar(1.6) },
        uBottom: { value: new THREE.Color("#ff3d9a").multiplyScalar(1.6) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sun = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), this.sunMaterial);
    sun.position.set(0, 5.5, -50);
    this.scene.add(sun);

    const terrainGeometry = new THREE.PlaneGeometry(44, 70, 120, 190);
    terrainGeometry.rotateX(-Math.PI / 2);
    this.terrainMaterial = new THREE.ShaderMaterial({
      vertexShader: terrainVertex,
      fragmentShader: terrainFragment,
      uniforms: {
        uOffset: { value: 0 },
        uLineA: { value: new THREE.Color("#ff4fd8").multiplyScalar(1.6) },
        uLineB: { value: new THREE.Color("#4de1ff").multiplyScalar(1.6) },
        uFog: { value: horizon },
      },
    });
    const terrain = new THREE.Mesh(terrainGeometry, this.terrainMaterial);
    terrain.position.z = -28;
    this.scene.add(terrain);

    this.dust = createDust(180, 14, "#ffd1f3", 1.6, 5);
    this.dust.points.position.set(0, 3, -4);
    this.scene.add(this.dust.points);

    this.offset = 0;
  }

  update(dt, time, state) {
    this.offset += dt * (2.2 + state.hover * 6);
    this.terrainMaterial.uniforms.uOffset.value = this.offset;
    this.sunMaterial.uniforms.uTime.value = time;
    this.dust.update(time);
    parallaxCamera(this.camera, this.cameraBase, state, { x: 1.4, y: 0.4 }, this.lookTarget);
  }
}
