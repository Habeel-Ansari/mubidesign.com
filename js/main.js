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
  if (qsa('.case-item .case-card').length < 2 || window.innerWidth < 768) return;

  function update() {
    const cards = qsa('.case-item .case-card').filter(card => card.closest('.case-item').style.display !== 'none');
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
  window.__updateStickyCards = update;
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
        const matches = cat === 'all' || card.dataset.category === cat;
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
// 15b. SELECTED WORK DOMAIN FILTER (index page)
// ──────────────────────────────────────────────
function initWorkStackFilter() {
  const btns  = qsa('.work__header .filter-btn');
  const items = qsa('.case-item[data-category]');
  if (!btns.length || !items.length) return;

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      const cat = btn.dataset.filter;

      items.forEach(item => {
        const matches = cat === 'all' || item.dataset.category === cat;
        item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

        if (matches) {
          item.style.display = '';
          requestAnimationFrame(() => {
            item.style.opacity   = '1';
            item.style.transform = '';
          });
        } else {
          item.style.opacity   = '0';
          item.style.transform = 'scale(0.96)';
          setTimeout(() => {
            item.style.display = 'none';
            window.__updateStickyCards && window.__updateStickyCards();
          }, 300);
        }
      });

      requestAnimationFrame(() => window.__updateStickyCards && window.__updateStickyCards());
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
  const stage   = qs('#ss-stage');
  const wheel   = qs('#ss-wheel');
  const rail    = qs('#ss-rail');
  const hint    = qs('#ss-hint');
  const bubble  = qs('#ss-bubble');
  const bubTxt  = qs('#ss-bubble-text');
  const bubIdx  = qs('#ss-bubble-idx');
  const panel   = qs('#ss-left');
  const items   = qsa('.ss-item');
  if (!items.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Drum geometry — how far apart neighbours sit, and how hard they rotate away
     from the centre slot. STEP is also the drag distance for one step. */
  const STEP  = 50;   // px between neighbouring items
  const ANGLE = 27;   // deg of X rotation per step away from centre
  const DEPTH = 42;   // px pushed back per step away from centre

  const N    = items.length;
  const HALF = Math.floor(N / 2);

  let active  = 0;
  let swapT   = null;
  let spinT   = null;
  const prevOff = new Map();   // last offset per item, to spot a wrap-around

  const wrap = i => ((i % N) + N) % N;
  /* calc() needs an explicit sign with spaces around the operator — building
     "calc(-50% + -50px)" from a negative offset is invalid and silently voids the
     whole transform, which flattens the drum. */
  const cy = px => 'calc(-50% ' + (px < 0 ? '- ' : '+ ') + Math.abs(px) + 'px)';
  /* The drum is a loop: an item's offset is the SHORTEST way round to the centre
     slot, so the wheel always looks populated above and below rather than running
     out of items at either end of the list. */
  const offsetOf = i => ((i - active + N + HALF) % N) - HALF;

  // Position rail — one tick per service
  if (rail && !rail.children.length) {
    items.forEach(() => rail.appendChild(document.createElement('span')));
  }

  function layout() {
    items.forEach((el, i) => {
      const o = offsetOf(i);         // signed distance from the centre slot
      const d = Math.abs(o);
      /* An item that has just wrapped from one end of the drum to the other must
         not glide across the whole wheel — it jumps, hidden inside the mask. */
      const prev = prevOff.get(el);
      const jumped = prev !== undefined && Math.abs(o - prev) > 1.5;
      if (jumped) el.style.transition = 'none';
      if (reduce) {
        el.style.transform = 'translateY(' + cy(o * 40) + ')';
        el.style.opacity   = d === 0 ? '1' : '0.32';
        el.style.filter    = 'none';
      } else {
        const scale = Math.max(0.72, 1 - d * 0.085);
        el.style.transform =
          'translate3d(0, ' + cy(o * STEP) + ', ' + (-d * DEPTH) + 'px)' +
          ' rotateX(' + (-o * ANGLE) + 'deg) scale(' + scale.toFixed(3) + ')';
        // Neighbours stay readable; anything further recedes into the panel
        el.style.opacity = d === 0 ? '1' : String(Math.max(0, 0.5 - (d - 1) * 0.17).toFixed(2));
        el.style.filter  = d === 0 ? 'blur(0px)' : 'blur(' + Math.min(3.4, d * 1.15).toFixed(2) + 'px)';
      }
      el.style.zIndex        = String(100 - d);
      el.style.pointerEvents = d > 2 ? 'none' : 'auto';
      el.classList.toggle('is-active', d === 0);
      el.setAttribute('aria-selected', d === 0 ? 'true' : 'false');
      el.tabIndex = d === 0 ? 0 : -1;
      if (jumped) { void el.offsetWidth; el.style.transition = ''; }
      prevOff.set(el, o);
    });
    if (rail) {
      [...rail.children].forEach((t, i) => t.classList.toggle('is-on', i === active));
    }
  }

  /* Card swap: blur/rotate out, replace the copy at the midpoint, settle back in
     — so the text never visibly cross-fades against itself. */
  function swapCard() {
    if (!bubble || !bubTxt) return;
    const desc  = items[active].dataset.desc || '';
    const label = String(active + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0');
    clearTimeout(swapT);
    bubble.classList.add('is-swapping');
    swapT = setTimeout(() => {
      bubTxt.textContent = desc;
      if (bubIdx) bubIdx.textContent = label;
      bubble.classList.remove('is-swapping');
    }, reduce ? 0 : 170);
  }

  function setActive(i, silent) {
    const next = wrap(i);
    if (next === active && silent !== 'init') return;
    active = next;
    layout();
    swapCard();
    if (silent) return;
    if (hint) hint.classList.add('is-gone');
    if (panel) {
      panel.classList.add('is-spinning');
      clearTimeout(spinT);
      spinT = setTimeout(() => panel.classList.remove('is-spinning'), 700);
    }
  }

  // ── Wheel: one gesture = one step. Released right at the first/last item so
  //    the page can keep scrolling instead of trapping the reader inside the
  //    section — checked per gesture (not "seen everything once") so reverse
  //    scrolling back through already-visited items always keeps working.
  let cooling = false;
  if (stage) {
    stage.addEventListener('wheel', e => {
      const dir = e.deltaY > 0 ? 1 : -1;
      if ((dir > 0 && active === N - 1) || (dir < 0 && active === 0)) return;
      e.preventDefault();
      if (cooling) return;
      cooling = true;
      setTimeout(() => { cooling = false; }, reduce ? 60 : 230);
      setActive(active + dir);
    }, { passive: false });

    // ── Drag along the drum — mouse and touch alike. Touch needs this: there's
    //    no wheel event on mobile, so dragging is the only way to reach items
    //    beyond direct tap range. The stage's touch-action:none hands the
    //    gesture to us instead of the page scroll.
    let dragging = false, startY = 0, base = 0;
    stage.addEventListener('pointerdown', e => {
      dragging = true; startY = e.clientY; base = active;
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', e => {
      if (!dragging) return;
      setActive(base + Math.round((startY - e.clientY) / STEP));
    });
    const endDrag = () => { dragging = false; };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    // ── Keyboard
    stage.addEventListener('keydown', e => {
      const map = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
      if (map[e.key])          { e.preventDefault(); setActive(active + map[e.key]); }
      else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
      else if (e.key === 'End')  { e.preventDefault(); setActive(items.length - 1); }
    });

    // ── Pointer parallax — the drum tilts a couple of degrees toward the cursor
    if (!reduce) {
      stage.addEventListener('pointermove', e => {
        const r = stage.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width  - 0.5;
        const ny = (e.clientY - r.top)  / r.height - 0.5;
        stage.style.setProperty('--ss-ry', (nx *  7).toFixed(2) + 'deg');
        stage.style.setProperty('--ss-rx', (ny * -4).toFixed(2) + 'deg');
      });
      stage.addEventListener('pointerleave', () => {
        stage.style.setProperty('--ss-ry', '0deg');
        stage.style.setProperty('--ss-rx', '0deg');
      });
    }
  }

  // ── Click / tap straight to an item
  items.forEach((el, i) => el.addEventListener('click', () => {
    if (stage) stage.focus({ preventScroll: true });
    setActive(i);
  }));

  // ── Spin-up the first time the section is seen
  if (wheel && !reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        wheel.classList.add('is-intro');
        /* Drop the class once it has played: its filled end-state transform would
           otherwise outrank the parallax transform for good. */
        wheel.addEventListener('animationend', () => wheel.classList.remove('is-intro'), { once: true });
        io.disconnect();
      });
    }, { threshold: 0.35 });
    io.observe(wheel);
  }

  setActive(0, 'init');

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
    // ssAvatar stays a plain user icon for every slide — no per-author initials.
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

  // Per-character staggered exit: each letter tumbles up and blurs out,
  // a beat after the one before it.
  function animateCharsOut(el, onDone) {
    const chars = qsa('.char', el);
    if (!chars.length) { onDone(); return; }
    const step = 14; // ms between each character's start
    let maxDelay = 0;
    chars.forEach((c, i) => {
      const delay = i * step;
      maxDelay = Math.max(maxDelay, delay);
      c.style.transition = 'opacity 0.3s var(--ease-out), transform 0.3s var(--ease-out), filter 0.3s var(--ease-out)';
      c.style.transitionDelay = `${delay}ms`;
      requestAnimationFrame(() => {
        c.style.opacity = '0';
        c.style.transform = 'translateY(-15px) rotate(-8deg)';
        c.style.filter = 'blur(3px)';
      });
    });
    setTimeout(onDone, maxDelay + 320);
  }

  // Per-character staggered entrance: letters rise into place, a beat apart.
  function animateCharsIn(el) {
    const chars = qsa('.char', el);
    const step = 12;
    chars.forEach(c => {
      c.style.transition = 'none';
      c.style.opacity = '0';
      c.style.transform = 'translateY(15px) rotate(8deg)';
      c.style.filter = 'blur(3px)';
    });
    void el.offsetWidth; // force reflow so the "from" state above actually paints
    chars.forEach((c, i) => {
      const delay = i * step;
      c.style.transition = 'opacity 0.4s var(--ease-out), transform 0.4s var(--ease-out), filter 0.4s var(--ease-out)';
      c.style.transitionDelay = `${delay}ms`;
      c.style.opacity = '1';
      c.style.transform = 'translateY(0) rotate(0deg)';
      c.style.filter = 'blur(0px)';
    });
    const maxDelay = (chars.length - 1) * step;
    setTimeout(() => {
      // Hand control back to the CSS-defined (faster) transition used by the
      // cursor-weight hover effect, instead of leaving our swap timing in place.
      chars.forEach(c => {
        c.style.transition = '';
        c.style.transitionDelay = '';
      });
    }, maxDelay + 420);
  }

  function swap() {
    const el = getEl();
    if (!el) return;
    index = (index + 1) % words.length;

    if (reduceMotion) {
      setWord(el, words[index]);
      return;
    }

    animateCharsOut(el, () => {
      const liveEl = getEl();
      if (!liveEl) return;
      setWord(liveEl, words[index]);
      animateCharsIn(liveEl);
    });
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

// ──────────────────────────────────────────────
// SCROLL PROGRESS — thin bar fills as the page is read
// ──────────────────────────────────────────────
function initScrollProgress() {
  const fill = qs('.scroll-progress__fill');
  if (!fill) return;

  let ticking = false;

  function update() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    fill.style.transform = `scaleX(${progress})`;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });

  window.addEventListener('resize', update);
  update();
}

// ──────────────────────────────────────────────
// MAGNETIC BUTTONS — primary CTAs pull slightly toward the cursor
// ──────────────────────────────────────────────
function initMagneticButtons() {
  if (window.matchMedia('(hover: none)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  qsa('.btn--primary').forEach(btn => {
    let raf = null;

    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;

      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        btn.style.transition = 'transform 0.15s ' + 'var(--ease-out)';
        btn.style.transform = `translate(${x * 0.35}px, ${y * 0.45}px)`;
      });
    });

    btn.addEventListener('mouseleave', () => {
      cancelAnimationFrame(raf);
      btn.style.transition = 'transform 0.4s ' + 'var(--ease-out)';
      btn.style.transform = 'translate(0, 0)';
    });
  });
}

// ──────────────────────────────────────────────
// PLAYGROUND GRAVITY — click the hand-drawn note, the mockup cards lose
// their balance, tumble to the floor, and nudge apart as the mouse nears.
// ──────────────────────────────────────────────
function initPlaygroundGravity() {
  const poke  = qs('#mkPoke');
  const bento = qs('#mkBento');
  if (!poke || !bento) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    poke.remove();
    return;
  }

  let started = false;

  poke.addEventListener('click', () => {
    if (started || typeof Matter === 'undefined') return;
    started = true;
    poke.classList.add('is-gone');
    dropCards(bento);
  });
}

function dropCards(bento) {
  const { Engine, Runner, Bodies, Composite, Body, Mouse, MouseConstraint } = Matter;

  const cards = qsa('.mk-card', bento);
  if (!cards.length) return;

  // Pass 1 — measure every card's current on-screen position (viewport
  // coordinates) before touching anything, so later layout changes can't
  // corrupt the measurements. Also lock in the container's *current* height
  // now — widening it below naturally grows the aspect-ratio'd cards' row
  // height, and measuring after that would inflate the arena and jump the
  // page layout.
  const measured = cards.map(card => {
    const r = card.getBoundingClientRect();
    return { el: card, w: r.width, h: r.height, vx: r.left, vy: r.top };
  });
  const originalHeight = bento.getBoundingClientRect().height;

  // Break out of the centered/gutter'd grid container so the physics arena
  // can use the section's full width, not just the constrained column.
  bento.style.maxWidth   = 'none';
  bento.style.width      = '100%';
  bento.style.paddingLeft  = '0';
  bento.style.paddingRight = '0';
  bento.style.marginLeft  = '0';
  bento.style.marginRight = '0';
  bento.classList.add('is-physics');

  const rect   = bento.getBoundingClientRect();
  const arenaW = rect.width;
  // Keep the arena to the grid's own existing footprint — one fold, no
  // page-scroll required, and no sudden layout jump when physics kicks in.
  // Capped against the viewport too: on narrow screens the grid can stack
  // into a much taller natural height than fits in one fold.
  const arenaH = Math.min(Math.max(originalHeight, 420), Math.max(window.innerHeight * 0.75, 480));
  bento.style.position = 'relative';
  bento.style.height   = arenaH + 'px';
  bento.style.overflow = 'hidden';

  // Pass 2 — now it's safe to pull every card out of flow, re-based to the
  // (now wider) arena's own coordinate space.
  const cardData = measured.map((d, i) => {
    const { el, w, h, vx, vy } = d;
    const x = vx - rect.left;
    // Clamp the starting depth so cards from a natural layout taller than
    // the capped arena don't spawn deeply overlapping the floor — stagger
    // the clamp slightly per-card so they don't all pop from one line.
    const y = Math.min(vy - rect.top, arenaH - h - 4 - (i % 3) * 10);

    el.style.position        = 'absolute';
    el.style.top             = '0';
    el.style.left            = '0';
    el.style.width           = w + 'px';
    el.style.height          = h + 'px';
    el.style.margin          = '0';
    el.style.willChange      = 'transform';
    el.style.transformOrigin = 'center center';
    el.style.cursor          = 'grab';

    const video = el.querySelector('video');
    if (video) video.style.pointerEvents = 'none';

    return { el, w, h, x, y };
  });

  const engine = Engine.create();
  engine.gravity.y = 1;
  const world = engine.world;

  const wall = 80;
  Composite.add(world, [
    Bodies.rectangle(arenaW / 2, arenaH + wall / 2, arenaW * 2, wall, { isStatic: true }),
    // Top wall — without this a hard drag-throw can fling a card above the
    // arena, where it overlaps the "Playground" heading sitting just above it.
    Bodies.rectangle(arenaW / 2, -wall / 2, arenaW * 2, wall, { isStatic: true }),
    Bodies.rectangle(-wall / 2, arenaH / 2, wall, arenaH * 2, { isStatic: true }),
    Bodies.rectangle(arenaW + wall / 2, arenaH / 2, wall, arenaH * 2, { isStatic: true }),
  ]);

  const bodies = cardData.map(d => {
    const body = Bodies.rectangle(d.x + d.w / 2, d.y + d.h / 2, d.w, d.h, {
      restitution: 0.32,
      friction: 0.15,
      frictionAir: 0.02,
      chamfer: { radius: 14 },
    });
    Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.09);
    Composite.add(world, body);
    return body;
  });

  Runner.run(Runner.create(), engine);

  function sync() {
    bodies.forEach((body, i) => {
      const d = cardData[i];
      const x = body.position.x - d.w / 2;
      const y = body.position.y - d.h / 2;
      d.el.style.transform = `translate(${x}px, ${y}px) rotate(${body.angle}rad)`;
    });
    requestAnimationFrame(sync);
  }
  sync();

  // Grab-and-throw — pick a card up with the mouse (or a finger) and fling
  // it into the others.
  const mouse = Mouse.create(bento);
  mouse.pixelRatio = window.devicePixelRatio || 1;
  const mouseConstraint = MouseConstraint.create(engine, {
    mouse,
    constraint: { stiffness: 0.25, damping: 0.15, render: { visible: false } },
  });
  Composite.add(world, mouseConstraint);
  // Matter's Mouse module binds its own wheel handlers that unconditionally
  // preventDefault() — that would swallow page scroll the instant the
  // cursor is over the arena. Strip them so scrolling stays untouched.
  bento.removeEventListener('mousewheel', mouse.mousewheel);
  bento.removeEventListener('DOMMouseScroll', mouse.mousewheel);
  bento.removeEventListener('wheel', mouse.mousewheel);

  mouseConstraint.mouse.element.addEventListener('mousedown', () => { bento.style.cursor = 'grabbing'; });
  window.addEventListener('mouseup', () => { bento.style.cursor = ''; });

  // Mouse proximity also nudges nearby cards apart, like poking a pile —
  // independent of whatever's being actively dragged.
  const REPEL_RADIUS = 220;
  const REPEL_STRENGTH = 0.035;
  bento.addEventListener('mousemove', e => {
    const r = bento.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    bodies.forEach(body => {
      const dx = body.position.x - mx;
      const dy = body.position.y - my;
      const dist = Math.hypot(dx, dy);
      if (dist < REPEL_RADIUS && dist > 1) {
        const force = (1 - dist / REPEL_RADIUS) * REPEL_STRENGTH;
        Body.applyForce(body, body.position, { x: (dx / dist) * force, y: (dy / dist) * force });
      }
    });
  });
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
  initWorkStackFilter();
  initCursor();
  initScrollProgress();
  initMagneticButtons();
  initHeroCursorWeight();
  initHeroRotate();
  initCardClick();
  initCountUp();
  initScrollParallax();
  initMockupReveals();
  initProtoFrames();
  initPortMapFrame();
  initMkScroll();
  initPlaygroundGravity();
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
