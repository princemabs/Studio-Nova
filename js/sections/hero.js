import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { device } from "../utils/device.js";
import { clamp } from "../utils/math.js";

// Where the right-hand monitor sits in the film's final frame (fractions of the frame).
const MONITOR = { x: 0.645, y: 0.47 };
const VIDEO_RATIO = 16 / 9;

export class Hero {
  constructor(section) {
    this.section = section;
    this.q = gsap.utils.selector(section);
    this.video = section.querySelector("#heroVideo");
    this.videoContainer = section.querySelector(".video-container");
    this.zoom = section.querySelector(".video-zoom");
    this.parallax = section.querySelector(".video-parallax");
    this.overlay = section.querySelector(".video-overlay");
    this.flash = section.querySelector(".video-flash");
    this.content = section.querySelector(".hero-content");
    this.text = section.querySelector(".hero-text");
    this.footer = section.querySelector(".hero-footer");
    this.intro = section.querySelector(".hero-intro");
    this.dive = { warp: 0, form: device.reducedMotion ? 1 : 0 };
    this.videoHeld = true;
    this.holdVideo();
  }

  /* ------------------------------------------------------------------ */
  /* Video                                                               */
  /* ------------------------------------------------------------------ */

  /** Keep the film on hold behind the preloader so it always starts at its first frame. */
  holdVideo() {
    const video = this.video;
    if (!video) return;
    video.loop = false;

    const hold = () => {
      if (!this.videoHeld) return;
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        /* currentTime may throw before metadata is ready; ignore */
      }
    };
    video.addEventListener("playing", hold);
    if (!video.paused) hold();

    // The video must NOT loop — log when it reaches the final frame.
    video.addEventListener("ended", () => {
      console.log("Hero video reached its last frame.");
      this.section.classList.add("video-ended");
    });
  }

  whenVideoReady(timeout = 4500) {
    const video = this.video;
    if (!video || video.readyState >= 3) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(done, timeout);
      video.addEventListener("canplay", done, { once: true });
      video.addEventListener("playing", done, { once: true });
      video.addEventListener("error", done, { once: true });
    });
  }

  startVideo() {
    const video = this.video;
    if (!video) return;
    this.videoHeld = false;

    // Always begin at the first frame.
    const startPlayback = () => {
      try {
        video.currentTime = 0;
      } catch {
        /* currentTime may throw before metadata is ready; ignore */
      }
      const attempt = video.play();
      if (attempt && typeof attempt.catch === "function") {
        attempt.catch((err) => {
          // Browser blocked autoplay (e.g. power-saving). Not fatal.
          console.warn("Hero video autoplay was prevented:", err);
        });
      }
    };

    if (video.readyState >= 1) startPlayback();
    else video.addEventListener("loadedmetadata", startPlayback, { once: true });
  }

  /* ------------------------------------------------------------------ */
  /* Intro (plays as the preloader lifts)                                */
  /* ------------------------------------------------------------------ */

  prepareIntro() {
    const q = this.q;
    this.greeting = q(".greeting")[0];
    this.greetingText = this.greeting?.textContent.trim() || "";

    this.titleSplit = SplitText.create(q(".main-title"), {
      type: "lines, words, chars",
      mask: "lines",
      linesClass: "tl",
      wordsClass: "word",
      charsClass: "char",
    });

    gsap.set("[data-intro='nav']", { autoAlpha: 0, y: -24 });
    gsap.set(this.greeting, { autoAlpha: 0 });
    gsap.set(this.titleSplit.chars, { yPercent: 120, rotateX: -80, transformOrigin: "50% 100%" });
    gsap.set(q(".sub-title, .cta-group .btn, [data-intro='footer']"), { autoAlpha: 0, y: 34 });
    gsap.set(this.video, { scale: 1.14 });
    q("[data-count]").forEach((el) => (el.textContent = `0${el.dataset.suffix || ""}`));
  }

  playIntro() {
    const q = this.q;
    this.startVideo();

    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.to(this.video, { scale: 1, duration: 3.2, ease: "power3.out" }, 0)
      .to("[data-intro='nav']", { autoAlpha: 1, y: 0, duration: 1.3, stagger: 0.08 }, 0.15)
      .set(this.greeting, { autoAlpha: 1 }, 0.25)
      .to(
        this.greeting,
        {
          duration: 1.3,
          ease: "none",
          scrambleText: { text: this.greetingText, chars: "upperCase", speed: 0.5, revealDelay: 0.25 },
        },
        0.25
      )
      .to(this.titleSplit.chars, { yPercent: 0, rotateX: 0, duration: 1.6, stagger: 0.022 }, 0.3)
      .to(q(".sub-title"), { autoAlpha: 1, y: 0, duration: 1.3 }, 0.8)
      .to(q(".cta-group .btn"), { autoAlpha: 1, y: 0, duration: 1.3, stagger: 0.1 }, 0.95)
      .to(q("[data-intro='footer']"), { autoAlpha: 1, y: 0, duration: 1.3, stagger: 0.1 }, 1.05)
      .add(() => this.countStats(), 1.1)
      .add(() => this.startRotator(), 1.8);
    return tl;
  }

  countStats() {
    this.q("[data-count]").forEach((el, i) => {
      const end = Number(el.dataset.count) || 0;
      const suffix = el.dataset.suffix || "";
      const counter = { value: 0 };
      gsap.to(counter, {
        value: end,
        duration: 2.2,
        delay: i * 0.12,
        ease: "power3.out",
        onUpdate: () => (el.textContent = `${Math.round(counter.value)}${suffix}`),
      });
    });
  }

  /** Cycles the highlighted word in the subtitle with a 3D flip. */
  startRotator() {
    const rotator = this.q(".word-rotator")[0];
    if (!rotator) return;
    const items = [...rotator.querySelectorAll(".word-rotator__item")];
    if (items.length < 2) return;

    let index = 0;
    gsap.set(items, { yPercent: 110, rotateX: -85, autoAlpha: 0 });
    gsap.set(items[0], { yPercent: 0, rotateX: 0, autoAlpha: 1 });
    gsap.set(rotator, { width: items[0].offsetWidth });

    window.addEventListener("resize", () => gsap.set(rotator, { width: items[index].offsetWidth }));

    const next = () => {
      const outgoing = items[index];
      index = (index + 1) % items.length;
      const incoming = items[index];
      gsap
        .timeline({ defaults: { duration: 0.9, ease: "expo.inOut" } })
        .to(outgoing, { yPercent: -110, rotateX: 85, autoAlpha: 0 }, 0)
        .fromTo(incoming, { yPercent: 110, rotateX: -85, autoAlpha: 0 }, { yPercent: 0, rotateX: 0, autoAlpha: 1 }, 0)
        .to(rotator, { width: incoming.offsetWidth }, 0);
    };

    gsap.timeline({ repeat: -1 }).call(next, null, 2.6);
  }

  /* ------------------------------------------------------------------ */
  /* Mouse parallax                                                      */
  /* ------------------------------------------------------------------ */

  initParallax() {
    if (!device.finePointer || device.reducedMotion) return;
    const videoX = gsap.quickTo(this.parallax, "x", { duration: 1.4, ease: "power3" });
    const videoY = gsap.quickTo(this.parallax, "y", { duration: 1.4, ease: "power3" });
    const textX = gsap.quickTo(this.text, "x", { duration: 1.4, ease: "power3" });
    const textY = gsap.quickTo(this.text, "y", { duration: 1.4, ease: "power3" });

    window.addEventListener(
      "pointermove",
      (event) => {
        if (window.scrollY > window.innerHeight) return;
        const nx = event.clientX / window.innerWidth - 0.5;
        const ny = event.clientY / window.innerHeight - 0.5;
        videoX(-nx * 30);
        videoY(-ny * 20);
        textX(nx * 14);
        textY(ny * 10);
      },
      { passive: true }
    );
  }

  /* ------------------------------------------------------------------ */
  /* Scroll dive: zoom into the monitor and arrive in the 3D world       */
  /* ------------------------------------------------------------------ */

  /** Places the zoom origin on the monitor, accounting for object-fit: cover. */
  updateOrigin() {
    const width = this.zoom.offsetWidth;
    const height = this.zoom.offsetHeight;
    const videoWidth = Math.max(width, height * VIDEO_RATIO);
    const videoHeight = videoWidth / VIDEO_RATIO;
    const x = clamp((width - videoWidth) / 2 + MONITOR.x * videoWidth, width * 0.2, width * 0.8);
    const y = clamp((height - videoHeight) / 2 + MONITOR.y * videoHeight, height * 0.25, height * 0.75);
    gsap.set(this.zoom, { transformOrigin: `${x}px ${y}px` });
    this.flash.style.setProperty("--fx", `${x}px`);
    this.flash.style.setProperty("--fy", `${y}px`);
  }

  initDive(world) {
    if (world) world.dive = this.dive;
    const q = this.q;

    if (device.reducedMotion) {
      // No pinning or zooming — the film simply fades as the page scrolls.
      gsap.to(this.videoContainer, {
        autoAlpha: 0,
        ease: "none",
        scrollTrigger: { trigger: this.section, start: "top top", end: "bottom top", scrub: true },
      });
      world?.setCovered(false);
      return;
    }

    this.updateOrigin();
    gsap.set(this.intro, { autoAlpha: 0 });

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: this.section,
        start: "top top",
        end: () => `+=${Math.round(window.innerHeight * 1.75)}`,
        pin: true,
        scrub: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onRefresh: () => this.updateOrigin(),
        onUpdate: (self) => {
          world?.setCovered(self.progress < 0.48);
          this.section.classList.toggle("is-diving", self.progress > 0.02);
        },
      },
    });

    tl.to(this.content, { yPercent: -16, rotateX: 22, scale: 0.9, autoAlpha: 0, transformPerspective: 1100, duration: 0.3, ease: "power2.in" }, 0)
      .to(this.footer, { y: 80, autoAlpha: 0, duration: 0.24, ease: "power2.in" }, 0)
      .to(this.zoom, { scale: 7.5, duration: 0.72, ease: "power3.in" }, 0)
      .to(this.overlay, { autoAlpha: 0, duration: 0.45, ease: "power1.in" }, 0.1)
      .to(this.flash, { opacity: 1, scale: 1.15, duration: 0.2, ease: "power2.in" }, 0.5)
      .to(this.videoContainer, { autoAlpha: 0, duration: 0.12 }, 0.64)
      .to(this.flash, { opacity: 0, scale: 1.7, duration: 0.2, ease: "power1.out" }, 0.7)
      .to(this.dive, { warp: 1, duration: 0.2, ease: "power2.in" }, 0.48)
      .to(this.dive, { warp: 0, duration: 0.28, ease: "power2.out" }, 0.7)
      .to(this.dive, { form: 1, duration: 0.36, ease: "power2.out" }, 0.62)
      .set(this.intro, { autoAlpha: 1 }, 0.78)
      .fromTo(q(".hero-intro__eyebrow"), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.1, ease: "power2.out" }, 0.8)
      .fromTo(q(".hi-line > span"), { yPercent: 115 }, { yPercent: 0, duration: 0.14, stagger: 0.035, ease: "power3.out" }, 0.8)
      .fromTo(q(".hero-intro__hint"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.08 }, 0.94);

    this.diveTimeline = tl;
  }
}
