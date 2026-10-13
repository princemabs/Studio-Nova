import * as THREE from "three";
import { damp } from "../../utils/math.js";
import { createGlow, createDust, parallaxCamera } from "./common.js";

/** 02 — Orbit: a chrome planet with neon rings and satellites. */
export class OrbitCover {
  constructor({ envMap }) {
    this.background = new THREE.Color("#05081a");
    this.tint = "#5a8cff";
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 16 / 10, 0.1, 80);
    this.cameraBase = new THREE.Vector3(0, 0.5, 7);

    this.planet = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 96, 64),
      new THREE.MeshPhysicalMaterial({
        color: "#c9d0ff",
        emissive: "#1c1550",
        metalness: 0.92,
        roughness: 0.32,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        envMap,
        envMapIntensity: 1.8,
      })
    );
    this.scene.add(this.planet);

    const ringDefs = [
      { radius: 1.5, tube: 0.012, color: "#4de1ff", tilt: [1.2, 0.0, 0.15], speed: 0.9 },
      { radius: 1.85, tube: 0.008, color: "#8a63f8", tilt: [1.0, 0.45, -0.2], speed: -0.6 },
      { radius: 2.25, tube: 0.014, color: "#ff5fd2", tilt: [1.45, -0.5, 0.25], speed: 0.4 },
    ];

    this.ringGroup = new THREE.Group();
    this.rings = ringDefs.map((def, i) => {
      const pivot = new THREE.Group();
      pivot.rotation.set(...def.tilt);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(def.radius, def.tube, 12, 240),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(def.color).multiplyScalar(2.4) })
      );
      const satellite = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 20, 16),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(def.color).multiplyScalar(4) })
      );
      satellite.position.set(def.radius, 0, 0);
      ring.add(satellite);
      pivot.add(ring);
      this.ringGroup.add(pivot);
      return { ring, speed: def.speed, offset: i * 2.1 };
    });
    this.scene.add(this.ringGroup);

    this.scene.add(createGlow("#3a5bff", 9, 0.75, -4));
    this.scene.add(createGlow("#4de1ff", 4, 0.25, -2, 1));
    this.dust = createDust(420, 12, "#cfe0ff", 1.8, 7);
    this.scene.add(this.dust.points);

    this.spread = 1;
  }

  update(dt, time, state) {
    this.spread = damp(this.spread, 1 + state.hover * 0.12, 5, dt);
    this.ringGroup.scale.setScalar(this.spread);
    const boost = 1 + state.hover * 2;
    this.rings.forEach(({ ring, speed }) => {
      ring.rotation.z += dt * speed * boost;
    });
    this.ringGroup.rotation.y = Math.sin(time * 0.15) * 0.3;
    this.planet.rotation.y += dt * 0.25;
    this.dust.update(time);
    parallaxCamera(this.camera, this.cameraBase, state, { x: 1.8, y: 0.8 });
  }
}
