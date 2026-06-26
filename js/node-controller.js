/* ════════════════════════════════════════════════
   node-controller.js — one object per floating element
   Owns its depth, ambient breathing, parallax offset and
   magnetic pull. update() is driven by the master loop so
   there is exactly one rAF for the whole system.
════════════════════════════════════════════════ */
window.MM = window.MM || {};

MM.NodeController = (function () {
  const { lerp, clamp } = MM.physics;

  class Node {
    constructor(el, opts) {
      this.el      = el;
      this.depth   = parseFloat(el.dataset.depth) || 0.6;
      this.baseRot = parseFloat(el.dataset.rot)   || 0;
      this.maxMove = opts.maxMove;
      this.maxRot  = opts.maxRot;

      // de-synchronised ambient motion
      this.phase = Math.random() * Math.PI * 2;
      this.speed = 0.6 + Math.random() * 0.5;
      this.amp   = 2.0 + Math.random() * 1.4;

      this.hover  = false;
      this.cursor = { x: 0, y: 0, active: false };

      // smoothed magnetic + scale state
      this.s = { mx: 0, my: 0, scale: 1 };

      // base centre (filled by measure) + live offset (for line endpoints)
      this.cx = 0; this.cy = 0;
      this.offX = 0; this.offY = 0;
    }

    measure() {
      // offsetLeft/Top are pre-transform; with translate(-50%,-50%)
      // baked into the transform, the visual centre equals offsetLeft/Top.
      this.cx = this.el.offsetLeft;
      this.cy = this.el.offsetTop;
    }

    setHover(v) {
      this.hover = v;
      if (!v) this.cursor.active = false;
      this.el.classList.toggle('is-hover', v);
    }

    setCursor(x, y) {
      this.cursor.x = x;
      this.cursor.y = y;
      this.cursor.active = true;
    }

    update(t, px, py) {
      const d = this.depth;

      // parallax translate + subtle 3D rotation
      const tx = px * this.maxMove * d;
      const ty = py * this.maxMove * d;
      const ry =  px * this.maxRot * d;
      const rx = -py * this.maxRot * d;

      // ambient breathing — unsynchronised, very slow
      const bx = Math.sin(t * 0.0006 * this.speed + this.phase)        * this.amp * d;
      const by = Math.cos(t * 0.0005 * this.speed + this.phase * 1.3)  * this.amp * d;

      // magnetic pull toward cursor while hovered (capped)
      let mxT = 0, myT = 0;
      if (this.hover && this.cursor.active) {
        mxT = clamp((this.cursor.x - this.cx) * 0.16, -12, 12);
        myT = clamp((this.cursor.y - this.cy) * 0.16, -12, 12);
      }
      this.s.mx = lerp(this.s.mx, mxT, 0.12);
      this.s.my = lerp(this.s.my, myT, 0.12);
      this.s.scale = lerp(this.s.scale, this.hover ? 1.06 : 1, 0.14);

      const X = tx + bx + this.s.mx;
      const Y = ty + by + this.s.my;
      this.offX = X;
      this.offY = Y;

      this.el.style.transform =
        `translate(-50%,-50%) translate3d(${X.toFixed(2)}px,${Y.toFixed(2)}px,0) ` +
        `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) ` +
        `rotate(${this.baseRot}deg) scale(${this.s.scale.toFixed(3)})`;
    }

    getCenter() {
      return { x: this.cx + this.offX, y: this.cy + this.offY };
    }
  }

  return Node;
})();
