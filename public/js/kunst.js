/* Kristall RNG: Zeichnen der Kristalle als SVG (alles aus Formen gebaut, keine Bilddateien) */
'use strict';
(function () {
  var KR = window.KR;
  var uid = 0;

  /* ---------- Farben ---------- */
  function hex2hsl(hex) {
    var r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn;
    if (d) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return { h: h, s: s * 100, l: l * 100 };
  }
  function cl(x, a, b) { return x < a ? a : x > b ? b : x; }
  function hsl(h, s, l, a) { return 'hsl(' + Math.round(((h % 360) + 360) % 360) + ' ' + Math.round(cl(s, 0, 100)) + '% ' + Math.round(cl(l, 2, 98)) + '%' + (a != null ? ' / ' + a : '') + ')'; }
  function r1(x) { return Math.round(x * 10) / 10; }
  function seedRng(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h += 0x6D2B79F5; var t = Math.imul(h ^ (h >>> 15), h | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* ---------- Zeichenzustand ---------- */
  function Ctx(c, mi) {
    var base = hex2hsl(c.farbe), m = KR.MUT[mi].id;
    this.m = m; this.spread = c.spread || 0; this.fi = 0; this.pts = []; this.out = [];
    var h = base.h, s = base.s, l = base.l;
    if (m === 'gold') { h = 44; s = 92; l = 54; this.spread = 10; }
    else if (m === 'neon') { s = Math.min(100, s * 1.25 + 14); l = cl(l * 1.04 + 5, 30, 70); }
    else if (m === 'schatten') { h = h * 0.4 + 262 * 0.6; s = s * 0.6; l = l * 0.5; }
    else if (m === 'leere') { h = 268; s = 55; l = 10; this.spread = 30; }
    else if (m === 'regenbogen') { this.spread = 360; s = Math.max(s, 70); l = Math.min(Math.max(l, 45), 62); }
    else if (m === 'glitzer') { l = Math.min(96, l + 4); }
    this.h = h; this.s = s; this.l = l;
    this.lmin = l * 0.55; this.lmax = l + Math.min(30, (100 - l) * 0.5);
    this.rim = hsl(h, s * 0.8, Math.max(8, l * 0.4), 0.5);
  }
  // Füllfarbe für eine Facette mit Helligkeit shade in -1..1
  Ctx.prototype.fill = function (shade) {
    shade = cl(shade, -1, 1);
    var L = this.lmin + (shade + 1) / 2 * (this.lmax - this.lmin);
    var S = this.s * (shade < 0 ? 1.08 : 0.92);
    var i = this.fi++, hv = this.h;
    if (this.spread) hv += this.spread * (((i * 0.618034) % 1) - 0.5);
    return hsl(hv, S, L);
  };
  Ctx.prototype.poly = function (pts, shade) {
    var f = this.fill(shade);
    for (var i = 0; i < pts.length; i++) this.pts.push(pts[i]);
    this.out.push('<polygon points="' + pts.map(function (p) { return r1(p[0]) + ',' + r1(p[1]); }).join(' ') + '" fill="' + f + '"/>');
    return f;
  };
  Ctx.prototype.raw = function (s) { this.out.push(s); };

  var LX = -0.62, LY = -0.78; // Richtung zum Licht (oben links)
  function dotL(dx, dy) { var d = Math.sqrt(dx * dx + dy * dy) || 1; return (dx * LX + dy * LY) / d; }
  function centroid(P) { var x = 0, y = 0; P.forEach(function (p) { x += p[0]; y += p[1]; }); return [x / P.length, y / P.length]; }
  function scaleP(P, c, s) { return P.map(function (p) { return [c[0] + (p[0] - c[0]) * s, c[1] + (p[1] - c[1]) * s]; }); }
  function fit(P, size, cx, cy) {
    var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    P.forEach(function (p) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
    var s = size / Math.max(x1 - x0, y1 - y0), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    return P.map(function (p) { return [cx + (p[0] - mx) * s, cy + (p[1] - my) * s]; });
  }
  function rot(P, deg) {
    var a = deg * Math.PI / 180, co = Math.cos(a), si = Math.sin(a);
    return P.map(function (p) { return [p[0] * co - p[1] * si, p[0] * si + p[1] * co]; });
  }

  /* ---------- Ringschliffe (Umriss mit gestuften Ringen und Tafel) ---------- */
  function ringCut(X, outline, scales) {
    var c = centroid(outline), best = { s: -9, p: null };
    for (var k = 0; k < scales.length - 1; k++) {
      var A = scaleP(outline, c, scales[k]), B = scaleP(outline, c, scales[k + 1]);
      for (var i = 0; i < A.length; i++) {
        var j = (i + 1) % A.length;
        var mx = (A[i][0] + A[j][0]) / 2 - c[0], my = (A[i][1] + A[j][1]) / 2 - c[1];
        var sh = dotL(mx, my) * (0.95 - k * 0.18) + ((i + k) % 2 ? 0.1 : -0.1);
        X.poly([A[i], A[j], B[j], B[i]], sh);
        if (sh > best.s) best = { s: sh, p: centroid([A[i], A[j], B[j], B[i]]) };
      }
    }
    var T = scaleP(outline, c, scales[scales.length - 1]);
    for (var t = 0; t < T.length; t++) {
      var u = (t + 1) % T.length;
      var cx2 = (T[t][0] + T[u][0]) / 2 - c[0], cy2 = (T[t][1] + T[u][1]) / 2 - c[1];
      var sh2 = 0.38 + dotL(cx2, cy2) * 0.42;
      X.poly([c, T[t], T[u]], sh2);
    }
    return best.p;
  }
  function brillant(X) {
    var n = 16, st = Math.PI * 2 / n, R = 45, rm = 33, rt = 21, cx = 50, cy = 50, i;
    function pt(r, a) { return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }
    var O = [], M = [], T = [];
    for (i = 0; i < n; i++) { O.push(pt(R, i * st - Math.PI / 2)); M.push(pt(rm, (i + 0.5) * st - Math.PI / 2)); T.push(pt(rt, i * st - Math.PI / 2)); }
    var best = { s: -9, p: [cx - 12, cy - 14] };
    function f(P, ang, add) {
      var sh = dotL(Math.cos(ang), Math.sin(ang)) + add;
      X.poly(P, sh); if (sh > best.s) best = { s: sh, p: centroid(P) };
    }
    for (i = 0; i < n; i++) {
      var j = (i + 1) % n, k = (i + n - 1) % n, a0 = i * st - Math.PI / 2, a1 = (i + 0.5) * st - Math.PI / 2;
      f([O[i], O[j], M[i]], a1, -0.05);
      f([M[k], M[i], O[i]], a0, 0.12);
      f([M[k], M[i], T[i]], a0, 0.22);
      f([T[i], T[j], M[i]], a1, 0.30);
    }
    for (i = 0; i < n; i += 2) { // Tafel als Fächer aus acht Dreiecken
      var q = (i + 2) % n, am = (i + 1) * st - Math.PI / 2;
      X.poly([[cx, cy], T[i], T[(i + 1) % n], T[q]], 0.5 + dotL(Math.cos(am), Math.sin(am)) * 0.32);
    }
    return best.p;
  }

  /* ---------- Umrisse ---------- */
  function umrissSmaragd() {
    var w = 29, h = 40, c = 13;
    return [[-w + c, -h], [w - c, -h], [w, -h + c], [w, h - c], [w - c, h], [-w + c, h], [-w, h - c], [-w, -h + c]].map(function (p) { return [p[0] + 50, p[1] + 50]; });
  }
  function umrissTropfen() {
    var P = [], n = 26, m = 1.6;
    for (var i = 0; i < n; i++) { var t = i / n * Math.PI * 2; P.push([Math.sin(t) * Math.pow(Math.sin(t / 2), m), -Math.cos(t)]); }
    return fit(P, 90, 50, 50);
  }
  function umrissMarquise() {
    var P = [], n = 9, k, t;
    for (k = 0; k <= n; k++) { t = -1 + 2 * k / n; P.push([t * 44, -Math.pow(1 - t * t, 0.75) * 24]); }
    for (k = n - 1; k >= 1; k--) { t = -1 + 2 * k / n; P.push([t * 44, Math.pow(1 - t * t, 0.75) * 24]); }
    return fit(rot(P, -38), 90, 50, 50);
  }
  function umrissHerz() {
    var P = [], n = 32;
    for (var i = 0; i < n; i++) {
      var t = i / n * Math.PI * 2;
      P.push([16 * Math.pow(Math.sin(t), 3), -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]);
    }
    return fit(P, 88, 50, 52);
  }
  var STERNSPITZEN = { sonnenstein: 8, sternsaphir: 6, nebelstern: 4, phoenix: 5, sternengeburt: 5 };
  function umrissStern(id) {
    var np = STERNSPITZEN[id] || 5, P = [];
    for (var i = 0; i < np * 2; i++) {
      var a = i * Math.PI / np - Math.PI / 2, r = i % 2 ? 21 : 46;
      P.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r]);
    }
    return P;
  }

  /* ---------- feste Körper ---------- */
  function prisma(X, x, by, w, h, tip, tilt, bias) {
    var xs = [x - w / 2, x - w * 0.2, x + w * 0.2, x + w / 2], top = by - h, apex = [x + w * 0.04, top - tip];
    var P = function (a, b) { return [a, b]; };
    var g = [];
    var save = X.out; X.out = g;
    X.poly([P(xs[0], by + 2), P(xs[1], by), P(xs[1], top), P(xs[0], top)], 0.55 + bias);
    X.poly([P(xs[1], by), P(xs[2], by - 1), P(xs[2], top), P(xs[1], top)], 0.12 + bias);
    X.poly([P(xs[2], by - 1), P(xs[3], by - 3), P(xs[3], top), P(xs[2], top)], -0.48 + bias);
    X.poly([P(xs[0], top), P(xs[1], top), apex], 0.88 + bias);
    X.poly([P(xs[1], top), P(xs[2], top), apex], 0.30 + bias);
    X.poly([P(xs[2], top), P(xs[3], top), apex], -0.32 + bias);
    // feine Lichtkante links
    X.out.push('<polygon points="' + r1(xs[0] + 1.6) + ',' + r1(by - 3) + ' ' + r1(xs[0] + 3.4) + ',' + r1(by - 4) + ' ' + r1(xs[0] + 3.4) + ',' + r1(top + 1) + ' ' + r1(xs[0] + 1.6) + ',' + r1(top + 1) + '" fill="#fff" opacity=".28"/>');
    X.out = save;
    X.out.push('<g transform="rotate(' + tilt + ' ' + x + ' ' + by + ')">' + g.join('') + '</g>');
    return [xs[0] + 3, top - tip * 0.3];
  }
  function spitze(X) {
    prisma(X, 28, 90, 20, 30, 14, -24, -0.1);
    prisma(X, 73, 91, 22, 34, 15, 21, -0.14);
    return prisma(X, 50, 93, 34, 46, 24, -3, 0);
  }
  function cluster(X) {
    var cfg = [[20, 88, 18, 34, 15, -42], [78, 88, 18, 36, 15, 40], [34, 90, 20, 44, 18, -21], [66, 90, 20, 46, 19, 21], [50, 92, 24, 54, 22, 0]], i, gl;
    for (i = 0; i < cfg.length; i++) { var a = cfg[i]; gl = prisma(X, a[0], a[1], a[2], a[3], a[4], a[5], i === 4 ? 0.05 : -0.08 + (i % 2) * 0.05); }
    // Gestein
    X.raw('<path d="M6 97 Q10 80 28 84 L50 79 L72 84 Q90 80 95 97 Z" fill="#3d3848"/>' +
      '<path d="M6 97 Q10 80 28 84 L36 90 L22 97 Z" fill="#524b60"/>' +
      '<path d="M50 79 L72 84 Q90 80 95 97 L80 97 L66 88 Z" fill="#2d2938"/>');
    return gl;
  }
  function oktaeder(X) {
    var T = [50, 5], B = [50, 95], L = [10, 50], R = [90, 50], F = [50, 66], K = [50, 36];
    X.poly([T, L, K], 0.85); X.poly([T, K, R], 0.05);
    X.poly([T, L, F], 0.62); X.poly([T, F, R], -0.15);
    X.poly([B, L, F], 0.05); X.poly([B, F, R], -0.62);
    return [38, 36];
  }
  function wuerfel(X) {
    var A = [50, 10], Bp = [86, 30], C = [50, 50], D = [14, 30], E = [14, 70], F = [50, 90], G = [86, 70];
    X.poly([A, Bp, C, D], 0.82); X.poly([D, C, F, E], 0.08); X.poly([C, Bp, G, F], -0.52);
    function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
    var s = '', k, p, q;
    for (k = 1; k < 6; k++) { // Streifen wie bei echtem Pyrit
      var t = k / 6;
      p = lerp(D, E, t); q = lerp(C, F, t); s += '<line x1="' + r1(p[0]) + '" y1="' + r1(p[1]) + '" x2="' + r1(q[0]) + '" y2="' + r1(q[1]) + '" stroke="#000" stroke-opacity=".22" stroke-width=".7"/>';
      p = lerp(C, F, t); q = lerp(Bp, G, t); s += '<line x1="' + r1(p[0]) + '" y1="' + r1(p[1]) + '" x2="' + r1(q[0]) + '" y2="' + r1(q[1]) + '" stroke="#000" stroke-opacity=".25" stroke-width=".7"/>';
      p = lerp(D, A, t); q = lerp(C, Bp, t); s += '<line x1="' + r1(p[0]) + '" y1="' + r1(p[1]) + '" x2="' + r1(q[0]) + '" y2="' + r1(q[1]) + '" stroke="#fff" stroke-opacity=".28" stroke-width=".7"/>';
    }
    X.raw(s);
    return [34, 24];
  }
  function raute(X) {
    var A = [52, 8], Bp = [88, 30], C = [50, 50], D = [14, 28], E = [24, 72], F = [60, 92], G = [96, 70];
    X.poly([A, Bp, C, D], 0.84); X.poly([D, C, F, E], 0.12); X.poly([C, Bp, G, F], -0.5);
    return [38, 26];
  }

  /* ---------- Ergebnis ---------- */
  function star4(cx, cy, r) {
    return 'M' + r1(cx) + ' ' + r1(cy - r) + 'Q' + r1(cx) + ' ' + r1(cy) + ' ' + r1(cx + r) + ' ' + r1(cy) + 'Q' + r1(cx) + ' ' + r1(cy) + ' ' + r1(cx) + ' ' + r1(cy + r) +
      'Q' + r1(cx) + ' ' + r1(cy) + ' ' + r1(cx - r) + ' ' + r1(cy) + 'Q' + r1(cx) + ' ' + r1(cy) + ' ' + r1(cx) + ' ' + r1(cy - r) + 'Z';
  }
  function huelle(pts) { // konvexe Hülle (Monotone Chain)
    var P = pts.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }), lo = [], up = [], i;
    function cr(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    for (i = 0; i < P.length; i++) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], P[i]) <= 0) lo.pop(); lo.push(P[i]); }
    for (i = P.length - 1; i >= 0; i--) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], P[i]) <= 0) up.pop(); up.push(P[i]); }
    up.pop(); lo.pop(); return lo.concat(up);
  }

  /*  svgKristall(index | Kristall, Mutationsindex, {glow, funkeln})  */
  KR.svgKristall = function (ci, mi, opt) {
    opt = opt || {}; mi = mi || 0;
    var c = typeof ci === 'number' ? KR.KRISTALLE[ci] : ci, X = new Ctx(c, mi), id = 'k' + (++uid), glint;
    switch (c.schliff) {
      case 'rund': glint = brillant(X); break;
      case 'smaragd': glint = ringCut(X, umrissSmaragd(), [1, 0.79, 0.59, 0.4]); break;
      case 'tropfen': glint = ringCut(X, umrissTropfen(), [1, 0.74, 0.5, 0.27]); break;
      case 'marquise': glint = ringCut(X, umrissMarquise(), [1, 0.72, 0.46, 0.24]); break;
      case 'herz': glint = ringCut(X, umrissHerz(), [1, 0.7, 0.44, 0.22]); break;
      case 'stern': glint = ringCut(X, umrissStern(c.id), [1, 0.62, 0.3]); break;
      case 'spitze': glint = spitze(X); break;
      case 'cluster': glint = cluster(X); break;
      case 'oktaeder': glint = oktaeder(X); break;
      case 'wuerfel': glint = wuerfel(X); break;
      case 'raute': glint = raute(X); break;
      default: glint = brillant(X);
    }
    var hull = huelle(X.pts), hullS = hull.map(function (p) { return r1(p[0]) + ',' + r1(p[1]); }).join(' ');
    var m = X.m, defs = '', back = '', front = '', rnd = seedRng(c.id + mi);

    // Leuchten hinter dem Stein
    if (opt.glow) {
      defs += '<radialGradient id="' + id + 'g"><stop offset="0" stop-color="' + hsl(X.h, Math.max(X.s, 60), Math.max(X.l, 55), 0.55) + '"/><stop offset="1" stop-color="' + hsl(X.h, X.s, X.l, 0) + '"/></radialGradient>';
      back += '<circle cx="50" cy="50" r="62" fill="url(#' + id + 'g)"/>';
    }
    // Leere: Ring um den Stein
    if (m === 'leere') {
      defs += '<linearGradient id="' + id + 'r" x1="0" x2="1"><stop offset="0" stop-color="#7a4dff" stop-opacity="0"/><stop offset=".5" stop-color="#e9d9ff"/><stop offset="1" stop-color="#7a4dff" stop-opacity="0"/></linearGradient>';
      back += '<g transform="rotate(-18 50 52)"><ellipse cx="50" cy="52" rx="58" ry="13" fill="none" stroke="url(#' + id + 'r)" stroke-width="2.4" opacity=".85"/></g>';
      front += '<g transform="rotate(-18 50 52)"><path d="M -8 52 A 58 13 0 0 0 108 52" fill="none" stroke="url(#' + id + 'r)" stroke-width="2.8"/></g>';
    }
    var body = X.out.join('');
    var ov = '', konvex = !(c.schliff === 'spitze' || c.schliff === 'cluster'), kante = X.rim, kw = 0.35;
    // Kanten (bei Spitzen und Gruppen an jeder Fläche, sonst um die ganze Form)
    if (konvex) {
      ov += '<polygon points="' + hullS + '" fill="none" stroke="' + X.rim + '" stroke-width=".8" stroke-linejoin="round"/>';
      if (m === 'neon') ov += '<polygon points="' + hullS + '" fill="none" stroke="' + hsl(X.h, 100, 80, 0.95) + '" stroke-width="1.8" stroke-linejoin="round"/>';
      if (m === 'schatten') ov += '<polygon points="' + hullS + '" fill="none" stroke="#c9b6ff" stroke-width="1" stroke-opacity=".7" stroke-linejoin="round"/>';
      if (m === 'leere') ov += '<polygon points="' + hullS + '" fill="none" stroke="#e9d9ff" stroke-width="1.1" stroke-opacity=".85" stroke-linejoin="round"/>';
    } else if (m === 'neon') { kante = hsl(X.h, 100, 82, 0.95); kw = 1.1; }
    else if (m === 'schatten') { kante = 'rgba(201,182,255,.75)'; kw = 0.8; }
    else if (m === 'leere') { kante = 'rgba(233,217,255,.85)'; kw = 0.8; }
    // Lichtreflex
    if (glint) ov += '<path d="' + star4(glint[0], glint[1], c.t >= 3 ? 9 : 6) + '" fill="#fff" opacity=".9"/>';
    // Glanzstreifen, der über den Stein wandert
    if (konvex && (m === 'glitzer' || m === 'gold' || m === 'neon' || c.t >= 5)) {
      defs += '<clipPath id="' + id + 'c"><polygon points="' + hullS + '"/></clipPath>';
      ov += '<g clip-path="url(#' + id + 'c)"><rect class="glanz" x="-60" y="-10" width="16" height="120" fill="#fff" opacity=".32" transform="skewX(-22)"/></g>';
    }
    // Funkeln
    var nf = (opt.funkeln === false) ? 0 : (m === 'glitzer' ? 8 : m === 'normal' ? (c.t >= 4 ? 4 : c.t >= 2 ? 2 : 0) : 6);
    if (m === 'regenbogen' || m === 'gold') nf = Math.max(nf, 6);
    var sp = '';
    for (var i = 0; i < nf; i++) {
      var ang = rnd() * Math.PI * 2, rr = 22 + rnd() * 32, sx = 50 + Math.cos(ang) * rr, sy = 50 + Math.sin(ang) * rr * 0.9, sr = 3 + rnd() * 4.5;
      sp += '<path class="funk" style="animation-delay:' + r1(rnd() * 2.4) + 's" d="' + star4(sx, sy, sr) + '" fill="' + (m === 'schatten' || m === 'leere' ? '#e3d6ff' : '#fff') + '"/>';
    }
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="kr-svg m-' + m + '" aria-hidden="true" focusable="false" style="--g:' + hsl(X.h, Math.max(X.s, 55), Math.max(X.l, 52)) + '">' +
      (defs ? '<defs>' + defs + '</defs>' : '') + back + '<g stroke="' + kante + '" stroke-width="' + kw + '" stroke-linejoin="round">' + body + '</g>' + ov + sp + front + '</svg>';
  };

  /* Gesteinsbrocken vor dem Aufbrechen; farbe = Hinweisfarbe der Stufe */
  KR.svgGeode = function (farbe) {
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="kr-svg geode" aria-hidden="true" focusable="false" style="--hint:' + farbe + '">' +
      '<path d="M19 80 C6 60 10 34 29 22 C44 11 67 11 79 24 C93 39 95 65 80 81 C66 93 33 93 19 80 Z" fill="#4b4658"/>' +
      '<path d="M29 22 C44 11 67 11 79 24 L60 34 L40 32 Z" fill="#6a6478"/>' +
      '<path d="M19 80 C6 60 10 34 29 22 L40 32 L34 58 L26 82 Z" fill="#5a5468"/>' +
      '<path d="M80 81 C95 65 93 39 79 24 L68 48 L64 72 L66 90 C72 88 77 85 80 81 Z" fill="#332f3e"/>' +
      '<path d="M34 58 L64 72 L66 90 C52 96 34 92 26 82 Z" fill="#3d3949"/>' +
      '<path class="riss-glut" d="M52 14 L46 34 L57 47 L47 63 L55 90" fill="none" stroke="var(--hint)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>' +
      '<path class="riss" d="M52 14 L46 34 L57 47 L47 63 L55 90" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
  };

  /* Symbol-Hilfen für die Oberfläche */
  KR.svgSplitter = function (farbe) {
    farbe = farbe || '#8fe3ff';
    return '<svg viewBox="0 0 24 24" class="kr-ico" aria-hidden="true"><path d="M12 2 L19 10 L12 22 L5 10 Z" fill="' + farbe + '"/><path d="M12 2 L19 10 L12 12 Z" fill="#fff" opacity=".6"/><path d="M5 10 L12 12 L12 22 Z" fill="#000" opacity=".2"/></svg>';
  };
})();
