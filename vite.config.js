import { defineConfig } from "vite";

/**
 * Phosphor's stylesheet lists four font formats (woff2, woff, ttf, svg).
 * Every modern browser uses woff2, so keep only that one — this removes
 * ~4 MB of unused font files from the production build.
 */
const phosphorWoff2Only = {
  name: "phosphor-woff2-only",
  enforce: "pre",
  transform(code, id) {
    if (id.includes("@phosphor-icons/web") && id.includes(".css")) {
      return code.replace(/src:[^;]+;/, 'src: url("./Phosphor.woff2") format("woff2");');
    }
    return null;
  },
};

// Relative base so the production build works from any sub-path
// (GitHub Pages, Netlify, Vercel, a plain static host…).
export default defineConfig({
  base: "./",
  plugins: [phosphorWoff2Only],
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 1200,
  },
});
