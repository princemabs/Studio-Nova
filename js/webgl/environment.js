import * as THREE from "three";

/**
 * A tiny neon "photo studio" baked into a prefiltered environment map.
 * Coloured softboxes give chrome and glass a violet / cyan / pink sheen that
 * matches the palette of the site (no HDR file to download).
 */
export function createEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#06050c");

  const geometry = new THREE.PlaneGeometry(1, 1);
  const materials = [];

  const panel = (color, intensity, position, scale) => {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(intensity),
      side: THREE.DoubleSide,
    });
    materials.push(material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.scale.set(scale[0], scale[1], 1);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  };

  panel("#ffffff", 2.4, [0, 7, 1], [9, 5]); // key softbox above
  panel("#8a63f8", 3.4, [-7, 1, 2], [3, 9]); // violet strip, left
  panel("#4de1ff", 2.6, [7, 0.5, 1.5], [3, 9]); // cyan strip, right
  panel("#ff5fd2", 2.2, [0, -1, -7], [8, 2.5]); // pink rim, behind
  panel("#5a8cff", 1.4, [0, -6, 2], [7, 4]); // blue floor bounce
  panel("#ffffff", 1.1, [0, 1, 8], [6, 3]); // soft front fill

  const target = pmrem.fromScene(scene, 0.04);

  pmrem.dispose();
  geometry.dispose();
  materials.forEach((m) => m.dispose());

  return target.texture;
}
