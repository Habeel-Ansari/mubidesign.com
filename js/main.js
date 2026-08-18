/* ============================================================
   PORTFOLIO — Interactions & Animations
   ============================================================ */

'use strict';

// ──────────────────────────────────────────────
// UTILS
// ──────────────────────────────────────────────
const qs  = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const lerp = (a, b, t) => a + (b - a) * t;

// ──────────────────────────────────────────────
// 1. FONT LOADING — prevent FOUT flash
// ──────────────────────────────────────────────
function initFonts() {
  if (document.fonts) {
    document.fonts.ready.then(() => {
      document.body.classList.add('fonts-ready');
    });
  } else {
    document.body.classList.add('fonts-ready');
  }
}

// ──────────────────────────────────────────────
// 1b. LOADER — name reveal on first paint
// ──────────────────────────────────────────────
function initLoader() {
  const loader = qs('.loader');
  if (!loader) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    loader.remove();
    return;
  }

  requestAnimationFrame(() => loader.classList.add('is-visible'));

  setTimeout(() => {
    loader.classList.add('is-hidden');
    loader.addEventListener('transitionend', () => loader.remove(), { once: true });
  }, 1500);
}

// ──────────────────────────────────────────────
// 2. LOAD REVEALS — staggered entrance on page load
// ──────────────────────────────────────────────
function initLoadReveals() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    qsa('[data-load-reveal]').forEach(el => el.classList.add('is-loaded'));
    return;
  }

  requestAnimationFrame(() => {
    qsa('[data-load-reveal]').forEach(el => {
      el.classList.add('is-loaded');
    });
  });
}

// ──────────────────────────────────────────────
// 3. SCROLL REVEAL — intersection observer
// ──────────────────────────────────────────────
function initScrollReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    qsa('[data-reveal]').forEach(el => el.classList.add('is-revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '-40px 0px',
  });

  qsa('[data-reveal]').forEach(el => observer.observe(el));
}

// ──────────────────────────────────────────────
// 4. HEADER — hide on scroll down, show on scroll up
// ──────────────────────────────────────────────
function initHeader() {
  const header = qs('.header');
  if (!header) return;

  let lastY = window.scrollY;
  let ticking = false;

  function update() {
    const currentY = window.scrollY;
    const delta    = currentY - lastY;

    if (currentY > 80) {
      header.classList.toggle('is-hidden', delta > 0);
    } else {
      header.classList.remove('is-hidden');
    }

    lastY   = currentY;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });

  // Re-sync immediately and on bfcache restore, so the header can't get
  // stuck hidden if scroll position changes without a 'scroll' event firing.
  update();
  window.addEventListener('pageshow', update);
}

// ──────────────────────────────────────────────
// 5. MOBILE MENU
// ──────────────────────────────────────────────
function initMobileMenu() {
  const hamburger = qs('.hamburger');
  const menu      = qs('.mobile-menu');
  if (!hamburger || !menu) return;

  function close() {
    hamburger.classList.remove('is-open');
    menu.classList.remove('is-open');
    document.body.style.overflow = '';
    hamburger.setAttribute('aria-expanded', 'false');
  }

  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.toggle('is-open');
    menu.classList.toggle('is-open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });

  qsa('.mobile-menu__link', menu).forEach(link => link.addEventListener('click', close));

  // Close on outside click
  document.addEventListener('click', e => {
    if (menu.classList.contains('is-open') &&
        !menu.contains(e.target) &&
        !hamburger.contains(e.target)) {
      close();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
  });
}

// ──────────────────────────────────────────────
// 6. ACTIVE NAV LINKS — highlight current page
// ──────────────────────────────────────────────
function initNavLinks() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';

  qsa('.nav__link, .mobile-menu__link').forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const linkPath = href.replace(/\/$/, '') || '/';

    if (path === linkPath || (path !== '/' && linkPath !== '/' && path.startsWith(linkPath))) {
      link.classList.add('is-active');
    }
  });
}

// ──────────────────────────────────────────────
// 7. 3D TILT CARDS with lerp smoothing
// ──────────────────────────────────────────────
class TiltCard {
  constructor(el) {
    this.el        = el;
    this.amplitude = parseFloat(el.dataset.tiltAmplitude) || 3;
    this.speed     = 0.08;
    this.glare     = qs('.case-card__glare', el);

    this.tx = 0; this.ty = 0; // target
    this.cx = 0; this.cy = 0; // current
    this.isHovered = false;
    this.rafId     = null;

    this._onMove  = this._onMove.bind(this);
    this._onEnter = this._onEnter.bind(this);
    this._onLeave = this._onLeave.bind(this);
    this._tick    = this._tick.bind(this);

    el.addEventListener('mouseenter', this._onEnter);
    el.addEventListener('mousemove',  this._onMove);
    el.addEventListener('mouseleave', this._onLeave);
  }

  _onEnter() {
    this.isHovered = true;
    if (!this.rafId) this._tick();
  }

  _onMove(e) {
    const r = this.el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top)  / r.height;

    this.tx = -(y - 0.5) * this.amplitude * 2;
    this.ty =  (x - 0.5) * this.amplitude * 2;

    if (this.glare) {
      this.glare.style.setProperty('--glare-x', `${x * 100}%`);
      this.glare.style.setProperty('--glare-y', `${y * 100}%`);
    }
  }

  _onLeave() {
    this.isHovered = false;
    this.tx = 0;
    this.ty = 0;
  }

  _tick() {
    this.cx = lerp(this.cx, this.tx, this.speed);
    this.cy = lerp(this.cy, this.ty, this.speed);

    const active = this.isHovered || Math.abs(this.cx) > 0.005 || Math.abs(this.cy) > 0.005;

    if (active) {
      this.el.style.transform = `perspective(1000px) rotateX(${this.cx}deg) rotateY(${this.cy}deg)`;
      this.rafId = requestAnimationFrame(this._tick);
    } else {
      this.el.style.transform = '';
      this.rafId = null;
    }
  }
}

function initTilt() {
  if (window.innerWidth < 768 ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  qsa('[data-tilt]').forEach(el => new TiltCard(el));
}

// ──────────────────────────────────────────────
// 8. STICKY CARD BLUR — scale/blur buried cards
// ──────────────────────────────────────────────
function initStickyCards() {
  const cards = qsa('.case-item .case-card');
  if (cards.length < 2 || window.innerWidth < 768) return;

  function update() {
    cards.forEach((card, i) => {
      const next = cards[i + 1];
      if (!next) { card.style.transform = ''; card.style.filter = ''; return; }

      const r1 = card.getBoundingClientRect();
      const r2 = next.getBoundingClientRect();
      const overlap = r1.bottom - r2.top;

      if (overlap > 0) {
        const p     = Math.min(overlap / 100, 1);
        const scale = 1 - p * 0.04;
        const blur  = p * 2;
        card.style.transform = `perspective(1000px) scale(${scale})`;
        card.style.filter    = `blur(${blur}px)`;
      } else {
        card.style.transform = '';
        card.style.filter    = '';
      }
    });
  }

  window.addEventListener('scroll', update, { passive: true });
}

// ──────────────────────────────────────────────
// 9. TESTIMONIAL SLIDER with pixel transition
// ──────────────────────────────────────────────
function initTestimonials() {
  const slider = qs('.testimonial-slider');
  if (!slider) return;

  const slides  = qsa('.testimonial-slide', slider);
  const prevBtn = qs('.testimonial-btn--prev', slider);
  const nextBtn = qs('.testimonial-btn--next', slider);
  const dots    = qsa('.testimonial-dot', slider);
  if (!slides.length) return;

  let current       = 0;
  let transitioning = false;

  // ── Pixel reveal on avatar ──
  function pixelReveal(wrapper) {
    if (!wrapper) return;
    const GRID   = 8;
    const ov     = document.createElement('div');
    ov.className = 'pixel-overlay';

    const cells = Array.from({ length: GRID * GRID }, () => {
      const c = document.createElement('div');
      c.className = 'pixel-cell';
      ov.appendChild(c);
      return c;
    });

    wrapper.appendChild(ov);

    const shuffled = cells.sort(() => Math.random() - 0.5);
    const DURATION = 280;
    const step     = DURATION / cells.length;

    // reveal
    shuffled.forEach((c, i) => setTimeout(() => { c.style.opacity = '1'; }, i * step));

    // hide + remove
    setTimeout(() => {
      shuffled.forEach((c, i) => setTimeout(() => { c.style.opacity = '0'; }, i * step));
      setTimeout(() => ov.remove(), DURATION + 80);
    }, DURATION + 100);
  }

  function goTo(idx, dir = 1) {
    if (transitioning || idx === current) return;
    transitioning = true;

    const from = slides[current];
    const to   = slides[idx];

    // Pixel on avatar
    pixelReveal(qs('.testimonial-avatar-wrapper', from));

    // Fade/slide out
    Object.assign(from.style, {
      opacity: '0',
      transform: `translateX(${dir > 0 ? '-24px' : '24px'})`,
      transition: 'opacity 0.28s ease, transform 0.28s ease',
      pointerEvents: 'none',
    });

    setTimeout(() => {
      from.classList.remove('is-active');
      Object.assign(from.style, { opacity: '', transform: '', transition: '', pointerEvents: '' });

      to.classList.add('is-active');
      Object.assign(to.style, {
        opacity: '0',
        transform: `translateX(${dir > 0 ? '24px' : '-24px'})`,
        transition: 'none',
      });

      requestAnimationFrame(() => requestAnimationFrame(() => {
        Object.assign(to.style, {
          opacity: '1',
          transform: 'translateX(0)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        });
      }));

      setTimeout(() => {
        Object.assign(to.style, { opacity: '', transform: '', transition: '' });
        transitioning = false;
      }, 450);
    }, 300);

    current = idx;
    syncUI();
  }

  function syncUI() {
    dots.forEach((d, i) => d.classList.toggle('is-active', i === current));
    if (prevBtn) prevBtn.disabled = current === 0;
    if (nextBtn) nextBtn.disabled = current === slides.length - 1;
  }

  if (prevBtn) prevBtn.addEventListener('click', () => { if (current > 0) goTo(current - 1, -1); });
  if (nextBtn) nextBtn.addEventListener('click', () => { if (current < slides.length - 1) goTo(current + 1, 1); });
  dots.forEach((d, i) => d.addEventListener('click', () => goTo(i, i > current ? 1 : -1)));

  // Swipe support
  const slidesEl = qs('.testimonial-slides', slider);
  if (slidesEl) {
    let startX = 0;
    slidesEl.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    slidesEl.addEventListener('touchend', e => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 48) {
        if (diff > 0 && current < slides.length - 1) goTo(current + 1, 1);
        else if (diff < 0 && current > 0) goTo(current - 1, -1);
      }
    });
  }

  syncUI();
}

// ──────────────────────────────────────────────
// 10. EMAIL COPY + SPARKS
// ──────────────────────────────────────────────
function initCopyEmail() {
  qsa('.copy-btn').forEach(btn => {
    const textEl = btn.previousElementSibling;
    const text   = textEl ? textEl.textContent.trim() : '';
    if (!text) return;

    btn.addEventListener('click', (e) => {
      const doCopy = () => {
        btn.classList.add('is-copied');
        fireSparks(e.clientX, e.clientY);
        setTimeout(() => btn.classList.remove('is-copied'), 2200);
      };

      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(doCopy).catch(() => legacyCopy(text, doCopy));
      } else {
        legacyCopy(text, doCopy);
      }
    });
  });
}

function legacyCopy(text, cb) {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
  document.body.appendChild(el);
  el.select();
  try { document.execCommand('copy'); cb(); } catch (_) {}
  el.remove();
}

function fireSparks(x, y) {
  const count  = 12;
  const colors = ['#171717', '#525252', '#A3A3A3', '#171717', '#737373', '#171717'];

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'spark';

    const angle = (i / count) * 360 + Math.random() * 20;
    const dist  = 16 + Math.random() * 18;

    el.style.left    = `${x}px`;
    el.style.top     = `${y}px`;
    el.style.setProperty('--angle', `${angle}deg`);
    el.style.setProperty('--dist',  `${dist}px`);
    el.style.background       = colors[i % colors.length];
    el.style.animationDelay   = `${Math.random() * 80}ms`;
    el.style.width             = `${4 + Math.random() * 3}px`;
    el.style.height            = el.style.width;

    document.body.appendChild(el);
    setTimeout(() => el.remove(), 600);
  }
}

// ──────────────────────────────────────────────
// 11. SIGNATURE SVG draw animation
// ──────────────────────────────────────────────
function initSignature() {
  const svg = qs('.signature-svg');
  if (!svg) return;

  const paths = qsa('path', svg);
  if (!paths.length) return;

  paths.forEach(p => {
    const len = p.getTotalLength();
    p.style.strokeDasharray  = len;
    p.style.strokeDashoffset = len;
    p.style.transition       = 'none';
  });

  const draw = (durations) => {
    paths.forEach((p, i) => {
      p.style.transition     = `stroke-dashoffset ${durations[i] || 1.8}s cubic-bezier(0.4,0,0.2,1) ${i * 0.15}s`;
      p.style.strokeDashoffset = '0';
    });
  };

  const reset = () => {
    paths.forEach(p => {
      p.style.transition       = 'none';
      p.style.strokeDashoffset = p.style.strokeDasharray;
    });
  };

  // Auto-play on load
  setTimeout(() => draw([1.8, 1.2]), 900);

  // Re-draw on hover
  svg.addEventListener('mouseenter', () => {
    reset();
    requestAnimationFrame(() => requestAnimationFrame(() => draw([1.4, 0.9])));
  });
}

// ──────────────────────────────────────────────
// 12. VIDEO — pause/play based on visibility
// ──────────────────────────────────────────────
function initVideos() {
  const videos = qsa('video[autoplay]');
  if (!videos.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      e.isIntersecting
        ? e.target.play().catch(() => {})
        : e.target.pause();
    });
  }, { threshold: 0.25 });

  videos.forEach(v => observer.observe(v));
}

// ──────────────────────────────────────────────
// 13. FOOTER YEAR
// ──────────────────────────────────────────────
function initYear() {
  qsa('.js-year').forEach(el => {
    el.textContent = new Date().getFullYear();
  });
}

// ──────────────────────────────────────────────
// 14. SMOOTH SCROLL for anchor links
// ──────────────────────────────────────────────
function initSmoothScroll() {
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const id     = link.getAttribute('href');
    const target = qs(id);
    if (!target) return;

    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  });
}

// ──────────────────────────────────────────────
// 15. WORK GRID FILTER (work page)
// ──────────────────────────────────────────────
function initFilter() {
  const btns  = qsa('.filter-btn');
  const cards = qsa('.wg-card[data-category]');
  if (!btns.length || !cards.length) return;

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      const cat = btn.dataset.filter;

      cards.forEach(card => {
        const matches = cat === 'all' || card.dataset.category.split(' ').includes(cat);
        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

        if (matches) {
          card.style.display  = '';
          requestAnimationFrame(() => {
            card.style.opacity   = '1';
            card.style.transform = '';
          });
        } else {
          card.style.opacity   = '0';
          card.style.transform = 'scale(0.96)';
          setTimeout(() => { card.style.display = 'none'; }, 300);
        }
      });
    });
  });
}

// ──────────────────────────────────────────────
// 16. CUSTOM CURSOR
// ──────────────────────────────────────────────
function initCursor() {
  // Only on non-touch devices
  if (window.matchMedia('(hover: none)').matches) return;

  const dot  = qs('#cursor-dot');
  const ring = qs('#cursor-ring');
  if (!dot || !ring) return;

  document.body.classList.add('no-cursor');

  let mx = -100, my = -100;
  let rx = -100, ry = -100;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  });

  // Ring follows with lerp for a smooth lag
  function tickRing() {
    rx = lerp(rx, mx, 0.12);
    ry = lerp(ry, my, 0.12);
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(tickRing);
  }
  tickRing();

  // Expand ring on interactive elements
  const hoverEls = 'a, button, [data-tilt], .case-card, .ss-item, .nav__link';
  document.addEventListener('mouseover', e => {
    const match = e.target.closest(hoverEls);
    if (match && !match.contains(e.relatedTarget)) ring.classList.add('is-hovering');
  });
  document.addEventListener('mouseout', e => {
    const match = e.target.closest(hoverEls);
    if (match && !match.contains(e.relatedTarget)) ring.classList.remove('is-hovering');
  });

  // Hide when leaving window
  document.addEventListener('mouseleave', () => {
    dot.style.opacity  = '0';
    ring.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    dot.style.opacity  = '1';
    ring.style.opacity = '1';
  });
}

// ──────────────────────────────────────────────
// 17. SPLIT SECTION — interactive services list
// ──────────────────────────────────────────────
function initServicesInteractive() {
  const items      = qsa('.ss-item');
  const bubble     = qs('#ss-bubble');
  const bubbleText = qs('#ss-bubble-text');
  const panel      = qs('#ss-left');
  if (!items.length) return;

  // Update spark colours to electric blue palette
  function activate(item) {
    const idx  = item.dataset.index;
    const desc = item.dataset.desc;

    // State on items
    items.forEach(i => {
      i.classList.remove('is-active');
      i.setAttribute('aria-pressed', 'false');
    });
    item.classList.add('is-active');
    item.setAttribute('aria-pressed', 'true');

    // Cloud highlight
    if (panel) {
      panel.className = panel.className.replace(/\bis-active-\d\b/g, '').trim();
      panel.classList.add(`is-active-${idx}`);
    }

    // Bubble text with quick fade
    if (bubble && bubbleText) {
      bubble.style.opacity = '0';
      bubble.style.transform = 'translateY(calc(-50% + 6px))';
      setTimeout(() => {
        bubbleText.textContent = desc;
        bubble.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        bubble.style.opacity   = '1';
        bubble.style.transform = 'translateY(-50%)';
      }, 140);
    }
  }

  items.forEach(item => {
    item.addEventListener('click', () => activate(item));
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(item); }
    });
  });

  // Activate first item on load
  if (items[0]) activate(items[0]);

  // Also wire up ss-testi prev/next if multiple slides exist
  const ssSlides  = qsa('.ss-testi-slide');
  const ssPrev    = qs('.ss-t-btn--prev');
  const ssNext    = qs('.ss-t-btn--next');
  const ssDots    = qsa('.ss-testi-dot');
  const ssAuthor  = qs('.ss-testi-name');
  const ssRole    = qs('.ss-testi-role');
  const ssAvatar  = qs('.ss-avatar');

  if (ssSlides.length < 2) return; // only 1 testimonial — nothing more to do

  let cur = 0;

  function goSS(idx) {
    ssSlides[cur].classList.remove('is-active');
    ssDots[cur]?.classList.remove('is-active');
    cur = idx;
    ssSlides[cur].classList.add('is-active');
    ssDots[cur]?.classList.add('is-active');
    if (ssPrev) ssPrev.disabled = cur === 0;
    if (ssNext) ssNext.disabled = cur === ssSlides.length - 1;
    // Update author info from data attributes
    const slide = ssSlides[cur];
    if (ssAuthor) ssAuthor.textContent = slide.dataset.author || '';
    if (ssRole)   ssRole.textContent   = slide.dataset.role   || '';
    if (ssAvatar) ssAvatar.textContent  = slide.dataset.initials || '';
  }

  if (ssPrev) ssPrev.addEventListener('click', () => { if (cur > 0) goSS(cur - 1); });
  if (ssNext) ssNext.addEventListener('click', () => { if (cur < ssSlides.length - 1) goSS(cur + 1); });
  ssDots.forEach((d, i) => d.addEventListener('click', () => goSS(i)));

  if (ssPrev) ssPrev.disabled = true;
  if (ssNext) ssNext.disabled = ssSlides.length <= 1;
}

// ──────────────────────────────────────────────
// 18. CURSOR WEIGHT — headline characters get heavier & larger near the pointer
// ──────────────────────────────────────────────
// Capitalises the first letter of each word, leaving the rest of the word's
// own casing untouched (so a stylised word like "ViBe" keeps its inner caps).
function toTitleCase(str) {
  return str.replace(/\S+/g, word => word.charAt(0).toUpperCase() + word.slice(1));
}

// Splits text into one <span class="char"> per character, grouped into
// per-word <span class="word"> wrappers, so the cursor-weight effect can
// target each glyph individually. Two things break if a word's letters
// aren't grouped like this:
//  - Each .char is display:inline-block, which makes every letter-to-letter
//    boundary a valid line-break point to the browser - without a nowrap
//    word wrapper, long words wrap mid-word (e.g. "System" / "s").
//  - A space rendered as its own inline-block span gets trimmed to zero
//    width by the browser, silently deleting the gap between words - so
//    spaces between word spans are kept as real text nodes instead.
function wrapCharsIn(el) {
  const text = el.textContent;
  el.textContent = '';
  const words = text.split(' ');
  words.forEach((word, i) => {
    const wordSpan = document.createElement('span');
    wordSpan.className = 'word';
    word.split('').forEach(ch => {
      const charSpan = document.createElement('span');
      charSpan.className = 'char';
      charSpan.textContent = ch;
      wordSpan.appendChild(charSpan);
    });
    el.appendChild(wordSpan);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
  });
}

function initHeroCursorWeight() {
  const headline = qs('.hero__headline');
  if (!headline) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const topEl = qs('.hero__headline-top', headline);
  if (topEl) wrapCharsIn(topEl);
  const rotateEl = qs('#heroRotate', headline);
  if (rotateEl) {
    rotateEl.textContent = toTitleCase(rotateEl.textContent);
    wrapCharsIn(rotateEl);
  }

  const RADIUS = 90; // px - how far from the cursor the effect reaches

  function applyProximity(clientX, clientY) {
    qsa('.char', headline).forEach(span => {
      const r = span.getBoundingClientRect();
      const dist = Math.hypot(clientX - (r.left + r.width / 2), clientY - (r.top + r.height / 2));
      const t = Math.max(0, 1 - dist / RADIUS); // 1 = right under the cursor, 0 = out of reach
      span.style.fontWeight = Math.round(400 + t * 300); // 400 -> 700
      span.style.transform = t ? `scale(${1 + t * 0.16})` : '';
      span.style.webkitTextStrokeWidth = t ? `${(t * 0.6).toFixed(2)}px` : '';
    });
  }

  function reset() {
    qsa('.char', headline).forEach(span => {
      span.style.fontWeight = '';
      span.style.transform = '';
      span.style.webkitTextStrokeWidth = '';
    });
  }

  headline.addEventListener('mousemove', e => applyProximity(e.clientX, e.clientY));
  headline.addEventListener('mouseleave', reset);
}

// ──────────────────────────────────────────────
// 19. HERO ROTATE — interchangeable headline word, on a timer
// ──────────────────────────────────────────────
function initHeroRotate() {
  const initialEl = qs('#heroRotate');
  if (!initialEl) return;

  const words = (initialEl.dataset.words || '').split('|').map(w => w.trim()).filter(Boolean);
  if (words.length < 2) return;

  const getEl = () => document.getElementById('heroRotate');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = 0;

  function setWord(el, word) {
    el.textContent = toTitleCase(word);
    if (!reduceMotion) wrapCharsIn(el); // re-establish .char spans for the cursor-weight effect
  }

  function swap() {
    const el = getEl();
    if (!el) return;
    index = (index + 1) % words.length;

    if (reduceMotion) {
      setWord(el, words[index]);
      return;
    }

    el.classList.add('is-swapping');
    setTimeout(() => {
      const liveEl = getEl();
      if (liveEl) {
        setWord(liveEl, words[index]);
        liveEl.classList.remove('is-swapping');
      }
    }, 350);
  }

  setInterval(swap, 2600);
}

// ──────────────────────────────────────────────
// 20. COUNT-UP NUMBERS — animate stat values as they enter view
// ──────────────────────────────────────────────
function initCountUp() {
  const els = qsa('.cs-metric__value');
  if (!els.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Parses a stat string into an animation plan, or null if it isn't a countable number.
  // Covers every format used across the case studies:
  //   "40%", "~70%", "100%"   → leading number + static prefix/suffix
  //   "4 tools"               → leading number + static word suffix
  //   "1→3", "0-to-1"         → arrow/word range, counts from the first value to the second
  //   "3-5 min", "3-4 hrs"    → hyphen range with a unit, counts the upper bound only
  // Anything else ("Zero", "Full", …) returns null and is left static.
  function parseTarget(text) {
    let m = text.match(/^(\d+)(→|-to-)(\d+)(.*)$/);
    if (m) return { prefix: m[1] + m[2], from: parseInt(m[1], 10), to: parseInt(m[3], 10), suffix: m[4] };

    m = text.match(/^(\d+)-(\d+)(\s.*)$/);
    if (m) return { prefix: m[1] + '-', from: parseInt(m[1], 10), to: parseInt(m[2], 10), suffix: m[3] };

    m = text.match(/^(~?)(\d+)(\D*)$/);
    if (m) return { prefix: m[1], from: 0, to: parseInt(m[2], 10), suffix: m[3] };

    return null;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);

      const el = entry.target;
      const plan = parseTarget(el.textContent.trim());
      if (!plan) return;

      const duration = 900;
      const start = performance.now();

      function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = `${plan.prefix}${Math.round(lerp(plan.from, plan.to, eased))}${plan.suffix}`;
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.4 });

  els.forEach(el => observer.observe(el));
}

// ──────────────────────────────────────────────
// 21. SCROLL PARALLAX — subtle depth on product screens as they pass through view
// ──────────────────────────────────────────────
function initScrollParallax() {
  const els = qsa('[data-parallax]');
  if (!els.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let ticking = false;

  function update() {
    const vh = window.innerHeight;
    els.forEach(el => {
      const r = el.getBoundingClientRect();
      const center = r.top + r.height / 2;
      // -1 (entering below) → 0 (centred in viewport) → 1 (leaving above)
      const progress = Math.max(-1, Math.min(1, (center - vh / 2) / (vh / 2)));
      const depth = parseFloat(el.dataset.parallax) || 14;
      el.style.transform = `translateY(${(progress * -depth).toFixed(2)}px) rotateX(${(progress * 1.4).toFixed(2)}deg)`;
    });
    ticking = false;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}

// ──────────────────────────────────────────────
// 22. MOCKUP REVEALS — chart draw-in / map route pop-in, once scrolled into view
// ──────────────────────────────────────────────
function initMockupReveals() {
  const targets = qsa('[data-mockup-reveal]');
  if (!targets.length) return;

  // The fuel-price chart line needs its dash pattern set from the real path
  // length before anything is observed, so the reveal has a "from" state to animate.
  targets.forEach(el => {
    if (el.dataset.mockupReveal !== 'chart') return;
    const line = qs('.gs-chart-line', el);
    if (!line) return;
    const len = line.getTotalLength();
    line.style.strokeDasharray = len;
    line.style.strokeDashoffset = len;
  });

  function reveal(el) {
    el.classList.add('is-mockup-revealed');
    const line = qs('.gs-chart-line', el);
    if (line) line.style.strokeDashoffset = 0;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    targets.forEach(reveal);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      reveal(entry.target);
    });
  }, { threshold: 0.4 });

  targets.forEach(el => observer.observe(el));
}

function initProtoFrames() {
  const wraps = qsa('.gs-proto-frame');
  if (!wraps.length) return;

  function update() {
    wraps.forEach(wrap => {
      const iframe = qs('iframe', wrap);
      if (!iframe) return;
      const scale = wrap.clientWidth / 1440;
      iframe.style.transform = `scale(${scale})`;
    });
  }

  update();
  window.addEventListener('resize', update);
}

function initMkScroll() {
  const cards = qsa('.mk-card');
  if (!cards.length) return;

  function update() {
    cards.forEach(card => {
      const iframe = qs('iframe', card);
      if (!iframe) return;
      const scale = card.clientWidth / 1440;
      iframe.style.transform = `scale(${scale})`;
    });
  }

  update();
  window.addEventListener('resize', update);
}

function initPortMapFrame() {
  const frame = qs('#gsPortMapFrame iframe');
  if (!frame) return;

  frame.addEventListener('load', () => {
    try {
      frame.contentWindow.eval('openDetail(PIN_PORTS.find(p => p.name === "Gibraltar"))');
    } catch (e) {}
  });
}

// ──────────────────────────────────────────────
// INIT ALL
// ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initFonts();
  initLoader();
  initLoadReveals();
  initScrollReveal();
  initHeader();
  initMobileMenu();
  initNavLinks();
  initTilt();
  initStickyCards();
  initTestimonials();
  initCopyEmail();
  initSignature();
  initVideos();
  initYear();
  initServicesInteractive();
  initSmoothScroll();
  initFilter();
  initCursor();
  initHeroCursorWeight();
  initHeroRotate();
  initCardClick();
  initCountUp();
  initScrollParallax();
  initMockupReveals();
  initProtoFrames();
  initPortMapFrame();
  initMkScroll();
});

function initCardClick() {
  qsa('.case-card').forEach(card => {
    const link = card.querySelector('.case-card__link');
    if (!link) return;
    card.addEventListener('click', e => {
      if (e.target.closest('a')) return;
      window.location.href = link.href;
    });
  });
}
