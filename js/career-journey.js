'use strict';

// Career Journey — Interactive Experience
// Inherits lerp/RAF patterns from main.js

(function () {

  const qs  = (s, ctx) => (ctx || document).querySelector(s);
  const qsa = (s, ctx) => [...(ctx || document).querySelectorAll(s)];
  const lerp = (a, b, t) => a + (b - a) * t;

  // ── Spring Tilt ──────────────────────────────
  class JourneyTilt {
    constructor(el) {
      this.el = el;
      this.tx = 0; this.ty = 0;
      this.cx = 0; this.cy = 0;
      this.active = false;
      this.raf = null;
      this._onEnter = this._onEnter.bind(this);
      this._onMove  = this._onMove.bind(this);
      this._onLeave = this._onLeave.bind(this);
      this._tick    = this._tick.bind(this);
      el.addEventListener('mouseenter', this._onEnter);
      el.addEventListener('mousemove',  this._onMove);
      el.addEventListener('mouseleave', this._onLeave);
    }

    _onEnter() {
      this.active = true;
      if (!this.raf) this._tick();
    }

    _onMove(e) {
      const r = this.el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - 0.5;
      const y = (e.clientY - r.top)  / r.height - 0.5;
      this.tx = -y * 4;
      this.ty =  x * 4;
    }

    _onLeave() {
      this.active = false;
      this.tx = 0; this.ty = 0;
    }

    _tick() {
      this.cx = lerp(this.cx, this.tx, 0.07);
      this.cy = lerp(this.cy, this.ty, 0.07);
      const moving = this.active || Math.abs(this.cx) > 0.01 || Math.abs(this.cy) > 0.01;
      if (moving) {
        this.el.style.transform =
          `perspective(1200px) rotateX(${this.cx.toFixed(3)}deg) rotateY(${this.cy.toFixed(3)}deg)`;
        this.raf = requestAnimationFrame(this._tick);
      } else {
        this.el.style.transform = '';
        this.raf = null;
      }
    }
  }

  // ── Stage Nav Progress ───────────────────────
  function initProgress() {
    const stages  = qsa('.cj-stage');
    const navBtns = qsa('.cj-nav__btn');
    const fill    = qs('.cj-nav__progress-fill');
    if (!stages.length || !navBtns.length) return;

    // Set fill height = total nav height so scaleY controls it
    function setFillHeight() {
      const nav = qs('.cj-nav__progress');
      if (!nav || !fill) return;
      fill.style.height = nav.offsetHeight + 'px';
    }
    setFillHeight();

    let activeIdx = -1;
    const activate = (idx) => {
      if (idx === activeIdx) return;
      activeIdx = idx;
      navBtns.forEach((b, i) => b.classList.toggle('is-active', i === idx));
      stages.forEach((s, i) => s.classList.toggle('is-current', i === idx));
      if (fill) {
        const pct = (idx + 1) / stages.length;
        fill.style.transform = `scaleY(${pct})`;
      }
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const idx = parseInt(e.target.dataset.stageIdx, 10);
          if (!isNaN(idx)) activate(idx);
        }
      });
    }, { threshold: 0.3, rootMargin: '-10% 0px -40% 0px' });

    stages.forEach(s => observer.observe(s));

    navBtns.forEach((btn, i) => {
      btn.addEventListener('click', () => {
        stages[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }

  // ── Scroll Parallax on stage visuals ─────────
  function initParallax() {
    const visuals = qsa('.cj-stage__visual svg, .cj-ai-canvas svg');
    if (!visuals.length) return;

    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = window.innerHeight;
      visuals.forEach(svg => {
        const r = svg.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return; // offscreen — skip
        // -0.5 (entering bottom) → 0.5 (leaving top), centered at 0
        const progress = (r.top + r.height / 2 - vh / 2) / vh;
        const shift = -progress * 26; // px drift
        svg.style.transform = `translate3d(0, ${shift.toFixed(2)}px, 0)`;
      });
    };

    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  // ── AI Workflow Canvas ───────────────────────
  function initAICanvas() {
    const canvas = qs('.cj-ai-canvas');
    if (!canvas) return;

    const paths = qsa('.cj-ai-path', canvas);
    const nodes = qsa('.cj-ai-node', canvas);

    // Set up dash animation
    paths.forEach(p => {
      try {
        const len = p.getTotalLength();
        p.style.strokeDasharray  = len;
        p.style.strokeDashoffset = len;
      } catch (_) {}
    });

    let animated = false;

    const animateIn = () => {
      if (animated) return;
      animated = true;

      // Animate paths sequentially
      paths.forEach((p, i) => {
        const delay = 400 + i * 180;
        setTimeout(() => {
          p.style.transition = 'stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1)';
          p.style.strokeDashoffset = '0';
        }, delay);
      });

      // Pop nodes in
      nodes.forEach((n, i) => {
        setTimeout(() => n.classList.add('is-visible'), 200 + i * 140);
      });
    };

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        animateIn();
        observer.disconnect();
      }
    }, { threshold: 0.25 });

    observer.observe(canvas);

    // Node hover highlight
    nodes.forEach((node, i) => {
      node.addEventListener('mouseenter', () => {
        nodes.forEach((n, j) => {
          n.classList.toggle('is-active', j === i);
          n.classList.toggle('is-dim',   j !== i);
        });
        paths.forEach((p, j) => {
          p.classList.toggle('is-active', j === i || j === i - 1);
          p.classList.toggle('is-dim',   j !== i && j !== i - 1);
        });
      });
      node.addEventListener('mouseleave', () => {
        nodes.forEach(n => n.classList.remove('is-active', 'is-dim'));
        paths.forEach(p => p.classList.remove('is-active', 'is-dim'));
      });
    });
  }

  // ── Init ─────────────────────────────────────
  function init() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile  = window.innerWidth < 768;

    if (!reduced && !mobile) {
      qsa('.cj-stage:not(.cj-stage--ai)').forEach(el => new JourneyTilt(el));
      initParallax();
    }

    initProgress();
    initAICanvas();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
