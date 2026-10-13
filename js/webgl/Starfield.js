import * as THREE from "three";
import { createRandom } from "../utils/math.js";
import { starsVertex, starsFragment, warpVertex, warpFragment } from "./shaders/particles.js";

const DEPTH = 80;

/** Deep-space dust that drifts towards the camera, plus warp streaks for the hero dive. */
export class Starfield {
  constructor({ count, pixelRatio }) {
    const random = createRandom(3);
    const positions = new Float32Array(count * 3);
    const data = new Float32Array(count * 2);

    for (let i = 0; i < count; i++) {
      // keep the centre clear so the streaks feel like a tunnel
      const radius = 2.5 + Math.pow(random(), 0.75) * 32;
      const angle = random() * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius * 0.65;
      positions[i * 3 + 2] = random() * DEPTH;
      data[i * 2] = 0.6 + random() * 1.8;
      data[i * 2 + 1] = random();
    }

    const colorA = new THREE.Color("#8a63f8");
    const colorB = new THREE.Color("#9fe8ff");

    /* Points */
    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pointsGeometry.setAttribute("aData", new THREE.BufferAttribute(data, 2));

    this.uniforms = {
      uTime: { value: 0 },
      uTravel: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uWarp: { value: 0 },
      uOpacity: { value: 1 },
      uColorA: { value: colorA },
      uColorB: { value: colorB },
    };

    this.pointsMaterial = new THREE.ShaderMaterial({
      vertexShader: starsVertex,
      fragmentShader: starsFragment,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.pointsMaterial.toneMapped = false;
    this.points = new THREE.Points(pointsGeometry, this.pointsMaterial);
    this.points.frustumCulled = false;

    /* Warp streaks: two vertices per star (head + tail) */
    const linePositions = new Float32Array(count * 6);
    const ends = new Float32Array(count * 2);
    const phases = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      for (let k = 0; k < 2; k++) {
        linePositions[(i * 2 + k) * 3] = positions[i * 3];
        linePositions[(i * 2 + k) * 3 + 1] = positions[i * 3 + 1];
        linePositions[(i * 2 + k) * 3 + 2] = positions[i * 3 + 2];
        ends[i * 2 + k] = k;
        phases[i * 2 + k] = data[i * 2 + 1];
      }
    }
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute("aEnd", new THREE.BufferAttribute(ends, 1));
    lineGeometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

    this.linesMaterial = new THREE.ShaderMaterial({
      vertexShader: warpVertex,
      fragmentShader: warpFragment,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.linesMaterial.toneMapped = false;
    this.lines = new THREE.LineSegments(lineGeometry, this.linesMaterial);
    this.lines.frustumCulled = false;
    this.lines.visible = false;

    this.group = new THREE.Group();
    this.group.add(this.points, this.lines);
  }

  update(dt, time, warp) {
    this.uniforms.uTime.value = time;
    this.uniforms.uWarp.value = warp;
    this.uniforms.uTravel.value = (this.uniforms.uTravel.value + dt * (0.6 + warp * 95)) % DEPTH;
    this.lines.visible = warp > 0.002;
  }

  setPixelRatio(pixelRatio) {
    this.uniforms.uPixelRatio.value = pixelRatio;
  }
}
