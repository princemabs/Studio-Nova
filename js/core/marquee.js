import { gsap } from "gsap";
import { clamp, damp } from "../utils/math.js";

/**
 * Infinite marquee that speeds up with scroll velocity.
 *  - `followScroll`: flips direction with the scroll direction
 *  - `skew`: leans the text while scrolling fast
 */
export function createMarquee(track, { speed = 60, direction = -1, followScroll = false, skew = false, lenis = null } = {}) {
  const source = track.firstElementChild;
  if (!source) return;

  // Clone the content until it is wide enough to loop seamlessly.
  const fill = () => {
    track.querySelectorAll("[data-clone]").forEach((clone) => clone.remove());
    const width = source.offsetWidth || 1;
    const copies = Math.max(1, Math.ceil((window.innerWidth * 2) / width));
    for (let i = 0; i < copies; i++) {
      const clone = source.cloneNode(true);
      clone.setAttribute("data-clone", "");
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
    }
    return width;
  };

  let width = fill();
  let x = 0;
  let dir = direction;
  let skewValue = 0;
  let visible = true;

  const observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), { rootMargin: "100px" });
  observer.observe(track);

  window.addEventListener("resize", () => {
    width = fill();
  });

  const setX = gsap.quickSetter(track, "x", "px");
  const setSkew = skew ? gsap.quickSetter(track, "skewX", "deg") : null;

  gsap.ticker.add((_time, deltaMs) => {
    if (!visible) return;
    const dt = Math.min(deltaMs / 1000, 1 / 20);
    const velocity = lenis ? lenis.velocity || 0 : 0;
    if (followScroll && Math.abs(velocity) > 0.5) dir = velocity > 0 ? direction : -direction;

    const boost = 1 + clamp(Math.abs(velocity) / 12, 0, 6);
    x += dir * speed * boost * dt;
    if (x <= -width) x += width;
    if (x > 0) x -= width;
    setX(x);

    if (setSkew) {
      skewValue = damp(skewValue, clamp(-velocity * 0.35, -12, 12), 6, dt);
      setSkew(skewValue);
    }
  });
}
