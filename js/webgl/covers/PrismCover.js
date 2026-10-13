import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { damp, createRandom } from "../../utils/math.js";
import { createGlow, createDust, parallaxCamera } from "./common.js";

/** 03 — Prism: a floating cluster of iridescent glass cubes. */
export class PrismCover {
  constructor({ envMap }) {
    this.background = new THREE.Color("#0b0616");
    this.tint = "#ff5fd2";
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 16 / 10, 0.1, 80);
    this.cameraBase = new THREE.Vector3(0, 0.2, 7.5);

    const geometry = new RoundedBoxGeometry(1, 1, 1, 5, 0.12);
    const makeMaterial = (color) =>
      new THREE.MeshPhysicalMaterial({
        color,
        metalness: 0.25,
        roughness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        iridescence: 1,
        iridescenceIOR: 1.5,
        iridescenceThicknessRange: [120, 700],
        envMap,
        envMapIntensity: 1.45,
      });
    const materials = [makeMaterial("#ffffff"), makeMaterial("#c9b8ff"), makeMaterial("#ffb3ea")];

    const random = createRandom(42);
    this.cluster = new THREE.Group();
    this.cubes = [];

    // Hero cube with neon edges
    const hero = new THREE.Mesh(geometry, materials[0]);
    hero.scale.setScalar(1.15);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.08, 1.08, 1.08)),
      new THREE.LineBasicMaterial({ color: new THREE.Color("#4de1ff").multiplyScalar(2.6) })
    );
    hero.add(edges);
    this.cluster.add(hero);
    this.cubes.push({ mesh: hero, base: new THREE.Vector3(), spin: new THREE.Vector3(0.25, 0.35, 0.1), phase: 0 });

    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + random() * 0.4;
      const radius = 1.6 + random() * 1.1;
      const base = new THREE.Vector3(Math.cos(angle) * radius * 1.25, Math.sin(angle) * radius * 0.62, (random() - 0.5) * 2.2);
      const mesh = new THREE.Mesh(geometry, materials[i % materials.length]);
      mesh.scale.setScalar(0.28 + random() * 0.38);
      mesh.position.copy(base);
      mesh.rotation.set(random() * 3, random() * 3, random() * 3);
      this.cluster.add(mesh);
      this.cubes.push({
        mesh,
        base,
        spin: new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(1.2),
        phase: random() * Math.PI * 2,
      });
    }
    this.scene.add(this.cluster);

    this.scene.add(createGlow("#ff4fd8", 7, 0.5, -3, 0.4));
    this.scene.add(createGlow("#5c43fa", 9, 0.55, -4, -0.6));
    this.dust = createDust(300, 11, "#ffd1f3", 2, 13);
    this.scene.add(this.dust.points);

    this.spread = 1;
  }

  update(dt, time, state) {
    this.spread = damp(this.spread, 1 + state.hover * 0.16, 5, dt);
    const boost = 1 + state.hover * 1.8;
    this.cubes.forEach(({ mesh, base, spin, phase }) => {
      mesh.rotation.x += spin.x * dt * boost;
      mesh.rotation.y += spin.y * dt * boost;
      mesh.rotation.z += spin.z * dt * boost;
      mesh.position.set(base.x * this.spread, base.y * this.spread + Math.sin(time * 0.9 + phase) * 0.12, base.z);
    });
    this.cluster.rotation.y = Math.sin(time * 0.2) * 0.35;
    this.dust.update(time);
    parallaxCamera(this.camera, this.cameraBase, state, { x: 1.8, y: 0.7 });
  }
}
