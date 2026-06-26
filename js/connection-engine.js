/* ════════════════════════════════════════════════
   connection-engine.js — thin SVG lines between nodes
   Reads live node centres each frame and rewrites line
   endpoints. Highlights the edges touching a given node.
════════════════════════════════════════════════ */
window.MM = window.MM || {};

MM.Connections = (function () {
  const NS = 'http://www.w3.org/2000/svg';
  let svg = null;
  let edges = [];
  let ctrlMap = {};

  function init(svgEl, edgeList, controllers) {
    svg = svgEl;
    ctrlMap = controllers;
    svg.innerHTML = '';
    edges = edgeList.map(([a, b]) => {
      const line = document.createElementNS(NS, 'line');
      line.setAttribute('class', 'mm-line');
      line.dataset.a = a;
      line.dataset.b = b;
      svg.appendChild(line);
      return { a, b, el: line };
    });
  }

  function resize(w, h) {
    if (!svg) return;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
  }

  function update() {
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      const A = ctrlMap[e.a], B = ctrlMap[e.b];
      if (!A || !B) continue;
      const a = A.getCenter(), b = B.getCenter();
      e.el.setAttribute('x1', a.x.toFixed(1));
      e.el.setAttribute('y1', a.y.toFixed(1));
      e.el.setAttribute('x2', b.x.toFixed(1));
      e.el.setAttribute('y2', b.y.toFixed(1));
    }
  }

  function highlight(id) {
    for (const e of edges) {
      const on = e.a === id || e.b === id;
      e.el.classList.toggle('is-active', on);
      e.el.classList.toggle('is-dim', !on);
    }
  }

  function clear() {
    for (const e of edges) e.el.classList.remove('is-active', 'is-dim');
  }

  return { init, resize, update, highlight, clear };
})();
