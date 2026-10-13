const query = (q) => window.matchMedia(q);

const reducedMotionQuery = query("(prefers-reduced-motion: reduce)");
const finePointerQuery = query("(hover: hover) and (pointer: fine)");

export const device = {
  get reducedMotion() {
    return reducedMotionQuery.matches;
  },
  get finePointer() {
    return finePointerQuery.matches;
  },
  get isMobile() {
    return window.innerWidth < 768;
  },
  get isDesktop() {
    return window.innerWidth >= 900;
  },
  /**
   * Rough performance tier used to scale particle counts and resolution.
   * "high" — desktop with plenty of cores, "medium" — laptops / tablets, "low" — phones.
   */
  get tier() {
    const cores = navigator.hardwareConcurrency || 4;
    const memory = navigator.deviceMemory || 8;
    const smallScreen = Math.min(window.screen.width, window.screen.height) < 600;
    if (smallScreen || memory <= 2) return "low";
    if (!finePointerQuery.matches || cores <= 4 || memory <= 4) return "medium";
    return "high";
  },
};
