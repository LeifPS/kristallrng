/* Kristall RNG: Zeichnen der Kristalle als SVG (alles aus Formen gebaut, keine Bilddateien).
   Qualität q = 2 (große Darstellung: Verläufe, Lichtbrechung, Spiegelungen, Besonderheiten je Stein),
   q = 1 (kleine Symbole in Listen, bewusst leicht). */
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
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpHue(a, b, t) { var d = ((b - a + 540) % 360) - 180; return a + d * t; }
  function sm(t) { t = cl(t, 0, 1); return t * t * (3 - 2 * t); }
  function hsl(h, s, l, a) { return 'hsl(' + Math.round(((h % 360) + 360) % 360) + ' ' + Math.round(cl(s, 0, 100)) + '% ' + Math.round(cl(l, 2, 98)) + '%' + (a != null ? ' / ' + a : '') + ')'; }
  function r1(x) { return Math.round(x * 10) / 10; }
  function seedRng(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h += 0x6D2B79F5; var t = Math.imul(h ^ (h >>> 15), h | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // zweite Farbe und Richtung (x = links→rechts, y = unten→oben)
  var ZWEIT = {
    alexandrit: ['#d8345a', 'x'], turmalin: ['#ff6aa8', 'y'], paraiba: ['#38f0ff', 'y'], rauchquarz: ['#e9e2da', 'y'],
    fluorit: ['#9a6bff', 'x'], amethyst: ['#e2c6ff', 'y'], granat: ['#ff5a5a', 'x'], aquamarin: ['#bff6ff', 'y'], sonnenstein: ['#ffe9a0', 'x']
  };

  /* ---------- Zeichenzustand ---------- */
  function Ctx(c, mi, q) {
    var base = hex2hsl(c.farbe), m = KR.MUT[mi].id;
    this.q = q; this.m = m; this.id = 'k' + (++uid); this.spread = c.spread || 0; this.fi = 0;
    this.pts = []; this.out = []; this.fac = []; this.defs = []; this.sil = []; this.rim = []; this.gc = {}; this.gn = 0;
    this.inn = []; this.front = []; this.back = [];
    var h = base.h, s = base.s, l = base.l, zw = ZWEIT[c.id];
    if (c.id === 'alexandrit') { h = 160; s = 62; l = 40; this.spread = 0; }
    if (m === 'gold') { h = 44; s = 92; l = 54; this.spread = 8; zw = null; }
    else if (m === 'neon') { s = Math.min(100, s * 1.25 + 14); l = cl(l * 1.04 + 5, 30, 70); }
    else if (m === 'schatten') { h = h * 0.4 + 262 * 0.6; s = s * 0.6; l = l * 0.5; zw = null; }
    else if (m === 'leere') { h = 268; s = 55; l = 10; this.spread = 30; zw = null; }
    else if (m === 'regenbogen') { this.spread = 360; s = Math.max(s, 70); l = Math.min(Math.max(l, 45), 62); zw = null; }
    else if (m === 'glitzer') { l = Math.min(96, l + 4); }
    this.h = h; this.s = s; this.l = l;
    this.zw = zw ? Object.assign(hex2hsl(zw[0]), { achse: zw[1] }) : null;
    this.rimF = hsl(h, s * 0.8, Math.max(8, l * 0.4), 0.5);
  }
  Ctx.prototype.basis = function (tx, ty) {
    if (!this.zw) return { h: this.h, s: this.s, l: this.l };
    var k = sm(((this.zw.achse === 'y' ? 1 - ty : tx) - 0.3) / 0.4);
    return { h: lerpHue(this.h, this.zw.h, k), s: lerp(this.s, this.zw.s, k), l: lerp(this.l, this.zw.l, k) };
  };
  Ctx.prototype.fill = function (shade, tx, ty, g) {
    shade = cl(shade, -1, 1);
    var b = this.basis(tx, ty), lmin = b.l * 0.52, lmax = b.l + Math.min(32, (100 - b.l) * 0.55);
    var L = lmin + (shade + 1) / 2 * (lmax - lmin), S = b.s * (shade < 0 ? 1.1 : 0.9), i = this.fi++, hv = b.h;
    if (this.spread) hv += this.spread * (((i * 0.618034) % 1) - 0.5);
    if (this.q < 2) return hsl(hv, S, L);
    var key = Math.round(hv / 4) + ',' + Math.round(S / 4) + ',' + Math.round(L / 1.5) + (g || '');
    if (!this.gc[key]) {
      var id = this.id + 'f' + (++this.gn);
      this.gc[key] = 'url(#' + id + ')';
      this.defs.push('<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (g === 'h' ? 1 : 0.8) + '" y2="' + (g === 'h' ? 0 : 1) + '"><stop offset="0" stop-color="' + hsl(hv, S * 0.92, L + 8) + '"/><stop offset="1" stop-color="' + hsl(hv + 4, S, L - 8) + '"/></linearGradient>');
    }
    return this.gc[key];
  };
  Ctx.prototype.poly = function (pts, shade, o) {
    o = o || {};
    var c = centroid(pts), f = this.fill(shade, c[0] / 100, c[1] / 100, o.g);
    for (var i = 0; i < pts.length; i++) this.pts.push(pts[i]);
    this.fac.push({ p: pts, s: shade, c: c, e: o.e !== false });
    if (o.sil !== false) this.sil.push(pts);
    this.out.push('<polygon points="' + pstr(pts) + '" fill="' + f + '"' + (o.a != null ? ' fill-opacity="' + o.a + '"' : '') + '/>');
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
  function rot(P, deg, c) {
    var a = deg * Math.PI / 180, co = Math.cos(a), si = Math.sin(a); c = c || [0, 0];
    return P.map(function (p) { var dx = p[0] - c[0], dy = p[1] - c[1]; return [c[0] + dx * co - dy * si, c[1] + dx * si + dy * co]; });
  }
  function pstr(P) { return P.map(function (p) { return r1(p[0]) + ',' + r1(p[1]); }).join(' '); }

  /* ---------- Ringschliffe (Umriss mit gestuften Ringen und Tafel) ---------- */
  function ringCut(X, outline, scales) {
    var c = centroid(outline), best = { s: -9, p: null }, nr = scales.length - 1;
    X.sil.push(outline); X.rim.push(outline);
    for (var k = 0; k < nr; k++) {
      var A = scaleP(outline, c, scales[k]), B = scaleP(outline, c, scales[k + 1]);
      for (var i = 0; i < A.length; i++) {
        var j = (i + 1) % A.length;
        var mx = (A[i][0] + A[j][0]) / 2 - c[0], my = (A[i][1] + A[j][1]) / 2 - c[1];
        var sh = dotL(mx, my) * (0.95 - k * 0.18) + ((i + k) % 2 ? 0.12 : -0.1);
        var q = [A[i], A[j], B[j], B[i]];
        X.poly(q, sh, { sil: false });
        if (sh > best.s) best = { s: sh, p: centroid(q) };
      }
    }
    var T = scaleP(outline, c, scales[nr]);
    for (var t = 0; t < T.length; t++) {
      var u = (t + 1) % T.length;
      var cx2 = (T[t][0] + T[u][0]) / 2 - c[0], cy2 = (T[t][1] + T[u][1]) / 2 - c[1];
      X.poly([c, T[t], T[u]], 0.38 + dotL(cx2, cy2) * 0.42, { sil: false });
    }
    if (X.q >= 2) { // Blick durch die Tafel auf die Rückseite des Steins
      var T2 = rot(scaleP(T, c, 0.58), 180 / T.length, c);
      for (var w = 0; w < T2.length; w++) {
        var v = (w + 1) % T2.length;
        var gx = (T2[w][0] + T2[v][0]) / 2 - c[0], gy = (T2[w][1] + T2[v][1]) / 2 - c[1];
        X.poly([c, T2[w], T2[v]], 0.25 + dotL(gx, gy) * 0.7 * (w % 2 ? 1 : -0.6), { a: 0.5, sil: false, e: false });
      }
    }
    return best.p;
  }
  function brillant(X) {
    var n = 16, st = Math.PI * 2 / n, R = 45, rm = 33, rt = 21, cx = 50, cy = 50, i;
    function pt(r, a) { return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }
    var O = [], M = [], T = [];
    for (i = 0; i < n; i++) { O.push(pt(R, i * st - Math.PI / 2)); M.push(pt(rm, (i + 0.5) * st - Math.PI / 2)); T.push(pt(rt, i * st - Math.PI / 2)); }
    X.sil.push(O); X.rim.push(O);
    var best = { s: -9, p: [cx - 12, cy - 14] };
    function f(P, ang, add) {
      var sh = dotL(Math.cos(ang), Math.sin(ang)) + add;
      X.poly(P, sh, { sil: false }); if (sh > best.s) best = { s: sh, p: centroid(P) };
    }
    for (i = 0; i < n; i++) {
      var j = (i + 1) % n, k = (i + n - 1) % n, a0 = i * st - Math.PI / 2, a1 = (i + 0.5) * st - Math.PI / 2;
      f([O[i], O[j], M[i]], a1, -0.05);
      f([M[k], M[i], O[i]], a0, 0.12);
      f([M[k], M[i], T[i]], a0, 0.22);
      f([T[i], T[j], M[i]], a1, 0.30);
    }
    for (i = 0; i < n; i += 2) { // Tafel als Fächer aus acht Vierecken
      var q = (i + 2) % n, am = (i + 1) * st - Math.PI / 2;
      X.poly([[cx, cy], T[i], T[(i + 1) % n], T[q]], 0.5 + dotL(Math.cos(am), Math.sin(am)) * 0.32, { sil: false });
    }
    if (X.q >= 2) { // gespiegelte Unterseite sichtbar durch die Tafel
      for (i = 0; i < 8; i++) {
        var a = i * Math.PI / 4 + Math.PI / 8 - Math.PI / 2, d = 0.3;
        X.poly([[cx, cy], pt(rt * 0.5, a - d), pt(rt * 0.96, a), pt(rt * 0.5, a + d)], i % 2 ? 0.8 : -0.15, { a: 0.5, sil: false, e: false });
      }
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
      var a = i * Math.PI / np - Math.PI / 2, r = i % 2 ? 22 : 46;
      P.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r]);
    }
    return P;
  }

  /* ---------- feste Körper ---------- */
  function prisma(X, x, by, w, h, tip, tilt, bias) {
    var xs = [x - w / 2, x - w * 0.2, x + w * 0.2, x + w / 2], top = by - h, apex = [x + w * 0.04, top - tip];
    var a = tilt * Math.PI / 180, co = Math.cos(a), si = Math.sin(a);
    function T(p) { var dx = p[0] - x, dy = p[1] - by; return [x + dx * co - dy * si, by + dx * si + dy * co]; }
    function P() { return Array.prototype.slice.call(arguments).map(T); }
    var hq = X.q >= 2;
    X.poly(P([xs[0], by + 2], [xs[1], by], [xs[1], top], [xs[0], top]), 0.55 + bias, { g: 'h', sil: false });
    X.poly(P([xs[1], by], [xs[2], by - 1], [xs[2], top], [xs[1], top]), 0.14 + bias, { g: 'h', sil: false });
    X.poly(P([xs[2], by - 1], [xs[3], by - 3], [xs[3], top], [xs[2], top]), -0.48 + bias, { g: 'h', sil: false });
    X.poly(P([xs[0], top], [xs[1], top], apex), 0.88 + bias, { sil: false });
    X.poly(P([xs[1], top], [xs[2], top], apex), 0.30 + bias, { sil: false });
    X.poly(P([xs[2], top], [xs[3], top], apex), -0.32 + bias, { sil: false });
    var outline = P([xs[0], by + 2], [xs[1], by], [xs[2], by - 1], [xs[3], by - 3], [xs[3], top], apex, [xs[0], top]);
    X.sil.push(outline); X.rim.push(outline);
    var s = '<polygon points="' + pstr(P([xs[0] + 1.6, by - 3], [xs[0] + 3.4, by - 4], [xs[0] + 3.4, top + 1], [xs[0] + 1.6, top + 1])) + '" fill="#fff" opacity=".3"/>';
    if (hq) {
      for (var k = 1; k < 5; k++) { // Wachstumsstreifen
        var y = top + h * k / 5, a1 = T([xs[0], y]), a2 = T([xs[3], y]);
        s += '<line x1="' + r1(a1[0]) + '" y1="' + r1(a1[1]) + '" x2="' + r1(a2[0]) + '" y2="' + r1(a2[1]) + '" stroke="#fff" stroke-opacity=".14" stroke-width=".45"/>';
      }
      // Phantom: ein Kristall im Kristall
      var ph = P([x - w * 0.27, by - 5], [x - w * 0.27, top + h * 0.12], [apex[0], top - tip * 0.52], [x + w * 0.27, top + h * 0.12], [x + w * 0.27, by - 5]);
      s += '<polygon points="' + pstr(ph) + '" fill="#fff" fill-opacity=".07" stroke="#fff" stroke-opacity=".32" stroke-width=".45"/>';
    }
    X.inn.push(s);
    return T([xs[0] + 3, top - tip * 0.3]);
  }
  function spitze(X) {
    prisma(X, 28, 90, 20, 30, 14, -24, -0.1);
    prisma(X, 73, 91, 22, 34, 15, 21, -0.14);
    return prisma(X, 50, 93, 34, 46, 24, -3, 0);
  }
  function cluster(X, c) {
    var cfg = [[20, 88, 18, 34, 15, -42], [78, 88, 18, 36, 15, 40], [34, 90, 20, 44, 18, -21], [66, 90, 20, 46, 19, 21], [50, 92, 24, 54, 22, 0]], i, gl;
    for (i = 0; i < cfg.length; i++) { var a = cfg[i]; gl = prisma(X, a[0], a[1], a[2], a[3], a[4], a[5], i === 4 ? 0.05 : -0.08 + (i % 2) * 0.05); }
    X.raw('<path d="M6 97 Q10 80 28 84 L50 79 L72 84 Q90 80 95 97 Z" fill="#3d3848"/>' +
      '<path d="M6 97 Q10 80 28 84 L36 90 L22 97 Z" fill="#564f66"/><path d="M28 84 L50 79 L58 90 L36 90 Z" fill="#463f54"/>' +
      '<path d="M50 79 L72 84 Q90 80 95 97 L80 97 L66 88 Z" fill="#2b2736"/><path d="M50 79 L58 90 L66 88 L72 84 Z" fill="#383344"/>');
    X.sil.push([[6, 97], [10, 84], [28, 84], [50, 79], [72, 84], [90, 84], [95, 97]]);
    if (X.q >= 2) { // kleine Kristalle auf dem Gestein
      var rnd = seedRng(c.id + 'd');
      for (i = 0; i < 9; i++) {
        var bx = 12 + rnd() * 76, by = 88 + rnd() * 6;
        prisma(X, bx, by, 4.5 + rnd() * 3, 6 + rnd() * 7, 3 + rnd() * 3, (rnd() - 0.5) * 50, -0.05 + rnd() * 0.15);
      }
    }
    return gl;
  }
  function oktaeder(X) {
    var T = [50, 5], B = [50, 95], L = [10, 50], R = [90, 50], F = [50, 66], K = [50, 36];
    X.poly([T, L, K], 0.85); X.poly([T, K, R], 0.05);
    X.poly([T, L, F], 0.62); X.poly([T, F, R], -0.15);
    X.poly([B, L, F], 0.05); X.poly([B, F, R], -0.62);
    if (X.q >= 2) { // innere Spiegelkanten
      X.poly([[50, 30], [28, 50], [50, 70], [72, 50]], 0.7, { a: 0.18, sil: false, e: false });
      X.poly([[50, 18], [24, 50], [50, 50]], 0.9, { a: 0.28, sil: false, e: false });
    }
    X.rim.push([T, R, B, L]);
    return [38, 36];
  }
  function wuerfel(X) {
    var A = [50, 10], Bp = [86, 30], C = [50, 50], D = [14, 30], E = [14, 70], F = [50, 90], G = [86, 70];
    X.poly([A, Bp, C, D], 0.82); X.poly([D, C, F, E], 0.08); X.poly([C, Bp, G, F], -0.52);
    function lp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
    var s = '', k, p, q;
    for (k = 1; k < 7; k++) { // Streifen wie bei echtem Pyrit
      var t = k / 7;
      p = lp(D, E, t); q = lp(C, F, t); s += '<line x1="' + r1(p[0]) + '" y1="' + r1(p[1]) + '" x2="' + r1(q[0]) + '" y2="' + r1(q[1]) + '" stroke="#000" stroke-opacity=".24" stroke-width=".7"/>';
      p = lp(C, F, t); q = lp(Bp, G, t); s += '<line x1="' + r1(p[0]) + '" y1="' + r1(p[1]) + '" x2="' + r1(q[0]) + '" y2="' + r1(q[1]) + '" stroke="#000" stroke-opacity=".26" stroke-width=".7"/>';
      p = lp(D, A, t); q = lp(C, Bp, t); s += '<line x1="' + r1(p[0]) + '" y1="' + r1(p[1]) + '" x2="' + r1(q[0]) + '" y2="' + r1(q[1]) + '" stroke="#fff" stroke-opacity=".3" stroke-width=".7"/>';
    }
    X.inn.push(s);
    X.rim.push([A, Bp, G, F, E, D]);
    return [34, 24];
  }
  function raute(X) {
    var A = [52, 8], Bp = [88, 30], C = [50, 50], D = [14, 28], E = [24, 72], F = [60, 92], G = [96, 70];
    X.poly([A, Bp, C, D], 0.84); X.poly([D, C, F, E], 0.12); X.poly([C, Bp, G, F], -0.5);
    if (X.q >= 2) { // Doppelbild des Kalkspats: versetzte Geisterkanten
      var s = '';
      [[D, C], [C, Bp], [C, F]].forEach(function (l) { s += '<line x1="' + r1(l[0][0] + 2.4) + '" y1="' + r1(l[0][1] + 1.6) + '" x2="' + r1(l[1][0] + 2.4) + '" y2="' + r1(l[1][1] + 1.6) + '" stroke="#fff" stroke-opacity=".35" stroke-width=".6"/>'; });
      X.inn.push(s);
    }
    X.rim.push([A, Bp, G, F, E, D]);
    return [38, 26];
  }

  /* ---------- Hilfen für Besonderheiten ---------- */
  function star4(cx, cy, r) {
    return 'M' + r1(cx) + ' ' + r1(cy - r) + 'Q' + r1(cx) + ' ' + r1(cy) + ' ' + r1(cx + r) + ' ' + r1(cy) + 'Q' + r1(cx) + ' ' + r1(cy) + ' ' + r1(cx) + ' ' + r1(cy + r) +
      'Q' + r1(cx) + ' ' + r1(cy) + ' ' + r1(cx - r) + ' ' + r1(cy) + 'Q' + r1(cx) + ' ' + r1(cy) + ' ' + r1(cx) + ' ' + r1(cy - r) + 'Z';
  }
  function glintLang(x, y, s) { // Lichtstern mit langen Strahlen und Hof
    return '<g class="kr-blink"><circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="' + r1(s * 0.55) + '" fill="#fff" opacity=".28" filter="url(#BL2)"/>' +
      '<path d="' + star4(x, y, s * 2.1) + '" fill="#fff" opacity=".75"/><path d="' + star4(x, y, s) + '" fill="#fff"/></g>';
  }
  function huelle(pts) { // konvexe Hülle (Monotone Chain)
    var P = pts.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }), lo = [], up = [], i;
    function cr(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    for (i = 0; i < P.length; i++) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], P[i]) <= 0) lo.pop(); lo.push(P[i]); }
    for (i = P.length - 1; i >= 0; i--) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], P[i]) <= 0) up.pop(); up.push(P[i]); }
    up.pop(); lo.pop(); return lo.concat(up);
  }
  function pol(r, a, cx, cy) { return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }
  function strahlen(cx, cy, n, l0, l1, w, farbe, op, rnd) {
    var s = '';
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2, l = l0 + (l1 - l0) * rnd(), q = pol(l, a + w, cx, cy), o = pol(l, a - w, cx, cy);
      s += '<polygon points="' + r1(cx) + ',' + r1(cy) + ' ' + r1(q[0]) + ',' + r1(q[1]) + ' ' + r1(o[0]) + ',' + r1(o[1]) + '" fill="' + farbe + '" opacity="' + op + '"/>';
    }
    return s;
  }
  function rgrad(id, cx, cy, r, st) { return '<radialGradient id="' + id + '" gradientUnits="userSpaceOnUse" cx="' + cx + '" cy="' + cy + '" r="' + r + '">' + st.map(function (x) { return '<stop offset="' + x[0] + '" stop-color="' + x[1] + '" stop-opacity="' + (x[2] == null ? 1 : x[2]) + '"/>'; }).join('') + '</radialGradient>'; }
  function lgrad(id, x1, y1, x2, y2, st) { return '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '">' + st.map(function (x) { return '<stop offset="' + x[0] + '" stop-color="' + x[1] + '" stop-opacity="' + (x[2] == null ? 1 : x[2]) + '"/>'; }).join('') + '</linearGradient>'; }

  /* ---------- Besonderheiten je Stein ----------
     Jede Funktion bekommt (X, G) und füllt X.back (hinter dem Stein), X.inn (im Stein, auf die Form beschnitten) und X.front (davor).
     Nur in der großen Darstellung (q = 2). */
  var DEKO = {};
  function glut(X, id, farbe, r, op, cx, cy) {
    X.defs.push(rgrad(X.id + id, cx == null ? 50 : cx, cy == null ? 52 : cy, r, [[0, farbe, op], [1, farbe, 0]]));
    return '<rect x="-10" y="-10" width="120" height="120" fill="url(#' + X.id + id + ')" style="mix-blend-mode:screen"/>';
  }
  DEKO.opal = function (X, G) {
    var s = glut(X, 'o1', '#8affc8', 34, 0.45, 40, 44) + glut(X, 'o2', '#ff8ad8', 30, 0.42, 60, 58) + glut(X, 'o3', '#8ab8ff', 26, 0.4, 52, 36);
    for (var i = 0; i < 34; i++) {
      var a = G.rnd() * 6.28, r = G.rnd() * 30, x = 50 + Math.cos(a) * r * 0.8, y = 50 + Math.sin(a) * r, z = 1.2 + G.rnd() * 3.2;
      s += '<polygon class="funk" style="animation-delay:' + r1(G.rnd() * 3) + 's" points="' + pstr([[x, y - z], [x + z, y], [x, y + z], [x - z, y]]) + '" fill="hsl(' + Math.round(G.rnd() * 360) + ' 100% 65%)" opacity=".85"/>';
    }
    X.inn.push(s);
  };
  DEKO.feueropal = function (X) { X.inn.push(glut(X, 'f1', '#ffd45a', 26, 0.42, 44, 46) + glut(X, 'f2', '#ff3a1a', 40, 0.3, 58, 64)); };
  DEKO.sonnenstein = function (X, G) {
    var s = glut(X, 's1', '#ffcf5a', 40, 0.55);
    for (var i = 0; i < 40; i++) {
      var a = G.rnd() * 6.28, r = G.rnd() * 36, x = 50 + Math.cos(a) * r, y = 50 + Math.sin(a) * r, z = 0.7 + G.rnd() * 1.6;
      s += '<rect class="funk" style="animation-delay:' + r1(G.rnd() * 3) + 's" x="' + r1(x) + '" y="' + r1(y) + '" width="' + r1(z) + '" height="' + r1(z) + '" fill="#fff6c0" transform="rotate(' + Math.round(G.rnd() * 90) + ' ' + r1(x) + ' ' + r1(y) + ')"/>';
    }
    X.inn.push(s);
  };
  DEKO.diamant = DEKO.rotdiamant = DEKO.ersteslicht = function (X, G) {
    var s = '', cols = ['#ff5a5a', '#ffd24a', '#5aff9a', '#4ab8ff', '#b05aff'], i;
    for (i = 0; i < 9; i++) { // Farbspiel (Dispersion) in einzelnen Facetten
      var f = G.fac[(G.rnd() * G.fac.length) | 0]; if (!f) continue;
      var c = f.c, z = 2 + G.rnd() * 2.4;
      s += '<polygon points="' + pstr([[c[0], c[1] - z], [c[0] + z, c[1] + z * 0.7], [c[0] - z, c[1] + z * 0.7]]) + '" fill="' + cols[i % 5] + '" opacity=".55" style="mix-blend-mode:screen"/>';
    }
    X.inn.push(s);
    if (G.c.id === 'ersteslicht') {
      X.back.push('<g class="kr-dreh">' + strahlen(50, 50, 28, 40, 68, 0.025, '#fff2b0', 0.55, G.rnd) + '</g>');
      X.inn.push(glut(X, 'e1', '#ffffff', 26, 0.55));
    }
    if (G.c.id === 'rotdiamant') X.inn.push(glut(X, 'r1', '#ff3050', 34, 0.45));
  };
  DEKO.sternsaphir = function (X) {
    var s = glut(X, 'a1', '#6fa0ff', 34, 0.5), i;
    for (i = 0; i < 3; i++) {
      var a = i * Math.PI / 3 - Math.PI / 2, p = pol(40, a, 50, 50), q = pol(40, a + Math.PI, 50, 50);
      s += '<line x1="' + r1(p[0]) + '" y1="' + r1(p[1]) + '" x2="' + r1(q[0]) + '" y2="' + r1(q[1]) + '" stroke="#cfe0ff" stroke-width="3" opacity=".7" filter="url(#BL2)"/><line x1="' + r1(p[0]) + '" y1="' + r1(p[1]) + '" x2="' + r1(q[0]) + '" y2="' + r1(q[1]) + '" stroke="#fff" stroke-width=".9"/>';
    }
    X.inn.push(s + '<circle cx="50" cy="50" r="5" fill="#fff" opacity=".9" filter="url(#BL2)"/>');
  };
  DEKO.phoenix = function (X) {
    X.defs.push(lgrad(X.id + 'p1', 0, 80, 0, 30, [[0, '#ff3a00'], [0.5, '#ff9a1a'], [1, '#fff2a0']]));
    X.inn.push(glut(X, 'p2', '#ff7a1a', 36, 0.7) + '<g class="kr-flacker"><path d="M50 80 C34 62 46 52 50 26 C58 48 70 62 50 80 Z" fill="url(#' + X.id + 'p1)" opacity=".85"/><path d="M50 74 C42 64 48 56 50 40 C54 54 60 62 50 74 Z" fill="#fff6c0" opacity=".9"/></g>');
  };
  DEKO.magmaherz = function (X, G) {
    var s = glut(X, 'm1', '#ff4a12', 42, 0.75), i, j, d = '';
    for (i = 0; i < 5; i++) {
      var a = G.rnd() * 6.28, x = 50, y = 52, p = 'M50 52';
      for (j = 0; j < 4; j++) { a += (G.rnd() - 0.5) * 1.3; x += Math.cos(a) * 10; y += Math.sin(a) * 10; p += ' L' + r1(x) + ' ' + r1(y); }
      d += p + ' ';
    }
    s += '<g class="kr-lava"><path d="' + d + '" fill="none" stroke="#ff3a00" stroke-width="4" stroke-linecap="round" opacity=".8" filter="url(#BL2)"/><path d="' + d + '" fill="none" stroke="#ffe08a" stroke-width="1.3" stroke-linecap="round"/></g>';
    X.inn.push(s);
  };
  function frost(farbe) {
    var s = '', i, j;
    for (i = 0; i < 6; i++) {
      var a = i * Math.PI / 3, p = pol(24, a, 50, 50);
      s += '<line x1="50" y1="50" x2="' + r1(p[0]) + '" y2="' + r1(p[1]) + '" stroke="' + farbe + '" stroke-width=".8" opacity=".75"/>';
      for (j = 1; j <= 3; j++) {
        var m = pol(7 * j, a, 50, 50), l = pol(5 - j * 0.6, a + 0.9, m[0], m[1]), r = pol(5 - j * 0.6, a - 0.9, m[0], m[1]);
        s += '<polyline points="' + pstr([l, m, r]) + '" fill="none" stroke="' + farbe + '" stroke-width=".6" opacity=".7"/>';
      }
    }
    return s;
  }
  DEKO.eisherz = function (X) { X.inn.push(glut(X, 'i1', '#b8f0ff', 34, 0.5) + frost('#ffffff')); };
  DEKO.ewigeis = function (X) { X.inn.push(glut(X, 'i1', '#bff4ff', 40, 0.35) + '<g transform="translate(0,6)">' + frost('#ffffff') + '</g>'); };
  DEKO.blutmond = function (X) {
    X.inn.push('<circle cx="64" cy="44" r="44" fill="#18000a" opacity=".6"/>' + glut(X, 'b1', '#ff2a4a', 30, 0.5, 36, 56) +
      '<ellipse cx="38" cy="62" rx="5" ry="3.5" fill="#000" opacity=".2"/><ellipse cx="30" cy="44" rx="3.5" ry="2.5" fill="#000" opacity=".2"/><ellipse cx="46" cy="40" rx="2.5" ry="2" fill="#000" opacity=".18"/>');
  };
  DEKO.obsidian = DEKO.nachtglas = function (X) {
    X.defs.push(lgrad(X.id + 'n1', 0, 0, 100, 100, [[0, '#7a5cff', 0], [0.4, '#33e0ff', 0.28], [0.7, '#ff5ad0', 0.24], [1, '#7a5cff', 0]]));
    var s = '<rect x="0" y="0" width="100" height="100" fill="url(#' + X.id + 'n1)" style="mix-blend-mode:screen"/>', i;
    for (i = 0; i < 3; i++) s += '<polygon points="' + pstr([[18 + i * 22, 100], [26 + i * 22, 100], [58 + i * 22, 0], [50 + i * 22, 0]]) + '" fill="#fff" opacity="' + (0.12 - i * 0.03) + '"/>';
    X.inn.push(s);
  };
  DEKO.lichtader = function (X) {
    X.inn.push(glut(X, 'l1', '#fff6b0', 38, 0.7, 50, 56) + '<line class="kr-puls" x1="50" y1="26" x2="50" y2="90" stroke="#ffe36a" stroke-width="5" opacity=".8" filter="url(#BL2)"/><line x1="50" y1="26" x2="50" y2="90" stroke="#fff" stroke-width="1.4"/>');
  };
  DEKO.himmelstraene = function (X, G) {
    var s = '<ellipse cx="44" cy="56" rx="20" ry="7" fill="#fff" opacity=".3" filter="url(#BL2)"/><ellipse cx="58" cy="70" rx="16" ry="5" fill="#fff" opacity=".25" filter="url(#BL2)"/>', i;
    for (i = 0; i < 7; i++) {
      var x = 38 + G.rnd() * 26, y = 40 + G.rnd() * 44, r = 1.6 + G.rnd() * 3;
      s += '<circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="' + r1(r) + '" fill="#fff" fill-opacity=".14" stroke="#fff" stroke-opacity=".7" stroke-width=".5"/><circle cx="' + r1(x - r * 0.35) + '" cy="' + r1(y - r * 0.35) + '" r="' + r1(r * 0.28) + '" fill="#fff"/>';
    }
    X.inn.push(s);
  };
  DEKO.seelenstein = function (X) {
    var d = '', i;
    for (i = 0; i < 3; i++) { var r = 8 + i * 6; d += 'M' + r1(50 - r) + ' 50 A' + r + ' ' + r + ' 0 1 1 ' + r1(50 + r * 0.2) + ' ' + r1(50 + r * 0.98) + ' '; }
    X.inn.push(glut(X, 'se', '#d8c0ff', 30, 0.6) + '<g class="kr-dreh"><path d="' + d + '" fill="none" stroke="#fff" stroke-width=".9" opacity=".7"/></g><circle cx="44" cy="48" r="2.4" fill="#fff" filter="url(#BL2)"/><circle cx="57" cy="48" r="2.4" fill="#fff" filter="url(#BL2)"/>');
  };
  DEKO.weltenkern = function (X) {
    X.inn.push(glut(X, 'w1', '#caffd0', 22, 0.95) + '<g class="kr-dreh"><ellipse cx="50" cy="50" rx="24" ry="8" fill="none" stroke="#fff" stroke-width=".8" opacity=".7" transform="rotate(-30 50 50)"/><circle cx="72" cy="40" r="2.4" fill="#fff"/></g><ellipse cx="50" cy="50" rx="24" ry="8" fill="none" stroke="#bfffc8" stroke-width=".7" opacity=".5" transform="rotate(35 50 50)"/><circle cx="50" cy="50" r="5" fill="#fff"/>');
  };
  DEKO.zeitsplitter = function (X) {
    var s = glut(X, 'z1', '#fff0b0', 32, 0.5), i;
    for (i = 0; i < 12; i++) {
      var a = i * Math.PI / 6, p = pol(i % 3 ? 27 : 24, a, 50, 50), q = pol(31, a, 50, 50);
      s += '<line x1="' + r1(p[0]) + '" y1="' + r1(p[1]) + '" x2="' + r1(q[0]) + '" y2="' + r1(q[1]) + '" stroke="#fff" stroke-width="' + (i % 3 ? 0.7 : 1.4) + '" opacity=".85"/>';
    }
    s += '<g class="kr-dreh" style="animation-duration:12s"><line x1="50" y1="50" x2="50" y2="29" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/></g><g class="kr-dreh" style="animation-duration:60s"><line x1="50" y1="50" x2="63" y2="50" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></g><circle cx="50" cy="50" r="2" fill="#fff"/>';
    X.inn.push(s);
  };
  function nebel(X, G, cols) {
    var s = '', i;
    cols.forEach(function (c, k) { s += glut(X, 'n' + k, c[0], c[1], c[2], c[3], c[4]); });
    for (i = 0; i < 18; i++) s += '<circle class="funk" style="animation-delay:' + r1(G.rnd() * 3) + 's" cx="' + r1(10 + G.rnd() * 80) + '" cy="' + r1(10 + G.rnd() * 80) + '" r="' + r1(0.5 + G.rnd() * 1.1) + '" fill="#fff"/>';
    return s;
  }
  DEKO.nebelstern = function (X, G) { X.inn.push(nebel(X, G, [['#ff4ad8', 26, 0.7, 40, 44], ['#4a8cff', 28, 0.7, 60, 56], ['#4affea', 20, 0.5, 50, 36]])); };
  DEKO.sternengeburt = function (X, G) {
    X.inn.push(nebel(X, G, [['#ff9ad0', 30, 0.6, 50, 52], ['#ffd870', 22, 0.8, 50, 50]]) + '<path d="' + star4(50, 50, 26) + '" fill="#fff" opacity=".9" filter="url(#BL2)"/><path d="' + star4(50, 50, 18) + '" fill="#fff"/>');
  };
  DEKO.weltentraene = function (X) {
    var s = glut(X, 'wt', '#d0d8ff', 26, 0.7, 50, 58), i, a;
    for (i = 0; i < 40; i++) { a = i * 0.34; var r = 2 + i * 0.55, x = 50 + Math.cos(a) * r * 0.9, y = 58 + Math.sin(a) * r * 0.5; s += '<circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="' + r1(0.5 + (40 - i) * 0.02) + '" fill="#fff" opacity="' + r1(0.9 - i * 0.012) + '"/>'; }
    X.inn.push(s);
  };
  DEKO.singularitaet = function (X) {
    X.defs.push(lgrad(X.id + 'a1', 0, 0, 100, 0, [[0, '#ff7a1a', 0], [0.25, '#ff9a3a'], [0.5, '#fff6e0'], [0.75, '#ff9a3a'], [1, '#ff7a1a', 0]]));
    X.inn.push('<circle cx="50" cy="50" r="17" fill="#000"/><circle cx="50" cy="50" r="17.5" fill="none" stroke="#fff" stroke-width="1" opacity=".9" filter="url(#BL2)"/>');
    X.front.push('<g transform="rotate(-14 50 50)"><ellipse cx="50" cy="50" rx="46" ry="10" fill="none" stroke="url(#' + X.id + 'a1)" stroke-width="4" opacity=".9" filter="url(#BL2)"/><ellipse cx="50" cy="50" rx="46" ry="10" fill="none" stroke="url(#' + X.id + 'a1)" stroke-width="1.6"/></g><path d="M30 38 Q50 24 70 38" fill="none" stroke="#ffe6c0" stroke-width="1" opacity=".6"/>');
  };
  DEKO.urkristall = function (X) {
    var s = '', i;
    for (i = 0; i < 9; i++) { var a = -Math.PI * 0.9 + i * 0.28, p = pol(70, a, 50, 94); s += '<line x1="50" y1="92" x2="' + r1(p[0]) + '" y2="' + r1(p[1]) + '" stroke="hsl(' + (i * 40) + ' 100% 65%)" stroke-width="1.6" opacity=".55"/>'; }
    X.back.push('<g class="kr-schimmer">' + s + '</g>');
    X.inn.push(glut(X, 'u1', '#ffffff', 36, 0.35, 50, 50));
  };
  DEKO.kristallherz = function (X) {
    X.inn.push('<g class="kr-puls">' + glut(X, 'h1', '#fff0fa', 28, 0.95, 50, 50) + glut(X, 'h2', '#ff3aa0', 44, 0.6, 50, 50) + '</g>');
    X.back.push('<g class="kr-schimmer"><circle cx="50" cy="50" r="52" fill="none" stroke="#ff9ae0" stroke-width="1" opacity=".45" stroke-dasharray="2 6"/></g>');
  };
  DEKO.pyrit = function (X) {
    X.defs.push(lgrad(X.id + 'y1', 10, 10, 90, 90, [[0, '#fff6b0', 0.5], [0.4, '#ffd24a', 0], [0.6, '#7a5a10', 0.25], [1, '#fff0a0', 0.4]]));
    X.inn.push('<rect width="100" height="100" fill="url(#' + X.id + 'y1)" style="mix-blend-mode:overlay"/>');
  };
  DEKO.fluorit = function (X) {
    var s = '', i;
    for (i = 0; i < 6; i++) s += '<polygon points="' + pstr([[8 + i * 16, 0], [18 + i * 16, 0], [18 + i * 16 - 40, 100], [8 + i * 16 - 40, 100]]) + '" fill="' + (i % 2 ? '#a070ff' : '#40e0c0') + '" opacity=".28"/>';
    X.inn.push(s + glut(X, 'fl', '#a0ffe8', 38, 0.35));
  };
  DEKO.haematit = function (X) {
    X.defs.push(lgrad(X.id + 'h1', 0, 20, 0, 80, [[0, '#fff', 0], [0.42, '#fff', 0.5], [0.52, '#fff', 0], [1, '#000', 0.3]]));
    X.inn.push('<rect width="100" height="100" fill="url(#' + X.id + 'h1)"/>');
  };
  DEKO.mondstein = function (X) {
    X.inn.push('<g class="kr-schimmer"><ellipse cx="46" cy="50" rx="14" ry="30" fill="#bcd4ff" opacity=".6" filter="url(#BL2)" transform="rotate(-24 46 50)"/></g>' + glut(X, 'mo', '#ffffff', 30, 0.4));
  };
  DEKO.rosenquarz = function (X) { X.inn.push(glut(X, 'rq', '#ffe0ee', 36, 0.55, 46, 52)); };
  DEKO.citrin = function (X) { X.inn.push(glut(X, 'ci', '#fff0a0', 32, 0.5, 50, 66)); };
  DEKO.benitoit = function (X) { X.inn.push(glut(X, 'be', '#4a7cff', 32, 0.6)); };
  DEKO.granat = DEKO.rubin = function (X, G) { X.inn.push(glut(X, 'ru', G.c.id === 'rubin' ? '#ff2a5a' : '#ff5a4a', 32, 0.5)); };
  DEKO.smaragd = function (X, G) {
    var s = '', i;
    for (i = 0; i < 6; i++) { var x = 30 + G.rnd() * 40, y = 30 + G.rnd() * 40; s += '<path d="M' + r1(x) + ' ' + r1(y) + ' q4 -5 8 0 t6 -3" fill="none" stroke="#d8ffe8" stroke-width=".6" opacity=".55"/>'; }
    X.inn.push(s + glut(X, 'sm', '#7affb0', 30, 0.35));
  };
  DEKO.saphir = DEKO.aquamarin = function (X, G) { X.inn.push(glut(X, 'sa', G.c.id === 'saphir' ? '#4a80ff' : '#b0f4ff', 32, 0.5)); };
  DEKO.tansanit = DEKO.topas = DEKO.peridot = DEKO.aventurin = function (X, G) { X.inn.push(glut(X, 'tt', G.c.farbe, 30, 0.45)); };

  /* ---------- Ergebnis ----------
     svgKristall(index | Kristall, Mutationsindex, {glow, funkeln, q})
     Standard: große Darstellung (q 2); mit funkeln:false (Listensymbole) die leichte (q 1). */
  KR.svgKristall = function (ci, mi, opt) {
    opt = opt || {}; mi = mi || 0;
    var c = typeof ci === 'number' ? KR.KRISTALLE[ci] : ci, q = opt.q || (opt.funkeln === false ? 1 : 2), X = new Ctx(c, mi, q), glint;
    switch (c.schliff) {
      case 'rund': glint = brillant(X); break;
      case 'smaragd': glint = ringCut(X, umrissSmaragd(), [1, 0.79, 0.59, 0.4]); break;
      case 'tropfen': glint = ringCut(X, umrissTropfen(), [1, 0.74, 0.5, 0.27]); break;
      case 'marquise': glint = ringCut(X, umrissMarquise(), [1, 0.72, 0.46, 0.24]); break;
      case 'herz': glint = ringCut(X, umrissHerz(), [1, 0.7, 0.44, 0.22]); break;
      case 'stern': glint = ringCut(X, umrissStern(c.id), [1, 0.62, 0.3]); break;
      case 'spitze': glint = spitze(X); break;
      case 'cluster': glint = cluster(X, c); break;
      case 'oktaeder': glint = oktaeder(X); break;
      case 'wuerfel': glint = wuerfel(X); break;
      case 'raute': glint = raute(X); break;
      default: glint = brillant(X);
    }
    var id = X.id, m = X.m, rnd = seedRng(c.id + mi), hq = q >= 2, konvex = !(c.schliff === 'spitze' || c.schliff === 'cluster');
    var body = X.out.join(''), defs = '', back = '', front = '', sp = '';
    var G = { c: c, rnd: rnd, fac: X.fac };

    if (hq) defs += '<filter id="' + id + 'bl" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2"/></filter>';
    if (hq && DEKO[c.id]) { try { DEKO[c.id](X, G); } catch (e) { /* Ein Zeichenfehler darf das Spiel nie stören */ } }

    // Leuchten hinter dem Stein
    if (opt.glow || hq) {
      defs += '<radialGradient id="' + id + 'g"><stop offset="0" stop-color="' + hsl(X.h, Math.max(X.s, 60), Math.max(X.l, 55), 0.5) + '"/><stop offset="1" stop-color="' + hsl(X.h, X.s, X.l, 0) + '"/></radialGradient>';
      back += '<circle cx="50" cy="50" r="64" fill="url(#' + id + 'g)"/>';
    }
    back += X.back.join('');
    if (m === 'leere') {
      defs += '<linearGradient id="' + id + 'r" x1="0" x2="1"><stop offset="0" stop-color="#7a4dff" stop-opacity="0"/><stop offset=".5" stop-color="#e9d9ff"/><stop offset="1" stop-color="#7a4dff" stop-opacity="0"/></linearGradient>';
      back += '<g transform="rotate(-18 50 52)"><ellipse cx="50" cy="52" rx="58" ry="13" fill="none" stroke="url(#' + id + 'r)" stroke-width="2.4" opacity=".85"/></g>';
      front += '<g transform="rotate(-18 50 52)"><path d="M -8 52 A 58 13 0 0 0 108 52" fill="none" stroke="url(#' + id + 'r)" stroke-width="2.8"/></g>';
    }
    if (m === 'schatten' && hq) back += '<g class="kr-rauch" filter="url(#BL2)"><path d="M30 90 q-8 -20 6 -34 q-6 -14 4 -28" fill="none" stroke="#7a5cff" stroke-width="5" opacity=".4" stroke-linecap="round"/><path d="M70 90 q8 -22 -4 -36 q8 -14 -2 -26" fill="none" stroke="#9a7cff" stroke-width="5" opacity=".35" stroke-linecap="round"/></g>';

    // Form für Beschneidung: alle Flächen zusammen
    var clipId = id + 'c';
    defs += '<clipPath id="' + clipId + '">' + X.sil.map(function (P) { return '<polygon points="' + pstr(P) + '"/>'; }).join('') + '</clipPath>';

    // Kanten: helle Fasen zum Licht hin, dunkle Kanten abseits
    var kanten = '';
    if (hq) {
      var cnt = 0;
      X.fac.forEach(function (f) {
        if (!f.e || cnt > 260) return;
        for (var i = 0; i < f.p.length; i++) {
          var a = f.p[i], b = f.p[(i + 1) % f.p.length], dx = b[0] - a[0], dy = b[1] - a[1];
          if (dx * dx + dy * dy < 6) continue;
          var d = dotL((a[0] + b[0]) / 2 - f.c[0], (a[1] + b[1]) / 2 - f.c[1]);
          if (d > 0.7) { kanten += '<line x1="' + r1(a[0]) + '" y1="' + r1(a[1]) + '" x2="' + r1(b[0]) + '" y2="' + r1(b[1]) + '" stroke="#fff" stroke-opacity="' + r1(0.25 + d * 0.3) + '" stroke-width=".55"/>'; cnt++; }
          else if (d < -0.7) { kanten += '<line x1="' + r1(a[0]) + '" y1="' + r1(a[1]) + '" x2="' + r1(b[0]) + '" y2="' + r1(b[1]) + '" stroke="#000" stroke-opacity=".22" stroke-width=".7"/>'; cnt++; }
        }
      });
    }

    // Innenleben (beschnitten auf die Form)
    var inner = '';
    if (hq) {
      defs += rgrad(id + 'ig', 46, 46, 48, [[0, hsl(X.h, Math.min(100, X.s + 10), Math.min(90, X.l + 28), 0.55)], [1, hsl(X.h, X.s, X.l, 0)]]);
      defs += lgrad(id + 'bt', 0, 40, 0, 100, [[0, '#000', 0], [1, '#000', 0.34]]);
      inner += '<rect width="100" height="100" fill="url(#' + id + 'ig)" style="mix-blend-mode:screen"/><rect width="100" height="100" fill="url(#' + id + 'bt)"/>';
    }
    inner += X.inn.join('');
    if (hq) {
      if (m === 'neon') inner += '<rect width="100" height="100" fill="' + hsl(X.h, 100, 70, 0.28) + '" style="mix-blend-mode:screen"/>';
      if (m === 'gold') { defs += lgrad(id + 'gd', 0, 0, 100, 100, [[0, '#fff3b0', 0.85], [0.3, '#ffd24a', 0], [0.55, '#8a5a00', 0.45], [0.8, '#ffe27a', 0.5], [1, '#fff3b0', 0.6]]); inner += '<rect width="100" height="100" fill="url(#' + id + 'gd)" style="mix-blend-mode:soft-light"/>'; }
      if (m === 'schatten') inner += '<rect width="100" height="100" fill="#120a30" fill-opacity=".35"/>';
      if (m === 'regenbogen') { defs += lgrad(id + 'rb', 0, 0, 100, 100, [[0, '#ff3a3a', 0.5], [0.2, '#ffd23a', 0.5], [0.4, '#3aff7a', 0.5], [0.6, '#3ab8ff', 0.5], [0.8, '#a03aff', 0.5], [1, '#ff3a9a', 0.5]]); inner += '<rect width="100" height="100" fill="url(#' + id + 'rb)" style="mix-blend-mode:color"/>'; }
      if (m === 'leere') {
        for (var i = 0; i < 24; i++) inner += '<circle class="funk" style="animation-delay:' + r1(rnd() * 3) + 's" cx="' + r1(rnd() * 100) + '" cy="' + r1(rnd() * 100) + '" r="' + r1(0.4 + rnd() * 0.9) + '" fill="#fff"/>';
      }
    }
    var out = hq ? '<g clip-path="url(#' + clipId + ')">' + inner + '</g>' : inner;

    // Glanz: weiche Fläche und scharfer Streifen
    var gl = '';
    if (hq && glint) {
      gl += '<g clip-path="url(#' + clipId + ')"><ellipse cx="' + r1(glint[0] + 2) + '" cy="' + r1(glint[1] + 3) + '" rx="13" ry="6" fill="#fff" opacity=".42" filter="url(#BL2)" transform="rotate(-38 ' + r1(glint[0]) + ' ' + r1(glint[1]) + ')"/></g>';
      gl += '<line x1="' + r1(glint[0] - 6) + '" y1="' + r1(glint[1] + 6) + '" x2="' + r1(glint[0] + 4) + '" y2="' + r1(glint[1] - 5) + '" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity=".85"/>';
    }

    // Randlicht und Umrisse
    var rim = '', rimPolys = X.rim.length ? X.rim : [huelle(X.pts)];
    if (hq) defs += lgrad(id + 'rl', 0, 0, 100, 100, [[0, '#fff', 0.95], [0.45, '#fff', 0.1], [1, '#fff', 0]]);
    rimPolys.forEach(function (P) {
      var pp = pstr(P);
      rim += '<polygon points="' + pp + '" fill="none" stroke="' + X.rimF + '" stroke-width=".8" stroke-linejoin="round"/>';
      if (hq) rim += '<polygon points="' + pp + '" fill="none" stroke="url(#' + id + 'rl)" stroke-width="1.5" stroke-linejoin="round"/>';
      if (m === 'neon') rim += '<polygon points="' + pp + '" fill="none" stroke="' + hsl(X.h, 100, 82, 0.95) + '" stroke-width="1.8" stroke-linejoin="round"/>';
      if (m === 'schatten') rim += '<polygon points="' + pp + '" fill="none" stroke="#c9b6ff" stroke-width="1" stroke-opacity=".7" stroke-linejoin="round"/>';
      if (m === 'leere') rim += '<polygon points="' + pp + '" fill="none" stroke="#e9d9ff" stroke-width="1.1" stroke-opacity=".85" stroke-linejoin="round"/>';
    });

    // Lichtstern
    var gs = '';
    if (glint) gs = hq && c.t >= 2 ? glintLang(glint[0], glint[1], c.t >= 4 ? 5.5 : 4) : '<path d="' + star4(glint[0], glint[1], c.t >= 3 ? 9 : 6) + '" fill="#fff" opacity=".9"/>';

    // Glanzstreifen, der über den Stein wandert
    var sweep = '';
    if (m === 'glitzer' || m === 'gold' || m === 'neon' || c.t >= 5) sweep = '<g clip-path="url(#' + clipId + ')"><rect class="glanz" x="-60" y="-10" width="16" height="120" fill="#fff" opacity=".3" transform="skewX(-22)"/></g>';

    // Funkeln
    var nf = (opt.funkeln === false) ? 0 : (m === 'glitzer' ? 8 : m === 'normal' ? (c.t >= 4 ? 4 : c.t >= 2 ? 2 : 0) : 6);
    if (opt.funkeln !== false && (m === 'regenbogen' || m === 'gold')) nf = Math.max(nf, 6);
    for (var i2 = 0; i2 < nf; i2++) {
      var ang = rnd() * Math.PI * 2, rr = 22 + rnd() * 32, sx = 50 + Math.cos(ang) * rr, sy = 50 + Math.sin(ang) * rr * 0.9, sr = 3 + rnd() * 4.5;
      sp += '<path class="funk" style="animation-delay:' + r1(rnd() * 2.4) + 's" d="' + star4(sx, sy, sr) + '" fill="' + (m === 'schatten' || m === 'leere' ? '#e3d6ff' : '#fff') + '"/>';
    }

    // Grundstrich der Flächen (nur ohne Randpolygon nötig; dünn)
    var kf = X.rimF, kw = 0.35;
    if (!konvex) { if (m === 'neon') { kf = hsl(X.h, 100, 82, 0.95); kw = 1.1; } else if (m === 'schatten') { kf = 'rgba(201,182,255,.75)'; kw = 0.8; } else if (m === 'leere') { kf = 'rgba(233,217,255,.85)'; kw = 0.8; } }

    var svg = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="kr-svg m-' + m + '" aria-hidden="true" focusable="false" style="--g:' + hsl(X.h, Math.max(X.s, 55), Math.max(X.l, 52)) + '">' +
      '<defs>' + defs + X.defs.join('') + '</defs>' + back +
      '<g stroke="' + kf + '" stroke-width="' + kw + '" stroke-linejoin="round">' + body + '</g>' +
      (hq ? '<g>' + kanten + '</g>' : '') + out + gl + rim + sweep + gs + sp + X.front.join('') + front + '</svg>';
    return svg.split('url(#BL2)').join('url(#' + id + 'bl)');
  };

  /* Gesteinsbrocken vor dem Aufbrechen; farbe = Hinweisfarbe der Stufe */
  KR.svgGeode = function (farbe) {
    var id = 'g' + (++uid);
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="kr-svg geode" aria-hidden="true" focusable="false" style="--hint:' + farbe + '">' +
      '<defs><linearGradient id="' + id + 'a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7d7690"/><stop offset="1" stop-color="#2c2838"/></linearGradient></defs>' +
      '<path d="M19 80 C6 60 10 34 29 22 C44 11 67 11 79 24 C93 39 95 65 80 81 C66 93 33 93 19 80 Z" fill="url(#' + id + 'a)"/>' +
      '<path d="M29 22 C44 11 67 11 79 24 L60 34 L40 32 Z" fill="#8a849c"/>' +
      '<path d="M19 80 C6 60 10 34 29 22 L40 32 L34 58 L26 82 Z" fill="#6a6480"/>' +
      '<path d="M80 81 C95 65 93 39 79 24 L68 48 L64 72 L66 90 C72 88 77 85 80 81 Z" fill="#2a2634"/>' +
      '<path d="M34 58 L64 72 L66 90 C52 96 34 92 26 82 Z" fill="#383344"/>' +
      '<path d="M40 32 L60 34 L68 48 L64 72 L34 58 Z" fill="#4d475c" opacity=".7"/>' +
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
