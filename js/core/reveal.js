import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";

/**
 * Declarative scroll reveals:
 *   data-reveal="chars"   — big titles: characters flip up in 3D
 *   data-reveal="lines"   — paragraphs: lines slide up from a mask
 *   data-reveal="fade"    — fade + rise
 *   data-reveal="stagger" — children fade + rise one after another
 */
export function initReveals() {
  document.querySelectorAll('[data-reveal="chars"]').forEach((element) => {
    SplitText.create(element, {
      type: "lines, words, chars",
      mask: "lines",
      linesClass: "tl",
      wordsClass: "word",
      charsClass: "char",
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.chars, {
          yPercent: 120,
          rotateX: -75,
          transformOrigin: "50% 100%",
          duration: 1.4,
          ease: "expo.out",
          stagger: 0.022,
          scrollTrigger: { trigger: element, start: "top 85%", once: true },
        }),
    });
  });

  document.querySelectorAll('[data-reveal="lines"]').forEach((element) => {
    SplitText.create(element, {
      type: "lines",
      mask: "lines",
      linesClass: "rl",
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 105,
          duration: 1.2,
          ease: "expo.out",
          stagger: 0.08,
          scrollTrigger: { trigger: element, start: "top 88%", once: true },
        }),
    });
  });

  gsap.utils.toArray('[data-reveal="fade"]').forEach((element) => {
    gsap.from(element, {
      y: 40,
      autoAlpha: 0,
      duration: 1.3,
      ease: "expo.out",
      scrollTrigger: { trigger: element, start: "top 90%", once: true },
    });
  });

  gsap.utils.toArray('[data-reveal="stagger"]').forEach((element) => {
    gsap.from(element.children, {
      y: 36,
      autoAlpha: 0,
      duration: 1.2,
      ease: "expo.out",
      stagger: 0.09,
      scrollTrigger: { trigger: element, start: "top 88%", once: true },
    });
  });
}
