/* ════════════════════════════════════════════════
   physics.js — shared math for the mind-map system
   Pure functions. No DOM. No state.
════════════════════════════════════════════════ */
window.MM = window.MM || {};

MM.physics = (function () {
  const lerp  = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
  const map   = (v, a, b, c, d) => c + (d - c) * ((v - a) / (b - a));
  const dist  = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

  return { lerp, clamp, map, dist };
})();
