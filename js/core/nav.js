import { gsap } from "gsap";

/**
 * Fixed header behaviour (glass on scroll, hide on the way down, show on the way up),
 * sliding active-link indicator, scroll progress bar and the full-screen mobile menu.
 */
export function initNav({ scroll }) {
  const header = document.querySelector(".site-header");
  const links = [...document.querySelectorAll(".nav-link")];
  const indicator = document.querySelector(".nav-indicator");
  const progress = document.querySelector(".scroll-progress span");
  const toggle = document.querySelector(".mobile-menu-toggle");
  const menu = document.getElementById("mobileMenu");

  let menuOpen = false;
  let activeName = "home";

  /* ---------- Header state ---------- */
  scroll.lenis.on("scroll", ({ scroll: y, direction, limit }) => {
    header.classList.toggle("is-scrolled", y > 40);
    if (!menuOpen) {
      if (direction === 1 && y > 140) header.classList.add("is-hidden");
      else if (direction === -1) header.classList.remove("is-hidden");
    }
    if (progress) progress.style.transform = `scaleX(${limit > 0 ? y / limit : 0})`;
  });

  /* ---------- Active link indicator ---------- */
  const moveIndicator = (immediate = false) => {
    const active = links.find((link) => link.dataset.nav === activeName);
    if (!indicator || !active || !active.offsetWidth) return;
    gsap.to(indicator, {
      x: active.offsetLeft,
      width: active.offsetWidth,
      duration: immediate ? 0 : 0.8,
      ease: "expo.out",
    });
  };

  const setActive = (name) => {
    if (!name || name === activeName) return;
    activeName = name;
    links.forEach((link) => {
      const isActive = link.dataset.nav === name;
      link.classList.toggle("active", isActive);
      if (isActive) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
    moveIndicator();
  };

  moveIndicator(true);
  window.addEventListener("resize", () => moveIndicator(true));
  document.fonts?.ready.then(() => moveIndicator(true));

  /* ---------- Mobile menu ---------- */
  if (toggle && menu) {
    const bg = menu.querySelector(".mobile-menu__bg");
    const texts = menu.querySelectorAll(".mm-text");
    const nums = menu.querySelectorAll(".mm-num");
    const footer = menu.querySelector(".mobile-menu__footer");
    const circle = (size) => `circle(${size}% at calc(100% - 3rem) 3rem)`;
    let timeline = null;

    menu.inert = true;

    const open = () => {
      menuOpen = true;
      document.documentElement.classList.add("menu-open");
      header.classList.remove("is-hidden");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close menu");
      menu.classList.add("is-open");
      menu.setAttribute("aria-hidden", "false");
      menu.inert = false;
      scroll.lenis.stop();

      timeline?.kill();
      timeline = gsap
        .timeline()
        .fromTo(bg, { clipPath: circle(0) }, { clipPath: circle(150), duration: 1, ease: "expo.inOut" })
        .fromTo(texts, { yPercent: 110 }, { yPercent: 0, duration: 1, ease: "expo.out", stagger: 0.06 }, 0.35)
        .fromTo(nums, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, stagger: 0.06 }, 0.5)
        .fromTo(footer, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: "expo.out" }, 0.6)
        .add(() => menu.querySelector(".mm-link")?.focus({ preventScroll: true }), 0.6);
    };

    const close = (onClosed) => {
      menuOpen = false;
      document.documentElement.classList.remove("menu-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      menu.inert = true;

      timeline?.kill();
      timeline = gsap
        .timeline({
          onComplete: () => {
            menu.classList.remove("is-open");
            menu.setAttribute("aria-hidden", "true");
            scroll.lenis.start();
            onClosed?.();
          },
        })
        .to(texts, { yPercent: -110, duration: 0.5, ease: "expo.in", stagger: 0.03 })
        .to([footer, ...nums], { autoAlpha: 0, duration: 0.3 }, 0)
        .to(bg, { clipPath: circle(0), duration: 0.8, ease: "expo.inOut" }, 0.2);
    };

    toggle.addEventListener("click", () => (menuOpen ? close() : open()));

    menu.querySelectorAll("a[href^='#']").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const hash = link.getAttribute("href");
        close(() => {
          if (hash === "#") return;
          const target = hash === "#home" ? 0 : document.querySelector(hash);
          if (target !== null) scroll.scrollTo(target);
        });
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuOpen) {
        close();
        toggle.focus();
      }
    });

    window.addEventListener("resize", () => {
      if (menuOpen && window.innerWidth > 1024) close();
    });
  }

  return { setActive };
}
