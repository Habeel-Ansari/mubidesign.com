/* ════════════════════════════════════════════════
   parallax-engine.js — single pointer tracker
   Normalises the cursor to [-1, 1] relative to a host
   element's centre, smoothed with lerp. Other modules
   read get()/update() — one source of truth.
════════════════════════════════════════════════ */
window.MM = window.MM || {};

MM.Parallax = (function () {
  const { lerp, clamp } = MM.physics;

  let host    = null;
  const target  = { x: 0, y: 0 };
  const current = { x: 0, y: 0 };

  function onMove(e) {
    if (!host) return;
    const r  = host.getBoundingClientRect();
    const cx = r.left + r.width  / 2;
    const cy = r.top  + r.height / 2;
    target.x = clamp((e.clientX - cx) / (r.width  / 2), -1, 1);
    target.y = clamp((e.clientY - cy) / (r.height / 2), -1, 1);
  }

  function recenter() { target.x = 0; target.y = 0; }

  function attach(el) {
    host = el;
    window.addEventListener('mousemove', onMove, { passive: true });
    el.addEventListener('mouseleave', recenter);
  }

  // Called once per frame by the orchestrator.
  function update() {
    current.x = lerp(current.x, target.x, 0.08);
    current.y = lerp(current.y, target.y, 0.08);
    return current;
  }

  return { attach, update, get: () => current };
})();
