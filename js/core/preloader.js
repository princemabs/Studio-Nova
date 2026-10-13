import { gsap } from "gsap";

/**
 * Counts from 0 to 100 while real assets load (fonts, hero film, WebGL).
 * A gentle "fake" progress keeps the counter alive on slow networks and
 * real progress pulls it ahead as tasks complete.
 */
export class Preloader {
  constructor(element) {
    this.element = element;
    this.count = element?.querySelector(".js-preloader-count");
    this.bar = element?.querySelector(".preloader__bar span");
    this.displayed = 0;
    this.target = 0;
    this.startTime = performance.now();
    this.finished = false;
    this.onComplete = null;
    this.tick = this.tick.bind(this);
    if (element) gsap.ticker.add(this.tick);
  }

  /** Resolves once every task settled (or maxDuration passed) and the counter reached 100. */
  load(tasks, { minDuration = 1800, maxDuration = 7000 } = {}) {
    if (!this.element) return Promise.all(tasks).catch(() => {});

    let settled = 0;
    const onSettle = () => {
      settled += 1;
      this.target = Math.max(this.target, settled / tasks.length);
    };
    tasks.forEach((task) => Promise.resolve(task).then(onSettle, onSettle));

    const all = Promise.allSettled(tasks);
    const timeout = new Promise((resolve) => setTimeout(resolve, maxDuration));
    const minimum = new Promise((resolve) => setTimeout(resolve, minDuration));

    return Promise.all([Promise.race([all, timeout]), minimum]).then(
      () =>
        new Promise((resolve) => {
          this.target = 1;
          this.onComplete = resolve;
        })
    );
  }

  tick() {
    const elapsed = (performance.now() - this.startTime) / 1000;
    const fake = Math.min(0.9, 1 - Math.exp(-elapsed * 0.7));
    const goal = Math.max(this.target, fake * 0.92);
    const speed = this.target >= 1 ? 0.14 : 0.06;
    this.displayed += (goal - this.displayed) * speed;
    if (this.target >= 1 && 1 - this.displayed < 0.004) this.displayed = 1;

    if (this.count) this.count.textContent = String(Math.round(this.displayed * 100));
    if (this.bar) this.bar.style.transform = `scaleX(${this.displayed})`;

    if (this.displayed >= 1 && this.onComplete && !this.finished) {
      this.finished = true;
      gsap.ticker.remove(this.tick);
      this.onComplete();
    }
  }

  /** Lifts the curtain. `onReveal` fires as the hero starts to show. */
  exit(onReveal) {
    const el = this.element;
    if (!el) {
      onReveal?.();
      return gsap.timeline();
    }
    const q = gsap.utils.selector(el);
    const tl = gsap.timeline({
      onComplete: () => {
        el.style.display = "none";
      },
    });
    tl.to(q(".js-preloader-count, .preloader__count sup"), { yPercent: -110, duration: 0.8, ease: "expo.in", stagger: 0.05 })
      .to(q(".preloader__label-line, .preloader__brand span"), { yPercent: -120, duration: 0.7, ease: "expo.in", stagger: 0.04 }, 0)
      .to(q(".preloader__cube"), { scale: 0.5, rotate: 45, autoAlpha: 0, duration: 0.8, ease: "expo.in" }, 0)
      .to(q(".preloader__bar"), { autoAlpha: 0, duration: 0.4 }, 0.3)
      .fromTo(el, { clipPath: "inset(0% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 100% 0%)", duration: 1.25, ease: "expo.inOut" }, 0.6)
      .add(() => onReveal?.(), 0.95);
    return tl;
  }
}
