/* Kristall RNG: Spielkern (Zustand, Würfeln, Höhlen, Verbesserungen, Offline-Fortschritt, Speichern) */
'use strict';
(function () {
  var KR = window.KR;
  var KEY = 'kristallrng.v1';
  var S = null;
  KR.rng = Math.random; // für Tests austauschbar

  /* ---------- kleine Helfer ---------- */
  var ho = {};
  KR.on = function (n, f) { (ho[n] = ho[n] || []).push(f); };
  KR.emit = function (n, a) { (ho[n] || []).forEach(function (f) { try { f(a); } catch (e) { console.error(e); } }); };

  var SUFFIX = [[1e18, ' Trio.'], [1e15, ' Brd.'], [1e12, ' Bio.'], [1e9, ' Mrd.'], [1e6, ' Mio.']];
  KR.fmt = function (n) {
    n = Number(n) || 0;
    var a = Math.abs(n);
    for (var i = 0; i < SUFFIX.length; i++) {
      if (a >= SUFFIX[i][0]) {
        var v = n / SUFFIX[i][0];
        return (v >= 100 ? Math.round(v).toString() : v >= 10 ? v.toFixed(1) : v.toFixed(2)).replace('.', ',').replace(/,0+$|(,\d)0$/, '$1') + SUFFIX[i][1];
      }
    }
    if (a >= 1e21) return n.toExponential(2).replace('.', ',').replace('e+', ' e');
    return Math.round(n).toLocaleString('de-DE');
  };
  KR.fmtOdds = function (zahl) { return '1 zu ' + KR.fmt(zahl); };
  KR.fmtZeit = function (s) { return (s < 10 ? s.toFixed(2) : s.toFixed(1)).replace('.', ',') + ' s'; };
  KR.fmtDauer = function (sek) {
    sek = Math.round(sek);
    var h = Math.floor(sek / 3600), m = Math.floor(sek % 3600 / 60);
    if (h > 0) return h + ' Std. ' + m + ' Min.';
    if (m > 0) return m + ' Min.';
    return sek + ' Sek.';
  };
  KR.aufbruchZeit = function (l) { return Math.max(0.28, 1.6 * Math.pow(0.93, l)); };
  KR.autoTakt = function (l) { return Math.max(0.6, 2.6 * Math.pow(0.94, l)); };

  /* ---------- Zustand ---------- */
  function neu() {
    return {
      v: 1, erstellt: Date.now(), zuletzt: Date.now(), splitter: 0, gesamt: 0, schlaege: 0, funde: 0,
      inv: {}, entdeckt: {}, mutGefunden: [0, 0, 0, 0, 0, 0, 0], hoechsteStufe: 0, bestes: null,
      up: {}, autoAn: false, autoZermahlen: false, erfolge: {}, spielzeit: 0,
      einst: { ton: true, effekte: 'voll' }, tutorial: false
    };
  }
  KR.laden = function () {
    var d = null;
    try { var t = localStorage.getItem(KEY); if (t) d = JSON.parse(t); } catch (e) { d = null; }
    var n = neu();
    if (d && typeof d === 'object') {
      for (var k in n) if (Object.prototype.hasOwnProperty.call(d, k) && d[k] != null) n[k] = d[k];
      n.einst = Object.assign({ ton: true, effekte: 'voll' }, d.einst || {});
      if (!Array.isArray(n.mutGefunden) || n.mutGefunden.length < 7) n.mutGefunden = [0, 0, 0, 0, 0, 0, 0].map(function (x, i) { return (d.mutGefunden && d.mutGefunden[i]) || 0; });
    }
    S = n; KR.S = S;
    return S;
  };
  var gespeichertAm = 0, schmutzig = false;
  KR.merke = function () { schmutzig = true; };
  KR.speichern = function (erzwingen) {
    if (!S) return;
    var jetzt = Date.now();
    if (!erzwingen && !schmutzig) return;
    if (!erzwingen && jetzt - gespeichertAm < 1500) return;
    S.zuletzt = jetzt;
    try { localStorage.setItem(KEY, JSON.stringify(S)); gespeichertAm = jetzt; schmutzig = false; } catch (e) { /* voll oder gesperrt */ }
  };
  KR.zuruecksetzen = function () {
    try { localStorage.removeItem(KEY); } catch (e) { }
    S = neu(); KR.S = S; KR.emit('aenderung');
  };

  /* ---------- Höhlen ---------- */
  function hash01(n) {
    var t = (Math.imul(n | 0, 0x9E3779B1) + 0x6D2B79F5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  KR.hoehleSlot = function (slot) {
    var r = hash01(slot * 7919 + 13), id;
    if (r < 0.05) id = 'sturm';
    else if (r < 0.40) id = 'tief';
    else id = KR.HOEHLEN_FOLGE[Math.min(5, Math.floor((r - 0.40) / 0.60 * 6))];
    return { id: id, def: KR.HOEHLEN[id], slot: slot, start: slot * KR.SLOT_MS, ende: (slot + 1) * KR.SLOT_MS };
  };
  KR.hoehle = function (ms) { return KR.hoehleSlot(Math.floor((ms == null ? Date.now() : ms) / KR.SLOT_MS)); };
  KR.hoehlenFaktor = function () { return 4 + 0.8 * lvl('kompass'); };

  /* ---------- Verbesserungen ---------- */
  function lvl(id) { return (S && S.up[id]) || 0; }
  KR.lvl = lvl;
  KR.kosten = function (id) { var u = KR.UPI[id]; return Math.ceil(u.basis * Math.pow(u.f, lvl(id))); };
  KR.kannKaufen = function (id) {
    var u = KR.UPI[id], l = lvl(id);
    if (l >= u.max) return 'max';
    if (u.braucht && !lvl(u.braucht)) return 'gesperrt';
    return S.splitter >= KR.kosten(id) ? 'ja' : 'zuwenig';
  };
  KR.kaufen = function (id) {
    if (KR.kannKaufen(id) !== 'ja') return false;
    S.splitter -= KR.kosten(id);
    S.up[id] = lvl(id) + 1;
    if (id === 'auto') S.autoAn = true;
    KR.merke(); KR.speichern(true); KR.emit('aenderung');
    return true;
  };

  /* ---------- Glück ---------- */
  KR.sammelBonus = function () {
    var vollst = 0;
    for (var t = 0; t < KR.STUFEN.length; t++) {
      var ok = true;
      for (var i = 0; i < KR.KRISTALLE.length; i++) if (KR.KRISTALLE[i].t === t && !S.entdeckt[KR.KRISTALLE[i].id]) { ok = false; break; }
      if (ok) vollst++;
    }
    return vollst * 0.05; // +5 % je vollständiger Stufe
  };
  KR.stufeVollstaendig = function (t) {
    for (var i = 0; i < KR.KRISTALLE.length; i++) if (KR.KRISTALLE[i].t === t && !S.entdeckt[KR.KRISTALLE[i].id]) return false;
    return true;
  };
  KR.erfolgBonus = function () {
    var s = 0;
    KR.ERFOLGE.forEach(function (e) { if (S.erfolge[e.id]) s += e.bonus; });
    return s / 100;
  };
  KR.gluck = function () { return (1 + 0.10 * lvl('gluck')) * (1 + KR.sammelBonus()) * (1 + KR.erfolgBonus()); };
  KR.mutGluck = function () { return 1 + 0.08 * lvl('mut'); };
  KR.anzahlEntdeckt = function () { var n = 0; for (var k in S.entdeckt) if (S.entdeckt[k]) n++; return n; };
  KR.entdecktMut = function (id, mi) { return !!(S.entdeckt[id] & (1 << mi)); };

  /* ---------- Chancen ---------- */
  // Prüfung von selten nach häufig: jede Prüfung gelingt mit Glück / n (nur das häufigste Stück ist der Rest)
  KR.chancen = function (L, el, faktor) {
    var K = KR.KRISTALLE, c = new Array(K.length);
    for (var i = 0; i < K.length; i++) {
      var b = (el && K[i].el === el) ? faktor : 1;
      c[i] = i === 0 ? 1 : Math.min(0.98, L * b / K[i].n);
    }
    return c;
  };
  KR.wahrscheinlichkeiten = function (c) {
    var p = new Array(c.length), rest = 1;
    for (var i = c.length - 1; i >= 0; i--) { p[i] = rest * c[i]; rest *= (1 - c[i]); }
    return p;
  };
  KR.mutChancen = function (mL) {
    var M = KR.MUT, c = new Array(M.length);
    for (var i = 0; i < M.length; i++) c[i] = i === 0 ? 1 : Math.min(0.9, mL / M[i].n);
    return c;
  };
  var grundP = null;
  KR.grundP = function () { return grundP || (grundP = KR.wahrscheinlichkeiten(KR.chancen(1, null, 1))); };
  KR.zeigeOdds = function (i) {
    var x = Math.max(1, 1 / KR.grundP()[i]);
    if (x < 100) return Math.round(x);
    var f = Math.pow(10, Math.floor(Math.log10(x)) - 2); // drei gültige Stellen
    return Math.round(x / f) * f;
  };
  KR.zeigeMutOdds = function (m) { return KR.MUT[m].n; };
  KR.wertVon = function (ci, mi) { return KR.KRISTALLE[ci].wert * KR.MUT[mi].m; };

  function ziehe(c) {
    for (var i = c.length - 1; i > 0; i--) if (KR.rng() < c[i]) return i;
    return 0;
  }

  /* ---------- Schlag ---------- */
  KR.aktuelleChancen = function (jetzt) {
    var h = KR.hoehle(jetzt), f = KR.hoehlenFaktor();
    var cc = KR.chancen(KR.gluck(), h.def.el, f);
    var mL = KR.mutGluck() * (h.def.sturm ? f : 1);
    return { c: cc, m: KR.mutChancen(mL), hoehle: h };
  };
  KR.stufeText = function (ci) { return KR.STUFEN[KR.KRISTALLE[ci].t].name; };

  function eintragen(ci, mi, n) {
    var c = KR.KRISTALLE[ci], key = c.id + ':' + mi;
    S.inv[key] = (S.inv[key] || 0) + n;
    var vorher = S.entdeckt[c.id] || 0;
    var neuKristall = !vorher, neuMut = !(vorher & (1 << mi));
    S.entdeckt[c.id] = vorher | (1 << mi);
    S.mutGefunden[mi] += n;
    if (c.t > S.hoechsteStufe) S.hoechsteStufe = c.t;
    var w = KR.wertVon(ci, mi);
    if (!S.bestes || w > KR.wertVon(KR.KRI[S.bestes.id].i, S.bestes.mi)) S.bestes = { id: c.id, mi: mi };
    return { neuKristall: neuKristall, neuMut: neuMut };
  }
  KR.schlag = function (jetzt) {
    var ch = KR.aktuelleChancen(jetzt), k = 1 + lvl('doppel'), res = [];
    for (var j = 0; j < k; j++) {
      var ci = ziehe(ch.c), mi = ziehe(ch.m);
      var e = eintragen(ci, mi, 1);
      res.push({ ci: ci, mi: mi, wert: KR.wertVon(ci, mi), neuKristall: e.neuKristall, neuMut: e.neuMut });
    }
    S.schlaege++; S.funde += k;
    var best = res.reduce(function (a, b) { return (b.wert > a.wert) ? b : a; });
    var autoGrind = null;
    if (S.autoZermahlen && lvl('sortier')) autoGrind = KR.zermahleDoppelte(true, res.map(function (r) { return KR.KRISTALLE[r.ci].id + ':' + r.mi; }));
    var erf = KR.pruefeErfolge();
    KR.merke(); KR.speichern();
    return { alle: res, bester: best, hoehle: ch.hoehle, erfolge: erf, autoGrind: autoGrind };
  };

  /* ---------- Zermahlen ---------- */
  KR.ausbeute = function () { return 1 + 0.15 * lvl('muehle'); };
  KR.zermahlWert = function (key) {
    var p = key.split(':'), c = KR.KRI[p[0]];
    return Math.round(c.wert * KR.MUT[+p[1]].m * KR.ausbeute());
  };
  KR.zermahlen = function (key, anzahl) {
    var have = S.inv[key] || 0; anzahl = Math.min(anzahl, have);
    if (anzahl <= 0) return 0;
    var gewinn = KR.zermahlWert(key) * anzahl;
    S.inv[key] = have - anzahl; if (!S.inv[key]) delete S.inv[key];
    S.splitter += gewinn; S.gesamt += gewinn;
    KR.merke(); KR.speichern(); KR.emit('aenderung');
    return gewinn;
  };
  // Behält von jedem Stück eines. mitMut: auch mutierte Doppelte. nurKeys: nur diese Einträge. trocken: nur ausrechnen.
  KR.zermahleDoppelte = function (mitMut, nurKeys, trocken) {
    var anz = 0, gew = 0, keys = nurKeys || Object.keys(S.inv);
    keys.forEach(function (key) {
      var n = S.inv[key] || 0; if (n < 2) return;
      if (!mitMut && +key.split(':')[1] > 0) return;
      anz += n - 1; gew += KR.zermahlWert(key) * (n - 1);
      if (!trocken) S.inv[key] = 1;
    });
    if (!trocken && anz) { S.splitter += gew; S.gesamt += gew; KR.merke(); KR.speichern(); KR.emit('aenderung'); }
    return { anzahl: anz, splitter: gew };
  };

  /* ---------- Erfolge ---------- */
  KR.pruefeErfolge = function () {
    var neue = [];
    KR.ERFOLGE.forEach(function (e) {
      if (!S.erfolge[e.id] && e.test(S)) { S.erfolge[e.id] = Date.now(); neue.push(e); }
    });
    return neue;
  };

  /* ---------- Offline-Fortschritt ---------- */
  function gauss() { var u = 0, v = 0; while (!u) u = KR.rng(); v = KR.rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function binom(n, p) {
    if (n <= 0 || p <= 0) return 0;
    if (p >= 1) return n;
    if (n < 40) { var s = 0; for (var i = 0; i < n; i++) if (KR.rng() < p) s++; return s; }
    var mean = n * p;
    if (mean < 25) { // Poisson (Knuth)
      var L = Math.exp(-mean), k = 0, q = 1;
      do { k++; q *= KR.rng(); } while (q > L && k < 400);
      return Math.min(n, k - 1);
    }
    var v = Math.round(mean + Math.sqrt(mean * (1 - p)) * gauss());
    return Math.max(0, Math.min(n, v));
  }
  KR.offlineRate = function () { // Würfe pro Sekunde bei geschlossenem Spiel
    var l = lvl('nacht'), eff = Math.min(0.95, 0.20 + 0.05 * l);
    var takt = Math.max(KR.aufbruchZeit(lvl('tempo')), KR.autoTakt(lvl('takt'))) + 0.35;
    return { eff: eff, proSek: eff * (1 + lvl('doppel')) / takt, deckelSek: (2 + 0.5 * l) * 3600, strProSek: eff / takt };
  };
  KR.offlineBerechnen = function (jetzt) {
    if (!lvl('auto') || !S.autoAn) return null;
    var vergangen = (jetzt - S.zuletzt) / 1000;
    if (!(vergangen >= 90)) return null;
    var r = KR.offlineRate(), sek = Math.min(vergangen, r.deckelSek);
    var N = Math.floor(sek * r.proSek);
    if (N < 1) return null;
    var cp = KR.wahrscheinlichkeiten(KR.chancen(KR.gluck(), null, 1));
    var mp = KR.wahrscheinlichkeiten(KR.mutChancen(KR.mutGluck()));
    var cells = [], i, m;
    for (i = 0; i < cp.length; i++) for (m = 0; m < mp.length; m++) { var q = cp[i] * mp[m]; if (q > 0) cells.push([i, m, q]); }
    cells.sort(function (a, b) { return a[2] - b[2]; });
    var suf = new Array(cells.length + 1); suf[cells.length] = 0;
    for (var s2 = cells.length - 1; s2 >= 0; s2--) suf[s2] = suf[s2 + 1] + cells[s2][2]; // Restmasse ohne Auslöschung
    var rest = N, gefunden = [], neuEntdeckt = 0;
    for (var j = 0; j < cells.length && rest > 0; j++) { // von selten nach häufig, der häufigste nimmt den Rest
      var c = cells[j];
      var n = j === cells.length - 1 ? rest : binom(rest, Math.min(1, c[2] / suf[j]));
      rest -= n;
      if (n > 0) {
        var e = eintragen(c[0], c[1], n);
        if (e.neuKristall) neuEntdeckt++;
        gefunden.push({ ci: c[0], mi: c[1], n: n, wert: KR.wertVon(c[0], c[1]) });
      }
    }
    var k = 1 + lvl('doppel');
    S.funde += N; S.schlaege += Math.round(N / k);
    var keys = gefunden.map(function (g) { return KR.KRISTALLE[g.ci].id + ':' + g.mi; });
    var grind = null;
    if (S.autoZermahlen && lvl('sortier')) grind = KR.zermahleDoppelte(true, keys);
    gefunden.sort(function (a, b) { return b.wert - a.wert; });
    var erf = KR.pruefeErfolge();
    S.zuletzt = jetzt;
    KR.merke(); KR.speichern(true);
    return { dauer: sek, anzahl: N, eff: r.eff, beste: gefunden.slice(0, 5), neuEntdeckt: neuEntdeckt, grind: grind, erfolge: erf, gekappt: vergangen > r.deckelSek };
  };

  KR.start = function () { KR.laden(); };
})();
