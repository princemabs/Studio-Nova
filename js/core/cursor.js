import { gsap } from "gsap";
import { device } from "../utils/device.js";

/** A dot + trailing ring cursor with contextual states (hover, label, text). */
export function initCursor() {
  const root = document.querySelector(".cursor");
  if (!root || !device.finePointer) return;

  const dot = root.querySelector(".cursor__dot");
  const ring = root.querySelector(".cursor__ring");
  const label = root.querySelector(".cursor__label");
  const lag = device.reducedMotion ? 0.05 : 0.5;

  document.documentElement.classList.add("has-cursor");
  gsap.set([dot, ring], { xPercent: -50, yPercent: -50, x: window.innerWidth / 2, y: window.innerHeight / 2 });

  const dotX = gsap.quickTo(dot, "x", { duration: 0.08, ease: "power3" });
  const dotY = gsap.quickTo(dot, "y", { duration: 0.08, ease: "power3" });
  const ringX = gsap.quickTo(ring, "x", { duration: lag, ease: "power3" });
  const ringY = gsap.quickTo(ring, "y", { duration: lag, ease: "power3" });

  root.classList.add("is-hidden");

  window.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType !== "mouse") return;
      dotX(event.clientX);
      dotY(event.clientY);
      ringX(event.clientX);
      ringY(event.clientY);
      root.classList.remove("is-hidden");
    },
    { passive: true }
  );

  document.addEventListener("pointerdown", () => root.classList.add("is-down"));
  document.addEventListener("pointerup", () => root.classList.remove("is-down"));
  document.documentElement.addEventListener("pointerleave", () => root.classList.add("is-hidden"));

  const setState = (target) => {
    root.classList.remove("is-hover", "is-label", "is-text");
    if (!target) return;
    if (target.matches('input:not([type="checkbox"]):not([type="radio"]), textarea')) {
      root.classList.add("is-text");
      return;
    }
    const labelled = target.closest("[data-cursor]");
    if (labelled) {
      label.textContent = labelled.dataset.cursor;
      root.classList.add("is-label");
      return;
    }
    root.classList.add("is-hover");
  };

  document.addEventListener("pointerover", (event) => {
    setState(event.target.closest('[data-cursor], a, button, [role="button"], label, input, textarea'));
  });
}
