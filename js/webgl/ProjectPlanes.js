import * as THREE from "three";
import { gsap } from "gsap";
import { createCover } from "./covers/index.js";
import { coverShared } from "./covers/common.js";
import { planeVertex, planeFragment } from "./shaders/plane.js";
import { clamp, damp } from "../utils/math.js";

/**
 * Keeps one WebGL plane glued to every `.project-card__media` element.
 * Each plane displays a live 3D scene rendered into a texture; render targets
 * are pooled so only the cards on screen cost anything.
 */
export class ProjectPlanes {
  constructor({ renderer, scene, envMap, maxPixelRatio, hdr }) {
    this.renderer = renderer;
    this.scene = scene;
    this.envMap = envMap;
    this.maxPixelRatio = maxPixelRatio;
    this.hdr = hdr;
    this.items = [];
    this.pool = [];
    this.geometry = new THREE.PlaneGeometry(1, 1, 32, 20);
    this.viewport = { width: window.innerWidth, height: window.innerHeight };
    this.targetSize = new THREE.Vector2(16, 10);
    this.pixelRatio = 1;
  }

  add(element, sceneName, card = element) {
    const cover = createCover(sceneName, { envMap: this.envMap });
    const radius = parseFloat(getComputedStyle(element).borderTopLeftRadius) || 22;

    const material = new THREE.ShaderMaterial({
      vertexShader: planeVertex,
      fragmentShader: planeFragment,
      uniforms: {
        uTexture: { value: null },
        uPlaneSize: { value: new THREE.Vector2(1, 1) },
        uRadius: { value: radius },
        uHover: { value: 0 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uVelocity: { value: new THREE.Vector2() },
        uReveal: { value: 0 },
        uTime: { value: 0 },
        uTint: { value: new THREE.Color(cover.tint) },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    // HDR covers are tone-mapped here; 8-bit covers are already in range.
    material.toneMapped = this.hdr;

    const mesh = new THREE.Mesh(this.geometry, material);
    mesh.frustumCulled = false;
    mesh.visible = false;
    this.scene.add(mesh);

    const item = {
      element,
      cover,
      material,
      mesh,
      previous: null,
      velocity: new THREE.Vector2(),
      revealed: false,
    };

    const hover = material.uniforms.uHover;
    card.addEventListener("pointerenter", () => gsap.to(hover, { value: 1, duration: 0.9, ease: "power3.out" }));
    card.addEventListener("pointerleave", () => gsap.to(hover, { value: 0, duration: 0.9, ease: "power3.out" }));
    card.addEventListener("focusin", () => gsap.to(hover, { value: 1, duration: 0.9, ease: "power3.out" }));
    card.addEventListener("focusout", () => gsap.to(hover, { value: 0, duration: 0.9, ease: "power3.out" }));
    element.addEventListener("pointermove", (event) => {
      const rect = element.getBoundingClientRect();
      material.uniforms.uMouse.value.set(
        (event.clientX - rect.left) / rect.width,
        1 - (event.clientY - rect.top) / rect.height
      );
    });

    this.items.push(item);
    this.resize(this.viewport.width, this.viewport.height, this.pixelRatio);
    return item;
  }

  resize(width, height, pixelRatio) {
    this.viewport.width = width;
    this.viewport.height = height;
    this.pixelRatio = pixelRatio;

    let maxWidth = 16;
    let maxHeight = 10;
    this.items.forEach(({ element }) => {
      maxWidth = Math.max(maxWidth, element.offsetWidth);
      maxHeight = Math.max(maxHeight, element.offsetHeight);
    });

    const ratio = Math.min(pixelRatio, this.maxPixelRatio);
    coverShared.pixelRatio.value = ratio;
    this.targetSize.set(Math.max(2, Math.round(maxWidth * ratio)), Math.max(2, Math.round(maxHeight * ratio)));
    this.pool.forEach((target) => target.setSize(this.targetSize.x, this.targetSize.y));

    const aspect = maxWidth / maxHeight;
    this.items.forEach(({ cover }) => {
      cover.camera.aspect = aspect;
      cover.camera.updateProjectionMatrix();
    });
  }

  getTarget(index) {
    if (!this.pool[index]) {
      this.pool[index] = new THREE.WebGLRenderTarget(this.targetSize.x, this.targetSize.y, {
        type: this.hdr ? THREE.HalfFloatType : THREE.UnsignedByteType,
        samples: 4,
      });
    }
    return this.pool[index];
  }

  /** Renders every visible cover into a pooled target and places its plane. Returns true if any plane is visible. */
  update(dt, time) {
    const { width, height } = this.viewport;
    const margin = 80;
    let slot = 0;

    for (const item of this.items) {
      const rect = item.element.getBoundingClientRect();
      const visible =
        rect.width > 2 &&
        rect.bottom > -margin &&
        rect.top < height + margin &&
        rect.right > -margin &&
        rect.left < width + margin;

      item.mesh.visible = visible;
      if (!visible) {
        item.previous = null;
        continue;
      }

      const u = item.material.uniforms;

      // Velocity of the DOM element (px/s), smoothed — drives the bend & RGB split
      if (item.previous) {
        const step = Math.max(dt, 1 / 240);
        item.velocity.x = damp(item.velocity.x, (rect.left - item.previous.x) / step, 8, dt);
        item.velocity.y = damp(item.velocity.y, (rect.top - item.previous.y) / step, 8, dt);
      } else {
        item.previous = { x: 0, y: 0 };
        item.velocity.set(0, 0);
      }
      item.previous.x = rect.left;
      item.previous.y = rect.top;
      u.uVelocity.value.set(clamp(item.velocity.x / 4500, -1, 1), clamp(item.velocity.y / 4500, -1, 1));

      // Pixel-perfect placement (the DOM camera maps 1 unit to 1 CSS pixel)
      item.mesh.position.set(rect.left + rect.width / 2 - width / 2, height / 2 - (rect.top + rect.height / 2), 0);
      item.mesh.scale.set(rect.width, rect.height, 1);
      u.uPlaneSize.value.set(rect.width, rect.height);
      u.uTime.value = time;

      if (!item.revealed) {
        item.revealed = true;
        gsap.to(u.uReveal, { value: 1, duration: 2.2, ease: "expo.out", delay: 0.05 });
      }

      const target = this.getTarget(slot++);
      u.uTexture.value = target.texture;

      item.cover.update(dt, time, {
        hover: u.uHover.value,
        parallaxX: (rect.left + rect.width / 2) / width - 0.5,
        parallaxY: (rect.top + rect.height / 2) / height - 0.5,
      });

      this.renderer.setRenderTarget(target);
      this.renderer.setClearColor(item.cover.background, 1);
      this.renderer.render(item.cover.scene, item.cover.camera);
    }

    this.renderer.setRenderTarget(null);
    return slot > 0;
  }

  /** Compiles every cover's shaders ahead of time (called behind the preloader). */
  async warmup() {
    const target = this.getTarget(0);
    for (const item of this.items) {
      this.renderer.setRenderTarget(target);
      try {
        await this.renderer.compileAsync(item.cover.scene, item.cover.camera);
      } catch {
        /* compileAsync is an optimisation only */
      }
      this.renderer.setRenderTarget(target);
      this.renderer.setClearColor(item.cover.background, 1);
      item.cover.update(0, 0, { hover: 0, parallaxX: 0, parallaxY: 0 });
      this.renderer.render(item.cover.scene, item.cover.camera);
    }
    this.renderer.setRenderTarget(null);
  }
}
