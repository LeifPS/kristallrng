/* Kristall RNG: Oberfläche (Kopfzeile, Höhlenband, Schürf-Bühne, Effekte, Hinweise, Dialoge) */
'use strict';
(function () {
  var KR = window.KR, T = KR.ton;
  var UI = KR.UI = {};
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  UI.$ = $; UI.$$ = $$;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  UI.esc = esc;
  var S;

  /* ---------- Symbole der Navigation ---------- */
  var NAV = [
    ['schuerfen', 'Schürfen', '<path d="M12 3 L19 10 L12 21 L5 10 Z"/><path d="M5 10 H19 M9 10 L12 3 L15 10 M9 10 L12 21 L15 10"/>'],
    ['sammlung', 'Sammlung', '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>'],
    ['rucksack', 'Rucksack', '<path d="M7 9a5 5 0 0 1 10 0v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z"/><path d="M9.5 4.5V3.5h5v1M8 14h8M10 17.5h4"/>'],
    ['werkstatt', 'Werkstatt', '<path d="M14.5 6.5a4 4 0 0 0-5.4 5.2L3.5 17.3a1.6 1.6 0 0 0 2.2 2.2l5.6-5.6a4 4 0 0 0 5.2-5.4l-2.4 2.4-2.1-.6-.6-2.1z"/>'],
    ['erfolge', 'Erfolge', '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8.5 20h7M10 17h4"/>']
  ];
  UI.NAV = NAV;

  /* ---------- Hinweise ---------- */
  var toastT = null;
  UI.toast = function (text, farbe, ms) {
    var t = $('#toast');
    t.textContent = text; t.style.setProperty('--tf', farbe || 'rgba(255,255,255,.14)');
    t.classList.add('an');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('an'); }, ms || 2600);
  };
  UI.sage = function (text) { var s = $('#sr'); if (s) s.textContent = text; };

  /* ---------- Dialoge ---------- */
  var dlgListe = [];
  UI.dialog = function (html, opt) {
    opt = opt || {};
    var d = document.createElement('div');
    d.className = 'dlg' + (opt.breit ? ' breit' : '');
    d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
    d.innerHTML = '<div class="karte">' + (opt.ohneX ? '' : '<button class="zu" type="button" aria-label="Schließen">×</button>') + html + '</div>';
    function zu() { if (d.parentNode) d.parentNode.removeChild(d); var i = dlgListe.indexOf(d); if (i >= 0) dlgListe.splice(i, 1); if (opt.zu) opt.zu(); }
    d.addEventListener('click', function (e) { if (e.target === d && !opt.fest) zu(); });
    var x = $('.zu', d); if (x) x.addEventListener('click', function () { T.klick(); zu(); });
    document.getElementById('app').appendChild(d); dlgListe.push(d);
    d.schliessen = zu;
    var f = $('button:not(.zu)', d); if (f && opt.fokus !== false) { try { f.focus({ preventScroll: true }); } catch (e) { } }
    return d;
  };
  UI.dialogOffen = function () { return dlgListe.length > 0; };
  UI.alleZu = function () { dlgListe.slice().forEach(function (d) { d.schliessen(); }); };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dlgListe.length) { dlgListe[dlgListe.length - 1].schliessen(); }
  });

  /* ---------- Hintergrund der Höhle ---------- */
  var bgAn = 0, bgId = null;
  UI.setzeHoehle = function (h) {
    var def = h.def;
    if (bgId === h.id) return;
    bgId = h.id;
    var neu = $(bgAn ? '#bgA' : '#bgB'), alt = $(bgAn ? '#bgB' : '#bgA');
    neu.style.background = 'linear-gradient(180deg,' + def.bg[0] + ',' + def.bg[1] + ')';
    neu.style.setProperty('--akz', def.akzent);
    neu.classList.add('an'); alt.classList.remove('an');
    bgAn = 1 - bgAn;
    document.documentElement.style.setProperty('--akz', def.akzent);
  };

  /* ---------- Kopfzeile und Band ---------- */
  UI.kopf = function () {
    S = KR.S;
    $('#p-splitter').innerHTML = KR.svgSplitter('#8fe3ff') + '<span>' + KR.fmt(S.splitter) + '</span>';
    var g = KR.gluck();
    $('#p-gluck').innerHTML = '<small>Glück</small><span>×' + g.toFixed(g >= 10 ? 1 : 2).replace('.', ',') + '</span>';
  };
  var bandKey = '';
  UI.band = function () {
    var jetzt = Date.now(), h = KR.hoehle(jetzt), rest = Math.max(0, Math.ceil((h.ende - jetzt) / 1000));
    var mm = Math.floor(rest / 60), ss = rest % 60, zeit = mm + ':' + (ss < 10 ? '0' : '') + ss;
    UI.setzeHoehle(h);
    var f = KR.hoehlenFaktor(), bonus;
    if (h.def.sturm) bonus = 'Mutationen ×' + String(f).replace('.', ',');
    else if (h.def.el) bonus = KR.ELEMENTE[h.def.el].name + '-Kristalle ×' + String(f).replace('.', ',');
    else bonus = 'kein Bonus';
    var key = h.id + '|' + zeit + '|' + bonus;
    if (key === bandKey) return h;
    bandKey = key;
    $('#band').innerHTML = '<span class="punkt"></span><b>' + esc(h.def.name) + '</b><span class="zeit">' + zeit + '</span><span class="bonus">· ' + esc(bonus) + '</span>';
    return h;
  };
  UI.letzteHoehle = null;
  UI.hoehlenTick = function () {
    var h = UI.band();
    if (UI.letzteHoehle && UI.letzteHoehle !== h.id) {
      if (h.id !== 'tief') { UI.toast(h.def.name + ': ' + h.def.text, h.def.akzent, 3400); T.hoehle(); }
    }
    UI.letzteHoehle = h.id;
  };

  /* ---------- Partikel ---------- */
  var fx, g2, P = [], fxLauf = false, fxT = 0;
  function fxGroesse() {
    var d = Math.min(2, window.devicePixelRatio || 1);
    fx.width = Math.round(window.innerWidth * d); fx.height = Math.round(window.innerHeight * d);
    g2.setTransform(d, 0, 0, d, 0, 0);
  }
  UI.effekteStark = function () { return KR.S.einst.effekte !== 'wenig'; };
  UI.burst = function (x, y, farben, n, kraft) {
    if (!fx) return;
    if (!UI.effekteStark()) n = Math.ceil(n * 0.3);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, v = (50 + Math.random() * kraft) * (0.4 + Math.random() * 0.9), stern = Math.random() < 0.55;
      P.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 50, r: stern ? 3 + Math.random() * 6 : 2 + Math.random() * 4.5, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 9,
               t: 0, max: 0.7 + Math.random() * 1.1, f: farben[(Math.random() * farben.length) | 0], stern: stern });
    }
    if (!fxLauf) { fxLauf = true; fxT = performance.now(); requestAnimationFrame(fxSchritt); }
  };
  function fxSchritt(jetzt) {
    var dt = Math.min(0.05, (jetzt - fxT) / 1000); fxT = jetzt;
    g2.clearRect(0, 0, window.innerWidth, window.innerHeight);
    var i, p;
    for (i = P.length - 1; i >= 0; i--) {
      p = P[i]; p.t += dt;
      if (p.t >= p.max) { P.splice(i, 1); continue; }
      p.vy += (p.stern ? 70 : 340) * dt; p.vx *= (1 - 0.9 * dt); p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      var k = 1 - p.t / p.max;
      g2.save(); g2.translate(p.x, p.y); g2.rotate(p.rot); g2.globalAlpha = Math.min(1, k * 1.6); g2.fillStyle = p.f;
      g2.beginPath();
      if (p.stern) { var r = p.r * (0.5 + k * 0.7); g2.moveTo(0, -r); g2.quadraticCurveTo(0, 0, r, 0); g2.quadraticCurveTo(0, 0, 0, r); g2.quadraticCurveTo(0, 0, -r, 0); g2.quadraticCurveTo(0, 0, 0, -r); }
      else { var s = p.r; g2.moveTo(0, -s); g2.lineTo(s * 0.7, s * 0.8); g2.lineTo(-s * 0.7, s * 0.5); }
      g2.closePath(); g2.fill(); g2.restore();
    }
    if (P.length) requestAnimationFrame(fxSchritt); else { fxLauf = false; g2.clearRect(0, 0, window.innerWidth, window.innerHeight); }
  }

  /* ---------- Bühne ---------- */
  var B = {}; // Elemente der Bühne
  var busy = false, skip = false, wartT = null, wartR = null, autoT = null, letzterStart = 0, verlauf = [], erstesMal = true;
  UI.busy = function () { return busy; };

  UI.baueBuehne = function () {
    var v = $('#v-schuerfen');
    v.innerHTML =
      '<div class="buehne" id="buehne">' +
      '<div class="stein-bereich"><div class="stein ruhe" id="stein"><div class="aura" id="aura"></div><div class="welle" id="welle"></div><div id="stein-svg" style="display:contents"></div></div></div>' +
      '<div class="unten"><div class="info" id="info"></div>' +
      '<div class="aktion"><button class="gross" id="b-schuerfen" type="button">Schürfen</button>' +
      '<div class="reihe"><button class="klein" id="b-auto" type="button" aria-pressed="false" hidden>Automatik: Aus</button></div></div>' +
      '<div id="verlauf" aria-label="Letzte Funde"></div></div></div>';
    B.buehne = $('#buehne'); B.stein = $('#stein'); B.svg = $('#stein-svg'); B.aura = $('#aura'); B.welle = $('#welle'); B.info = $('#info');
    B.knopf = $('#b-schuerfen'); B.auto = $('#b-auto'); B.verlauf = $('#verlauf');
    B.svg.innerHTML = KR.svgGeode('#cfd8ea');
    UI.infoLeer();
    B.knopf.addEventListener('click', function () { T.start(); UI.schuerfen(); });
    B.auto.addEventListener('click', function () {
      T.start(); T.klick();
      S.autoAn = !S.autoAn; KR.merke(); KR.speichern(true); UI.autoKnopf(); UI.planeAuto();
    });
    UI.autoKnopf();
  };
  UI.autoKnopf = function () {
    S = KR.S;
    var da = KR.lvl('auto') > 0;
    B.auto.hidden = !da;
    B.auto.setAttribute('aria-pressed', S.autoAn ? 'true' : 'false');
    B.auto.textContent = 'Automatik: ' + (S.autoAn ? 'An' : 'Aus');
  };
  UI.infoLeer = function () {
    B.info.innerHTML = '<div class="tipp">Tippe auf Schürfen, um einen Stein aufzubrechen.</div>';
  };
  function mutFarbe(mi) { return KR.MUT[mi].farbe; }
  function setzeInfo(b, c, sf) {
    var m = KR.MUT[b.mi], w = KR.wertVon(b.ci, b.mi);
    B.info.style.setProperty('--sf', sf.farbe); B.info.style.setProperty('--mc', m.farbe);
    B.info.innerHTML =
      '<div class="stufe">' + esc(sf.name) + '</div>' +
      '<h2>' + esc(c.name) + (b.neuKristall ? '<span class="neu">NEU</span>' : '') + '</h2>' +
      (b.mi ? '<div class="mut">' + esc(m.name) + ' · ×' + m.m + (b.neuMut && !b.neuKristall ? '<span class="neu">NEU</span>' : '') + '</div>' : '') +
      '<div class="meta">' + KR.fmtOdds(KR.zeigeOdds(c.i)) + (b.mi ? ' · Mutation ' + KR.fmtOdds(m.n) : '') + ' · Wert ' + KR.fmt(w) + '</div>';
    UI.sage(c.name + ', ' + sf.name + (b.mi ? ', ' + m.name : ''));
  }
  function zeichneVerlauf() {
    B.verlauf.innerHTML = verlauf.slice(0, 10).map(function (r) {
      var c = KR.KRISTALLE[r.ci];
      return '<div class="v" style="--vf:' + KR.STUFEN[c.t].farbe + '" title="' + esc(c.name) + '">' + KR.svgKristall(c, r.mi, { funkeln: false }) + (r.mi ? '<i style="color:' + mutFarbe(r.mi) + '">' + esc(KR.MUT[r.mi].name.charAt(0)) + '</i>' : '') + '</div>';
    }).join('');
  }
  function warte(ms) {
    if (skip) return Promise.resolve();
    return new Promise(function (res) { wartR = res; wartT = setTimeout(function () { wartR = null; res(); }, ms); });
  }
  function ueberspringen() { skip = true; if (wartR) { clearTimeout(wartT); var r = wartR; wartR = null; r(); } }

  function steinPos() {
    var r = B.stein.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
  }

  UI.schuerfen = function (aut) {
    if (busy) { if (!aut) ueberspringen(); return Promise.resolve(); }
    S = KR.S; busy = true; skip = false; letzterStart = Date.now();
    B.knopf.setAttribute('aria-busy', 'true');
    var res = KR.schlag(letzterStart), b = res.bester, c = KR.KRISTALLE[b.ci], t = c.t, sf = KR.STUFEN[t];
    var tempo = KR.lvl('tempo'), dauer = KR.aufbruchZeit(tempo) * 1000;
    var wow = Math.max(t, b.mi + 1), wf = KR.STUFEN[Math.min(7, wow)];
    var extra = wf.extra * 1000 + (res.alle.length > 1 ? 150 : 0);
    var sichtbar = UI.ansicht() === 'schuerfen' && !document.hidden;
    var vorher = res.alle.slice().sort(function (a, b2) { return b2.wert - a.wert; });
    verlauf = vorher.concat(verlauf).slice(0, 12);
    UI.kopf();
    return (async function () {
      try {
        if (sichtbar) {
          var p1 = Math.max(120, dauer * 0.55 + extra * 0.85);
          erstesMal = false;
          B.info.innerHTML = '<div class="tipp">…</div>';
          B.svg.innerHTML = KR.svgGeode(t >= 2 ? sf.farbe : '#cfd8ea');
          B.stein.className = 'stein zittern'; B.stein.style.setProperty('--rz', (p1 / 1000).toFixed(2) + 's'); B.stein.style.setProperty('--tg', 0);
          var hint = t >= 3 ? sf.farbe : (b.mi >= 3 ? mutFarbe(b.mi) : null);
          B.aura.style.setProperty('--aura', hint || '#fff'); B.aura.classList.toggle('an', !!hint); B.aura.classList.remove('puls');
          T.schlag(); vib(10);
          await warte(p1);
          T.riss(wow);
          await warte(wow >= 4 ? 260 : 110);
          offenbare(b, c, t, sf, wow, res);
          await warte(Math.max(80, dauer * 0.42));
          B.stein.className = 'stein schweben';
        } else {
          // Ohne sichtbare Bühne: nur kurz warten und, wenn es sich lohnt, eine Meldung zeigen
          await new Promise(function (r) { setTimeout(r, Math.max(80, dauer * 0.5)); });
          if (wow >= 3) { UI.toast(c.name + (b.mi ? ' (' + KR.MUT[b.mi].name + ')' : '') + ' gefunden!', wow > t ? mutFarbe(b.mi) : sf.farbe, 2600); T.aufdecken(Math.min(wow, 3), b.mi); }
          verlauf = verlauf.slice(0, 12);
        }
        zeichneVerlauf();
        nachFund(res, b, c);
      } finally {
        busy = false; B.knopf.removeAttribute('aria-busy');
        UI.planeAuto();
      }
    })();
  };
  function vib(x) { try { if (navigator.vibrate && UI.effekteStark()) navigator.vibrate(x); } catch (e) { } }

  function offenbare(b, c, t, sf, wow, res) {
    var farbe = (b.mi + 1 > t && b.mi >= 3) ? mutFarbe(b.mi) : sf.farbe;
    var pos = steinPos();
    B.svg.innerHTML = KR.svgKristall(c, b.mi, { glow: false });
    B.stein.style.setProperty('--tg', Math.min(7, wow));
    B.stein.className = 'stein pop';
    B.aura.style.setProperty('--aura', farbe); B.aura.classList.add('an'); B.aura.classList.toggle('puls', wow >= 3);
    B.welle.style.setProperty('--aura', farbe); B.welle.classList.remove('los'); void B.welle.offsetWidth; B.welle.classList.add('los');
    T.aufdecken(Math.min(7, wow), b.mi);
    var n = KR.STUFEN[Math.min(7, wow)].fx, farben = [farbe, '#ffffff', b.mi ? mutFarbe(b.mi) : farbe, sf.farbe];
    UI.burst(pos.x, pos.y, farben, n, 220 + wow * 60);
    if (wow >= 4 && UI.effekteStark()) {
      var bl = $('#blitz'); bl.style.setProperty('--aura', farbe); bl.classList.remove('los'); void bl.offsetWidth; bl.classList.add('los');
    }
    if (wow >= 4) {
      var an = $('#ansage'); an.style.setProperty('--aura', farbe);
      an.textContent = (b.mi >= 3 && b.mi + 1 > t) ? KR.MUT[b.mi].name + '!' : sf.name + '!';
      an.classList.remove('los'); void an.offsetWidth; an.classList.add('los');
    }
    if (wow >= 5 && UI.effekteStark()) { B.buehne.classList.remove('beben'); void B.buehne.offsetWidth; B.buehne.classList.add('beben'); vib([40, 40, 90]); }
    else if (wow >= 3) vib(25);
    setzeInfo(b, c, sf);
    if (wow >= 6) setTimeout(function () { UI.burst(pos.x, pos.y, farben, Math.round(n * 0.6), 340); }, 320);
  }

  function nachFund(res, b, c) {
    if (res.erfolge && res.erfolge.length) {
      var e = res.erfolge[0];
      setTimeout(function () { UI.toast('Erfolg: ' + e.name + ' (+' + e.bonus + ' % Glück)', '#ffd24a', 3200); T.erfolg(); UI.punkt('erfolge', true); }, UI.ansicht() === 'schuerfen' ? 900 : 0);
      KR.emit('aenderung');
    }
    if (res.alle.some(function (r) { return r.neuKristall || r.neuMut; })) UI.punkt('sammlung', true);
    if (UI.ansichtAktiv && UI.ansichtAktiv() !== 'schuerfen') KR.emit('aenderung');
  }

  /* ---------- Automatik ---------- */
  UI.planeAuto = function () {
    clearTimeout(autoT);
    S = KR.S;
    if (!S.autoAn || !KR.lvl('auto')) return;
    var takt = KR.autoTakt(KR.lvl('takt')) * 1000;
    var warteZeit = Math.max(60, letzterStart + takt - Date.now());
    autoT = setTimeout(function () {
      if (document.hidden || UI.dialogOffen()) { UI.planeAuto(); return; }
      if (busy) { autoT = setTimeout(UI.planeAuto, 150); return; }
      UI.schuerfen(true);
    }, warteZeit);
  };

  /* ---------- Punkte an der Navigation ---------- */
  var punkte = {};
  UI.punkt = function (v, an) {
    if (UI.ansicht() === v) return;
    punkte[v] = an; var b = $('#nav button[data-v="' + v + '"]'); if (!b) return;
    var p = $('.punkt', b);
    if (an && !p) { p = document.createElement('span'); p.className = 'punkt'; b.appendChild(p); }
    if (!an && p) p.remove();
  };

  /* ---------- Start des Zeichenbereichs ---------- */
  UI.initFx = function () {
    fx = $('#fx'); g2 = fx.getContext('2d'); fxGroesse();
    window.addEventListener('resize', fxGroesse);
  };
  UI.ersteMal = function () { return erstesMal; };
  UI.verlaufLeeren = function () { verlauf = []; };
  UI.zeigeLetzteBuehne = function (b, c) { // beim Zurückkehren zur Bühne
    if (!b) return;
    var sf = KR.STUFEN[c.t];
    B.svg.innerHTML = KR.svgKristall(c, b.mi, {});
    B.stein.style.setProperty('--tg', Math.min(7, Math.max(c.t, b.mi + 1)));
    B.stein.className = 'stein schweben';
    setzeInfo(b, c, sf);
  };
  UI.zeichneVerlauf = zeichneVerlauf;
})();
