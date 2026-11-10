/* Kristall RNG: Klänge, alle selbst erzeugt (Web Audio, keine Dateien) */
'use strict';
(function () {
  var KR = window.KR, ctx = null, master = null, trocken = null, hall = null;
  var T = KR.ton = { an: true };
  var PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];

  function frei() { return ctx && T.an; }
  T.start = function () { // beim ersten Tippen aufrufen (iPhone erlaubt Ton nur nach einer Berührung)
    try {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
      trocken = ctx.createGain(); trocken.connect(master);
      var len = Math.floor(ctx.sampleRate * 1.7), buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (var ch = 0; ch < 2; ch++) { var d = buf.getChannelData(ch); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
      var conv = ctx.createConvolver(); conv.buffer = buf;
      hall = ctx.createGain(); hall.gain.value = 0.9;
      var nass = ctx.createGain(); nass.gain.value = 0.3;
      hall.connect(conv); conv.connect(nass); nass.connect(master);
    } catch (e) { ctx = null; }
  };
  function ton(f, t0, dauer, typ, vol, hallAnteil, glide) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = typ || 'sine'; o.frequency.setValueAtTime(f, t0);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, glide), t0 + dauer);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
    o.connect(g); g.connect(trocken);
    if (hallAnteil) { var s = ctx.createGain(); s.gain.value = hallAnteil; g.connect(s); s.connect(hall); }
    o.start(t0); o.stop(t0 + dauer + 0.05);
  }
  function rauschen(t0, dauer, filt, f0, f1, q, vol) {
    var len = Math.max(1, Math.floor(ctx.sampleRate * dauer)), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var s = ctx.createBufferSource(); s.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = filt; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dauer);
    var g = ctx.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
    s.connect(f); f.connect(g); g.connect(trocken); s.start(t0); s.stop(t0 + dauer + 0.02);
  }
  function jetzt() { return ctx.currentTime + 0.005; }

  T.schlag = function () {
    if (!frei()) return; var t = jetzt();
    rauschen(t, 0.09, 'bandpass', 1800, 400, 1.2, 0.5);
    ton(150, t, 0.16, 'sine', 0.7, 0, 45);
    rauschen(t + 0.02, 0.18, 'lowpass', 900, 150, 0.7, 0.25);
  };
  T.riss = function (stufe) {
    if (!frei()) return; var t = jetzt();
    rauschen(t, 0.22, 'highpass', 3500 + stufe * 400, 2000, 0.8, 0.28);
    for (var i = 0; i < 3; i++) ton(2400 + Math.random() * 2400, t + i * 0.035, 0.06, 'triangle', 0.08, 0.3);
  };
  T.aufdecken = function (stufe, mut) {
    if (!frei()) return; var t = jetzt(), i;
    var n = Math.min(8, stufe + 2), f0 = 392 * Math.pow(2, (stufe >= 5 ? 2 : 0) / 12);
    for (i = 0; i < n; i++) {
      var f = f0 * Math.pow(2, PENTA[i] / 12), tt = t + i * (0.07 + 0.01 * (stufe > 3 ? 1 : 0));
      ton(f, tt, 0.9 + stufe * 0.12, 'sine', 0.2, 0.55);
      ton(f * 2, tt, 0.5, 'triangle', 0.07, 0.6);
    }
    var ende = t + n * 0.075;
    if (stufe >= 3) [0, 4, 7, 12].forEach(function (s, k) { ton(f0 * 2 * Math.pow(2, s / 12), ende, 1.8, 'triangle', 0.11, 0.9); });
    if (stufe >= 4) {
      ton(62, t, 1.6, 'sine', 0.55, 0.2, 34);
      rauschen(t, 1.1, 'lowpass', 300, 2600, 0.8, 0.25);
    }
    if (stufe >= 5) {
      for (i = 0; i < 6; i++) ton(2000 * Math.pow(2, PENTA[i] / 12) / 2, ende + 0.1 + i * 0.09, 0.7, 'sine', 0.06, 1);
    }
    if (stufe >= 6) {
      rauschen(t, 2.2, 'bandpass', 200, 5200, 2, 0.18);
      ton(41, t, 2.6, 'sine', 0.5, 0.3, 28);
    }
    if (mut >= 1) for (i = 0; i < Math.min(5, 1 + mut); i++) ton(3000 + Math.random() * 3500, ende + 0.05 + i * 0.06, 0.35, 'sine', 0.05, 1);
    if (mut === 6) { ton(500, t, 1.4, 'sawtooth', 0.04, 0.8, 70); }
  };
  T.klick = function () { if (!frei()) return; var t = jetzt(); ton(880, t, 0.06, 'triangle', 0.1, 0.1); };
  T.kaufen = function () { if (!frei()) return; var t = jetzt(); ton(660, t, 0.12, 'triangle', 0.16, 0.3); ton(990, t + 0.08, 0.3, 'triangle', 0.16, 0.5); ton(1320, t + 0.16, 0.45, 'sine', 0.1, 0.7); };
  T.mahlen = function () { if (!frei()) return; var t = jetzt(); rauschen(t, 0.28, 'bandpass', 1200, 300, 1.5, 0.35); ton(120, t, 0.25, 'sawtooth', 0.12, 0, 60); ton(1500, t + 0.25, 0.2, 'triangle', 0.1, 0.5); };
  T.nein = function () { if (!frei()) return; var t = jetzt(); ton(220, t, 0.14, 'square', 0.07, 0, 160); };
  T.erfolg = function () { if (!frei()) return; var t = jetzt(); [0, 4, 7, 12].forEach(function (s, i) { ton(523 * Math.pow(2, s / 12), t + i * 0.08, 0.7, 'triangle', 0.14, 0.7); }); };
  T.hoehle = function () { if (!frei()) return; var t = jetzt(); ton(330, t, 1.2, 'sine', 0.1, 0.9, 247); ton(494, t + 0.15, 1.2, 'sine', 0.08, 0.9, 370); };
})();
