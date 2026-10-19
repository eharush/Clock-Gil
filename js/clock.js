// שעון מחוגים ב-SVG: ציור, אנימציה, גרירת מחוגים ולחיצה על מספרים/מחוגים.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const R_FACE = 98;
  const R_NUM = 71;
  const R_RING = 124;
  const LEN = { hour: 48, minute: 80 };

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  // זווית 0 = הספרה 12, עם כיוון השעון
  function polar(deg, r) {
    const a = (deg - 90) * Math.PI / 180;
    return [+(r * Math.cos(a)).toFixed(2), +(r * Math.sin(a)).toFixed(2)];
  }
  function sectorPath(fromMin, toMin, r) {
    const span = toMin - fromMin;
    if (span <= 0) return '';
    if (span >= 60) return `M0 ${-r} A${r} ${r} 0 1 1 0 ${r} A${r} ${r} 0 1 1 0 ${-r} Z`;
    const [x1, y1] = polar(fromMin * 6, r);
    const [x2, y2] = polar(toMin * 6, r);
    return `M0 0 L${x1} ${y1} A${r} ${r} 0 ${span > 30 ? 1 : 0} 1 ${x2} ${y2} Z`;
  }
  const mod = (a, n) => ((a % n) + n) % n;
  const angDiff = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const DEFAULTS = {
    h: 12, m: 0,
    numbers: 'all',      // 'all' | 'none' | 'slots' (עיגולים ריקים)
    visibleNums: null,   // במצב slots: אילו מספרים כבר מופיעים
    ring: false,         // false | true | מספר התוויות שמוצגות (5, 10, 15...)
    sectors: [],         // [{from, to, cls}] בדקות
    hlNums: [],          // [{n, cls}]
    hlTicks: null,       // [from, to]
    hl: null,            // 'hour' | 'minute'
    hideHands: [],
    neutral: false,      // שני המחוגים באותו צבע
    mode: 'none',        // 'none' | 'drag' | 'number' | 'hand'
    draggable: ['hour', 'minute'],
    snap: 5,
    label: 'שעון מחוגים',
  };

  class Clock {
    constructor(host, cfg) {
      this.host = host;
      this.total = 0;      // דקות מאז 12:00, יכול להיות לא שלם בזמן אנימציה
      this.epoch = 0;
      this.onChange = null;
      this.onNumber = null;
      this.onHand = null;
      this.onStep = null;
      this.sweepFrom = null;
      this._build();
      this.configure(cfg || {});
    }

    _build() {
      const s = (this.svg = el('svg', { class: 'clock', viewBox: '-112 -112 224 224', direction: 'ltr' }));
      this.host.innerHTML = '';
      this.host.appendChild(s);

      this.gRing = el('g', { class: 'c-ring' }, s);
      this.ringItems = [];
      for (let n = 1; n <= 12; n++) {
        const [x, y] = polar(n * 30, R_RING);
        const g = el('g', { class: 'c-ring-item', transform: `translate(${x} ${y})` }, this.gRing);
        el('circle', { r: 11 }, g);
        const t = el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', y: 0.5 }, g);
        t.textContent = n === 12 ? '00' : String(n * 5);
        this.ringItems.push(g);
      }

      el('circle', { r: 106, class: 'c-rim' }, s);
      el('circle', { r: R_FACE, class: 'c-face' }, s);
      this.gSectors = el('g', { class: 'c-sectors' }, s);
      this.sweep = el('path', { class: 'c-sweep', d: '' }, s);

      const gTicks = el('g', { class: 'c-ticks' }, s);
      this.ticks = [];
      for (let i = 0; i < 60; i++) {
        const major = i % 5 === 0;
        const [x1, y1] = polar(i * 6, 93);
        const [x2, y2] = polar(i * 6, major ? 83 : 88);
        this.ticks.push(el('line', { x1, y1, x2, y2, class: major ? 'c-tick major' : 'c-tick' }, gTicks));
      }

      const gNums = el('g', { class: 'c-nums' }, s);
      this.nums = {};
      for (let n = 1; n <= 12; n++) {
        const [x, y] = polar(n * 30, R_NUM);
        const g = el('g', { class: 'c-num', transform: `translate(${x} ${y})` }, gNums);
        el('circle', { r: 14.5, class: 'c-num-hl' }, g);
        el('circle', { r: 12.5, class: 'c-slot' }, g);
        const t = el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', y: 1 }, g);
        t.textContent = n;
        el('circle', { r: 17, class: 'c-num-hit' }, g);
        g.addEventListener('click', () => {
          if (this.cfg.mode === 'number' && this.onNumber) this.onNumber(n);
        });
        this.nums[n] = g;
      }

      this.hands = {};
      for (const name of ['hour', 'minute']) {
        const g = el('g', { class: `c-hand ${name}` }, s);
        el('line', { x1: 0, y1: 0, x2: 0, y2: -LEN[name], class: 'c-hand-glow' }, g);
        el('line', { x1: 0, y1: name === 'hour' ? 10 : 13, x2: 0, y2: -LEN[name], class: 'c-hand-line' }, g);
        this.hands[name] = g;
      }
      el('circle', { r: 7, class: 'c-cap' }, s);
      el('circle', { r: 2.6, class: 'c-cap-dot' }, s);

      s.addEventListener('pointerdown', e => this._down(e));
      s.addEventListener('pointermove', e => this._move(e));
      s.addEventListener('pointerup', e => this._up(e));
      s.addEventListener('pointercancel', e => this._up(e));
      s.addEventListener('keydown', e => this._key(e));
    }

    configure(cfg) {
      this.epoch++;
      cancelAnimationFrame(this._raf);
      this.dragging = null;
      const c = (this.cfg = Object.assign({}, DEFAULTS, cfg));
      const s = this.svg;
      s.setAttribute('class', `clock mode-${c.mode}${c.neutral ? ' neutral' : ''}`);
      s.setAttribute('aria-label', c.label);
      if (c.mode === 'drag') s.setAttribute('tabindex', '0');
      else s.removeAttribute('tabindex');
      this.setRing(c.ring);
      this.setNumbers(c.numbers, c.visibleNums);
      this.setHighlightNums(c.hlNums);
      this.setSectors(c.sectors);
      this.setTicks(c.hlTicks);
      this.highlightHand(c.hl);
      for (const name of ['hour', 'minute']) {
        this.hands[name].style.display = c.hideHands.includes(name) ? 'none' : '';
        this.hands[name].classList.remove('flash-good', 'flash-bad', 'grabbed');
        this.hands[name].classList.toggle('can-drag', c.mode === 'drag' && c.draggable.includes(name));
      }
      this.sweepFrom = null;
      this.total = mod((c.h % 12) * 60 + c.m, 720);
      this._lastStep = Math.floor(this.total / 5);
      this.render();
      return this;
    }

    setRing(v) {
      this.cfg.ring = v;
      const count = v === true ? 12 : v ? v : 0;
      this.ringItems.forEach((g, i) => g.classList.toggle('on', i < count));
      this.svg.setAttribute('viewBox', v ? '-138 -138 276 276' : '-112 -112 224 224');
    }
    setNumbers(mode, visible) {
      this.cfg.numbers = mode;
      this.cfg.visibleNums = visible || null;
      for (let n = 1; n <= 12; n++) {
        const g = this.nums[n];
        const shown = mode === 'all' || (mode === 'slots' && visible && visible.includes(n));
        g.classList.toggle('hidden-num', !shown);
        g.classList.toggle('slot', mode === 'slots' && !shown);
        g.style.display = mode === 'none' ? 'none' : '';
      }
    }
    revealNumber(n) {
      const v = (this.cfg.visibleNums || []).slice();
      if (!v.includes(n)) v.push(n);
      this.setNumbers(this.cfg.numbers, v);
      const g = this.nums[n];
      g.classList.remove('pop');
      void g.getBBox();
      g.classList.add('pop');
    }
    setHighlightNums(list) {
      for (let n = 1; n <= 12; n++) this.nums[n].removeAttribute('data-hl');
      (list || []).forEach(({ n, cls }) => this.nums[n].setAttribute('data-hl', cls || 'accent'));
    }
    flashNumber(n, cls, ms) {
      this.nums[n].setAttribute('data-hl', cls);
      const ep = this.epoch;
      setTimeout(() => {
        if (ep === this.epoch && this.nums[n].getAttribute('data-hl') === cls) this.nums[n].removeAttribute('data-hl');
      }, ms || 700);
    }
    setSectors(list) {
      this.gSectors.innerHTML = '';
      (list || []).forEach(sec => el('path', { d: sectorPath(sec.from, sec.to, R_FACE - 1), class: `c-sector ${sec.cls || ''}` }, this.gSectors));
    }
    setTicks(range) {
      this.ticks.forEach((t, i) => t.classList.toggle('on', !!range && i >= range[0] && i <= range[1]));
    }
    highlightHand(name) {
      for (const k of ['hour', 'minute']) {
        this.hands[k].classList.toggle('is-hl', name === k);
        this.hands[k].classList.toggle('is-dim', !!name && name !== k && name !== 'both');
      }
      if (name === 'both') for (const k of ['hour', 'minute']) this.hands[k].classList.add('is-hl');
    }
    flashHand(name, cls) {
      const g = this.hands[name];
      g.classList.remove('flash-good', 'flash-bad');
      void g.getBBox();
      g.classList.add(cls);
    }
    startSweep() {
      this.sweepFrom = this.total;
      this.render();
    }
    clearSweep() {
      this.sweepFrom = null;
      this.render();
    }

    render() {
      const t = this.total;
      const mDeg = mod(t, 60) * 6;
      const hDeg = mod(t / 60, 12) * 30;
      this.hands.minute.setAttribute('transform', `rotate(${mDeg.toFixed(2)})`);
      this.hands.hour.setAttribute('transform', `rotate(${hDeg.toFixed(2)})`);
      if (this.sweepFrom != null) {
        const from = mod(this.sweepFrom, 60);
        const span = Math.min(60, t - this.sweepFrom);
        this.sweep.setAttribute('d', sectorPath(from, from + span, R_FACE - 1));
      } else {
        this.sweep.setAttribute('d', '');
      }
      const step = Math.floor((t + 0.001) / 5);
      if (step !== this._lastStep) {
        this._lastStep = step;
        if (this.onStep) this.onStep(step);
      }
      if (this.onChange) this.onChange(this.getTime());
    }

    getTime() {
      const t = mod(Math.round(this.total), 720);
      const h = Math.floor(t / 60);
      return { h: h === 0 ? 12 : h, m: t % 60 };
    }

    // אנימציה קדימה בזמן (המחוגים לא חוזרים אחורה)
    animateTo(h, m, ms) {
      let target = (h % 12) * 60 + m;
      while (target < this.total - 0.001) target += 720;
      return this.tweenTotal(target, ms);
    }
    tweenTotal(target, ms) {
      cancelAnimationFrame(this._raf);
      const ep = this.epoch;
      const from = this.total;
      const dur = REDUCED ? 1 : ms == null ? 900 : ms;
      const t0 = performance.now();
      return new Promise(resolve => {
        const step = now => {
          if (ep !== this.epoch) return resolve(false);
          const k = Math.min(1, (now - t0) / dur);
          this.total = from + (target - from) * ease(k);
          this.render();
          if (k < 1) this._raf = requestAnimationFrame(step);
          else {
            this.total = target;
            resolve(true);
          }
        };
        this._raf = requestAnimationFrame(step);
      });
    }
    // מחזיר false אם בינתיים השעון הוגדר מחדש (כדי לעצור רצפים של אנימציה)
    wait(ms) {
      const ep = this.epoch;
      return new Promise(r => setTimeout(() => r(ep === this.epoch), REDUCED ? Math.min(ms, 250) : ms));
    }

    // ---------- אינטראקציה ----------
    _local(e) {
      const pt = this.svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const p = pt.matrixTransform(this.svg.getScreenCTM().inverse());
      return { x: p.x, y: p.y, dist: Math.hypot(p.x, p.y), ang: mod(Math.atan2(p.x, -p.y) * 180 / Math.PI, 360) };
    }
    _handDeg(name) {
      return name === 'minute' ? mod(this.total, 60) * 6 : mod(this.total / 60, 12) * 30;
    }
    // המחוג הקרוב ביותר לנקודה (מרחק מהקטע של המחוג)
    pickHand(p, allowed) {
      let best = null;
      let bestD = Infinity;
      for (const name of allowed) {
        if (this.cfg.hideHands.includes(name)) continue;
        const [tx, ty] = polar(this._handDeg(name), LEN[name]);
        const len2 = tx * tx + ty * ty;
        const k = Math.max(0, Math.min(1, (p.x * tx + p.y * ty) / len2));
        let d = Math.hypot(p.x - tx * k, p.y - ty * k);
        if (angDiff(this._handDeg('hour'), this._handDeg('minute')) < 20) d += name === 'minute' ? (p.dist > 44 ? -2 : 2) : 0;
        if (d < bestD) {
          bestD = d;
          best = name;
        }
      }
      return bestD <= 18 ? best : null;
    }
    _down(e) {
      const c = this.cfg;
      if (c.mode === 'hand') {
        const p = this._local(e);
        const hand = this.pickHand(p, ['hour', 'minute']);
        if (this.onHand) this.onHand(hand);
        return;
      }
      if (c.mode !== 'drag') return;
      const p = this._local(e);
      const allowed = c.draggable.filter(n => !c.hideHands.includes(n));
      let hand = this.pickHand(p, allowed);
      if (!hand && allowed.length === 1) hand = allowed[0];
      if (!hand) return;
      e.preventDefault();
      this.epoch++;
      cancelAnimationFrame(this._raf);
      this.dragging = hand;
      this.svg.classList.add('dragging');
      this.hands[hand].classList.add('grabbed');
      try { this.svg.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      this._dragTo(p);
    }
    _move(e) {
      if (!this.dragging) return;
      e.preventDefault();
      this._dragTo(this._local(e));
    }
    _up() {
      if (!this.dragging) return;
      this.hands[this.dragging].classList.remove('grabbed');
      this.dragging = null;
      this.svg.classList.remove('dragging');
      this.total = Math.round(this.total);
      this.render();
    }
    _dragTo(p) {
      const snap = this.cfg.snap || 1;
      if (this.dragging === 'minute') {
        const newMin = mod(Math.round(p.ang / 6 / snap) * snap, 60);
        const cur = mod(Math.round(this.total), 60);
        let delta = newMin - cur;
        if (delta > 30) delta -= 60;
        if (delta < -30) delta += 60;
        this.total = mod(Math.round(this.total) + delta, 720);
      } else {
        const m = mod(Math.round(this.total), 60);
        const h = mod(Math.round((p.ang - m * 0.5) / 30), 12);
        this.total = h * 60 + m;
      }
      this.render();
    }
    _key(e) {
      if (this.cfg.mode !== 'drag') return;
      const can = n => this.cfg.draggable.includes(n);
      const snap = this.cfg.snap || 1;
      let d = 0;
      if (e.key === 'ArrowRight' && can('minute')) d = snap;
      else if (e.key === 'ArrowLeft' && can('minute')) d = -snap;
      else if (e.key === 'ArrowUp' && can('hour')) d = 60;
      else if (e.key === 'ArrowDown' && can('hour')) d = -60;
      else return;
      e.preventDefault();
      this.total = mod(Math.round(this.total) + d, 720);
      this.render();
    }
  }

  Clock.polar = polar;
  window.Clock = Clock;
})();
