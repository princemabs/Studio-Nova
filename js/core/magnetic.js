import { gsap } from "gsap";
import { device } from "../utils/device.js";

/**
 * Elements with [data-magnetic] lean towards the cursor and spring back.
 * Optional value sets the strength, e.g. data-magnetic="0.5".
 * Also feeds --mx / --my so buttons can draw a spotlight under the cursor.
 */
export function initMagnetic() {
  if (!device.finePointer) return;
  const reduced = device.reducedMotion;

  document.querySelectorAll("[data-magnetic]").forEach((element) => {
    const strength = parseFloat(element.dataset.magnetic) || 0.35;
    const xTo = gsap.quickTo(element, "x", { duration: 0.9, ease: "elastic.out(1, 0.35)" });
    const yTo = gsap.quickTo(element, "y", { duration: 0.9, ease: "elastic.out(1, 0.35)" });
    let rect = null;

    element.addEventListener("pointerenter", () => {
      rect = element.getBoundingClientRect();
    });

    element.addEventListener("pointermove", (event) => {
      if (!rect) rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      element.style.setProperty("--mx", `${x}px`);
      element.style.setProperty("--my", `${y}px`);
      if (reduced) return;
      xTo((x - rect.width / 2) * strength);
      yTo((y - rect.height / 2) * strength);
    });

    element.addEventListener("pointerleave", () => {
      rect = null;
      xTo(0);
      yTo(0);
    });
  });
}
