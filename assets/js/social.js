/* Social posts: each one is a full-size canvas, the 3D scene rendered still with type set on top.
   Because a post is a single canvas, saving it as a PNG gives exactly what is on screen. */
(function () {
  'use strict';

  var ORANGE = '#ff6000';
  var TONE = {
    ink: { fg: '#f5f7fc', fg2: '#d3dcf7', tag: 'rgba(8,22,72,0.35)' },
    stone: { fg: '#171a20', fg2: '#3d434d', tag: 'rgba(240,242,242,0.7)' },
    black: { fg: '#f5f7fc', fg2: '#b4b9c1', tag: 'rgba(0,0,0,0.3)' }
  };
  var FORMATS = [
    { id: 'portrait', w: 1080, h: 1350, label: 'Portrait 1080 × 1350' },
    { id: 'landscape', w: 1200, h: 627, label: 'Landscape 1200 × 627' }
  ];
  var MAKERS = ['Furness Controls', 'Galileo TP', 'GOMAX', 'Imperial Tools', 'OAK Europa (Ramer)', 'Supco', 'Technomark', 'Volvac', 'Wigam', 'CIMAT'];
  var SERVICES = ['Systems manufacturing', 'Repairs', 'Calibration', 'Certification', 'Product training', 'Stock and spare parts'];

  // key: camera key in the scene. m: camera distance multiplier [portrait, landscape].
  var POSTS = [
    { slug: 'brand', name: 'Brand', tone: 'ink', key: 0, m: [1.85, 0.95], P: { sy: 0.2, loose: false }, ink: 34, needle: 0.012,
      head: 'Quality machinery, measured and maintained.',
      body: 'Measurement equipment, instrumentation and production machinery, supplied and looked after since 2004.' },
    { slug: 'leak-flow-pressure', name: 'Leak, flow and pressure', tone: 'stone', key: 1, m: [1.55, 0.8], L: { flip: true }, act: { 1: 1 },
      head: 'Leak, flow and pressure',
      body: 'Leak detectors, flow measurement from 0.01 ml/min to 20,000 l/min, and pressure from 0.01 Pa to 20 kPa.',
      tags: ['Furness Controls', 'Galileo TP', 'OAK Europa (Ramer)'] },
    { slug: 'refrigeration', name: 'Refrigeration and air conditioning', tone: 'stone', key: 2, m: [1.95, 0.8], P: { sy: 0.2, sx: 0.09 }, L: { flip: true }, act: { 2: 1 },
      head: 'Refrigeration and air conditioning',
      body: 'Evacuation, refrigerant charging and recovery for production lines, with the gauges, pumps, hoses and scales for the service bench.',
      tags: ['Galileo TP', 'Wigam', 'Supco', 'Imperial Tools', 'GOMAX'] },
    { slug: 'marking', name: 'Marking and traceability', tone: 'stone', key: 3, m: [2.25, 1.15], P: { sy: 0.15, sx: 0.1 }, act: { 3: 1 },
      head: 'Marking and traceability',
      body: 'Dot peen and laser marking that gives every part a permanent identity: portable, on the bench, or built into the line.',
      tags: ['Technomark'] },
    { slug: 'balancing', name: 'Balancing', tone: 'stone', key: 4, m: [1.5, 1.0], act: { 4: 0.7 },
      head: 'Balancing',
      body: 'Turbocharger balancers and flow benches, automotive and industrial balancing machines, and field balancers for work on site.',
      tags: ['CIMAT'] },
    { slug: 'packaging', name: 'Processing and packaging', tone: 'stone', key: 5, m: [1.55, 1.0], act: { 5: 0.45 },
      head: 'Processing and packaging',
      body: 'Vacuum packaging machines, tray sealers, shrink tanks, slicers and tumblers for light duty and heavy duty lines.',
      tags: ['Volvac'] },
    { slug: 'makers', name: 'Ten makers', tone: 'black', makers: true,
      head: 'Ten makers. One supplier.',
      list: MAKERS },
    { slug: 'service', name: 'Service', tone: 'stone', key: 8, m: [1.7, 0.95], P: { sy: 0.25 }, L: { flip: true },
      head: 'The supplier that stays.',
      list: SERVICES },
    { slug: 'contact', name: 'Contact', tone: 'ink', key: 9, m: [2.6, 1.0], P: { key: 0, sy: 0.28, sx: 0.16 }, ink: 34, L: { sx: 0.3 }, needle: -0.004, loose: false,
      head: 'Tell us what you need to test, mark, balance or pack.',
      lines: [['Sales', '+61 (0)45 153 3197'], ['Technical support', '+61 (0)48 247 3400'], ['Email', 'paulm@qmiau.com']] }
  ];

  /* Type on canvas ----------------------------------------------------- */

  function font(x, weight, size, stretch, spacing) {
    x.font = weight + ' ' + size + 'px Archivo, Arial, sans-serif';
    if ('fontStretch' in x) x.fontStretch = stretch || 'normal';
    if ('letterSpacing' in x) x.letterSpacing = (spacing || 0) + 'px';
  }
  function wrap(x, text, maxW) {
    var words = text.split(' '), lines = [], line = '';
    words.forEach(function (w) {
      var t = line ? line + ' ' + w : w;
      if (line && x.measureText(t).width > maxW) { lines.push(line); line = w; } else line = t;
    });
    if (line) lines.push(line);
    return lines;
  }
  function mark(x, px, py, k, color) {
    x.save(); x.translate(px, py); x.scale(k, k);
    x.strokeStyle = color; x.lineWidth = 7; x.beginPath(); x.arc(24, 24, 17, 0, Math.PI * 2); x.stroke();
    x.fillStyle = ORANGE; x.beginPath(); x.moveTo(22.2, 22.2); x.lineTo(26.6, 20.4); x.lineTo(45, 43); x.lineTo(41.6, 46); x.closePath(); x.fill();
    x.fillStyle = color; x.textBaseline = 'alphabetic'; x.textAlign = 'left';
    font(x, 800, 34, 'normal', -1); x.fillText('&', 52, 38);
    var aw = x.measureText('&').width;
    font(x, 800, 34, 'ultra-expanded', -1); x.fillText('M', 53 + aw, 38);
    var mw = x.measureText('M').width, lx = 53 + aw + mw + 14;
    x.fillRect(lx, 10, 1, 28);
    font(x, 600, 13, 'condensed', 1.8); x.fillText('INSTRUMENTATION', lx + 13, 29);
    x.restore();
  }
  function scale(x, w, h, color, at) {
    var top = h * 0.12, bot = h * 0.9, n = 60, u = w / 1080;
    x.fillStyle = color;
    for (var i = 0; i <= n; i++) {
      var y = Math.round(top + (bot - top) * i / n), len = (i % 10 === 0 ? 26 : i % 5 === 0 ? 17 : 10) * Math.max(u, 0.8);
      x.globalAlpha = i % 10 === 0 ? 1 : i % 5 === 0 ? 0.8 : 0.55;
      x.fillRect(w - len, y, len, Math.max(1, Math.round(1.5 * u)));
    }
    x.globalAlpha = 1; x.fillStyle = ORANGE;
    x.fillRect(w - 40 * Math.max(u, 0.8), Math.round(top + (bot - top) * at) - 1, 40 * Math.max(u, 0.8), Math.max(3, Math.round(3 * u)));
  }
  function tags(x, names, px, py, maxW, s, tone, measure) {
    var hgt = Math.round(s * 2.15), padL = Math.round(s * 0.8), padR = Math.round(s * 1.0), hole = Math.round(s * 0.28), gap = Math.round(s * 0.5);
    var cx = px, cy = py;
    font(x, 650, s, 'condensed', s * 0.08);
    names.forEach(function (nm) {
      var t = nm.toUpperCase(), w = padL + hole * 2 + Math.round(s * 0.6) + x.measureText(t).width + padR;
      if (cx > px && cx + w > px + maxW) { cx = px; cy += hgt + gap; }
      if (!measure) {
        x.fillStyle = tone.tag; x.fillRect(cx, cy, w, hgt);
        x.strokeStyle = tone.fg; x.lineWidth = Math.max(1, s / 16); x.strokeRect(cx + 0.5, cy + 0.5, w - 1, hgt - 1);
        x.beginPath(); x.arc(cx + padL + hole, cy + hgt / 2, hole, 0, Math.PI * 2); x.stroke();
        x.fillStyle = tone.fg; x.textBaseline = 'middle'; x.textAlign = 'left';
        x.fillText(t, cx + padL + hole * 2 + Math.round(s * 0.6), cy + hgt / 2 + s * 0.06);
      }
      cx += w + gap;
    });
    return cy + hgt - py;
  }

  /* One post, one format ----------------------------------------------- */

  function pose(scene, post, f) {
    var portrait = f.id === 'portrait', MK = scene.makers;
    if (post.makers) {
      var z1 = MK.z0 + 9 * MK.dz;
      return portrait
        ? { p: [MK.x, 44, MK.z0 + 2.4 * MK.dz + 16], t: [MK.x, 0, MK.z0 + 2.4 * MK.dz], sx: 0.25, sy: 0 }
        : { p: [MK.x + 12, 18, z1 + 10], t: [MK.x - 2, 0.4, z1 - 8], sx: 0.22, sy: 0.02 };
    }
    var v = (portrait ? post.P : post.L) || {};
    var k = scene.keys[v.key != null ? v.key : post.key], m = post.m[portrait ? 0 : 1];
    var kp = k.p.slice(); if (v.cx != null) kp[0] = k.t[0] + v.cx;
    var p = kp.map(function (c, i) { return k.t[i] + (c - k.t[i]) * m; });
    var sx = portrait ? (v.sx || 0) : (v.sx || 0.25) * (v.flip ? -1 : 1);
    return { p: p, t: k.t, sx: sx, sy: v.sy != null ? v.sy : portrait ? 0.19 : 0.02, loose: v.loose };
  }

  function draw(scene, post, f, index) {
    var c = document.createElement('canvas'); c.width = f.w; c.height = f.h;
    var x = c.getContext('2d'), tone = TONE[post.tone], portrait = f.id === 'portrait';
    var o = pose(scene, post, f);
    o.w = f.w; o.h = f.h; o.ink = post.ink; o.act = post.act; o.needle = post.needle; if (o.loose == null) o.loose = post.loose;
    x.drawImage(scene.shot(o), 0, 0);

    var M = portrait ? 80 : 56;                       // margin
    var flip = !portrait && post.L && post.L.flip, TX = flip ? f.w - 545 : M;  // text column start
    var H1 = portrait ? 86 : 52, LH1 = portrait ? 86 : 53;
    var B = portrait ? 33 : 21, LB = portrait ? 47 : 30;
    var colW = portrait ? f.w - M * 2 - 40 : flip ? 450 : 540;
    var headW = post.makers && portrait ? 470 : colW;

    mark(x, flip ? TX : M, portrait ? 70 : 44, portrait ? 1.7 : 1.2, tone.fg);
    scale(x, f.w, f.h, tone.fg, (index + 0.5) / POSTS.length);

    // Measure the text block, then seat it: bottom of the frame in portrait, centred in landscape.
    font(x, 700, H1, 'extra-expanded', -H1 * 0.025);
    var hl = wrap(x, post.head, headW), parts = [{ h: hl.length * LH1 }];
    var bl = [];
    if (post.body) { font(x, 400, B, 'normal', 0); bl = wrap(x, post.body, Math.min(colW, portrait ? 860 : flip ? 440 : 500)); parts.push({ gap: portrait ? 30 : 18, h: bl.length * LB }); }
    var ts = portrait ? 25 : 16;
    if (post.tags) parts.push({ gap: portrait ? 36 : 22, h: tags(x, post.tags, 0, 0, colW, ts, tone, true) });
    var LS = portrait ? 40 : 25, LL = portrait ? 52 : 32, cols = post.list && (portrait && !post.makers ? 1 : post.list.length > 6 && !portrait ? 2 : 1);
    if (post.list) parts.push({ gap: portrait ? 38 : 22, h: Math.ceil(post.list.length / cols) * LL });
    var CS = portrait ? 54 : 32, CL = portrait ? 104 : 62;
    if (post.lines) parts.push({ gap: portrait ? 44 : 24, h: post.lines.length * CL });
    var total = parts.reduce(function (a, p) { return a + (p.gap || 0) + p.h; }, 0);
    var y = portrait ? (post.makers ? 250 : f.h - 150 - total) : Math.round((f.h - total) / 2 + 26);

    x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillStyle = tone.fg;
    font(x, 700, H1, 'extra-expanded', -H1 * 0.025);
    hl.forEach(function (l, i) { x.fillText(l, TX - H1 * 0.04, y + H1 * 0.78 + i * LH1); });
    y += hl.length * LH1;

    if (post.body) {
      y += portrait ? 30 : 18; x.fillStyle = tone.fg2; font(x, 400, B, 'normal', 0);
      bl.forEach(function (l, i) { x.fillText(l, TX, y + B * 0.95 + i * LB); });
      y += bl.length * LB;
    }
    if (post.tags) { y += portrait ? 36 : 22; y += tags(x, post.tags, TX, y, colW, ts, tone, false); }
    if (post.list) {
      y += portrait ? 38 : 22;
      var rows = Math.ceil(post.list.length / cols), cw = portrait ? 440 : 250;
      post.list.forEach(function (item, i) {
        var col = Math.floor(i / rows), row = i % rows, lx = TX + col * cw, ly = y + row * LL;
        x.fillStyle = tone.fg; x.globalAlpha = 0.35; x.fillRect(lx, ly, cw - (portrait ? 40 : 24), 1); x.globalAlpha = 1;
        font(x, 700, LS, 'extra-condensed', LS * 0.02);
        x.fillStyle = post.tone === 'black' ? tone.fg : tone.fg; x.fillText(item.toUpperCase(), lx, ly + LL * 0.76);
      });
      y += rows * LL;
    }
    if (post.lines) {
      y += portrait ? 44 : 24;
      post.lines.forEach(function (ln, i) {
        var ly = y + i * CL;
        font(x, 600, portrait ? 19 : 13, 'condensed', portrait ? 2.4 : 1.6); x.fillStyle = tone.fg2; x.fillText(ln[0].toUpperCase(), M, ly + (portrait ? 20 : 13));
        font(x, 600, CS, 'condensed', 0); x.fillStyle = tone.fg; x.fillText(ln[1], M, ly + (portrait ? 78 : 47));
      });
    }

    // Foot line: where to find them.
    font(x, 600, portrait ? 20 : 14, 'condensed', portrait ? 2.6 : 1.8);
    x.fillStyle = tone.fg2; x.textBaseline = 'alphabetic';
    x.fillText('QMISA.COM', flip ? TX : M, f.h - (portrait ? 66 : 40));
    return c;
  }

  /* Page --------------------------------------------------------------- */

  var saved = [];
  function save(canvas, name) {
    return new Promise(function (done) {
      canvas.toBlob(function (blob) {
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); done(); }, 350);
      }, 'image/png');
    });
  }

  function build() {
    var status = document.getElementById('status'), all = document.getElementById('all'), list = document.getElementById('posts');
    var scene;
    try { scene = window.QMScene.create(document.createElement('canvas')); }
    catch (e) { status.textContent = 'This browser could not start WebGL, so the posts cannot be rendered. Try Chrome, Edge or Brave with graphics acceleration on.'; return; }

    var i = 0;
    function next() {
      if (i >= POSTS.length) {
        status.textContent = 'All ' + saved.length + ' images are ready.';
        all.disabled = false; window.QMPosts = saved;
        return;
      }
      var post = POSTS[i], li = document.createElement('li'); li.className = 'post';
      var h = document.createElement('h2'); h.textContent = post.name; li.appendChild(h);
      var pair = document.createElement('div'); pair.className = 'post__pair'; li.appendChild(pair);
      FORMATS.forEach(function (f) {
        var c = draw(scene, post, f, i), name = 'qm-' + String(i + 1).padStart(2, '0') + '-' + post.slug + '-' + f.id + '-' + f.w + 'x' + f.h + '.png';
        c.setAttribute('role', 'img'); c.setAttribute('aria-label', post.head + ' (' + f.label + ')');
        var fig = document.createElement('figure'); fig.className = 'art'; fig.appendChild(c);
        var cap = document.createElement('figcaption'), sp = document.createElement('span'); sp.textContent = f.label; cap.appendChild(sp);
        var b = document.createElement('button'); b.type = 'button'; b.className = 'save'; b.textContent = 'Save PNG';
        b.addEventListener('click', function () { save(c, name); });
        cap.appendChild(b); fig.appendChild(cap); pair.appendChild(fig);
        saved.push({ canvas: c, name: name });
      });
      list.appendChild(li);
      i++; status.textContent = 'Rendering the posts… ' + i + ' of ' + POSTS.length;
      setTimeout(next, 30);
    }
    next();

    all.addEventListener('click', function () {
      all.disabled = true;
      saved.reduce(function (p, s) { return p.then(function () { return save(s.canvas, s.name); }); }, Promise.resolve())
        .then(function () { all.disabled = false; });
    });
  }

  var ready = document.fonts && document.fonts.load
    ? Promise.all([document.fonts.load('400 30px Archivo'), document.fonts.load('700 30px Archivo'), document.fonts.load('800 30px Archivo')])
    : Promise.resolve();
  Promise.race([ready, new Promise(function (r) { setTimeout(r, 2000); })]).then(build, build);
})();
