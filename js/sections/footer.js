import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";

export function initFooter({ scroll }) {
  const year = document.querySelector(".js-year");
  if (year) year.textContent = String(new Date().getFullYear());

  document.querySelector(".back-to-top")?.addEventListener("click", () => {
    scroll.lenis.scrollTo(0, { duration: 2.6, easing: (t) => 1 - Math.pow(1 - t, 4), force: true });
  });

  const wordmark = document.querySelector(".fw-text");
  if (!wordmark) return;
  SplitText.create(wordmark, {
    type: "chars",
    charsClass: "char",
    autoSplit: true,
    onSplit: (self) =>
      gsap.from(self.chars, {
        yPercent: 90,
        rotateX: -35,
        autoAlpha: 0,
        transformOrigin: "50% 100%",
        transformPerspective: 2000,
        duration: 1.6,
        ease: "expo.out",
        stagger: { each: 0.045, from: "center" },
        scrollTrigger: { trigger: wordmark, start: "top 95%", once: true },
      }),
  });
}
