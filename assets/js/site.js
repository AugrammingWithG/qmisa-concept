/* Page behaviour: drives the camera from scroll, binds readouts, draws the leader line. */
(function () {
  'use strict';

  var doc = document.documentElement, body = document.body;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function sstep(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  var stages = $$('.stage[data-key]');
  var sections = $$('[data-name]');
  var bar = $('.bar'), scale = $('.scale'), scaleLabel = $('.scale__label');
  var leader = $('#leader'), leaderLine = $('line', leader), leaderDot = $('circle', leader);
  var makers = $('#makers'), contact = $('#contact'), service = $('#service');

  /* Scale ticks */
  (function () {
    var holder = $('.scale__ticks'), n = 80, html = '';
    for (var i = 0; i <= n; i++) html += '<i class="' + (i % 10 === 0 ? 'l' : i % 5 === 0 ? 'm' : '') + '" style="top:' + (i / n * 100) + '%"></i>';
    holder.innerHTML = html;
  })();

  /* Service list reveals once, as one wipe down the list */
  (function () {
    var list = $('.service__list');
    if (!('IntersectionObserver' in window) || still) return;
    $$('li', list).forEach(function (li, i) { li.style.setProperty('--i', i); });
    body.classList.add('io');
    new IntersectionObserver(function (e, o) {
      if (e[0].isIntersecting) { list.classList.add('in'); o.disconnect(); }
    }, { threshold: 0.15 }).observe(list);
  })();

  /* Layout measurements */
  var vh = window.innerHeight, vw = window.innerWidth, centres = [], marks = [], docH = 1;
  function measure() {
    vh = window.innerHeight; vw = window.innerWidth;
    centres = stages.map(function (s) { var r = s.getBoundingClientRect(); return r.top + window.scrollY + r.height / 2; });
    docH = Math.max(1, doc.scrollHeight - vh);
    // Scroll positions (viewport centre) paired with camera keys; makers spans two keys.
    var mr = makers.getBoundingClientRect(), sr = service.getBoundingClientRect(), y = window.scrollY;
    marks = stages.slice(0, 6).map(function (s, i) { return [centres[i], i]; });
    marks.push([mr.top + y + vh / 2, 6], [mr.bottom + y - vh / 2, 7], [sr.top + y + vh / 2, 8], [sr.bottom + y - vh / 2, 8], [centres[6], 9]);
  }

  function keyAt(y) {
    var c = y + vh / 2;
    if (c <= marks[0][0]) return 0;
    for (var i = 0; i < marks.length - 1; i++) {
      var a = marks[i], b = marks[i + 1];
      if (c <= b[0]) return b[0] <= a[0] ? b[1] : a[1] + (b[1] - a[1]) * (c - a[0]) / (b[0] - a[0]);
    }
    return marks[marks.length - 1][1];
  }

  function sectionAt(y) {
    for (var i = sections.length - 1; i >= 0; i--) {
      if (sections[i].getBoundingClientRect().top <= y) return sections[i];
    }
    return sections[0];
  }

  /* Readouts */
  var R = {};
  ['hero', 'leak-p', 'leak-d', 'leak-r', 'ref-l', 'ref-h', 'ref-c', 'mark-n', 'bal-s', 'bal-u', 'pack-v', 'pack-s'].forEach(function (k) { R[k] = $('#r-' + k); });
  function put(el, text, settle) {
    if (el.textContent !== text) el.textContent = text;
    el.style.setProperty('--w', settle ? 760 : 380);
  }
  function sign(v, d) { return (v < 0 ? '−' : '+') + Math.abs(v).toFixed(d); }
  function readouts(s) {
    put(R.hero, sign(s.hero, 3) + ' mm', s.heroSettle);
    put(R['leak-p'], s.leakP.toFixed(2) + ' bar', s.leakSettle);
    put(R['leak-d'], s.leakD.toFixed(1) + ' Pa/s', s.leakSettle);
    put(R['leak-r'], s.leakR, s.leakSettle);
    put(R['ref-l'], s.refL.toFixed(1) + ' bar', s.refSettle);
    put(R['ref-h'], s.refH.toFixed(1) + ' bar', s.refSettle);
    put(R['ref-c'], s.refC.toFixed(3) + ' kg', s.refSettle);
    put(R['mark-n'], s.markN + ' of ' + s.markTotal, s.markSettle);
    put(R['bal-s'], s.balS.toLocaleString('en-AU') + ' rpm', s.balSettle);
    put(R['bal-u'], s.balU.toFixed(2) + ' g·mm', s.balSettle);
    put(R['pack-v'], (s.packV < -0.005 ? '−' : '') + Math.abs(s.packV).toFixed(2) + ' bar', s.packSettle);
    put(R['pack-s'], s.packS, s.packSettle);
  }

  /* Chrome that works with or without 3D */
  function chrome() {
    var y = window.scrollY;
    bar.dataset.tone = sectionAt(48).dataset.tone;
    var mid = sectionAt(vh / 2);
    scale.dataset.tone = mid.dataset.tone;
    if (scaleLabel.textContent !== mid.dataset.name) scaleLabel.textContent = mid.dataset.name;
    scale.style.setProperty('--p', clamp(y / docH, 0, 1));
  }

  var scene = null, canvas = $('#plate');
  var pointer = { x: 0.5, y: 0.5 };
  var keySm = 0, last = 0, lit = false, sinceRead = 0;

  function loop(now) {
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    chrome();
    if (!scene) return;

    var k = keyAt(window.scrollY);
    keySm = still ? k : keySm + (k - keySm) * (1 - Math.exp(-dt * 5.5));

    var viewC = window.scrollY + vh / 2, best = null, bestF = 0;
    stages.forEach(function (s, i) {
      var d = Math.abs(centres[i] - viewC) / vh;
      if (i === 0 && viewC < centres[0]) d = 0;
      if (i === stages.length - 1 && viewC > centres[i]) d = 0;
      var f = 1 - sstep(0.2, 0.6, d);
      s.firstElementChild.style.setProperty('--f', f.toFixed(3));
      if (f > bestF) { bestF = f; best = s; }
    });

    var hidden = vw <= 860 && makers.getBoundingClientRect().top <= 0 && contact.getBoundingClientRect().top >= vh;
    if (hidden) { leader.style.setProperty('--o', 0); return; }

    scene.frame(dt, keySm, pointer, still);
    if (!lit) { lit = true; body.classList.add('is-lit'); }

    sinceRead += dt;
    if (sinceRead > 0.07) { sinceRead = 0; readouts(scene.state); }

    // Leader line from the maker tags to the object they describe.
    var from = best && best.querySelector('.tags');
    var a = best ? scene.anchor(+best.dataset.key) : null;
    if (from && a && bestF > 0.05 && vw > 860 && from.classList.contains('tags')) {
      var r = from.getBoundingClientRect(), right = best.dataset.side === 'right';
      var kids = from.children.length ? from.children : [from];
      var edge = right ? kids[0].getBoundingClientRect().left : kids[kids.length - 1].getBoundingClientRect().right;
      var y0 = (right ? kids[0] : kids[kids.length - 1]).getBoundingClientRect();
      leaderLine.setAttribute('x1', edge); leaderLine.setAttribute('y1', y0.top + y0.height / 2);
      leaderLine.setAttribute('x2', a.x); leaderLine.setAttribute('y2', a.y);
      leaderDot.setAttribute('cx', a.x); leaderDot.setAttribute('cy', a.y);
      leader.dataset.tone = best.dataset.tone;
      leader.style.setProperty('--o', (bestF * bestF * 0.75).toFixed(3));
    } else {
      leader.style.setProperty('--o', 0);
    }
  }

  function resize() {
    measure();
    if (scene) scene.resize(vw, vh, window.devicePixelRatio);
  }

  function start() {
    var ok = false;
    try { var t = document.createElement('canvas'); ok = !!(window.THREE && window.QMScene && (t.getContext('webgl2') || t.getContext('webgl'))); } catch (e) { ok = false; }
    if (ok) {
      try {
        scene = window.QMScene.create(canvas);
        body.classList.add('has-3d');
      } catch (e) { scene = null; body.classList.remove('has-3d'); }
    }
    resize();
    keySm = keyAt(window.scrollY);
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('load', measure);
  window.addEventListener('pointermove', function (e) { pointer.x = e.clientX / vw; pointer.y = e.clientY / vh; }, { passive: true });
  window.addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t) { pointer.x = t.clientX / vw; pointer.y = t.clientY / vh; } }, { passive: true });
  $('#zero').addEventListener('click', function () { if (scene) scene.zero(); });

  // The dial faces are drawn with the page's typeface, so wait for it (briefly).
  var fontsReady = document.fonts && document.fonts.load
    ? Promise.all([document.fonts.load('600 40px Archivo'), document.fonts.load('800 40px Archivo')])
    : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 1500); })]).then(start, start);
})();
