import * as THREE from "three";
import { gsap } from "gsap";
import { Particles } from "./Particles.js";
import { Starfield } from "./Starfield.js";
import { ProjectPlanes } from "./ProjectPlanes.js";
import { createEnvironment } from "./environment.js";
import { clamp, damp } from "../utils/math.js";

/**
 * Where the particle sculpture lives in each section.
 *  - shape:   which shape to morph into (see shaders/particles.js)
 *  - anchor:  a DOM element the sculpture follows while scrolling (optional)
 *  - position / z / scale / opacity: placement in world units
 */
const STATES = {
  intro: { shape: 0, position: [0, 0, 0], scale: 1, opacity: 1 },
  work: { shape: 1, position: [0, -0.3, -3], scale: 1.45, opacity: 0.6 },
  about: { shape: 2, anchor: ".about__visual", z: -0.5, scale: 1.05, opacity: 1 },
  services: { shape: 3, position: [0, -1.7, -1], scale: 1.35, opacity: 0.6 },
  contact: { shape: 4, anchor: ".contact-form", z: -1, scale: 1.25, opacity: 1 },
};

const QUALITY = {
  high: { particles: 26000, stars: 1600, pixelRatio: 1.75, coverPixelRatio: 1.5 },
  medium: { particles: 16000, stars: 1100, pixelRatio: 1.5, coverPixelRatio: 1.25 },
  low: { particles: 9000, stars: 650, pixelRatio: 1.35, coverPixelRatio: 1.25 },
};

const CLEAR_COLOR = 0x030305;

export class World {
  constructor({ canvas, tier = "high", reducedMotion = false, lenis = null }) {
    this.canvas = canvas;
    this.quality = QUALITY[tier] || QUALITY.medium;
    this.reducedMotion = reducedMotion;
    this.lenis = lenis;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      stencil: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(CLEAR_COLOR, 1);
    // Shader error checks are useful while developing but cost compile time in production.
    this.renderer.debug.checkShaderErrors = import.meta.env.DEV;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    const extensions = this.renderer.extensions;
    this.hdr = extensions.has("EXT_color_buffer_float") || extensions.has("EXT_color_buffer_half_float");

    this.width = canvas.clientWidth || window.innerWidth;
    this.height = canvas.clientHeight || window.innerHeight;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, this.quality.pixelRatio);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.width, this.height, false);

    // Background world
    this.scene = new THREE.Scene();
    this.cameraZ = 10;
    this.camera = new THREE.PerspectiveCamera(35, this.width / this.height, 0.1, 200);
    this.camera.position.set(0, 0, this.cameraZ);

    // DOM-synced planes: 1 world unit = 1 CSS pixel at z = 0
    this.domScene = new THREE.Scene();
    this.domCamera = new THREE.PerspectiveCamera(45, this.width / this.height, 10, 4000);
    this.domCamera.position.z = 1000;

    this.time = 0;
    this.covered = !reducedMotion;
    this.dive = { warp: 0, form: reducedMotion ? 1 : 0 };
    this.turbulence = 0;

    this.pointer = new THREE.Vector2(0, 0);
    this.pointerSmooth = new THREE.Vector2(0, 0);
    this.pointerActive = 0;
    this.lastPointerMove = -10;
    this.raycaster = new THREE.Raycaster();
    this.mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this.mouseHit = new THREE.Vector3();

    this.sectionName = "intro";
    this.state = STATES.intro;
    this.current = { x: 0, y: 0, z: 0, scale: 1, opacity: 1 };
    this.anchors = {};

    this.frameAccum = 0;
    this.frameCount = 0;

    this.tick = this.tick.bind(this);
    this.onResize = this.onResize.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
  }

  async init() {
    this.envMap = createEnvironment(this.renderer);

    this.starfield = new Starfield({ count: this.quality.stars, pixelRatio: this.pixelRatio });
    this.scene.add(this.starfield.group);

    this.particles = new Particles({ count: this.quality.particles, pixelRatio: this.pixelRatio });
    this.scene.add(this.particles.group);

    this.planes = new ProjectPlanes({
      renderer: this.renderer,
      scene: this.domScene,
      envMap: this.envMap,
      maxPixelRatio: this.quality.coverPixelRatio,
      hdr: this.hdr,
    });

    this.onResize();
    let resizeFrame = 0;
    window.addEventListener("resize", () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(this.onResize);
    });
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });

    try {
      await this.renderer.compileAsync(this.scene, this.camera);
    } catch {
      /* optional optimisation */
    }

    gsap.ticker.add(this.tick);
    return this;
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                          */
  /* ------------------------------------------------------------------ */

  addProjectPlane(element, sceneName, card) {
    return this.planes.add(element, sceneName, card);
  }

  /** Pre-compiles the project covers so the first scroll through the gallery is smooth. */
  async warmup() {
    await this.planes.warmup();
    this.planes.items.forEach((item) => (item.mesh.visible = true));
    try {
      await this.renderer.compileAsync(this.domScene, this.domCamera);
    } catch {
      /* optional optimisation */
    }
    this.planes.items.forEach((item) => (item.mesh.visible = false));
  }

  setSection(name) {
    const state = STATES[name];
    if (!state || this.sectionName === name) return;
    this.sectionName = name;
    this.state = state;
    this.particles.morphTo(state.shape, { immediate: this.reducedMotion });
  }

  /** The hero film covers the canvas until the dive, so rendering can pause. */
  setCovered(covered) {
    this.covered = covered;
  }

  /* ------------------------------------------------------------------ */
  /* Internals                                                           */
  /* ------------------------------------------------------------------ */

  onPointerMove(event) {
    this.pointer.set((event.clientX / this.width) * 2 - 1, -(event.clientY / this.height) * 2 + 1);
    this.lastPointerMove = this.time;
  }

  onResize() {
    this.width = this.canvas.clientWidth || window.innerWidth;
    this.height = this.canvas.clientHeight || window.innerHeight;

    this.renderer.setSize(this.width, this.height, false);

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

    this.domCamera.aspect = this.width / this.height;
    this.domCamera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(this.height / 2 / this.domCamera.position.z));
    this.domCamera.updateProjectionMatrix();

    this.particles.uniforms.uSize.value = 4.2 * clamp(this.height / 900, 0.75, 1.6);
    this.planes.resize(this.width, this.height, this.pixelRatio);
  }

  applyPixelRatio() {
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.width, this.height, false);
    this.particles.setPixelRatio(this.pixelRatio);
    this.starfield.setPixelRatio(this.pixelRatio);
    this.planes.resize(this.width, this.height, this.pixelRatio);
  }

  /** Drops the resolution a notch if the device struggles to hold ~40fps. */
  adaptQuality(dt) {
    this.frameAccum += dt;
    this.frameCount += 1;
    if (this.frameAccum < 2.5) return;
    const average = this.frameAccum / this.frameCount;
    this.frameAccum = 0;
    this.frameCount = 0;
    if (average > 1 / 40 && this.pixelRatio > 1) {
      this.pixelRatio = Math.max(1, this.pixelRatio - 0.25);
      this.applyPixelRatio();
    }
  }

  screenToWorld(x, y, z) {
    const ndcX = (x / this.width) * 2 - 1;
    const ndcY = -(y / this.height) * 2 + 1;
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * (this.cameraZ - z);
    return { x: ndcX * halfHeight * this.camera.aspect, y: clamp(ndcY, -2.4, 2.4) * halfHeight };
  }

  getTargetTransform() {
    const state = this.state;
    let x = state.position ? state.position[0] : 0;
    let y = state.position ? state.position[1] : 0;
    const z = state.position ? state.position[2] : state.z || 0;

    if (state.anchor) {
      const element = (this.anchors[state.anchor] ||= document.querySelector(state.anchor));
      if (element) {
        const rect = element.getBoundingClientRect();
        const point = this.screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2, z);
        x = point.x;
        y = point.y;
      }
    }

    // Narrow (portrait) screens see less horizontally — shrink the sculpture to fit.
    const fit = clamp(this.camera.aspect * 1.15, 0.55, 1);
    const narrow = this.width < 900;
    return {
      x,
      y,
      z,
      scale: state.scale * fit,
      opacity: state.opacity * (narrow && this.sectionName !== "intro" ? 0.65 : 1),
    };
  }

  tick(_time, deltaMs) {
    const dt = Math.min((deltaMs || 16.7) / 1000, 1 / 20);
    this.time += dt;
    if (this.covered) return;

    this.adaptQuality(dt);

    // Pointer & camera parallax
    this.pointerSmooth.x = damp(this.pointerSmooth.x, this.pointer.x, 3, dt);
    this.pointerSmooth.y = damp(this.pointerSmooth.y, this.pointer.y, 3, dt);
    const pointerTarget = this.time - this.lastPointerMove < 1.2 && !this.reducedMotion ? 1 : 0;
    this.pointerActive = damp(this.pointerActive, pointerTarget, 3, dt);

    this.camera.position.x = this.pointerSmooth.x * 0.45;
    this.camera.position.y = this.pointerSmooth.y * 0.3;
    this.camera.lookAt(0, 0, 0);

    // Scroll energy feeds the particle turbulence
    const velocity = this.lenis ? Math.abs(this.lenis.velocity || 0) : 0;
    this.turbulence = damp(this.turbulence, clamp(velocity / 45), 4, dt);

    // Sculpture placement
    const target = this.getTargetTransform();
    const c = this.current;
    c.x = damp(c.x, target.x, 3.2, dt);
    c.y = damp(c.y, target.y, 3.2, dt);
    c.z = damp(c.z, target.z, 2.5, dt);
    c.scale = damp(c.scale, target.scale, 2.5, dt);
    c.opacity = damp(c.opacity, target.opacity, 2.5, dt);

    const group = this.particles.group;
    group.position.set(c.x, c.y, c.z);
    group.scale.setScalar(c.scale);
    group.rotation.x = damp(group.rotation.x, -this.pointerSmooth.y * 0.2, 2, dt);
    group.rotation.y = damp(group.rotation.y, this.pointerSmooth.x * 0.3, 2, dt);
    group.updateMatrixWorld();

    const u = this.particles.uniforms;
    u.uTime.value = this.time;
    u.uForm.value = this.dive.form;
    u.uOpacity.value = c.opacity;
    u.uTurbulence.value = this.turbulence;
    u.uMouseStrength.value = this.pointerActive;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.mousePlane.constant = -c.z;
    if (this.raycaster.ray.intersectPlane(this.mousePlane, this.mouseHit)) {
      group.worldToLocal(this.mouseHit);
      u.uMouse.value.copy(this.mouseHit);
    }

    this.starfield.update(dt, this.time, this.dive.warp);

    // Render: project covers → background world → DOM-synced planes
    const planesVisible = this.planes.update(dt, this.time);

    this.renderer.setRenderTarget(null);
    this.renderer.setClearColor(CLEAR_COLOR, 1);
    this.renderer.autoClear = true;
    this.renderer.render(this.scene, this.camera);

    if (planesVisible) {
      this.renderer.autoClear = false;
      this.renderer.clearDepth();
      this.renderer.render(this.domScene, this.domCamera);
      this.renderer.autoClear = true;
    }
  }
}
