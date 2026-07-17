/* ============================================================
   skillsdev.ai — App bootstrap
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {
  /* ---------------- Mobile menu ---------------- */
  const burger = document.getElementById("burgerBtn");
  const mobileMenu = document.getElementById("mobileMenu");
  function setMobileMenuOpen(open) {
    mobileMenu.classList.toggle("open", open);
    if (burger) {
      burger.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
    document.body.classList.toggle("no-scroll", open);
  }
  window.closeMobileMenu = () => setMobileMenuOpen(false);
  if (burger) {
    burger.addEventListener("click", () => setMobileMenuOpen(!mobileMenu.classList.contains("open")));
  }
  mobileMenu.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => setMobileMenuOpen(false))
  );
  window.addEventListener("resize", () => {
    if (window.innerWidth > 920) setMobileMenuOpen(false);
  });

  /* ---------------- Hero ambient visual: a live constellation-style aurora diagram ---------------- */
  (function renderHeroVisual() {
    const el = document.getElementById("heroVisual");
    if (!el) return;
    el.innerHTML = `
    <svg viewBox="0 0 420 460" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="heroGrad" x1="0" y1="0" x2="420" y2="460">
          <stop offset="0" stop-color="#8b6bff"/>
          <stop offset="0.5" stop-color="#34e0c2"/>
          <stop offset="1" stop-color="#ff6ec9"/>
        </linearGradient>
      </defs>
      <g id="heroLines" stroke="url(#heroGrad)" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.85">
        <path d="M 90 60 C 90 130, 210 120, 210 190" />
        <path d="M 330 90 C 330 150, 210 140, 210 190" />
        <path d="M 210 190 C 210 250, 100 260, 100 320" />
        <path d="M 210 190 C 210 250, 320 270, 320 330" />
        <path d="M 100 320 C 100 370, 210 380, 210 420" />
        <path d="M 320 330 C 320 380, 210 380, 210 420" />
      </g>
      <g id="heroNodes">
        <circle cx="90" cy="60" r="10" fill="#8b6bff"/>
        <circle cx="330" cy="90" r="8" fill="#ffc15e"/>
        <circle cx="210" cy="190" r="12" fill="#34e0c2"/>
        <circle cx="100" cy="320" r="8" fill="#8b6bff"/>
        <circle cx="320" cy="330" r="8" fill="#ffc15e"/>
        <circle cx="210" cy="420" r="10" fill="#34e0c2"/>
      </g>
    </svg>`;

    const paths = el.querySelectorAll("#heroLines path");
    paths.forEach((p, i) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
      p.animate(
        [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
        { duration: 1400, delay: i * 180, fill: "forwards", easing: "cubic-bezier(.16,.84,.44,1)" }
      );
    });
    el.querySelectorAll("#heroNodes circle").forEach((c, i) => {
      c.animate(
        [{ opacity: 0, transform: "scale(0.4)" }, { opacity: 1, transform: "scale(1)" }],
        { duration: 500, delay: 300 + i * 160, fill: "forwards", easing: "cubic-bezier(.16,.84,.44,1)" }
      );
    });
  })();

  /* ---------------- Init app modules ---------------- */
  Views.init();
  Chat.init();
});
