document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("heroVideo");

  if (video) {
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

    // The video must NOT loop — log when it reaches the final frame.
    video.addEventListener("ended", () => {
      console.log("Hero video reached its last frame.");
    });
  }

  // Mobile menu toggle (placeholder behaviour — the nav is CDN-icon driven).
  const toggle = document.querySelector(".mobile-menu-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
    });
  }
});
