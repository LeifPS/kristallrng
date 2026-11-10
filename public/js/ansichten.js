/* Kristall RNG: Ansichten (Sammlung, Rucksack, Werkstatt, Erfolge), Dialoge, Start */
'use strict';
(function () {
  var KR = window.KR, UI = KR.UI, T = KR.ton, $ = UI.$, $$ = UI.$$, esc = UI.esc, S;
  var aktuell = 'schuerfen', seitenIdx = {};
  UI.ansicht = function () { return aktuell; };
  UI.ansichtAktiv = UI.ansicht;

  /* ---------- Seiten statt Scrollen ---------- */
  function seite(host, o) {
    if (host._ro) { host._ro.disconnect(); host._ro = null; }
    host.innerHTML = '<div class="kz">' + o.kopf + '</div><div class="seite"><div class="seite-inhalt"></div>' +
      '<div class="seite-fuss"><button type="button" data-d="-1" aria-label="Vorherige Seite">‹</button><span></span><button type="button" data-d="1" aria-label="Nächste Seite">›</button></div></div>';
    var inh = $('.seite-inhalt', host), fuss = $('.seite-fuss', host), lab = $('span', fuss), bt = $$('button', fuss), key = o.key, gap = o.gap || 6;
    function fill() {
      var n = o.items.length, per, cols = 1, zh = 0, kompakt = false;
      function mess() {
        var w = inh.clientWidth, hh = inh.clientHeight, rows;
        if (!w || !hh) return 1;
        if (o.modus === 'raster') {
          cols = Math.max(2, Math.floor((w + gap) / (o.minB + gap)));
          var cw = (w - gap * (cols - 1)) / cols; zh = o.zH(cw);
          rows = Math.max(1, Math.floor((hh + gap) / (zh + gap)));
          zh = Math.min(zh * 1.3, (hh + gap) / rows - gap);
          return cols * rows;
        }
        cols = (o.zweispaltig && w >= 620) ? 2 : 1;
        kompakt = !!o.rHk && hh < 250; zh = kompakt ? o.rHk : o.rH;
        rows = Math.max(1, Math.floor((hh + gap) / (zh + gap)));
        zh = Math.min(zh * 1.25, (hh + gap) / rows - gap);
        return cols * rows;
      }
      fuss.hidden = true; per = mess();
      if (n > per) { fuss.hidden = false; per = mess(); }
      var seiten = Math.max(1, Math.ceil(n / per)), idx = Math.min(seitenIdx[key] || 0, seiten - 1);
      seitenIdx[key] = idx;
      var st = 'gap:' + gap + 'px;grid-auto-rows:' + Math.floor(zh) + 'px;grid-template-columns:repeat(' + cols + ',minmax(0,1fr));';
      inh.innerHTML = n ? '<div class="' + (o.modus === 'raster' ? 'raster' : 'liste' + (kompakt ? ' kompakt' : '')) + '" style="' + st + '">' + o.items.slice(idx * per, (idx + 1) * per).map(o.zeile).join('') + '</div>' : '<div class="leer">' + (o.leer || '') + '</div>';
      lab.textContent = (idx + 1) + ' / ' + seiten; bt[0].disabled = idx === 0; bt[1].disabled = idx >= seiten - 1;
      if (o.nachher) o.nachher(inh);
    }
    function geh(d) { seitenIdx[key] = Math.max(0, (seitenIdx[key] || 0) + d); T.klick(); fill(); }
    bt[0].addEventListener('click', function () { geh(-1); });
    bt[1].addEventListener('click', function () { geh(1); });
    var x0 = null, y0 = 0;
    inh.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    inh.addEventListener('touchend', function (e) {
      if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.6) { var i = seitenIdx[key] || 0; if (dx < 0 && !bt[1].disabled) geh(1); else if (dx > 0 && !bt[0].disabled) geh(-1); }
    }, { passive: true });
    var geplant = false;
    host._ro = new ResizeObserver(function () { if (geplant) return; geplant = true; requestAnimationFrame(function () { geplant = false; fill(); }); });
    host._ro.observe(inh);
    fill();
  }

  /* ---------- Hilfen ---------- */
  function mutName(mi) { return KR.MUT[mi].name; }
  function bitsAnz(x) { var n = 0; for (var i = 0; i < 7; i++) if (x & (1 << i)) n++; return n; }
  function zeigeLeer() { return ''; }

  /* ---------- Sammlung ---------- */
  function sammlung() {
    var host = $('#v-sammlung'), n = KR.anzahlEntdeckt(), bonus = Math.round(KR.sammelBonus() * 100);
    seite(host, {
      key: 'sammlung', modus: 'raster', minB: 70, gap: 6, zH: function (w) { return Math.round(w + 16); },
      kopf: '<span>Entdeckt <b>' + n + ' / ' + KR.KRISTALLE.length + '</b></span><span class="akz">Sammelbonus +' + bonus + ' % Glück</span>',
      items: KR.KRISTALLE.map(function (c) { return c.i; }),
      zeile: function (ci) {
        var c = KR.KRISTALLE[ci], ent = S.entdeckt[c.id] || 0, k = bitsAnz(ent);
        return '<button type="button" class="zelle ' + (ent ? '' : 'fremd') + '" data-ci="' + ci + '" style="--zf:' + (ent ? KR.STUFEN[c.t].farbe : 'var(--rand)') + '" aria-label="' + esc(ent ? c.name : 'Noch nicht entdeckt') + '">' +
          KR.svgKristall(c, 0, { funkeln: false }) + (ent ? '' : '<span class="fz">?</span>') + (k > 1 ? '<span class="pkt">' + k + '/7</span>' : '') +
          '<span class="n">' + esc(ent ? c.name : '???') + '</span></button>';
      },
      nachher: function (inh) { $$('.zelle', inh).forEach(function (b) { b.addEventListener('click', function () { T.klick(); zeigeDetail(+b.dataset.ci, 0); }); }); }
    });
  }

  function zeigeDetail(ci, mi0) {
    var c = KR.KRISTALLE[ci], sf = KR.STUFEN[c.t], ent = S.entdeckt[c.id] || 0, mi = mi0 || 0;
    var reihe = KR.MUT.map(function (m, i) {
      var hat = !!(ent & (1 << i));
      return '<button type="button" data-m="' + i + '" class="' + (hat ? '' : 'fremd') + '" style="--mc:' + m.farbe + '" aria-pressed="' + (i === mi ? 'true' : 'false') + '" aria-label="' + esc(m.name) + '">' +
        KR.svgKristall(c, i, { funkeln: false }) + (hat ? '<i>★</i>' : '') + '<span>' + esc(m.name) + '</span></button>';
    }).join('');
    var d = UI.dialog(
      '<div class="detail"><div class="gr" id="d-gr"></div><div>' +
      '<div class="kopfd" style="--sf:' + sf.farbe + '"><div class="stufe">' + esc(ent ? sf.name : 'Unbekannt') + '</div><h3>' + esc(ent ? c.name : '???') + '</h3>' +
      '<div class="daten"><span class="chip">' + KR.fmtOdds(KR.zeigeOdds(c.i)) + '</span><span class="chip">Wert ' + KR.fmt(c.wert) + '</span><span class="chip">' + esc(KR.ELEMENTE[c.el].name) + '</span></div></div>' +
      '<p class="lore">' + esc(ent ? c.text : 'Brich weiter Steine auf, um diesen Kristall zu entdecken.') + '</p>' +
      '<div class="mutreihe" id="d-mut">' + reihe + '</div><p class="stand" id="d-stand"></p></div></div>', { breit: true, fokus: false });
    function wahl(i) {
      mi = i; var hat = !!(ent & (1 << i)), gr = $('#d-gr', d), m = KR.MUT[i], key = c.id + ':' + i, n = S.inv[key] || 0;
      gr.className = 'gr' + (hat ? '' : ' fremd'); gr.innerHTML = KR.svgKristall(c, i, {});
      $$('#d-mut button', d).forEach(function (b) { b.setAttribute('aria-pressed', +b.dataset.m === i ? 'true' : 'false'); });
      $('#d-stand', d).innerHTML = hat
        ? '<b style="color:' + m.farbe + '">' + esc(m.name) + '</b> · im Rucksack: ' + n + ' · Wert pro Stück ' + KR.fmt(KR.wertVon(ci, i))
        : (i === 0 ? 'Noch nicht gefunden.' : '<b style="color:' + m.farbe + '">' + esc(m.name) + '</b> noch nicht gefunden · Mutation ' + KR.fmtOdds(m.n) + ', Wert ×' + m.m);
    }
    $$('#d-mut button', d).forEach(function (b) { b.addEventListener('click', function () { T.klick(); wahl(+b.dataset.m); }); });
    wahl(mi);
  }

  /* ---------- Rucksack ---------- */
  function rucksack() {
    var host = $('#v-rucksack'), keys = Object.keys(S.inv).filter(function (k) { return S.inv[k] > 0; });
    keys.sort(function (a, b) { return KR.zermahlWert(b) - KR.zermahlWert(a); });
    var gesamt = 0; keys.forEach(function (k) { gesamt += S.inv[k]; });
    var auto = KR.lvl('sortier') > 0;
    var kopf = '<span><b>' + KR.fmt(gesamt) + '</b> Steine · ' + keys.length + ' Arten</span><span class="reihe">' +
      '<button type="button" class="klein" id="r-dopp">Doppelte zermahlen</button>' +
      (auto ? '<button type="button" class="klein" id="r-auto" aria-pressed="' + (S.autoZermahlen ? 'true' : 'false') + '">Auto-Zermahlen: ' + (S.autoZermahlen ? 'An' : 'Aus') + '</button>' : '') + '</span>';
    seite(host, {
      key: 'rucksack', modus: 'liste', rH: 58, rHk: 50, zweispaltig: true, gap: 6, kopf: kopf, items: keys,
      leer: 'Dein Rucksack ist leer.<br>Brich Steine auf, sie landen hier.',
      zeile: function (k) {
        var p = k.split(':'), c = KR.KRI[p[0]], mi = +p[1], m = KR.MUT[mi];
        return '<button type="button" class="zeile" data-k="' + k + '" style="--zf:' + KR.STUFEN[c.t].farbe + '"><div class="bild">' + KR.svgKristall(c, mi, { funkeln: false }) + '</div>' +
          '<div class="mitte"><div class="t1">' + esc(c.name) + (mi ? ' <span style="color:' + m.farbe + '">· ' + esc(m.name) + '</span>' : '') + '</div><div class="t2">' + esc(KR.STUFEN[c.t].name) + ' · ' + KR.fmtOdds(KR.zeigeOdds(c.i)) + '</div></div>' +
          '<div class="rechts">×' + KR.fmt(S.inv[k]) + '<small>' + KR.fmt(KR.zermahlWert(k)) + ' Splitter</small></div></button>';
      },
      nachher: function (inh) { $$('.zeile', inh).forEach(function (b) { b.addEventListener('click', function () { T.klick(); itemDialog(b.dataset.k); }); }); }
    });
    var bd = $('#r-dopp', host); if (bd) bd.addEventListener('click', function () { T.klick(); doppelDialog(); });
    var ba = $('#r-auto', host); if (ba) ba.addEventListener('click', function () { T.klick(); S.autoZermahlen = !S.autoZermahlen; KR.merke(); KR.speichern(true); rucksack(); });
  }
  function doppelDialog() {
    var a = KR.zermahleDoppelte(false, null, true), b = KR.zermahleDoppelte(true, null, true);
    var d = UI.dialog('<h3>Doppelte zermahlen</h3><p>Von jedem Stein bleibt einer im Rucksack. Der Rest wird zu Splitter.</p>' +
      '<div class="knoepfe"><button type="button" class="klein haupt" id="z-a"' + (a.anzahl ? '' : ' disabled') + '>Normale zermahlen<br><small>' + KR.fmt(a.anzahl) + ' Steine → ' + KR.fmt(a.splitter) + ' Splitter</small></button>' +
      '<button type="button" class="klein" id="z-b"' + (b.anzahl ? '' : ' disabled') + '>Alle inkl. Mutationen<br><small>' + KR.fmt(b.anzahl) + ' Steine → ' + KR.fmt(b.splitter) + ' Splitter</small></button></div>');
    function los(mit) { var r = KR.zermahleDoppelte(mit); if (r.anzahl) { T.mahlen(); UI.toast('+' + KR.fmt(r.splitter) + ' Splitter', '#8fe3ff'); } d.schliessen(); UI.kopf(); }
    $('#z-a', d).addEventListener('click', function () { los(false); });
    $('#z-b', d).addEventListener('click', function () { los(true); });
  }
  function itemDialog(k) {
    var p = k.split(':'), c = KR.KRI[p[0]], mi = +p[1], m = KR.MUT[mi], n = S.inv[k] || 0;
    if (!n) return;
    var w = KR.zermahlWert(k), sicher = (c.t >= 4 || mi >= 3), bestaetigt = !sicher;
    var d = UI.dialog('<div class="detail"><div class="gr" style="--sf:' + KR.STUFEN[c.t].farbe + '">' + KR.svgKristall(c, mi, {}) + '</div><div>' +
      '<div class="kopfd" style="--sf:' + KR.STUFEN[c.t].farbe + '"><div class="stufe">' + esc(KR.STUFEN[c.t].name) + '</div><h3>' + esc(c.name) + '</h3>' +
      '<div class="daten">' + (mi ? '<span class="chip" style="color:' + m.farbe + '">' + esc(m.name) + '</span>' : '') + '<span class="chip">×' + n + '</span><span class="chip">' + KR.fmt(w) + ' Splitter pro Stück</span></div></div>' +
      '<div class="knoepfe">' +
      '<button type="button" class="klein haupt" id="i-1">1 zermahlen</button>' +
      '<button type="button" class="klein" id="i-d"' + (n > 1 ? '' : ' disabled') + '>Doppelte (' + (n - 1) + ')</button>' +
      '<button type="button" class="klein gefahr" id="i-a">Alle zermahlen</button></div>' +
      '<p class="stand" id="i-t">' + (sicher ? 'Seltener Stein: Alle zermahlen verlangt eine zweite Bestätigung.' : '') + '</p></div></div>', { breit: true });
    function tu(anz) { var g = KR.zermahlen(k, anz); if (g) { T.mahlen(); UI.toast('+' + KR.fmt(g) + ' Splitter', '#8fe3ff'); } UI.kopf(); if ((S.inv[k] || 0) <= 0) d.schliessen(); else { d.schliessen(); itemDialog(k); } }
    $('#i-1', d).addEventListener('click', function () { tu(1); });
    $('#i-d', d).addEventListener('click', function () { tu(n - 1); });
    $('#i-a', d).addEventListener('click', function () {
      if (!bestaetigt) { bestaetigt = true; this.textContent = 'Wirklich alle zermahlen?'; T.nein(); return; }
      tu(n);
    });
  }

  /* ---------- Werkstatt ---------- */
  function werkstatt() {
    var host = $('#v-werkstatt');
    seite(host, {
      key: 'werkstatt', modus: 'liste', rH: 72, rHk: 56, zweispaltig: true, gap: 6, items: KR.UPS.map(function (u) { return u.id; }),
      kopf: '<span>Verbessere deine Ausrüstung mit <b>Splitter</b></span><span class="akz">' + KR.fmt(S.splitter) + ' Splitter</span>',
      zeile: function (id) {
        var u = KR.UPI[id], l = KR.lvl(id), st = KR.kannKaufen(id), kosten = l >= u.max ? 0 : KR.kosten(id);
        var gesperrt = st === 'gesperrt';
        var knopf = st === 'max' ? '<span class="kauf max">Max</span>'
          : gesperrt ? '<span class="kauf nein">Gesperrt</span>'
          : '<button type="button" class="kauf ' + (st === 'ja' ? '' : 'nein') + '" data-u="' + id + '">' + KR.svgSplitter('#fff') + KR.fmt(kosten) + '</button>';
        var eff = u.max === 1 ? u.wirk(l) : u.wirk(l) + (l < u.max ? ' → ' + u.wirk(l + 1) : '');
        return '<div class="zeile ' + (gesperrt ? 'gesperrt' : '') + '"><div class="mitte"><div class="t1">' + esc(u.name) + (u.max > 1 ? ' <span style="color:var(--leise);font-weight:700;font-size:12px">Stufe ' + l + '/' + u.max + '</span>' : '') + '</div>' +
          '<div class="t2" style="color:var(--akz)">' + esc(gesperrt ? 'Braucht: ' + KR.UPI[u.braucht].name : eff) + '</div><div class="t2">' + esc(u.text) + '</div></div>' + knopf + '</div>';
      },
      nachher: function (inh) {
        $$('button.kauf', inh).forEach(function (b) {
          b.addEventListener('click', function () {
            var id = b.dataset.u;
            if (KR.kannKaufen(id) === 'ja') {
              var neu = KR.kaufen(id); T.start(); T.kaufen();
              if (id === 'auto') UI.toast('Automatik freigeschaltet! Schalter auf der Schürf-Seite.', '#4fd1c5', 3200);
              if (id === 'sortier') UI.toast('Sortiermaschine bereit. Schalter im Rucksack.', '#4fd1c5', 3200);
              UI.kopf(); UI.autoKnopf(); UI.planeAuto();
            } else { T.nein(); UI.toast('Noch nicht genug Splitter.', '#ff8da1', 1600); }
          });
        });
      }
    });
  }

  /* ---------- Erfolge ---------- */
  function erfolge() {
    var host = $('#v-erfolge'), er = KR.ERFOLGE, ok = er.filter(function (e) { return S.erfolge[e.id]; }).length;
    var stat = [
      ['Steine aufgebrochen', KR.fmt(S.funde), 'In ' + KR.fmt(S.schlaege) + ' Schlägen'],
      ['Splitter insgesamt', KR.fmt(S.gesamt), 'durch Zermahlen verdient'],
      ['Spielzeit', KR.fmtDauer(S.spielzeit), 'mit offenem Spiel'],
      ['Bester Fund', S.bestes ? KR.KRI[S.bestes.id].name : '–', S.bestes ? (S.bestes.mi ? KR.MUT[S.bestes.mi].name + ' · ' : '') + KR.fmt(KR.wertVon(KR.KRI[S.bestes.id].i, S.bestes.mi)) + ' Wert' : 'noch nichts gefunden']
    ];
    var items = stat.map(function (s) { return { s: s }; }).concat(er.map(function (e) { return { e: e }; }), [{ reset: 1 }]);
    seite(host, {
      key: 'erfolge', modus: 'liste', rH: 54, rHk: 48, zweispaltig: true, gap: 6, items: items,
      kopf: '<span>Erfolge <b>' + ok + ' / ' + er.length + '</b></span><span class="akz">Bonus +' + Math.round(KR.erfolgBonus() * 100) + ' % Glück</span>',
      zeile: function (it) {
        if (it.s) return '<div class="zeile"><div class="mitte"><div class="t1">' + esc(it.s[0]) + '</div><div class="t2">' + esc(it.s[2]) + '</div></div><div class="rechts">' + esc(it.s[1]) + '</div></div>';
        if (it.reset) return '<button type="button" class="zeile" id="e-reset" style="--zf:#7a1f33"><div class="mitte"><div class="t1">Spielstand löschen</div><div class="t2">Setzt alles zurück, nach zweiter Bestätigung.</div></div></button>';
        var e = it.e, da = !!S.erfolge[e.id];
        return '<div class="zeile ' + (da ? 'erledigt' : '') + '"><div class="haken">' + (da ? '✓' : '') + '</div><div class="mitte"><div class="t1">' + esc(e.name) + '</div><div class="t2">' + esc(e.text) + '</div></div><div class="rechts">+' + e.bonus + ' %<small>Glück</small></div></div>';
      },
      nachher: function (inh) { var b = $('#e-reset', inh); if (b) b.addEventListener('click', function () { T.klick(); resetDialog(); }); }
    });
  }
  function resetDialog() {
    var stufe = 0;
    var d = UI.dialog('<h3>Spielstand löschen?</h3><p>Alle Steine, Splitter, Verbesserungen und Erfolge gehen verloren. Das lässt sich nicht rückgängig machen. Tipp: Sichere vorher den Spielstand-Code im Zahnrad-Menü.</p><div class="knoepfe"><button type="button" class="klein haupt" id="x-n">Abbrechen</button><button type="button" class="klein gefahr" id="x-j">Löschen</button></div>');
    $('#x-n', d).addEventListener('click', function () { d.schliessen(); });
    $('#x-j', d).addEventListener('click', function () {
      if (stufe === 0) { stufe = 1; this.textContent = 'Wirklich alles löschen?'; T.nein(); return; }
      KR.zuruecksetzen(); location.reload();
    });
  }

  /* ---------- Willkommen zurück ---------- */
  function zeigeOffline(o) {
    var zeilen = o.beste.map(function (g) {
      var c = KR.KISTALLE_BY(g.ci), m = KR.MUT[g.mi];
      return '<div class="zeile" style="--zf:' + KR.STUFEN[c.t].farbe + '"><div class="bild">' + KR.svgKristall(c, g.mi, { funkeln: false }) + '</div><div class="mitte"><div class="t1">' + esc(c.name) + (g.mi ? ' <span style="color:' + m.farbe + '">· ' + esc(m.name) + '</span>' : '') + '</div><div class="t2">' + esc(KR.STUFEN[c.t].name) + '</div></div><div class="rechts">×' + KR.fmt(g.n) + '</div></div>';
    }).join('');
    var d = UI.dialog('<h3>Willkommen zurück!</h3><p>In ' + KR.fmtDauer(o.dauer) + ' hat deine Automatik <b style="color:#fff">' + KR.fmt(o.anzahl) + ' Steine</b> aufgebrochen (' + Math.round(o.eff * 100) + ' % Leistung).' +
      (o.neuEntdeckt ? ' <b style="color:#ffd24a">' + o.neuEntdeckt + ' neu entdeckt!</b>' : '') + (o.gekappt ? ' Länger arbeitet sie ohne dich nicht, die Nachtschicht verlängert das.' : '') +
      (o.grind && o.grind.anzahl ? ' Doppelte wurden zu ' + KR.fmt(o.grind.splitter) + ' Splitter.' : '') + '</p><div class="liste" style="gap:6px">' + zeilen + '</div>' +
      '<div class="knoepfe"><button type="button" class="klein haupt" id="o-ok">Weiterschürfen</button></div>', { breit: true, fest: false });
    $('#o-ok', d).addEventListener('click', function () { d.schliessen(); });
    UI.kopf(); T.start();
    if (o.erfolge && o.erfolge.length) UI.punkt('erfolge', true);
  }
  KR.KISTALLE_BY = function (i) { return KR.KRISTALLE[i]; };

  /* ---------- Navigation ---------- */
  var RENDER = { sammlung: sammlung, rucksack: rucksack, werkstatt: werkstatt, erfolge: erfolge };
  function zeige(v) {
    aktuell = v;
    $$('.ansicht').forEach(function (a) { a.hidden = a.id !== 'v-' + v; });
    $$('#nav button').forEach(function (b) { if (b.dataset.v === v) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    UI.punkt(v, false);
    var p = $('#nav button[data-v="' + v + '"] .punkt'); if (p) p.remove();
    if (RENDER[v]) RENDER[v]();
  }
  UI.zeige = zeige;
  var drueck = false, geplant = false, letztes = 0;
  document.addEventListener('pointerdown', function () { drueck = true; }, true);
  document.addEventListener('pointerup', function () { drueck = false; }, true);
  document.addEventListener('pointercancel', function () { drueck = false; }, true);
  function neuZeichnen() {
    if (geplant) return; geplant = true;
    (function warten() {
      var jetzt = Date.now();
      if (drueck || UI.dialogOffen() || jetzt - letztes < 700) { setTimeout(warten, 250); return; }
      geplant = false; letztes = jetzt; S = KR.S;
      UI.kopf(); UI.autoKnopf();
      if (RENDER[aktuell]) RENDER[aktuell]();
    })();
  }

  /* ---------- Start ---------- */
  function start() {
    KR.start(); S = KR.S;
    T.an = S.einst.ton !== false;
    if (!S.einst.effekteGesetzt && window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) S.einst.effekte = 'wenig';
    document.documentElement.classList.toggle('wenig', S.einst.effekte === 'wenig');
    window.LGH_ZEILEN = function () {
      return [
        { text: 'Ton', an: T.an, setze: function (v) { T.an = v; S.einst.ton = v; KR.merke(); KR.speichern(true); if (v) { T.start(); T.klick(); } } },
        { text: 'Starke Effekte', an: S.einst.effekte !== 'wenig', setze: function (v) { S.einst.effekte = v ? 'voll' : 'wenig'; S.einst.effekteGesetzt = true; document.documentElement.classList.toggle('wenig', !v); KR.merke(); KR.speichern(true); } }
      ];
    };
    $('#nav').innerHTML = UI.NAV.map(function (n) { return '<button type="button" data-v="' + n[0] + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + n[2] + '</svg><span>' + n[1] + '</span></button>'; }).join('');
    $$('#nav button').forEach(function (b) { b.addEventListener('click', function () { T.start(); T.klick(); zeige(b.dataset.v); }); });
    $('#b-einst').addEventListener('click', function () {
      T.start(); T.klick(); KR.speichern(true);
      if (window.LGH && window.LGH.oeffnen) window.LGH.oeffnen();
      else UI.dialog('<h3>Einstellungen</h3><p>Der Spielstand-Code steht hier nicht zur Verfügung.</p>');
    });
    UI.baueBuehne(); UI.initFx(); UI.kopf(); UI.hoehlenTick();
    zeige('schuerfen');
    KR.on('aenderung', neuZeichnen);
    setInterval(function () { UI.hoehlenTick(); if (!document.hidden) S.spielzeit += 0.5; KR.speichern(); }, 500);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { KR.speichern(true); return; }
      var o = KR.offlineBerechnen(Date.now()); if (o) zeigeOffline(o);
      UI.kopf(); neuZeichnen(); UI.planeAuto();
    });
    window.addEventListener('pagehide', function () { KR.speichern(true); });
    document.addEventListener('keydown', function (e) {
      if ((e.key === ' ' || e.key === 'Enter') && aktuell === 'schuerfen' && !UI.dialogOffen() && (document.activeElement === document.body || document.activeElement === $('#b-schuerfen'))) { e.preventDefault(); T.start(); UI.schuerfen(); }
    });
    var off = KR.offlineBerechnen(Date.now()); if (off) zeigeOffline(off);
    UI.planeAuto();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
