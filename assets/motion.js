// Scroll motion for every page, in the spirit of the app's RiseIn and StampPress:
// things rise onto their printed shadow as they scroll into view, tags get stamped on,
// the sunburst turns as you scroll, and a red ink bar tracks how far down you are.
// With reduced motion (or no JavaScript) everything simply shows, still.
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const root = document.documentElement;

  // ── Scroll progress bar and the header's shadow ──
  const header = document.querySelector(".site-header");
  const bar = document.createElement("div");
  bar.className = "scroll-progress";
  bar.setAttribute("aria-hidden", "true");
  if (header) header.append(bar);

  // ── Parallax pieces: [element, how far it drifts per pixel scrolled] ──
  const drift = [...document.querySelectorAll("[data-drift]")].map((el) => [el, parseFloat(el.dataset.drift) || 0]);
  const spinners = [...document.querySelectorAll(".rays")];

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = window.scrollY;
      const max = Math.max(1, root.scrollHeight - window.innerHeight);
      bar.style.transform = `scaleX(${Math.min(1, y / max)})`;
      header?.classList.toggle("scrolled", y > 8);
      if (reduce.matches) return;

      const vh = window.innerHeight;
      for (const el of spinners) {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) continue;
        // Turns a few degrees as the poster passes through the screen.
        const t = (vh - r.top) / (vh + r.height); // 0 → 1 while visible
        el.style.setProperty("--rays-turn", `${(t - 0.3) * 14}deg`);
      }
      for (const [el, k] of drift) {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        const offset = (r.top + r.height / 2 - vh / 2) * k;
        el.style.setProperty("--drift", `${offset.toFixed(1)}px`);
      }
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  if (reduce.matches || !("IntersectionObserver" in window)) return;

  // ── Reveal on scroll ──
  // Each page can add its own targets with data-reveal; these are the shared ones.
  const groups = {
    rise: ".section-title, .section-lead, .eyebrow, .card, .cta, .doc-poster, .toc, .lead, .checks li, .ticket-row, .tickets + .btn, .fine, .hero-actions > *, .hero-note, .hero-lead, .site-footer .container > *",
    stamp: ".print-tag, .stamp, .ink-tag",
    pop: ".hero h1 .line, .pro-poster .display span, .step .n, .feature .icon",
    poster: ".hero-poster, .pro-poster",
  };
  const seen = new Set();
  for (const [kind, selector] of Object.entries(groups)) {
    for (const el of document.querySelectorAll(selector)) {
      if (seen.has(el) || el.closest("[data-no-reveal]")) continue;
      seen.add(el);
      el.dataset.reveal ||= kind;
    }
  }
  const items = [...document.querySelectorAll("[data-reveal]")];

  // Siblings that arrive together are dealt one after another, like cards.
  const order = new Map();
  for (const el of items) {
    const n = order.get(el.parentElement) ?? 0;
    order.set(el.parentElement, n + 1);
    el.style.setProperty("--reveal-delay", `${Math.min(n, 6) * 70}ms`);
  }

  root.classList.add("motion");

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  items.forEach((el) => io.observe(el));

  // Anything a jump link skips past still shows when you scroll back up.
  window.addEventListener("hashchange", () => {
    for (const el of items) {
      if (el.getBoundingClientRect().bottom < window.innerHeight) el.classList.add("is-in");
    }
  });

  // ── Hooks for page scripts: run once when an element first scrolls into view ──
  window.cutoroOnView = (el, fn, threshold = 0.5) => {
    const once = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { once.disconnect(); fn(); }
    }, { threshold });
    once.observe(el);
  };
})();
