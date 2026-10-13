import * as THREE from "three";
import { gsap } from "gsap";
import { createParticleData } from "./shapes.js";
import { particlesVertex, particlesFragment } from "./shaders/particles.js";

export class Particles {
  constructor({ count, pixelRatio }) {
    const data = createParticleData(count);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(data.position, 3));
    geometry.setAttribute("aShape1", new THREE.BufferAttribute(data.shape1, 4));
    geometry.setAttribute("aShape2", new THREE.BufferAttribute(data.shape2, 4));
    geometry.setAttribute("aShape3", new THREE.BufferAttribute(data.shape3, 4));
    geometry.setAttribute("aShape4", new THREE.BufferAttribute(data.shape4, 4));
    geometry.setAttribute("aRandom", new THREE.BufferAttribute(data.randoms, 4));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30);

    this.material = new THREE.ShaderMaterial({
      vertexShader: particlesVertex,
      fragmentShader: particlesFragment,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 3 },
        uPixelRatio: { value: pixelRatio },
        uFrom: { value: 0 },
        uTo: { value: 0 },
        uProgress: { value: 0 },
        uForm: { value: 0 },
        uOpacity: { value: 1 },
        uTurbulence: { value: 0 },
        uMouse: { value: new THREE.Vector3(999, 999, 999) },
        uMouseStrength: { value: 0 },
        uColorA: { value: new THREE.Color("#7c5cff") },
        uColorB: { value: new THREE.Color("#4de1ff") },
        uColorC: { value: new THREE.Color("#ff8be0") },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.material.toneMapped = false;

    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;

    this.group = new THREE.Group();
    this.group.add(this.points);

    this.current = 0;
    this.desired = 0;
    this.morphing = false;
  }

  get uniforms() {
    return this.material.uniforms;
  }

  /** Morph to a shape; if a morph is running, the newest request is queued. */
  morphTo(shape, { immediate = false } = {}) {
    this.desired = shape;
    if (immediate) {
      gsap.killTweensOf(this.uniforms.uProgress);
      this.current = shape;
      this.uniforms.uFrom.value = shape;
      this.uniforms.uTo.value = shape;
      this.uniforms.uProgress.value = 0;
      this.morphing = false;
      return;
    }
    if (this.morphing || shape === this.current) return;
    this.startMorph(shape);
  }

  startMorph(shape) {
    const u = this.uniforms;
    this.morphing = true;
    u.uFrom.value = this.current;
    u.uTo.value = shape;
    u.uProgress.value = 0;
    gsap.to(u.uProgress, {
      value: 1,
      duration: 1.9,
      ease: "power2.inOut",
      onComplete: () => {
        this.current = shape;
        u.uFrom.value = shape;
        u.uProgress.value = 0;
        this.morphing = false;
        if (this.desired !== this.current) this.startMorph(this.desired);
      },
    });
  }

  setPixelRatio(pixelRatio) {
    this.uniforms.uPixelRatio.value = pixelRatio;
  }

  dispose() {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
