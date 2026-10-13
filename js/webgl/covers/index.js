import { NebulaCover } from "./NebulaCover.js";
import { OrbitCover } from "./OrbitCover.js";
import { PrismCover } from "./PrismCover.js";
import { WaveCover } from "./WaveCover.js";
import { HelixCover } from "./HelixCover.js";

const COVERS = {
  nebula: NebulaCover,
  orbit: OrbitCover,
  prism: PrismCover,
  wave: WaveCover,
  helix: HelixCover,
};

/**
 * Creates the live 3D scene shown inside a project card.
 * Add your own by writing a class with { scene, camera, background, tint, update() }
 * and registering it here under the name used in data-scene="…".
 */
export function createCover(name, context) {
  const Cover = COVERS[name] || NebulaCover;
  return new Cover(context);
}
