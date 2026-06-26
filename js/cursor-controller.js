/* ════════════════════════════════════════════════
   cursor-controller.js — enhances the existing custom
   cursor (#cursor-ring) when a mind-map node is hovered.
   Does not replace the site cursor in main.js — it only
   adds/removes a state class.
════════════════════════════════════════════════ */
window.MM = window.MM || {};

MM.Cursor = (function () {
  let ring = null;

  function init() {
    ring = document.getElementById('cursor-ring');
  }

  function node(on) {
    if (ring) ring.classList.toggle('is-node', on);
  }

  return { init, node };
})();
