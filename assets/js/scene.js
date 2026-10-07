/* The Surface Plate: one granite inspection plate, six groups of instruments on it.
   Everything is modelled in code; there are no external model or image files. */
(function () {
  'use strict';
  var T = window.THREE;
  if (!T) return;

  var PI = Math.PI;
  var ST0 = 44, GAP = 34; // x of the first station after the hero, and spacing

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function sstep(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function smoother(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function V(x, y, z) { return new T.Vector3(x, y, z); }

  /* Textures ----------------------------------------------------------- */

  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function tex(c) { var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t; }
  function font(x, weight, size, stretch) {
    x.font = weight + ' ' + size + 'px Archivo, Arial, sans-serif';
    if ('fontStretch' in x) x.fontStretch = stretch || 'normal';
  }

  function speckleTexture() {
    var S = 1024, c = canvas(S, S), x = c.getContext('2d');
    x.fillStyle = '#cdd0cf'; x.fillRect(0, 0, S, S);
    var tones = ['#4f5458', '#63686c', '#8b9093', '#a9adae', '#eef0ef', '#f7f8f7', '#b7ada3'];
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < 30000; i++) {
      var px = rnd() * S, py = rnd() * S, r = 0.5 + rnd() * rnd() * 2.6;
      x.globalAlpha = 0.25 + rnd() * 0.6;
      x.fillStyle = tones[(rnd() * tones.length) | 0];
      for (var ox = -1; ox <= 1; ox++) for (var oy = -1; oy <= 1; oy++) {
        var qx = px + ox * S, qy = py + oy * S;
        if (qx < -4 || qx > S + 4 || qy < -4 || qy > S + 4) continue;
        x.beginPath(); x.ellipse(qx, qy, r, r * (0.6 + rnd() * 0.6), rnd() * PI, 0, 2 * PI); x.fill();
      }
    }
    x.globalAlpha = 1;
    var t = tex(c); t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
  }

  // Where the engineer's blue has been wiped onto the plate: solid, then dry brush strokes.
  function inkMask() {
    var W = 512, H = 4096, c = canvas(W, H), x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#fff'; x.fillRect(0, 0, W * 0.84, H);
    var seed = 21;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var y = 0;
    while (y < H) {
      var h = 2 + rnd() * rnd() * 26, end = W * (0.85 + rnd() * rnd() * 0.14 + Math.sin(y * 0.004) * 0.02);
      var g = x.createLinearGradient(W * 0.82, 0, end, 0);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.75, 'rgba(255,255,255,' + (0.55 + rnd() * 0.45) + ')');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(W * 0.82, y, end - W * 0.82, h);
      y += h * (0.35 + rnd() * 0.8);
    }
    var t = new T.CanvasTexture(c);
    return t;
  }

  function faceTexture(o) {
    var S = 1024, c = canvas(S, S), x = c.getContext('2d');
    x.fillStyle = o.bg || '#f3f2ec'; x.fillRect(0, 0, S, S);
    x.translate(S / 2, S / 2);
    var fg = o.fg || '#15181c';
    if (o.band) {
      x.lineWidth = 34; x.strokeStyle = o.band.color;
      x.beginPath(); x.arc(0, 0, 418, o.band.a0 - PI / 2, o.band.a1 - PI / 2); x.stroke();
    }
    for (var i = 0; i <= o.n; i++) {
      if (o.full && i === o.n) break;
      var a = o.a0 + (o.a1 - o.a0) * i / o.n;
      var major = i % o.major === 0, mid = i % (o.major / 2) === 0;
      x.save(); x.rotate(a); x.fillStyle = fg;
      var len = major ? 78 : mid ? 56 : 36, w = major ? 9 : 4.5;
      x.fillRect(-w / 2, -476, w, len); x.restore();
      if (major) {
        font(x, 600, o.numSize || 76, 'condensed');
        x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(o.label(i), Math.sin(a) * 338, -Math.cos(a) * 338 + 4);
      }
    }
    (o.lines || []).forEach(function (l) {
      font(x, l.w || 600, l.s, l.st || 'condensed');
      x.fillStyle = l.c || fg; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(l.t, 0, l.y);
    });
    if (o.sub) { // small revolution counter
      x.strokeStyle = fg; x.lineWidth = 4; x.beginPath(); x.arc(0, -150, 62, 0, 2 * PI); x.stroke();
      for (var k = 0; k < 10; k++) { x.save(); x.translate(0, -150); x.rotate(k * PI / 5); x.fillStyle = fg; x.fillRect(-2, -62, 4, 14); x.restore(); }
      x.save(); x.translate(0, -150); x.rotate(0.9); x.fillRect(-3, -48, 6, 54); x.restore();
    }
    return tex(c);
  }

  /* Scene -------------------------------------------------------------- */

  function create(canvasEl, opts) {
    opts = opts || {};
    var renderer = new T.WebGLRenderer({ canvas: canvasEl, antialias: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;

    var scene = new T.Scene();
    var BG_INK = new T.Color(0x081648), BG_STONE = new T.Color(0xd2d5d4), BG_BLACK = new T.Color(0x0a0b0d);
    scene.background = BG_INK.clone();
    scene.fog = new T.Fog(BG_INK.clone(), 42, 112);

    var camera = new T.PerspectiveCamera(32, 1, 0.5, 400);

    // Lab lighting as an environment: a dim room with soft boxes overhead.
    (function () {
      var env = new T.Scene();
      function panel(w, h, intensity, pos, rot, color) {
        var m = new T.MeshBasicMaterial({ color: new T.Color(color || 0xffffff).multiplyScalar(intensity), side: T.DoubleSide });
        var p = new T.Mesh(new T.PlaneGeometry(w, h), m);
        p.position.copy(pos); p.rotation.set(rot[0], rot[1], rot[2]); env.add(p);
      }
      env.add(new T.Mesh(new T.BoxGeometry(60, 30, 60), new T.MeshBasicMaterial({ color: 0x4a515a, side: T.BackSide })));
      panel(60, 60, 1, V(0, -14.9, 0), [-PI / 2, 0, 0], 0x8f979c);
      panel(26, 10, 14, V(-4, 14.8, 4), [PI / 2, 0, 0]);
      panel(8, 22, 9, V(-29.8, 2, 6), [0, PI / 2, 0], 0xdfe9ff);
      panel(18, 5, 7, V(8, 6, 29.8), [0, PI, 0]);
      panel(6, 12, 5, V(29.8, 4, -8), [0, -PI / 2, 0], 0xfff1e0);
      var pm = new T.PMREMGenerator(renderer);
      scene.environment = pm.fromScene(env, 0.035).texture;
      pm.dispose();
    })();

    var sun = new T.DirectionalLight(0xffffff, 1.75);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -20; sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 70;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; sun.shadow.radius = 3.5;
    scene.add(sun, sun.target);
    scene.add(new T.HemisphereLight(0xffffff, 0x8a8f96, 0.14));

    /* Materials */
    var M = {
      steel: new T.MeshStandardMaterial({ color: 0xcfd4d8, metalness: 1, roughness: 0.2 }),
      brushed: new T.MeshStandardMaterial({ color: 0xbfc5ca, metalness: 1, roughness: 0.42 }),
      chrome: new T.MeshStandardMaterial({ color: 0xe6e9ec, metalness: 1, roughness: 0.07 }),
      alu: new T.MeshStandardMaterial({ color: 0xd3d6d8, metalness: 0.9, roughness: 0.5 }),
      black: new T.MeshStandardMaterial({ color: 0x17191c, metalness: 0.5, roughness: 0.45 }),
      rubber: new T.MeshStandardMaterial({ color: 0x1b1c1e, metalness: 0, roughness: 0.8 }),
      enamel: new T.MeshStandardMaterial({ color: 0x2b3038, metalness: 0.2, roughness: 0.38 }),
      inkPaint: new T.MeshStandardMaterial({ color: 0x1b3aa6, metalness: 0.25, roughness: 0.35 }),
      white: new T.MeshStandardMaterial({ color: 0xe4e7e9, metalness: 0.1, roughness: 0.4 }),
      brass: new T.MeshStandardMaterial({ color: 0xb9975a, metalness: 1, roughness: 0.3 }),
      needle: new T.MeshStandardMaterial({ color: 0xff5a1f, emissive: 0xff4a10, emissiveIntensity: 0.35, roughness: 0.5 }),
      glass: new T.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.02, transparent: true, opacity: 0.13, depthWrite: false }),
      hoseBlue: new T.MeshStandardMaterial({ color: 0x1d4fc4, roughness: 0.55 }),
      hoseRed: new T.MeshStandardMaterial({ color: 0xc4281d, roughness: 0.55 }),
      hoseYellow: new T.MeshStandardMaterial({ color: 0xe0b21a, roughness: 0.55 }),
      product: new T.MeshStandardMaterial({ color: 0xe6c463, roughness: 0.6 }),
      film: new T.MeshStandardMaterial({ color: 0xffffff, metalness: 0.6, roughness: 0.08, transparent: true, opacity: 0.22, depthWrite: false }),
      dot: new T.MeshStandardMaterial({ color: 0x24272b, metalness: 0.4, roughness: 0.9 })
    };

    /* Builders */
    function mesh(g, m, noShadow) { var o = new T.Mesh(g, m); if (!noShadow) { o.castShadow = true; o.receiveShadow = true; } return o; }
    function cyl(rt, rb, h, m, seg) { return mesh(new T.CylinderGeometry(rt, rb, h, seg || 40), m); }
    function at(o, x, y, z) { o.position.set(x, y, z); return o; }
    function rbox(w, h, d, r, m) {
      var s = new T.Shape(), x = -w / 2, y = -h / 2;
      r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001);
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
      var b = Math.min(r * 0.5, 0.07, d / 4);
      var g = new T.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelOffset: -b, bevelSegments: 3, curveSegments: 6 });
      g.translate(0, 0, -(d - 2 * b) / 2);
      return mesh(g, m);
    }
    function tube(points, r, m) {
      var curve = new T.CatmullRomCurve3(points.map(function (p) { return V(p[0], p[1], p[2]); }));
      return mesh(new T.TubeGeometry(curve, 80, r, 12, false), m);
    }
    function dial(o) {
      var g = new T.Group(), d = o.depth;
      var body = cyl(o.r, o.r, d, o.body || M.black, 64); body.rotation.x = PI / 2; g.add(body);
      var face = new T.Mesh(new T.CircleGeometry(o.r * 0.93, 64), new T.MeshStandardMaterial({ map: o.tex, roughness: 0.75 }));
      face.position.z = d / 2 + 0.012; face.receiveShadow = true; g.add(face);
      var bez = mesh(new T.TorusGeometry(o.r * 0.965, o.r * 0.075, 20, 96), o.bezel || M.chrome); bez.position.z = d / 2 + 0.02; g.add(bez);
      var n = new T.Group(); n.position.z = d / 2 + 0.06;
      var s = new T.Shape(), L = o.r * 0.8, t = o.r * 0.2, w = o.r * 0.034;
      s.moveTo(-w, -t); s.lineTo(w, -t); s.lineTo(w * 0.3, L); s.lineTo(-w * 0.3, L); s.closePath();
      n.add(new T.Mesh(new T.ShapeGeometry(s), M.needle));
      var cap = cyl(o.r * 0.075, o.r * 0.075, 0.06, M.black, 24); cap.rotation.x = PI / 2; cap.position.z = 0.03; n.add(cap);
      g.add(n); g.needle = n;
      var glass = new T.Mesh(new T.CircleGeometry(o.r * 0.93, 48), M.glass); glass.position.z = d / 2 + 0.14; g.add(glass);
      return g;
    }
    function gaugeTex(max, step, unit, bg, fg, band) {
      return faceTexture({
        a0: -0.75 * PI, a1: 0.75 * PI, n: 50, major: 10, bg: bg, fg: fg, band: band, numSize: 92,
        label: function (i) { return String(Math.round(max * i / 50 * 10) / 10); },
        lines: [{ t: unit, y: 170, s: 70, w: 700 }, { t: 'Q&M', y: 290, s: 64, w: 700, st: 'normal' }]
      });
    }

    // Soft contact shadow painted under each object so it sits on the stone.
    var blobTex = (function () {
      var c = canvas(256, 256), x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 20, 128, 128, 128);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, 256, 256);
      return new T.CanvasTexture(c);
    })();
    function blob(parent, x, z, w, d, o) {
      var m = new T.Mesh(new T.PlaneGeometry(w, d), new T.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: o || 0.5, depthWrite: false, color: 0x05070c }));
      m.rotation.x = -PI / 2; m.position.set(x, 0.02, z); m.renderOrder = 1; parent.add(m); return m;
    }

    /* The plate */
    var speck = speckleTexture();
    speck.repeat.set(44, 24);
    var plate = new T.Mesh(new T.PlaneGeometry(440, 240), new T.MeshStandardMaterial({ color: 0xbfc3c3, map: speck, roughness: 0.46, metalness: 0 }));
    plate.rotation.x = -PI / 2; plate.position.set(110, 0, 0); plate.receiveShadow = true; scene.add(plate);

    var speckInk = speck.clone(); speckInk.needsUpdate = true; speckInk.repeat.set(11, 24);
    var ink = new T.Mesh(new T.PlaneGeometry(110, 240), new T.MeshStandardMaterial({
      color: 0x0d2a9a, map: speckInk, alphaMap: inkMask(), transparent: true, roughness: 0.36, metalness: 0.05,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
    }));
    ink.rotation.x = -PI / 2; ink.position.set(-29, 0.004, 0); ink.receiveShadow = true; scene.add(ink);

    var state = {
      hero: 0, heroSettle: 0,
      leakP: 0, leakD: 0, leakR: 'Filling', leakSettle: 0,
      refL: 0, refH: 0, refC: 0, refSettle: 0,
      markN: 0, markTotal: 0, markSettle: 0,
      balS: 0, balU: 4.8, balSettle: 0,
      packV: 0, packS: 'Open', packSettle: 0
    };
    var act = [0, 0, 0, 0, 0, 0];
    var tick = [];
    var anchors = [];

    /* 0. Dial indicator on a stand, over two gauge blocks ---------------- */
    var heroDial, heroLoose;
    (function () {
      var g = new T.Group(); scene.add(g);
      g.add(at(rbox(3.6, 1.0, 0.95, 0.03, M.steel), 0, 0.5, 0));
      g.add(at(rbox(3.6, 0.5, 0.95, 0.03, M.chrome), 0.08, 1.25, 0));
      var loose = at(rbox(3.6, 0.8, 0.95, 0.03, M.steel), 4.4, 0.4, 2.6); loose.rotation.y = 0.5; g.add(loose);
      heroLoose = new T.Group(); g.add(heroLoose);
      var loose2 = at(rbox(3.6, 0.3, 0.95, 0.03, M.chrome), 5.6, 0.15, 5.4); loose2.rotation.y = -0.3; heroLoose.add(loose, loose2);

      g.add(at(rbox(4.4, 3.0, 3.8, 0.28, M.enamel), -5.6, 1.5, -0.3));
      var sw = cyl(0.55, 0.55, 0.5, M.chrome, 32); sw.rotation.x = PI / 2; g.add(at(sw, -5.6, 1.5, 1.8));
      g.add(at(rbox(0.22, 0.9, 0.2, 0.05, M.needle), -5.6, 1.5, 2.1));
      g.add(at(cyl(0.32, 0.32, 8.4, M.chrome), -5.6, 7.1, -0.3));
      g.add(at(cyl(0.42, 0.42, 0.25, M.black), -5.6, 11.4, -0.3));
      blob(g, -5.6, -0.1, 8, 7, 0.6); blob(g, 0.1, 0.1, 6, 2.6, 0.6); blob(heroLoose, 4.4, 2.7, 5.6, 3.6, 0.5); blob(heroLoose, 5.6, 5.4, 5.4, 3, 0.45);
      g.add(at(rbox(1.5, 1.4, 1.5, 0.15, M.black), -5.6, 9.6, -0.3));
      var knob = cyl(0.42, 0.42, 0.7, M.brushed, 24); knob.rotation.z = PI / 2; g.add(at(knob, -6.7, 9.6, -0.3));
      var arm = cyl(0.26, 0.26, 7.2, M.chrome); arm.rotation.z = PI / 2; g.add(at(arm, -2.4, 9.6, -0.75));
      g.add(at(rbox(0.9, 0.9, 0.9, 0.12, M.black), 0, 9.6, -0.75));
      g.add(at(rbox(0.55, 3.3, 0.28, 0.08, M.brushed), 0, 8.0, -0.66));

      heroDial = dial({
        r: 2.55, depth: 1.0, body: M.brushed,
        tex: faceTexture({
          full: true, a0: 0, a1: 2 * PI, n: 100, major: 10, sub: true,
          label: function (i) { return String(i); },
          lines: [{ t: 'Q&M', y: 158, s: 92, w: 700, st: 'normal' }, { t: '0.001 mm', y: 238, s: 54 }, { t: 'INSTRUMENTATION', y: 292, s: 34, w: 600 }]
        })
      });
      heroDial.position.set(0, 6.25, 0); g.add(heroDial);
      g.add(at(cyl(0.2, 0.2, 0.8, M.chrome, 24), 0, 9.05, 0));
      g.add(at(cyl(0.34, 0.34, 0.95, M.brushed, 24), 0, 3.3, 0));
      g.add(at(cyl(0.13, 0.13, 1.25, M.chrome, 20), 0, 2.3, 0));
      g.add(at(mesh(new T.SphereGeometry(0.18, 20, 14), M.chrome), 0, 1.68, 0));
      anchors[0] = V(0, 6.25, 0.6);
          })();

    /* 1. Leak test: instrument, hose, pressure part ---------------------- */
    (function () {
      var g = new T.Group(); g.position.set(ST0, 0, 0); scene.add(g);
      blob(g, -3.9, -1.0, 11, 8.5, 0.55); blob(g, 4.3, 1.3, 9.5, 6, 0.5);
      var unit = new T.Group(); unit.position.set(-3.9, 0, -1.2); unit.rotation.y = 0.28; g.add(unit);
      unit.add(at(rbox(7.2, 4.2, 5, 0.3, M.enamel), 0, 2.4, 0));
      unit.add(at(rbox(6.6, 3.6, 0.1, 0.15, M.black), 0, 2.4, 2.5));
      [-2.9, 2.9].forEach(function (x) { [-1.8, 1.8].forEach(function (z) { unit.add(at(cyl(0.3, 0.3, 0.3, M.rubber, 16), x, 0.15, z)); }); });
      var sc = canvas(512, 288), sx = sc.getContext('2d'), st = tex(sc);
      var screen = new T.Mesh(new T.PlaneGeometry(3.7, 2.08), new T.MeshBasicMaterial({ map: st, toneMapped: false }));
      unit.add(at(screen, -1.05, 2.75, 2.57));
      [0, 1, 2].forEach(function (i) { var k = cyl(0.26, 0.26, 0.3, M.brushed, 24); k.rotation.x = PI / 2; unit.add(at(k, 1.5 + i * 0.75, 3.5, 2.65)); });
      var start = cyl(0.42, 0.42, 0.3, M.needle, 28); start.rotation.x = PI / 2; unit.add(at(start, 2.25, 2.3, 2.65));
      var port = cyl(0.24, 0.24, 0.6, M.brass, 20); port.rotation.x = PI / 2; unit.add(at(port, 2.25, 1.15, 2.75));

      var part = new T.Group(); part.position.set(4.3, 0, 1.2); part.rotation.y = -0.22; g.add(part);
      var shell = cyl(1.7, 1.7, 5.2, M.alu, 56); shell.rotation.z = PI / 2; part.add(at(shell, 0, 2.3, 0));
      [-1, 1].forEach(function (s) {
        var end = mesh(new T.SphereGeometry(1.7, 40, 20, 0, 2 * PI, 0, PI / 2), M.alu);
        end.rotation.z = -s * PI / 2; end.scale.y = 0.55; part.add(at(end, s * 2.6, 2.3, 0));
        var fl = cyl(2.05, 2.05, 0.3, M.brushed, 56); fl.rotation.z = PI / 2; part.add(at(fl, s * 2.5, 2.3, 0));
        for (var i = 0; i < 10; i++) {
          var a = i * PI / 5, b = cyl(0.13, 0.13, 0.5, M.steel, 6); b.rotation.z = PI / 2;
          part.add(at(b, s * 2.5, 2.3 + Math.cos(a) * 1.87, Math.sin(a) * 1.87));
        }
        part.add(at(rbox(0.7, 0.7, 3.2, 0.1, M.black), s * 1.5, 0.35, 0));
      });
      part.add(at(cyl(0.2, 0.2, 1.0, M.brass, 20), 0, 4.4, 0));
      var pg = dial({ r: 1.15, depth: 0.6, tex: gaugeTex(5, 1, 'bar', '#f3f2ec', '#15181c') });
      pg.position.set(0, 5.9, 0); part.add(pg);
      var pport = cyl(0.22, 0.22, 0.7, M.brass, 20); pport.rotation.x = PI / 2; part.add(at(pport, -1.2, 2.0, 1.85));

      g.add(tube([[-1.45, 1.15, 2.2], [-1.0, 0.6, 3.6], [0.4, 0.2, 4.6], [2.2, 0.2, 4.4], [3.0, 0.9, 3.7], [3.45, 1.95, 3.2]], 0.15, M.rubber));
      anchors[1] = V(ST0 + 4.3, 4.0, 1.2);

      function draw(a) {
        sx.fillStyle = '#0a1230'; sx.fillRect(0, 0, 512, 288);
        sx.strokeStyle = 'rgba(190,205,255,0.22)'; sx.lineWidth = 1;
        for (var i = 1; i < 6; i++) { sx.beginPath(); sx.moveTo(24, 70 + i * 32); sx.lineTo(488, 70 + i * 32); sx.stroke(); }
        font(sx, 600, 26, 'condensed'); sx.fillStyle = '#c9d4ff'; sx.textAlign = 'left'; sx.textBaseline = 'alphabetic';
        sx.fillText('LEAK TEST', 24, 44);
        sx.textAlign = 'right'; sx.fillText(state.leakR.toUpperCase(), 488, 44);
        sx.strokeStyle = '#ffffff'; sx.lineWidth = 4; sx.beginPath();
        for (var k = 0; k <= 100; k++) {
          var u = k / 100; if (u > a) break;
          var p = u < 0.3 ? smoother(u / 0.3) : 1 - (u - 0.3) * 0.02;
          var X = 24 + u * 464, Y = 262 - p * 170;
          if (k === 0) sx.moveTo(X, Y); else sx.lineTo(X, Y);
        }
        sx.stroke();
        st.needsUpdate = true;
      }
      draw(0);
      tick[1] = function (a, t) {
        var p = a < 0.3 ? 2 * smoother(a / 0.3) : 2 - (a - 0.3) * 0.004;
        state.leakP = p;
        state.leakD = a < 0.5 ? 0 : a < 0.86 ? 0.3 + Math.sin(t * 9) * 0.12 * (0.86 - a) * 3 : 0.3;
        state.leakR = a < 0.3 ? 'Filling' : a < 0.5 ? 'Stabilising' : a < 0.86 ? 'Measuring' : 'Pass';
        state.leakSettle = a >= 0.86 ? 1 : 0;
        pg.needle.rotation.z = -(-0.75 * PI + (p / 5) * 1.5 * PI);
        draw(a);
      };
    })();

    /* 2. Refrigeration: manifold gauge set, hoses, cylinder on a scale ---- */
    (function () {
      var X = ST0 + GAP, g = new T.Group(); g.position.set(X, 0, 0); scene.add(g);
      blob(g, -4.2, -1.3, 7.6, 7.6, 0.6); blob(g, 6.4, 0.3, 8, 8, 0.6);
      g.add(at(cyl(2.3, 2.5, 0.45, M.enamel, 56), -4.2, 0.225, -1.4));
      g.add(at(cyl(0.26, 0.26, 12.6, M.chrome), -4.2, 6.7, -1.4));
      var bar = cyl(0.2, 0.2, 4.6, M.chrome); bar.rotation.z = PI / 2; g.add(at(bar, -2.0, 12.6, -1.4));
      g.add(at(rbox(0.9, 0.9, 0.9, 0.12, M.black), -4.2, 12.6, -1.4));

      var m = new T.Group(); m.position.set(0, 0, -1.4); m.rotation.y = 0.12; g.add(m);
      var hook = mesh(new T.TorusGeometry(0.55, 0.11, 12, 40, PI * 1.5), M.chrome); hook.rotation.z = -PI / 4; m.add(at(hook, 0, 12.05, 0));
      m.add(at(cyl(0.11, 0.11, 1.1, M.chrome, 12), 0, 11.0, 0));
      m.add(at(rbox(6.8, 1.4, 1.2, 0.22, M.alu), 0, 7.2, 0));
      var low = dial({ r: 1.6, depth: 0.8, tex: gaugeTex(10, 2, 'bar', '#16307a', '#f4f6fb'), body: M.inkPaint });
      var high = dial({ r: 1.6, depth: 0.8, tex: gaugeTex(30, 5, 'bar', '#b3261c', '#fbf4f2'), body: new T.MeshStandardMaterial({ color: 0xb3261c, roughness: 0.4, metalness: 0.2 }) });
      m.add(at(low, -1.95, 9.2, 0.1)); m.add(at(high, 1.95, 9.2, 0.1));
      [[-1, M.hoseBlue], [1, M.hoseRed]].forEach(function (s) {
        var k = cyl(0.62, 0.62, 0.9, s[1], 10); k.rotation.z = PI / 2; m.add(at(k, s[0] * 3.85, 7.2, 0));
      });
      [-1.95, 0, 1.95].forEach(function (x) { m.add(at(cyl(0.24, 0.24, 0.8, M.brass, 20), x, 6.2, 0)); });
      var sight = cyl(0.36, 0.36, 0.2, M.chrome, 28); sight.rotation.x = PI / 2; m.add(at(sight, 0, 7.2, 0.65));

      g.add(at(rbox(5, 0.7, 5, 0.18, M.enamel), 6.4, 0.35, 0.2));
      g.add(at(rbox(4.6, 0.12, 4.6, 0.12, M.brushed), 6.4, 0.76, 0.2));
      g.add(at(cyl(1.75, 1.75, 5.4, M.white, 56), 6.4, 3.52, 0.2));
      var dome = mesh(new T.SphereGeometry(1.75, 48, 20, 0, 2 * PI, 0, PI / 2), M.white); dome.scale.y = 0.6; g.add(at(dome, 6.4, 6.22, 0.2));
      g.add(at(cyl(1.77, 1.77, 1.1, M.inkPaint, 56), 6.4, 4.6, 0.2));
      var collar = mesh(new T.CylinderGeometry(1.15, 1.15, 1.3, 40, 1, true, 0.5, PI * 1.6), new T.MeshStandardMaterial({ color: 0xe4e7e9, metalness: 0.1, roughness: 0.4, side: T.DoubleSide }));
      g.add(at(collar, 6.4, 7.75, 0.2));
      g.add(at(cyl(0.28, 0.34, 0.9, M.brass, 20), 6.4, 7.55, 0.2));
      var hw = cyl(0.5, 0.5, 0.22, M.hoseBlue, 8); g.add(at(hw, 6.4, 8.15, 0.2));

      g.add(tube([[-1.9, 5.85, -1.3], [-2.3, 3.2, -0.2], [-3.2, 0.5, 2.2], [-4.6, 0.2, 4.6], [-6.4, 0.2, 6.4], [-6.0, 0.2, 8.6]], 0.19, M.hoseBlue));
      g.add(tube([[2.0, 5.85, -1.5], [2.3, 3.4, -0.2], [1.6, 0.6, 2.6], [-0.4, 0.2, 5.0], [-1.6, 0.2, 7.6], [-0.4, 0.2, 9.8]], 0.19, M.hoseRed));
      g.add(tube([[0.05, 5.85, -1.4], [0.5, 3.6, -0.2], [2.2, 1.6, 1.8], [4.2, 2.2, 2.4], [5.2, 5.4, 1.4], [5.9, 7.5, 0.5]], 0.19, M.hoseYellow));
      anchors[2] = V(X, 9.0, -1.2);

      tick[2] = function (a, t) {
        var e = 1 - Math.pow(1 - clamp(a / 0.8, 0, 1), 3);
        var wob = (1 - sstep(0.8, 1, a)) * Math.sin(t * 7) * 0.06;
        state.refL = 4.2 * e + wob; state.refH = 16.8 * e + wob * 3; state.refC = 0.65 * clamp(a / 0.95, 0, 1);
        state.refSettle = a >= 0.98 ? 1 : 0;
        low.needle.rotation.z = -(-0.75 * PI + (state.refL / 10) * 1.5 * PI);
        high.needle.rotation.z = -(-0.75 * PI + (state.refH / 30) * 1.5 * PI);
      };
    })();

    /* 3. Marking: a dot peen head striking a nameplate ------------------- */
    (function () {
      var X = ST0 + GAP * 2, g = new T.Group(); g.position.set(X, 0, 0); scene.add(g);
      var F = {
        'Q': ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
        '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
        'M': ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
        'E': ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
        'S': ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
        'T': ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
        '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
        '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
        '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
        ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000']
      };
      var P = 0.165, top = 1.13, pts = [];
      [['Q&M', -1.45], ['EST 2004', 0.3]].forEach(function (ln) {
        var w = ln[0].length * 6 - 1, x0 = -w * P / 2;
        for (var c = 0; c < ln[0].length; c++) for (var col = 0; col < 5; col++) for (var row = 0; row < 7; row++) {
          if (F[ln[0][c]][row][col] === '1') pts.push([x0 + (c * 6 + col) * P, ln[1] + row * P]);
        }
      });
      state.markTotal = pts.length;

      blob(g, 0, 0.2, 16, 10, 0.6);
      g.add(at(rbox(12, 0.6, 6.4, 0.18, M.enamel), 0, 0.3, 0));
      [-3.6, 3.6].forEach(function (x) { g.add(at(rbox(0.9, 0.3, 4.4, 0.05, M.steel), x, 0.75, 0)); });
      var np = rbox(9.6, 0.2, 4.2, 0.06, M.brushed); g.add(at(np, 0, 1.01, 0));
      [[-4.35, -1.65], [4.35, -1.65], [-4.35, 1.65], [4.35, 1.65]].forEach(function (p) {
        var h = new T.Mesh(new T.CircleGeometry(0.16, 20), M.rubber); h.rotation.x = -PI / 2; g.add(at(h, p[0], top - 0.012, p[1]));
      });
      var dots = new T.InstancedMesh(new T.CircleGeometry(0.062, 10), M.dot, pts.length);
      var mtx = new T.Matrix4(), q = new T.Quaternion().setFromEuler(new T.Euler(-PI / 2, 0, 0)), one = V(1, 1, 1);
      pts.forEach(function (p, i) { mtx.compose(V(p[0], top - 0.008, p[1]), q, one); dots.setMatrixAt(i, mtx); });
      dots.count = 0; g.add(dots);

      g.add(at(rbox(1.5, 9.4, 1.5, 0.2, M.enamel), -6.6, 5.0, -1.6));
      g.add(at(rbox(13, 1.0, 1.0, 0.16, M.brushed), -0.4, 8.9, -1.6));
      var head = new T.Group(); g.add(head);
      head.add(at(rbox(1.5, 1.7, 2.2, 0.18, M.black), 0, 8.6, -0.9));
      head.add(at(rbox(1.05, 3.6, 1.05, 0.16, M.enamel), 0, 6.0, 0));
      head.add(at(rbox(1.07, 0.4, 1.07, 0.08, M.inkPaint), 0, 5.2, 0));
      var sty = new T.Group(); head.add(sty);
      sty.add(at(cyl(0.2, 0.2, 2.2, M.chrome, 24), 0, 3.1, 0));
      sty.add(at(cyl(0.2, 0.025, 0.85, M.steel, 24), 0, 1.58, 0));
      anchors[3] = V(X, 1.2, 0);

      tick[3] = function (a, t) {
        var f = clamp(a, 0, 1) * pts.length, n = Math.floor(f), i = Math.min(n, pts.length - 1);
        dots.count = n; state.markN = n; state.markSettle = a >= 1 ? 1 : 0;
        var tx = a >= 1 ? 3.2 : pts[i][0], tz = a >= 1 ? -0.4 : pts[i][1];
        head.position.x += (tx - head.position.x) * 0.35;
        head.position.z += (tz - head.position.z) * 0.35;
        sty.position.y = a >= 1 ? 0.5 : 0.02 + Math.abs(Math.sin(f * PI)) * 0.16;
      };
    })();

    /* 4. Balancing: a turbo rotor on rollers, belt driven --------------- */
    (function () {
      var X = ST0 + GAP * 3, g = new T.Group(); g.position.set(X, 0, 0); g.rotation.y = 0.32; scene.add(g);

      function wheel(R, H, n, mat) {
        var w = new T.Group();
        function rh(u) { return R * (0.22 + 0.74 * Math.pow(u, 2.1)); }
        function yh(u) { return H * (0.07 + 0.9 * (1 - u)); }
        function rs(u) { return R * (0.62 + 0.38 * Math.pow(u, 1.3)); }
        function ys(u) { return H * (0.97 - 0.66 * Math.pow(u, 0.85)); }
        var pts = [new T.Vector2(0.001, 0), new T.Vector2(R, 0), new T.Vector2(R, H * 0.07)];
        for (var i = 24; i >= 0; i--) pts.push(new T.Vector2(rh(i / 24), yh(i / 24)));
        pts.push(new T.Vector2(0.001, H * 0.97));
        var m2 = mat.clone(); m2.side = T.DoubleSide;
        w.add(mesh(new T.LatheGeometry(pts, 72), m2));
        w.add(at(cyl(R * 0.12, R * 0.12, H * 0.16, M.steel, 6), 0, H * 1.04, 0));
        for (var b = 0; b < n * 2; b++) {
          var u0 = b % 2 ? 0.42 : 0, geo = new T.PlaneGeometry(1, 1, 28, 8), pos = geo.attributes.position, uv = geo.attributes.uv;
          for (var k = 0; k < pos.count; k++) {
            var u = lerp(u0, 1, uv.getX(k)), v = uv.getY(k);
            var r = lerp(rh(u), rs(u), v), y = lerp(yh(u), Math.max(ys(u), yh(u) + 0.03), v);
            var th = b * PI / n + 0.55 * Math.pow(1 - u, 1.3) + 0.06 * v;
            pos.setXYZ(k, r * Math.cos(th), y, r * Math.sin(th));
          }
          geo.computeVertexNormals();
          w.add(mesh(geo, m2));
        }
        return w;
      }

      blob(g, 0, 0.2, 17, 9, 0.6);
      g.add(at(rbox(13, 1.0, 5, 0.22, M.enamel), 0, 0.5, 0));
      g.add(at(rbox(12.4, 0.12, 0.9, 0.04, M.brushed), 0, 1.06, 1.6));
      g.add(at(rbox(12.4, 0.12, 0.9, 0.04, M.brushed), 0, 1.06, -1.6));
      [-1.7, 1.7].forEach(function (x) {
        g.add(at(rbox(1.1, 2.5, 2.7, 0.2, M.enamel), x, 2.25, 0));
        g.add(at(rbox(1.3, 0.5, 2.3, 0.1, M.brushed), x, 3.72, 0));
        g.add(at(rbox(1.5, 0.3, 3.4, 0.08, M.steel), x, 1.16, 0));
        [-0.56, 0.56].forEach(function (z) {
          var r = cyl(0.46, 0.46, 0.5, M.chrome, 32); r.rotation.z = PI / 2; g.add(at(r, x, 4.1, z));
          var ax = cyl(0.12, 0.12, 0.9, M.black, 16); ax.rotation.z = PI / 2; g.add(at(ax, x, 4.1, z));
        });
      });
      var motor = cyl(0.82, 0.82, 1.9, M.inkPaint, 44); motor.rotation.z = PI / 2; g.add(at(motor, 0, 1.92, 0));
      var pulley = cyl(0.9, 0.9, 0.3, M.chrome, 44); pulley.rotation.z = PI / 2; g.add(at(pulley, 0, 1.92, 0));
      var belt = [];
      for (var a = 0; a <= 8; a++) { var q = a / 8 * PI; belt.push([0, 4.58 + 0.34 * Math.sin(q), 0.34 * Math.cos(q)]); }
      for (var a2 = 0; a2 <= 8; a2++) { var q2 = PI + a2 / 8 * PI; belt.push([0, 1.92 + 0.93 * Math.sin(q2), 0.93 * Math.cos(q2)]); }
      var bc = new T.CatmullRomCurve3(belt.map(function (p) { return V(p[0], p[1], p[2]); }), true);
      g.add(mesh(new T.TubeGeometry(bc, 120, 0.07, 8, true), M.rubber));
      g.add(at(rbox(0.3, 2.6, 0.3, 0.06, M.steel), 3.0, 2.3, 1.7));
      g.add(at(rbox(0.6, 0.6, 0.6, 0.1, M.black), 3.0, 3.75, 1.7));
      var probe = cyl(0.13, 0.13, 1.2, M.brass, 16); probe.rotation.x = PI / 2; g.add(at(probe, 3.0, 4.2, 1.1));

      var rotor = new T.Group(); rotor.position.set(0, 4.58, 0); g.add(rotor);
      var spin = new T.Group(); rotor.add(spin);
      var shaft = cyl(0.28, 0.28, 8.6, M.chrome, 32); shaft.rotation.z = PI / 2; spin.add(shaft);
      var comp = wheel(2.6, 2.3, 7, M.alu); comp.rotation.z = PI / 2; comp.position.x = -3.2; spin.add(comp);
      var turb = wheel(2.1, 1.9, 6, new T.MeshStandardMaterial({ color: 0x8d8780, metalness: 1, roughness: 0.38 })); turb.rotation.z = -PI / 2; turb.position.x = 3.2; spin.add(turb);
      anchors[4] = V(X - 3.9, 4.6, 2.2);

      var ang = 0;
      tick[4] = function (a, t, dt) {
        var up = sstep(0, 0.22, a), amp = Math.exp(-a * 5.2);
        ang += dt * 13 * up;
        spin.rotation.x = ang; pulley.rotation.x = -ang * 0.36;
        rotor.position.y = 4.58 + Math.sin(ang) * 0.07 * amp * up;
        rotor.position.z = Math.cos(ang) * 0.07 * amp * up;
        state.balS = Math.round(2400 * up / 10) * 10;
        state.balU = Math.max(0.05, 4.8 * amp);
        state.balSettle = a >= 0.9 ? 1 : 0;
      };
    })();

    /* 5. Packaging: a chamber vacuum packer ------------------------------ */
    (function () {
      var X = ST0 + GAP * 4, g = new T.Group(); g.position.set(X, 0, 0); g.rotation.y = 0.18; scene.add(g);
      blob(g, 0, 0.3, 15, 12, 0.65);
      g.add(at(rbox(10.4, 4.2, 7.8, 0.4, M.brushed), 0, 2.5, 0));
      [-4.4, 4.4].forEach(function (x) { [-3.1, 3.1].forEach(function (z) { g.add(at(cyl(0.35, 0.4, 0.45, M.rubber, 20), x, 0.22, z)); }); });
      g.add(at(rbox(9.2, 0.1, 6.4, 0.3, M.black), 0, 4.62, -0.2));
      g.add(at(rbox(8.4, 0.34, 0.5, 0.08, M.steel), 0, 4.84, 2.45));
      g.add(at(rbox(8.4, 0.08, 0.2, 0.03, M.rubber), 0, 5.03, 2.45));
      var pouch = new T.Group(); pouch.position.set(0, 4.67, -0.3); g.add(pouch);
      pouch.add(at(rbox(4.6, 1.0, 3.0, 0.3, M.product), 0, 0.5, 0));
      var film = rbox(6.2, 1.16, 4.2, 0.45, M.film); film.castShadow = false; pouch.add(at(film, 0, 0.56, 0.3));

      var lid = new T.Group(); lid.position.set(0, 4.7, -3.5); g.add(lid);
      var domeG = new T.CylinderGeometry(3.3, 3.3, 9.4, 48, 1, true, 0, PI);
      var lidGlass = new T.MeshStandardMaterial({ color: 0xdfe8f2, metalness: 0.9, roughness: 0.04, transparent: true, opacity: 0.2, side: T.DoubleSide, depthWrite: false });
      var dome = new T.Mesh(domeG, lidGlass); dome.rotation.z = PI / 2; dome.rotation.y = 0; dome.scale.set(0.5, 1, 1);
      var domeWrap = new T.Group(); domeWrap.add(dome); domeWrap.rotation.set(0, 0, 0); lid.add(at(domeWrap, 0, 0, 3.3));
      [-4.7, 4.7].forEach(function (x) {
        var e = new T.Mesh(new T.CircleGeometry(3.3, 40, 0, PI), lidGlass); e.rotation.y = PI / 2; e.scale.y = 0.5; lid.add(at(e, x, 0, 3.3));
      });
      lid.add(at(rbox(9.8, 0.3, 0.3, 0.08, M.steel), 0, 0.1, 6.55));
      lid.add(at(rbox(9.8, 0.3, 0.3, 0.08, M.steel), 0, 0.1, 0.05));
      [-4.75, 4.75].forEach(function (x) { lid.add(at(rbox(0.3, 0.3, 6.8, 0.08, M.steel), x, 0.1, 3.3)); });
      var handle = cyl(0.2, 0.2, 5, M.black, 16); handle.rotation.z = PI / 2; lid.add(at(handle, 0, 0.55, 6.95));

      var vg = dial({ r: 0.95, depth: 0.4, tex: gaugeTex(1, 0.2, '−bar', '#f3f2ec', '#15181c') });
      g.add(at(vg, -3.3, 2.6, 3.95));
      g.add(at(rbox(3.2, 1.3, 0.1, 0.1, M.black), 1.4, 2.8, 3.92));
      var dc = canvas(384, 144), dx = dc.getContext('2d'), dt2 = tex(dc);
      g.add(at(new T.Mesh(new T.PlaneGeometry(2.9, 1.08), new T.MeshBasicMaterial({ map: dt2, toneMapped: false })), 1.4, 2.8, 3.98));
      function show() {
        dx.fillStyle = '#0a1230'; dx.fillRect(0, 0, 384, 144);
        font(dx, 600, 30, 'condensed'); dx.fillStyle = '#c9d4ff'; dx.textAlign = 'left'; dx.textBaseline = 'alphabetic';
        dx.fillText(state.packS.toUpperCase(), 20, 44);
        font(dx, 700, 64, 'condensed'); dx.fillStyle = '#ffffff';
        dx.fillText(Math.round(-state.packV / 0.98 * 99) + ' %', 20, 118);
        dt2.needsUpdate = true;
      }
      var go = cyl(0.42, 0.42, 0.25, M.needle, 28); go.rotation.x = PI / 2; g.add(at(go, 3.9, 2.8, 3.95));
      anchors[5] = V(X, 5.2, 1.5);

      tick[5] = function (a) {
        var close = sstep(0, 0.16, a) - sstep(0.86, 1, a);
        var vac = sstep(0.16, 0.56, a) - sstep(0.74, 0.86, a);
        lid.rotation.x = -(1 - close) * 0.95;
        film.scale.y = 1 - 0.14 * sstep(0.2, 0.56, a);
        film.scale.x = film.scale.z = 1 - 0.07 * sstep(0.2, 0.56, a);
        state.packV = -0.98 * vac;
        state.packS = a < 0.02 ? 'Open' : a < 0.16 ? 'Closing' : a < 0.56 ? 'Evacuating' : a < 0.74 ? 'Sealing' : a < 0.86 ? 'Venting' : 'Pack released';
        state.packSettle = a >= 0.86 ? 1 : 0;
        vg.needle.rotation.z = -(-0.75 * PI + (-state.packV) * 1.5 * PI);
        show();
      };
      tick[5](0);
    })();

    /* 6. Makers: ten gauge blocks on black granite, one engraved per maker */
    var MK = { x: 170, z0: 62, dz: 4.3 };
    (function () {
      var speckB = speck.clone(); speckB.needsUpdate = true; speckB.repeat.set(12, 10);
      var slab = new T.Mesh(new T.PlaneGeometry(120, 100), new T.MeshStandardMaterial({
        color: 0x23262b, map: speckB, roughness: 0.5, envMapIntensity: 0.1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
      }));
      slab.rotation.x = -PI / 2; slab.position.set(MK.x, 0.004, 92); slab.receiveShadow = true; scene.add(slab);
      var names = ['Furness Controls', 'Galileo TP', 'GOMAX', 'Imperial Tools', 'OAK Europa (Ramer)', 'Supco', 'Technomark', 'Volvac', 'Wigam', 'CIMAT'];
      var hs = [1.0, 1.6, 0.6, 1.3, 0.8, 2.0, 1.1, 0.5, 1.5, 0.9], xs = [0.3, -0.4, 0.5, 0, -0.3, 0.4, -0.5, 0.2, -0.2, 0.3];
      names.forEach(function (nm, i) {
        var h = hs[i], gx = MK.x + xs[i], gz = MK.z0 + i * MK.dz;
        blob(scene, gx + 0.2, gz + 0.2, 8.2, 3.4, 0.7);
        scene.add(at(rbox(6.4, h, 1.9, 0.04, i % 2 ? M.chrome : M.steel), gx, h / 2, gz));
        var c = canvas(1024, 256), x = c.getContext('2d'), size = 124;
        do { font(x, 700, size, 'condensed'); size -= 6; } while (x.measureText(nm.toUpperCase()).width > 930);
        x.fillStyle = 'rgba(18,21,25,0.84)'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(nm.toUpperCase(), 512, 134);
        var lab = new T.Mesh(new T.PlaneGeometry(6.0, 1.5), new T.MeshBasicMaterial({ map: tex(c), transparent: true, depthWrite: false }));
        lab.rotation.x = -PI / 2; lab.position.set(gx, h + 0.012, gz); lab.renderOrder = 2; scene.add(lab);
      });
    })();

    /* 7. Service: a wrung stack of gauge blocks, the reference kept true -- */
    var SV = { x: 60, z: 95 };
    (function () {
      var g = new T.Group(); g.position.set(SV.x, 0, SV.z); g.rotation.y = -0.38; g.scale.setScalar(1.5); scene.add(g);
      blob(g, 0.1, 0.1, 5.6, 2.6, 0.7);  blob(g, 1.2, 2.6, 5.2, 2.6, 0.5);
      g.add(at(rbox(3.6, 1.0, 0.95, 0.03, M.steel), 0, 0.5, 0));
      g.add(at(rbox(3.6, 0.5, 0.95, 0.03, M.chrome), 0.05, 1.25, 0));
      g.add(at(rbox(3.6, 0.25, 0.95, 0.03, M.steel), -0.04, 1.625, 0));
            var l2 = at(rbox(3.6, 0.3, 0.95, 0.03, M.chrome), 1.2, 0.15, 2.6); l2.rotation.y = -0.3; g.add(l2);
      var c = canvas(768, 192), x = c.getContext('2d');
      font(x, 600, 120, 'normal'); x.fillStyle = 'rgba(18,21,25,0.8)'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('25 mm', 384, 100);
      var lab = new T.Mesh(new T.PlaneGeometry(3.0, 0.75), new T.MeshBasicMaterial({ map: tex(c), transparent: true, depthWrite: false }));
      lab.position.set(0, 0.5, 0.49); lab.renderOrder = 2; g.add(lab);
    })();

    /* Camera keys: position, target, and where the object sits on screen - */
    function key(px, py, pz, tx, ty, tz, sx, sy, lift) { return { p: V(px, py, pz), t: V(tx, ty, tz), sx: sx, sy: sy || 0, lift: lift || 0 }; }
    var MKZ1 = MK.z0 + 9 * MK.dz;
    var K = [
      key(4.5, 14.5, 26, -2.4, 5.5, 0, 0.25, 0, 5),
      key(ST0 - 2, 15, 31.5, ST0, 2.6, 0, -0.235, 0, 5),
      key(ST0 + GAP + 6, 15, 33, ST0 + GAP + 1, 5.6, 0, 0.235, 0, 5),
      key(ST0 + GAP * 2 - 2, 17.5, 20, ST0 + GAP * 2, 1.6, 0, -0.26, 0, 5),
      key(ST0 + GAP * 3 + 1, 14, 27, ST0 + GAP * 3, 3.3, 0, 0.235, 0, 5),
      key(ST0 + GAP * 4 - 6, 13.5, 25, ST0 + GAP * 4, 3.4, 0, -0.235, 0, 12),
      key(MK.x, 27, MK.z0 + 12, MK.x, 0, MK.z0 + 0.5, 0.27, 0, 0),
      key(MK.x, 27, MKZ1 + 12, MK.x, 0, MKZ1 + 0.5, 0.27, 0, 14),
      key(SV.x + 4, 11, SV.z + 23, SV.x, 1.2, SV.z, -0.2, -0.16, 14),
      key(9.5, 7.2, 17, -0.4, 5.9, 0, 0.24, 0, 0)
    ];
    for (var s0 = 1; s0 <= 5; s0++) tick[s0](0, 0, 0);

    var W = 1, H = 1, portrait = 0;
    var cp = V(0, 0, 0), ct = V(0, 0, 0), tmp = V(0, 0, 0), par = { x: 0, y: 0 };
    var hero = { v: 0, vel: 0, zero: 0, raw: 0 };
    var clock = 0;

    function resize(w, h, dpr) {
      W = w; H = h;
      renderer.setPixelRatio(Math.min(dpr || 1, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      portrait = 1 - sstep(0.8, 1.35, w / h);
      heroLoose.visible = portrait < 0.5;
      camera.updateProjectionMatrix();
    }

    function frame(dt, k, pointer, still) {
      clock += dt;
      k = clamp(k, 0, K.length - 1);
      ink.scale.x = 1; ink.position.x = -29;
      var i = Math.min(Math.floor(k), K.length - 2), f = smoother(k - i), a = K[i], b = K[i + 1];
      if (portrait > 0.5 && i + 1 === K.length - 1) b = K[0]; // on phones the contact view reuses the hero framing
      cp.lerpVectors(a.p, b.p, f); ct.lerpVectors(a.t, b.t, f);
      cp.y += Math.sin(f * PI) * a.lift;
      var sx = lerp(a.sx, b.sx, f) * (1 - portrait), sy = lerp(a.sy, b.sy, f) * (1 - portrait) + 0.27 * portrait;
      tmp.subVectors(cp, ct).multiplyScalar(1 + 1.05 * portrait); cp.addVectors(ct, tmp);
      if (!still) {
        par.x += ((pointer.x - 0.5) - par.x) * Math.min(1, dt * 3);
        par.y += ((pointer.y - 0.5) - par.y) * Math.min(1, dt * 3);
        cp.x += par.x * 1.6; cp.y -= par.y * 1.0;
      }
      camera.position.copy(cp); camera.lookAt(ct);
      camera.setViewOffset(W, H, -sx * W, sy * H, W, H);

      var inkAmt = (1 - sstep(10, 30, ct.x)) * (1 - sstep(30, 60, ct.z));
      var blackAmt = sstep(96, 118, ct.x) * sstep(30, 52, ct.z);
      scene.background.lerpColors(BG_STONE, BG_INK, inkAmt).lerp(BG_BLACK, blackAmt);
      scene.fog.color.copy(scene.background);
      sun.target.position.copy(ct); sun.position.set(ct.x - 11, 24, ct.z + 13);

      // Hero indicator: the pointer loads the plunger, a spring carries the needle.
      hero.raw = (pointer.x - 0.5) * 0.07 + Math.sin(clock * 0.7) * 0.004 + Math.sin(clock * 1.9) * 0.0015;
      var target = hero.raw - hero.zero;
      hero.vel += ((target - hero.v) * 90 - hero.vel * 9) * dt;
      hero.v += hero.vel * dt;
      heroDial.needle.rotation.z = -(hero.v / 0.1) * 2 * PI;
      state.hero = hero.v;
      state.heroSettle = Math.abs(hero.v) < 0.0015 && Math.abs(hero.vel) < 0.02 ? 1 : 0;

      for (var s = 1; s <= 5; s++) {
        var d = Math.abs(k - s);
        if (d < 0.42) act[s] = Math.min(1, act[s] + dt / (s === 3 ? 9 : 7));
        else if (d > 0.85) act[s] = 0;
        if (d < 1.2 && tick[s]) tick[s](act[s], clock, dt);
      }
      renderer.render(scene, camera);
      return inkAmt;
    }

    function anchor(k) {
      var a = anchors[k]; if (!a) return null;
      tmp.copy(a).project(camera);
      return { x: (tmp.x * 0.5 + 0.5) * W, y: (-tmp.y * 0.5 + 0.5) * H };
    }

    // One still frame at an exact pixel size, for artwork such as social posts.
    function shot(o) {
      renderer.setPixelRatio(1); renderer.setSize(o.w, o.h, false);
      W = o.w; H = o.h;
      camera.aspect = o.w / o.h; camera.fov = o.fov || 32;
      cp.set(o.p[0], o.p[1], o.p[2]); ct.set(o.t[0], o.t[1], o.t[2]);
      camera.position.copy(cp); camera.lookAt(ct);
      camera.setViewOffset(o.w, o.h, -(o.sx || 0) * o.w, (o.sy || 0) * o.h, o.w, o.h);
      heroLoose.visible = o.loose !== false;
      ink.scale.x = o.ink ? 1.6 : 1; ink.position.x = o.ink ? 4 : -29; // stills can push the ink edge out of frame
      var inkAmt = (1 - sstep(10, 30, ct.x)) * (1 - sstep(30, 60, ct.z));
      var blackAmt = sstep(96, 118, ct.x) * sstep(30, 52, ct.z);
      scene.background.lerpColors(BG_STONE, BG_INK, inkAmt).lerp(BG_BLACK, blackAmt);
      scene.fog.color.copy(scene.background);
      sun.target.position.copy(ct); sun.position.set(ct.x - 11, 24, ct.z + 13);
      heroDial.needle.rotation.z = -((o.needle || 0) / 0.1) * 2 * PI;
      for (var s = 1; s <= 5; s++) {
        var av = (o.act && o.act[s]) || 0;
        for (var r = 0; r < (s === 3 ? 40 : 1); r++) tick[s](av, 1.3, 0.016);
      }
      renderer.render(scene, camera);
      return renderer.domElement;
    }

    return {
      shot: shot, makers: MK, service: SV,
      keys: K.map(function (k) { return { p: k.p.toArray(), t: k.t.toArray(), sx: k.sx, sy: k.sy }; }),
      resize: resize, frame: frame, anchor: anchor, state: state,
      zero: function () { hero.zero = hero.raw; }
    };
  }

  window.QMScene = { create: create };
})();
