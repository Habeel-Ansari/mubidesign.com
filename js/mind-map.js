/* ════════════════════════════════════════════════
   mind-map.js — orchestrator for "Inside My Design Mind"
   Wires the engines together, owns the single rAF loop,
   handles hover/highlight, the editorial panel, scroll
   reveal and responsive modes. Depends on:
   physics · parallax-engine · node-controller ·
   connection-engine · cursor-controller
════════════════════════════════════════════════ */
window.MM = window.MM || {};

(function () {
  // Concept graph — single source of truth for lines + related chips.
  const EDGES = [
    ['product-strategy', 'research'],
    ['research', 'design-systems'],
    ['design-systems', 'interaction-design'],
    ['design-systems', 'ai-workflows'],
    ['design-systems', 'developer-collaboration'],
    ['developer-collaboration', 'shipping-products'],
    ['shipping-products', 'product-strategy'],
    ['business-thinking', 'product-strategy'],
    ['ai-workflows', 'research'],
    ['design-leadership', 'mentoring'],
    ['design-leadership', 'design-ops'],
    ['design-ops', 'design-systems'],
    ['design-leadership', 'product-strategy'],
  ];

  function init() {
    const section = document.getElementById('mind');
    if (!section) return;

    const canvas   = section.querySelector('.mm-canvas');
    const svg      = section.querySelector('.mm-svg');
    const portrait = section.querySelector('.mm-portrait');
    const panel    = section.querySelector('.mm-panel');
    const scrim    = section.querySelector('.mm-scrim');
    const nodeEls  = [...section.querySelectorAll('.mm-node')];
    const noteEls  = [...section.querySelectorAll('.mm-note')];

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const w       = window.innerWidth;
    const mobile  = w < 768;
    const tablet  = w >= 768 && w < 1024;
    const maxMove = tablet ? 8 : 15;   // spec cap: 15px
    const maxRot  = tablet ? 1.5 : 3;  // spec cap: 3°

    const Node = MM.NodeController;

    // ── Build controllers ──
    const concepts = [];        // hoverable concept nodes
    const movers   = [];        // everything that parallaxes
    const ctrlMap  = {};        // id → concept controller (for lines)
    const idMap    = {};        // id → { ctrl, label }

    nodeEls.forEach(el => {
      const n = new Node(el, { maxMove, maxRot });
      n.id = el.dataset.id;
      const label = el.querySelector('.mm-node__label').textContent.trim();
      ctrlMap[n.id] = n;
      idMap[n.id]   = { ctrl: n, label };
      concepts.push(n);
      movers.push(n);
    });
    noteEls.forEach(el => movers.push(new Node(el, { maxMove, maxRot })));

    const portraitCtrl = new Node(portrait, { maxMove, maxRot });
    movers.push(portraitCtrl);

    // ── Neighbour map ──
    const neighbors = {};
    EDGES.forEach(([a, b]) => {
      (neighbors[a] = neighbors[a] || []).push(b);
      (neighbors[b] = neighbors[b] || []).push(a);
    });

    MM.Connections.init(svg, EDGES, ctrlMap);
    MM.Cursor.init();

    // ── Measure + static line draw ──
    function measureAll() {
      movers.forEach(n => n.measure());
      MM.Connections.resize(canvas.clientWidth, canvas.clientHeight);
      MM.Connections.update();
    }
    measureAll();
    window.addEventListener('resize', measureAll, { passive: true });

    // ── Pointer (for parallax + magnetism) ──
    const mouseClient = { x: -9999, y: -9999 };
    if (!mobile && !reduced) {
      MM.Parallax.attach(canvas);
      window.addEventListener('mousemove', e => {
        mouseClient.x = e.clientX;
        mouseClient.y = e.clientY;
      }, { passive: true });
    }

    // ── Hover: highlight related, dim the rest ──
    let hoveredId = null;
    concepts.forEach(n => {
      n.el.addEventListener('mouseenter', () => {
        if (mobile) return;
        hoveredId = n.id;
        n.setHover(true);
        canvas.classList.add('is-focusing');
        const nb = neighbors[n.id] || [];
        concepts.forEach(m => m.el.classList.toggle('is-related', nb.includes(m.id)));
        MM.Connections.highlight(n.id);
        MM.Cursor.node(true);
      });
      n.el.addEventListener('mouseleave', () => {
        if (mobile) return;
        hoveredId = null;
        n.setHover(false);
        canvas.classList.remove('is-focusing');
        concepts.forEach(m => m.el.classList.remove('is-related'));
        MM.Connections.clear();
        MM.Cursor.node(false);
      });
      n.el.addEventListener('click', () => openPanel(n.id));
    });

    // ── Editorial panel ──
    const elEyebrow = panel.querySelector('.mm-panel__eyebrow');
    const elTitle   = panel.querySelector('.mm-panel__title');
    const elTagline = panel.querySelector('.mm-panel__tagline');
    const elBody    = panel.querySelector('.mm-panel__body');
    const elRelated = panel.querySelector('.mm-panel__related');

    function openPanel(id) {
      const ctrl = ctrlMap[id];
      const d = ctrl.el.dataset;
      elEyebrow.textContent = d.cat || '';
      elTitle.textContent   = idMap[id].label;
      elTagline.textContent = d.tagline || '';
      elBody.textContent    = d.body || '';

      elRelated.innerHTML = '';
      (neighbors[id] || []).forEach(rid => {
        const chip = document.createElement('button');
        chip.className = 'mm-chip';
        chip.type = 'button';
        chip.textContent = idMap[rid].label;
        chip.addEventListener('click', () => openPanel(rid));
        elRelated.appendChild(chip);
      });

      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      scrim.classList.add('is-on');
      concepts.forEach(m => m.el.classList.toggle('is-selected', m.id === id));
    }

    function closePanel() {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      scrim.classList.remove('is-on');
      concepts.forEach(m => m.el.classList.remove('is-selected'));
    }

    panel.querySelector('.mm-panel__close').addEventListener('click', closePanel);
    scrim.addEventListener('click', closePanel);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });

    // ── Progressive reveal on scroll-in ──
    function reveal() {
      portraitCtrl.el.classList.add('is-in');
      const rest = movers.filter(n => n !== portraitCtrl);
      rest.forEach((n, i) => setTimeout(() => n.el.classList.add('is-in'), 160 + i * 85));
      setTimeout(() => svg.classList.add('is-in'), 320);
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { reveal(); io.disconnect(); }
      });
    }, { threshold: 0.2 });
    io.observe(canvas);

    // ── Static modes: no rAF (lines already drawn once) ──
    if (mobile || reduced) return;

    // ── Master loop — the only rAF in the system ──
    function frame(t) {
      const p = MM.Parallax.update();
      if (hoveredId) {
        const r = canvas.getBoundingClientRect();
        ctrlMap[hoveredId].setCursor(mouseClient.x - r.left, mouseClient.y - r.top);
      }
      for (let i = 0; i < movers.length; i++) movers[i].update(t, p.x, p.y);
      MM.Connections.update();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
