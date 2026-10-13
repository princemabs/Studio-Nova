import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { device } from "../utils/device.js";
import { clamp } from "../utils/math.js";
import { createMarquee } from "../core/marquee.js";

export function initAbout({ lenis }) {
  initStatement();
  initHolo();
  document.querySelectorAll(".skills__row").forEach((row) => {
    createMarquee(row, { speed: 45, direction: Number(row.dataset.direction) || -1, lenis });
  });
}

/** The big statement lights up word by word as you scroll through it. */
function initStatement() {
  const statement = document.querySelector("[data-scrub-words]");
  if (!statement) return;
  const split = SplitText.create(statement, { type: "words", wordsClass: "sw" });
  gsap.fromTo(
    split.words,
    { opacity: 0.13 },
    {
      opacity: 1,
      ease: "none",
      stagger: 0.1,
      scrollTrigger: { trigger: statement, start: "top 85%", end: "bottom 62%", scrub: true },
    }
  );
}

/** Holographic profile card: tilts towards the cursor, glare follows it, click flips it. */
function initHolo() {
  const root = document.querySelector("[data-holo]");
  if (!root) return;
  const card = root.querySelector(".holo__card");
  const float = root.querySelector(".holo__float");
  const reduced = device.reducedMotion;

  const state = { rx: 0, ry: 0, flip: 0, mx: 50, my: 50, hyp: 0 };
  const render = () => {
    card.style.transform = `rotateX(${state.rx}deg) rotateY(${state.ry + state.flip}deg)`;
    root.style.setProperty("--mx", `${state.mx}%`);
    root.style.setProperty("--my", `${state.my}%`);
    root.style.setProperty("--hyp", state.hyp.toFixed(3));
  };
  const settings = { duration: 0.7, ease: "power3.out", onUpdate: render };
  const to = {
    rx: gsap.quickTo(state, "rx", settings),
    ry: gsap.quickTo(state, "ry", settings),
    mx: gsap.quickTo(state, "mx", settings),
    my: gsap.quickTo(state, "my", settings),
    hyp: gsap.quickTo(state, "hyp", settings),
  };

  if (device.finePointer && !reduced) {
    root.addEventListener("pointermove", (event) => {
      const rect = root.getBoundingClientRect();
      const px = clamp((event.clientX - rect.left) / rect.width);
      const py = clamp((event.clientY - rect.top) / rect.height);
      to.rx((0.5 - py) * 24);
      to.ry((px - 0.5) * 28);
      to.mx(px * 100);
      to.my(py * 100);
      to.hyp(clamp(Math.hypot(px - 0.5, py - 0.5) / 0.7071));
    });
    root.addEventListener("pointerleave", () => {
      to.rx(0);
      to.ry(0);
      to.mx(50);
      to.my(50);
      to.hyp(0);
    });
  }

  const flip = () => {
    const showBack = state.flip < 90;
    gsap.to(state, { flip: showBack ? 180 : 0, duration: reduced ? 0.01 : 1.2, ease: "expo.inOut", onUpdate: render });
    root.setAttribute("aria-pressed", String(showBack));
  };
  root.addEventListener("click", (event) => {
    if (event.target.closest("a")) return;
    flip();
  });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      flip();
    }
  });

  if (reduced) return;

  // Entrance: the card swings in from the side
  gsap.from(root, {
    rotateY: -55,
    rotateX: 18,
    y: 120,
    autoAlpha: 0,
    transformPerspective: 1200,
    duration: 1.8,
    ease: "expo.out",
    scrollTrigger: { trigger: root, start: "top 88%", once: true },
  });
  // Idle float
  gsap.to(float, { y: -14, rotateZ: 1.2, duration: 3.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
}
