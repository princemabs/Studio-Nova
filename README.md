# STUDIO.NOVA — immersive 3D portfolio

A single-page portfolio built with **Three.js**, **GSAP** (ScrollTrigger, SplitText, ScrambleText) and **Lenis** smooth scrolling, bundled with **Vite**.

## Run it

```bash
npm install
npm run dev       # local dev server with hot reload → http://localhost:5173
npm run build     # production build → dist/
npm run preview   # serve the production build locally
```

> The site uses ES modules, so open it through the dev server — double-clicking `index.html` won't work.

## What happens on the page

| Section | Effects |
| --- | --- |
| Preloader | Counter driven by real loading (fonts, hero film, WebGL), cube line-drawing, curtain wipe |
| Hero | Film plays once from its first frame, scrambled greeting, 3D character reveal, rotating word, count-up stats, mouse parallax, magnetic buttons |
| Scroll "dive" | The hero pins, zooms into the right-hand monitor, flashes through warp streaks and lands in a real-time particle universe |
| Work | Pinned horizontal gallery. Each card is a **live 3D scene** rendered into a WebGL plane that bends and splits colour with scroll speed, and zooms/ripples on hover |
| About | Word-by-word scroll highlight, holographic profile card (tilt, foil, glare, click to flip), velocity-reactive skills marquee |
| Services | Sticky cards that sink back in 3D as the next one slides over, CSS 3D visuals |
| Contact | Validated form that opens the visitor's email app pre-filled, copy-email button |
| Everywhere | 26k-particle sculpture that morphs per section (nova core → galaxy → 4D tesseract → neon wave field → portal ring), custom cursor, film grain, scroll progress, hide-on-scroll header, full-screen mobile menu |

## Make it yours

All copy lives in `index.html`. Things you should replace:

- **Email** — search for `hello@studionova.example` and replace every occurrence.
- **Social links** — the GitHub / LinkedIn / X / Dribbble links use `href="#"`.
- **CV** — put your PDF in `public/` (e.g. `public/cv.pdf`) and set the *Download CV* link to `cv.pdf`.
- **Projects** — edit the five `.project-card` blocks (title, description, tags, year, link).
- **Stats & bio** — years / projects / clients counters (`data-count`) and the About text.

Visual tweaks:

- **Colours & fonts** — design tokens at the top of `css/style.css` (`:root`).
- **Project covers** — each card's `data-scene` picks a 3D scene from `js/webgl/covers/` (`nebula`, `orbit`, `prism`, `wave`, `helix`). Add your own by copying one of the classes and registering it in `js/webgl/covers/index.js`.
- **Particle sculpture** — shape, position, scale and opacity per section in `STATES` (`js/webgl/World.js`); colours in `js/webgl/Particles.js`; shapes in `js/webgl/shapes.js`.
- **Hero film** — the video URL is in `index.html`. If you change the film, update `MONITOR` in `js/sections/hero.js` to the point the dive should zoom into.
- **Contact form backend** — it uses `mailto:` (no server needed). Swap the `send()` function in `js/sections/contact.js` for a `fetch()` to Formspree, Netlify Forms or your own API if you prefer.

## Project structure

```
index.html              markup & content
css/style.css           all styles (tokens, sections, responsive, reduced motion)
public/                 favicon, hero poster (copied as-is)
js/main.js              boot sequence (preloader → scenes → intro)
js/core/                smooth scroll, preloader, cursor, magnetic, nav, reveals, marquee
js/sections/            hero, work, about, services, contact, footer
js/webgl/               World (renderer + loop), Particles, Starfield, ProjectPlanes
js/webgl/covers/        the five live 3D project scenes
js/webgl/shaders/       GLSL (noise, particles, planes)
_original/              your original hero files, untouched (safe to delete)
```

## Performance & accessibility

- WebGL loads lazily, pauses while the hero film covers it, renders project scenes only when visible, and lowers its resolution automatically on slow GPUs.
- `prefers-reduced-motion` turns off the pinned dive, smooth scrolling, the horizontal gallery and the idle animations.
- Without WebGL the site still works: project cards fall back to gradients.
- Keyboard friendly: skip link, visible focus, focusing a project scrolls the gallery to it, `Esc` closes the menu.

## Deploy

Any static host works — deploy the `dist/` folder.

- **Netlify / Vercel**: build command `npm run build`, output directory `dist`.
- **GitHub Pages**: run `npm run build` and publish `dist/` (paths are relative, so sub-folders work).
