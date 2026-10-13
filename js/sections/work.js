import { gsap } from "gsap";

/**
 * Selected work: a pinned horizontal gallery on desktop, a vertical stack on
 * smaller screens. Each card's media is a live WebGL scene (see webgl/covers).
 */
export function initWork({ world, lenis }) {
  const section = document.querySelector(".work");
  if (!section) return;

  const track = section.querySelector(".work__track");
  const cards = gsap.utils.toArray(".project-card", section);
  const counter = section.querySelector(".js-work-current");
  const bar = section.querySelector(".work__progress span");

  if (world) {
    cards.forEach((card) => {
      const media = card.querySelector(".project-card__media");
      if (media) world.addProjectPlane(media, media.dataset.scene, card.querySelector(".project-card__link") || card);
    });
  }

  let current = -1;
  const updateCounter = () => {
    const centre = window.innerWidth / 2;
    let best = 0;
    let bestDistance = Infinity;
    cards.forEach((card, i) => {
      const rect = card.getBoundingClientRect();
      const distance = Math.abs(rect.left + rect.width / 2 - centre);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    });
    if (best !== current && counter) {
      current = best;
      counter.textContent = String(best + 1).padStart(2, "0");
    }
  };

  const infoTargets = (card) =>
    card.querySelectorAll(".project-card__num, .project-card__title, .project-card__desc, .project-card__tags li");

  const mm = gsap.matchMedia();

  mm.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
    const distance = () => Math.max(0, track.scrollWidth - document.documentElement.clientWidth);

    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      onUpdate: updateCounter,
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (bar) bar.style.transform = `scaleX(${self.progress})`;
        },
      },
    });

    cards.forEach((card) => {
      gsap.from(infoTargets(card), {
        y: 40,
        autoAlpha: 0,
        duration: 1.1,
        ease: "expo.out",
        stagger: 0.05,
        scrollTrigger: {
          trigger: card,
          containerAnimation: tween,
          start: "left 90%",
          toggleActions: "play none none reverse",
        },
      });
    });

    // Keyboard users: focusing an off-screen card scrolls the page to it,
    // instead of letting the browser scroll the clipped track sideways.
    const pin = section.querySelector(".work__pin");
    const onFocus = (event) => {
      const item = event.target.closest(".project-card, .work__end");
      const st = tween.scrollTrigger;
      if (!item || !st) return;
      pin.scrollLeft = 0;
      const total = distance();
      const targetX = Math.min(Math.max(item.offsetLeft - window.innerWidth * 0.2, 0), total);
      const y = st.start + (st.end - st.start) * (total ? targetX / total : 0);
      if (lenis) lenis.scrollTo(y, { duration: 0.8, force: true });
      else window.scrollTo(0, y);
    };
    section.addEventListener("focusin", onFocus);

    const end = section.querySelector(".work__end");
    if (end) {
      gsap.from(end.firstElementChild, {
        scale: 0.5,
        rotate: -40,
        autoAlpha: 0,
        duration: 1.4,
        ease: "expo.out",
        scrollTrigger: { trigger: end, containerAnimation: tween, start: "left 90%", toggleActions: "play none none reverse" },
      });
    }

    return () => section.removeEventListener("focusin", onFocus);
  });

  mm.add("(max-width: 899px), (prefers-reduced-motion: reduce)", () => {
    cards.forEach((card) => {
      gsap.from(infoTargets(card), {
        y: 30,
        autoAlpha: 0,
        duration: 1,
        ease: "expo.out",
        stagger: 0.05,
        scrollTrigger: { trigger: card, start: "top 80%", once: true },
      });
    });
  });
}
