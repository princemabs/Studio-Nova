import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { simplexNoise } from "../shaders/noise.js";
import { createGlow, createDust, parallaxCamera } from "./common.js";

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uHover;
uniform float uRadius;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying float vNoise;

${simplexNoise}

float displacement(vec3 n) {
  float t = uTime * 0.28;
  float a = snoise(n * 1.15 + vec3(t, t * 0.6, -t * 0.4));
  float b = snoise(n * 2.7 - vec3(t * 0.8)) * 0.35;
  return (a + b) * (0.2 + uHover * 0.13);
}

void main() {
  vec3 n = normalize(position);
  float d = displacement(n);
  vec3 p = n * (uRadius + d);

  vec3 helper = abs(n.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 tangent = normalize(cross(n, helper));
  vec3 bitangent = normalize(cross(n, tangent));
  vec3 nT = normalize(n + tangent * 0.01);
  vec3 nB = normalize(n + bitangent * 0.01);
  vec3 pT = nT * (uRadius + displacement(nT));
  vec3 pB = nB * (uRadius + displacement(nB));
  vec3 normal = normalize(cross(pT - p, pB - p));
  if (dot(normal, n) < 0.0) normal = -normal;

  vNoise = d;
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorldPos = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uRim;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying float vNoise;

vec3 palette(float t) {
  return vec3(0.55, 0.45, 0.75) + vec3(0.45, 0.4, 0.3) * cos(6.28318 * (vec3(1.0, 0.9, 0.8) * t + vec3(0.0, 0.25, 0.5)));
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fresnel = pow(1.0 - ndv, 2.6);

  vec3 L = normalize(vec3(-0.6, 0.8, 0.7));
  float diffuse = clamp(dot(N, L), 0.0, 1.0);
  vec3 H = normalize(L + V);
  float spec = pow(clamp(dot(N, H), 0.0, 1.0), 70.0);

  vec3 base = mix(uColorA, uColorB, smoothstep(-0.4, 0.9, N.y + vNoise * 1.5));
  vec3 irid = palette(ndv * 0.8 + vNoise * 1.6 + uTime * 0.04);

  vec3 color = base * (0.1 + 0.6 * diffuse)
             + irid * fresnel * 1.4
             + uRim * pow(fresnel, 3.0) * 1.2
             + vec3(spec) * 1.3;

  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}
`;

/** 01 — Nebula: an iridescent, liquid blob breathing in a violet haze. */
export class NebulaCover {
  constructor() {
    this.background = new THREE.Color("#0a0820");
    this.tint = "#8a63f8";
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 16 / 10, 0.1, 60);
    this.cameraBase = new THREE.Vector3(0, 0, 6);

    const base = new THREE.IcosahedronGeometry(1, 40);
    base.deleteAttribute("normal");
    base.deleteAttribute("uv");
    const geometry = mergeVertices(base);
    base.dispose();

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uHover: { value: 0 },
        uRadius: { value: 1.3 },
        uColorA: { value: new THREE.Color("#3b1fb8") },
        uColorB: { value: new THREE.Color("#4de1ff") },
        uRim: { value: new THREE.Color("#ff8be0") },
      },
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh);

    this.scene.add(createGlow("#6b4dff", 8, 0.9, -3));
    this.scene.add(createGlow("#ff4fd8", 5, 0.35, -2.5, -1.2));
    this.dust = createDust(260, 9, "#c9b8ff", 2.4, 21);
    this.scene.add(this.dust.points);
  }

  update(dt, time, state) {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uHover.value = state.hover;
    this.mesh.rotation.y += dt * (0.15 + state.hover * 0.6);
    this.mesh.rotation.x = Math.sin(time * 0.2) * 0.25;
    this.dust.update(time);
    parallaxCamera(this.camera, this.cameraBase, state, { x: 1.6, y: 0.7 });
  }
}
