import "@phosphor-icons/web/regular";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

import { device } from "./utils/device.js";
import { createScroll } from "./core/scroll.js";
import { Preloader } from "./core/preloader.js";
import { initCursor } from "./core/cursor.js";
import { initMagnetic } from "./core/magnetic.js";
import { initNav } from "./core/nav.js";
import { initReveals } from "./core/reveal.js";
import { Hero } from "./sections/hero.js";
import { initWork } from "./sections/work.js";
import { initAbout } from "./sections/about.js";
import { initServices } from "./sections/services.js";
import { initContact } from "./sections/contact.js";
import { initFooter } from "./sections/footer.js";

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });

const root = document.documentElement;

/** Runs a setup step without letting one failure take the whole page down. */
function safely(label, fn) {
  try {
    return fn();
  } catch (error) {
    console.error(`[${label}]`, error);
    return undefined;
  }
}

/** The WebGL world is loaded on demand so the page still works without it. */
function supportsWebGL2() {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

async function createWorld(lenis) {
  const canvas = document.querySelector(".webgl");
  if (!canvas) return null;
  if (!supportsWebGL2()) {
    root.classList.add("no-webgl");
    canvas.remove();
    return null;
  }
  try {
    const { World } = await import("./webgl/World.js");
    const world = new World({ canvas, tier: device.tier, reducedMotion: device.reducedMotion, lenis });
    await world.init();
    root.classList.add("has-webgl");
    return world;
  } catch (error) {
    console.warn("WebGL is unavailable — continuing without the 3D layer.", error);
    root.classList.add("no-webgl");
    canvas.remove();
    return null;
  }
}

/** Keeps the nav highlight and the 3D sculpture in sync with the section on screen. */
function trackSections({ nav, world }) {
  const sections = [...document.querySelectorAll("[data-section]")];
  sections.forEach((section, i) => {
    const name = section.dataset.section;
    const next = sections[i + 1];
    ScrollTrigger.create({
      trigger: section,
      start: "top 55%",
      endTrigger: next || undefined,
      end: next ? "top 55%" : "max",
      onToggle: (self) => {
        if (!self.isActive) return;
        nav?.setActive(name);
        world?.setSection(name === "home" ? "intro" : name);
      },
    });
  });
}

async function boot() {
  clearTimeout(window.__bootTimer);

  const preloader = new Preloader(document.querySelector(".preloader"));
  const scroll = createScroll();
  scroll.lenis.stop();
  window.scrollTo(0, 0);

  const hero = new Hero(document.querySelector(".hero-section"));
  const worldTask = createWorld(scroll.lenis);
  const fontsTask = document.fonts ? document.fonts.ready : Promise.resolve();

  await preloader.load([fontsTask, hero.whenVideoReady(), worldTask]);
  const world = await worldTask;

  // Fonts and layout are final — build every scroll scene.
  safely("hero", () => {
    hero.prepareIntro();
    hero.initDive(world);
    hero.initParallax();
  });
  safely("work", () => initWork({ world, lenis: scroll.lenis }));
  safely("about", () => initAbout({ lenis: scroll.lenis }));
  safely("services", () => initServices());
  safely("contact", () => initContact({ lenis: scroll.lenis }));
  safely("footer", () => initFooter({ scroll }));
  safely("reveals", () => initReveals());
  safely("cursor", () => initCursor());
  safely("magnetic", () => initMagnetic());
  const nav = safely("nav", () => initNav({ scroll }));
  safely("sections", () => trackSections({ nav, world }));

  ScrollTrigger.refresh();
  if (world) await world.warmup().catch(() => {});

  preloader.exit(() => {
    root.classList.add("is-ready");
    hero.playIntro();
    scroll.lenis.start();
  });

  // Fonts can still shift metrics slightly after load; re-measure once settled.
  window.addEventListener("load", () => ScrollTrigger.refresh());
}

boot().catch((error) => {
  console.error("Boot failed:", error);
  root.classList.add("is-ready", "boot-failed");
  root.classList.remove("lenis-stopped");
});
