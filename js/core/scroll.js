import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { device } from "../utils/device.js";
import { clamp } from "../utils/math.js";

const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Smooth scrolling (Lenis) driven by GSAP's ticker so ScrollTrigger,
 * the WebGL renderer and the DOM all update in the same frame.
 */
export function createScroll() {
  const reduced = device.reducedMotion;

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  const lenis = new Lenis({
    autoRaf: false,
    lerp: 0.09,
    smoothWheel: !reduced,
    wheelMultiplier: 1,
    touchMultiplier: 1.4,
  });

  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  const scrollTo = (target, options = {}) => {
    const destination =
      typeof target === "number" ? target : target.getBoundingClientRect().top + window.scrollY + (options.offset || 0);
    const distance = Math.abs(destination - window.scrollY);
    lenis.scrollTo(destination, {
      duration: clamp(distance / 3500, 1, 2.6),
      easing: easeOutExpo,
      immediate: reduced,
      force: true,
      ...options,
      offset: 0,
    });
  };

  // In-page anchors use the smooth scroller; "#" placeholders do nothing.
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented) return;
    const hash = link.getAttribute("href");
    event.preventDefault();
    if (hash === "#") return;

    const target = hash === "#home" ? 0 : document.querySelector(hash);
    if (target === null) return;
    scrollTo(target, {
      onComplete: () => {
        // Move keyboard focus with the scroll for accessibility.
        const focusTarget = target === 0 ? document.querySelector("#main") : target;
        if (focusTarget && !focusTarget.hasAttribute("tabindex")) focusTarget.setAttribute("tabindex", "-1");
        focusTarget?.focus({ preventScroll: true });
      },
    });
  });

  return { lenis, scrollTo };
}
