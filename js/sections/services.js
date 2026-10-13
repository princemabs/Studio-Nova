import { gsap } from "gsap";

// Must match the media query that makes the cards sticky in style.css.
const STACKING = "(prefers-reduced-motion: no-preference) and (min-width: 769px) and (min-height: 600px)";

/** Stacking cards: as the next service slides over, the previous one sinks back in 3D. */
export function initServices() {
  const cards = gsap.utils.toArray(".service-card");
  if (!cards.length) return;

  const mm = gsap.matchMedia();

  mm.add(STACKING, () => {
    cards.forEach((card, i) => {
      const next = cards[i + 1];
      if (!next) return;
      const inner = card.querySelector(".service-card__inner");
      const shade = card.querySelector(".service-card__shade");

      gsap
        .timeline({
          scrollTrigger: {
            trigger: next,
            start: "top bottom",
            end: () => `top ${parseFloat(getComputedStyle(next).top) || 0}px`,
            scrub: true,
            invalidateOnRefresh: true,
          },
        })
        .to(inner, { scale: 0.9, rotateX: -10, yPercent: -3, ease: "none" }, 0)
        .to(shade, { opacity: 0.6, ease: "none" }, 0);
    });
  });

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    cards.forEach((card) => {
      const content = card.querySelectorAll(
        ".service-card__head, .service-card__title, .service-card__desc, .service-card__list li"
      );
      gsap.from(content, {
        y: 40,
        autoAlpha: 0,
        duration: 1.1,
        ease: "expo.out",
        stagger: 0.05,
        scrollTrigger: { trigger: card, start: "top 75%", once: true },
      });
      gsap.from(card.querySelector(".service-card__visual"), {
        scale: 0.6,
        autoAlpha: 0,
        rotate: -12,
        duration: 1.6,
        ease: "expo.out",
        scrollTrigger: { trigger: card, start: "top 70%", once: true },
      });
    });
  });
}
