import * as THREE from "three";
import { damp } from "../../utils/math.js";
import { createGlow, createDust, parallaxCamera } from "./common.js";

const UP = new THREE.Vector3(0, 1, 0);

/** 05 — Helix: a glossy double helix spinning through a teal haze. */
export class HelixCover {
  constructor({ envMap }) {
    this.background = new THREE.Color("#03111a");
    this.tint = "#4de1ff";
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 16 / 10, 0.1, 80);
    this.cameraBase = new THREE.Vector3(0, 0, 8);

    this.count = 44;
    const nodeMaterial = new THREE.MeshPhysicalMaterial({
      metalness: 0.3,
      roughness: 0.2,
      clearcoat: 0.8,
      envMap,
      envMapIntensity: 1.25,
    });
    this.nodes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 24, 16), nodeMaterial, this.count * 2);

    const palette = [new THREE.Color("#4de1ff"), new THREE.Color("#8a63f8"), new THREE.Color("#ff5fd2")];
    const color = new THREE.Color();
    for (let i = 0; i < this.count; i++) {
      const t = i / (this.count - 1);
      if (t < 0.5) color.copy(palette[0]).lerp(palette[1], t * 2);
      else color.copy(palette[1]).lerp(palette[2], (t - 0.5) * 2);
      this.nodes.setColorAt(i * 2, color);
      this.nodes.setColorAt(i * 2 + 1, color.clone().offsetHSL(0.04, 0, 0.08));
    }
    this.nodes.instanceColor.needsUpdate = true;

    this.rungs = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.016, 0.016, 1, 10),
      new THREE.MeshStandardMaterial({
        color: "#9fb4ff",
        emissive: "#3a2a8f",
        emissiveIntensity: 0.8,
        metalness: 0.2,
        roughness: 0.4,
        envMap,
      }),
      Math.ceil(this.count / 2)
    );

    this.helix = new THREE.Group();
    this.helix.add(this.nodes, this.rungs);
    this.helix.rotation.z = 0.55;
    this.scene.add(this.helix);

    this.scene.add(createGlow("#14b8ff", 8, 0.55, -3));
    this.scene.add(createGlow("#8a63f8", 6, 0.35, -2.5, 1.2));
    this.dust = createDust(320, 12, "#bdf3ff", 2, 9);
    this.scene.add(this.dust.points);

    this.dummy = new THREE.Object3D();
    this.a = new THREE.Vector3();
    this.b = new THREE.Vector3();
    this.dir = new THREE.Vector3();
    this.phase = 0;
    this.radius = 0.62;
  }

  update(dt, time, state) {
    this.phase += dt * (0.5 + state.hover * 1.6);
    this.radius = damp(this.radius, 0.62 + state.hover * 0.15, 5, dt);
    const { dummy, a, b, dir, count, radius } = this;

    for (let i = 0; i < count; i++) {
      const angle = i * 0.36 + this.phase;
      const y = (i - (count - 1) / 2) * 0.105;
      a.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      b.set(-a.x, y, -a.z);
      const pulse = 1 + 0.18 * Math.sin(time * 2 + i * 0.5);

      dummy.quaternion.identity();
      dummy.scale.setScalar(pulse);
      dummy.position.copy(a);
      dummy.updateMatrix();
      this.nodes.setMatrixAt(i * 2, dummy.matrix);
      dummy.position.copy(b);
      dummy.updateMatrix();
      this.nodes.setMatrixAt(i * 2 + 1, dummy.matrix);

      if (i % 2 === 0) {
        dir.subVectors(a, b).normalize();
        dummy.position.set(0, y, 0);
        dummy.quaternion.setFromUnitVectors(UP, dir);
        dummy.scale.set(1, radius * 2, 1);
        dummy.updateMatrix();
        this.rungs.setMatrixAt(i / 2, dummy.matrix);
      }
    }
    this.nodes.instanceMatrix.needsUpdate = true;
    this.rungs.instanceMatrix.needsUpdate = true;

    this.dust.update(time);
    parallaxCamera(this.camera, this.cameraBase, state, { x: 1.6, y: 0.6 });
  }
}
