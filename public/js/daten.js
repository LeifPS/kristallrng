/* Kristall RNG: Spieldaten (Stufen, Kristalle, Mutationen, Höhlen, Verbesserungen, Erfolge) */
'use strict';
(function () {
  var KR = window.KR = window.KR || {};

  /* ---------- Seltenheitsstufen ---------- */
  KR.STUFEN = [
    { name: 'Gewöhnlich',   farbe: '#9aa7b5', extra: 0,   fx: 6 },
    { name: 'Ungewöhnlich', farbe: '#62c26e', extra: 0,   fx: 10 },
    { name: 'Selten',       farbe: '#4aa3f0', extra: 0.1, fx: 16 },
    { name: 'Episch',       farbe: '#b06cf0', extra: 0.3, fx: 26 },
    { name: 'Legendär',     farbe: '#ffae2e', extra: 0.8, fx: 44 },
    { name: 'Mythisch',     farbe: '#ff4f86', extra: 1.4, fx: 64 },
    { name: 'Göttlich',     farbe: '#38e0d6', extra: 2.2, fx: 90 },
    { name: 'Kosmisch',     farbe: '#e4d4ff', extra: 3.2, fx: 130 }
  ];

  /* ---------- Elemente (für Höhlen-Boni) ---------- */
  KR.ELEMENTE = {
    erde:     { name: 'Erde',    farbe: '#c9a45a' },
    feuer:    { name: 'Feuer',   farbe: '#ff6a3d' },
    eis:      { name: 'Eis',     farbe: '#7ad7ff' },
    licht:    { name: 'Licht',   farbe: '#ffe27a' },
    schatten: { name: 'Schatten', farbe: '#a58bff' },
    kosmos:   { name: 'Kosmos',  farbe: '#c5b4ff' }
  };

  /* ---------- Kristalle ----------
     n = Grundchance "1 zu n" (nominell; echte Chance berechnet KR.kern), t = Stufe, schliff = Zeichenform,
     farbe = Grundfarbe, spread = Farbstreuung zwischen den Facetten (Grad), el = Element */
  var K = [
    // Gewöhnlich
    ['quarz', 'Quarz', 2, 0, 'spitze', '#dfe8f2', 0, 'erde', 'Der Klassiker unter den Steinen: klar, kantig und überall zu finden.'],
    ['kalkspat', 'Kalkspat', 3, 0, 'raute', '#e8d9b0', 0, 'erde', 'Bricht in schiefen Würfeln und lässt Schrift doppelt erscheinen.'],
    ['rauchquarz', 'Rauchquarz', 4, 0, 'spitze', '#8f7c6b', 0, 'schatten', 'Ein Quarz, der zu lange im Dunkeln gesessen hat.'],
    ['pyrit', 'Pyrit', 5, 0, 'wuerfel', '#d9b84a', 0, 'feuer', 'Glänzt wie Gold, bringt aber nur Funken. Man nennt ihn Katzengold.'],
    ['fluorit', 'Fluorit', 6, 0, 'oktaeder', '#8fd9c2', 40, 'eis', 'Leuchtet unter Schwarzlicht in Farben, die es draußen nicht gibt.'],
    ['haematit', 'Hämatit', 8, 0, 'rund', '#7b6672', 0, 'erde', 'Dunkel, schwer und glatt wie ein Spiegel aus Eisen.'],
    // Ungewöhnlich
    ['citrin', 'Citrin', 12, 1, 'spitze', '#f2c94c', 0, 'licht', 'Fängt Sonnenlicht ein und gibt es an trüben Tagen wieder her.'],
    ['amethyst', 'Amethyst', 16, 1, 'cluster', '#a77bd6', 0, 'schatten', 'Wächst in Höhlen zu violetten Wäldern aus Spitzen.'],
    ['rosenquarz', 'Rosenquarz', 20, 1, 'tropfen', '#f4a7c0', 0, 'licht', 'Sanft rosa und wohlig warm im Schein einer Laterne.'],
    ['aventurin', 'Aventurin', 26, 1, 'rund', '#4fb286', 0, 'erde', 'Grün gesprenkelt, als hätte jemand Glitzer in Moos gestreut.'],
    ['mondstein', 'Mondstein', 32, 1, 'tropfen', '#cdd8f0', 30, 'licht', 'Ein Schimmer wandert darin, je nachdem, wie man ihn dreht.'],
    ['granat', 'Granat', 40, 1, 'rund', '#b5273a', 0, 'feuer', 'Rot wie Granatapfelkerne und hart wie ein Entschluss.'],
    // Selten
    ['turmalin', 'Turmalin', 60, 2, 'spitze', '#2fbf8f', 70, 'erde', 'Ein Stein, zwei Farben, und beide behaupten, die echte zu sein.'],
    ['aquamarin', 'Aquamarin', 80, 2, 'smaragd', '#6ed0e8', 0, 'eis', 'Das Meer, in einen Stein gegossen, samt seiner Ruhe.'],
    ['topas', 'Topas', 110, 2, 'tropfen', '#f0a24a', 0, 'feuer', 'Warm wie ein später Sommerabend, fast zu schön für eine Hacke.'],
    ['peridot', 'Peridot', 140, 2, 'marquise', '#9ed83c', 0, 'erde', 'Olivgrün und uralt: Manche fand man schon in Meteoriten.'],
    ['opal', 'Opal', 180, 2, 'tropfen', '#cfe8ff', 150, 'licht', 'Darin steht ein ganzes Feuerwerk, das nie aufhört.'],
    ['feueropal', 'Feueropal', 250, 2, 'rund', '#ff7b3a', 28, 'feuer', 'Orange wie eine Flamme unter Glas. In der Hand wird er warm.'],
    // Episch
    ['rubin', 'Rubin', 400, 3, 'rund', '#d81f43', 0, 'feuer', 'Der König der roten Steine glüht von innen.'],
    ['saphir', 'Saphir', 550, 3, 'smaragd', '#2a5fd8', 0, 'eis', 'Tiefblau wie die Stunde, bevor die Sterne ausgehen.'],
    ['smaragd', 'Smaragd', 750, 3, 'smaragd', '#1fa866', 0, 'erde', 'Grün, das nach Regen und Wald schmeckt, und teurer als Gold.'],
    ['alexandrit', 'Alexandrit', 1000, 3, 'marquise', '#6a4fd0', 90, 'schatten', 'Am Tag grün, bei Kerzenlicht rot: ein Stein mit zwei Gesichtern.'],
    ['tansanit', 'Tansanit', 1300, 3, 'tropfen', '#5b4de0', 20, 'eis', 'Nur an einem einzigen Hang der Welt gefunden. Und du hältst ihn.'],
    ['obsidian', 'Obsidian', 1700, 3, 'spitze', '#26212f', 0, 'schatten', 'Vulkanglas, dessen Kanten schärfer sind als jedes Messer.'],
    ['sonnenstein', 'Sonnenstein', 2000, 3, 'stern', '#ffb347', 0, 'licht', 'Winzige Plättchen darin blitzen auf wie Sonnenstaub.'],
    // Legendär
    ['diamant', 'Diamant', 3000, 4, 'rund', '#e9f6ff', 25, 'licht', 'Das Härteste, was die Tiefe hervorbringt, und das Klarste.'],
    ['rotdiamant', 'Roter Diamant', 4500, 4, 'rund', '#ff3a5a', 0, 'feuer', 'Von ihm gibt es auf der ganzen Welt weniger als eine Handvoll.'],
    ['paraiba', 'Paraiba-Turmalin', 6500, 4, 'spitze', '#19e0d0', 30, 'eis', 'Sein Blau scheint von innen elektrisch zu leuchten.'],
    ['benitoit', 'Benitoit', 9000, 4, 'oktaeder', '#2c52ff', 0, 'eis', 'Unter Schwarzlicht strahlt er blau, bei Tag ist er still und tief.'],
    ['phoenix', 'Phönixstein', 12000, 4, 'stern', '#ff6a1f', 40, 'feuer', 'Er zerfällt nie ganz: Aus jeder Asche steigt er neu auf.'],
    ['eisherz', 'Eisherz', 15000, 4, 'herz', '#8ae6ff', 0, 'eis', 'Ein Herz, das nie auftaut und doch erstaunlich warm wirkt.'],
    // Mythisch
    ['blutmond', 'Blutmond-Kristall', 25000, 5, 'rund', '#8a1030', 0, 'schatten', 'Nur in mondlosen Nächten geboren, aber rot wie ein Mond.'],
    ['sternsaphir', 'Sternsaphir', 40000, 5, 'stern', '#3a6cff', 0, 'kosmos', 'Ein Stern steckt in ihm fest und dreht sich mit dem Licht.'],
    ['nachtglas', 'Nachtglas', 60000, 5, 'oktaeder', '#3a2a7a', 0, 'schatten', 'Ein Splitter der tiefsten Nacht, in dem sich nichts spiegelt.'],
    ['lichtader', 'Lichtader', 85000, 5, 'spitze', '#fff3a0', 0, 'licht', 'Eine Ader aus reinem Licht, die man vorsichtig freilegen muss.'],
    ['magmaherz', 'Magmaherz', 120000, 5, 'herz', '#ff4a12', 24, 'feuer', 'Es schlägt. Wirklich. Ganz langsam und sehr heiß.'],
    // Göttlich
    ['himmelstraene', 'Himmelsträne', 250000, 6, 'tropfen', '#9fe8ff', 30, 'licht', 'Entstand, als eine Wolke vor Rührung weinte.'],
    ['seelenstein', 'Seelenstein', 400000, 6, 'marquise', '#c9a8ff', 40, 'schatten', 'Wer lange hineinsieht, erkennt jemanden, der zurücklächelt.'],
    ['weltenkern', 'Weltenkern', 600000, 6, 'oktaeder', '#7aff8a', 30, 'erde', 'Ein Stück vom Herzen der Welt, das nie gesehen werden wollte.'],
    ['zeitsplitter', 'Zeitsplitter', 800000, 6, 'raute', '#ffd36a', 50, 'kosmos', 'Darin vergeht die Zeit anders. Ein Blick dauert einen Tag.'],
    ['ewigeis', 'Ewigeis', 1000000, 6, 'cluster', '#b8f4ff', 20, 'eis', 'So alt, dass es schon Eis war, als es noch keine Kälte gab.'],
    // Kosmisch
    ['nebelstern', 'Nebelstern', 3500000, 7, 'stern', '#b48cff', 90, 'kosmos', 'Ein kleiner Nebel, der sich zu einem Kristall zusammengerollt hat.'],
    ['singularitaet', 'Singularität', 8000000, 7, 'rund', '#14091f', 0, 'kosmos', 'Zu schwer für diese Höhle. Licht fällt hinein und kommt nie zurück.'],
    ['urkristall', 'Urkristall', 15000000, 7, 'cluster', '#ff9ad5', 360, 'kosmos', 'Aus ihm sind alle anderen Steine einmal herausgewachsen.'],
    ['weltentraene', 'Weltenträne', 25000000, 7, 'tropfen', '#a8b8ff', 120, 'kosmos', 'Die Träne eines Himmelskörpers, der Abschied nahm.'],
    ['sternengeburt', 'Sternengeburt', 50000000, 7, 'stern', '#ffd0f0', 160, 'kosmos', 'Der erste Atemzug eines neuen Sterns, in Stein gefasst.'],
    ['ersteslicht', 'Das Erste Licht', 100000000, 7, 'rund', '#fffbe8', 200, 'licht', 'Älter als der Tag und älter als der Himmel. Es war einfach da.'],
    ['kristallherz', 'Kristallherz', 500000000, 7, 'herz', '#ff7ad0', 300, 'kosmos', 'Das Herz aller Höhlen. Wer es findet, hat ein Leben lang Glück.']
  ];
  KR.KRISTALLE = K.map(function (a, i) {
    return { id: a[0], name: a[1], n: a[2], t: a[3], schliff: a[4], farbe: a[5], spread: a[6], el: a[7], text: a[8], i: i,
             wert: Math.max(1, Math.round(Math.pow(a[2], 0.85))) };
  });
  KR.KRI = {}; KR.KRISTALLE.forEach(function (c) { KR.KRI[c.id] = c; });

  /* ---------- Mutationen ---------- */
  KR.MUT = [
    { id: 'normal',     name: 'Normal',     n: 1,     m: 1,   farbe: '#9aa7b5' },
    { id: 'glitzer',    name: 'Glitzernd',  n: 10,    m: 2,   farbe: '#bfe8ff' },
    { id: 'neon',       name: 'Neon',       n: 40,    m: 5,   farbe: '#4dffb8' },
    { id: 'schatten',   name: 'Schatten',   n: 150,   m: 12,  farbe: '#8f72ff' },
    { id: 'gold',       name: 'Gold',       n: 600,   m: 35,  farbe: '#ffc83a' },
    { id: 'regenbogen', name: 'Regenbogen', n: 3000,  m: 120, farbe: '#ff7ad9' },
    { id: 'leere',      name: 'Leere',      n: 25000, m: 600, farbe: '#d6b8ff' }
  ];

  /* ---------- Höhlen (wechseln alle 4 Minuten, für alle Spieler gleich, nur aus der Uhrzeit berechnet) ---------- */
  KR.HOEHLEN = {
    tief:   { name: 'Tiefe Höhle',      el: null,       bg: ['#0e1830', '#070b16'], akzent: '#4fd1c5', text: 'Ruhig. Kein Bonus.' },
    erz:    { name: 'Erzader',          el: 'erde',     bg: ['#2a2312', '#120e07'], akzent: '#d3ad5f', text: 'Erd-Kristalle sind häufiger.' },
    magma:  { name: 'Magma-Kammer',     el: 'feuer',    bg: ['#3a1208', '#160604'], akzent: '#ff6a3d', text: 'Feuer-Kristalle sind häufiger.' },
    eis:    { name: 'Eisgrotte',        el: 'eis',      bg: ['#0e2e44', '#07131f'], akzent: '#7ad7ff', text: 'Eis-Kristalle sind häufiger.' },
    licht:  { name: 'Lichtkaverne',     el: 'licht',    bg: ['#3a3412', '#17140a'], akzent: '#ffe27a', text: 'Licht-Kristalle sind häufiger.' },
    nacht:  { name: 'Schattenschlucht', el: 'schatten', bg: ['#22163e', '#0a0716'], akzent: '#a58bff', text: 'Schatten-Kristalle sind häufiger.' },
    stern:  { name: 'Sternenspalt',     el: 'kosmos',   bg: ['#161348', '#060520'], akzent: '#c5b4ff', text: 'Kosmos-Kristalle sind häufiger.' },
    sturm:  { name: 'Kristallsturm',    el: null,       bg: ['#10304a', '#091426'], akzent: '#ff9ff0', text: 'Mutationen sind viel häufiger.', sturm: true }
  };
  KR.HOEHLEN_FOLGE = ['erz', 'magma', 'eis', 'licht', 'nacht', 'stern'];
  KR.SLOT_MS = 4 * 60 * 1000;

  /* ---------- Verbesserungen ---------- */
  function z(x) { return x; }
  KR.UPS = [
    { id: 'gluck', name: 'Glücksstern', max: 80, basis: 60, f: 1.26,
      text: 'Mehr Glück bei jedem Schlag.', wirk: function (l) { return '+' + (l * 10) + ' % Glück'; } },
    { id: 'tempo', name: 'Flinke Hacke', max: 25, basis: 300, f: 1.4,
      text: 'Verkürzt das Aufbrechen eines Steins.', wirk: function (l) { return KR.fmtZeit(KR.aufbruchZeit(l)) + ' pro Schlag'; } },
    { id: 'auto', name: 'Automatik', max: 1, basis: 400, f: 1,
      text: 'Schürft von selbst weiter. Schalter auf der Schürf-Seite.', wirk: function (l) { return l ? 'freigeschaltet' : 'gesperrt'; } },
    { id: 'takt', name: 'Auto-Takt', max: 20, basis: 1200, f: 1.5, braucht: 'auto',
      text: 'Die Automatik schlägt schneller zu.', wirk: function (l) { return KR.fmtZeit(KR.autoTakt(l)) + ' Takt'; } },
    { id: 'mut', name: 'Mutationsgespür', max: 30, basis: 1500, f: 1.38,
      text: 'Mutationen treten häufiger auf.', wirk: function (l) { return '+' + (l * 8) + ' % Mutationschance'; } },
    { id: 'muehle', name: 'Splitter-Mühle', max: 40, basis: 1000, f: 1.34,
      text: 'Beim Zermahlen entstehen mehr Splitter.', wirk: function (l) { return '+' + (l * 15) + ' % Splitter'; } },
    { id: 'doppel', name: 'Mehrfachschlag', max: 9, basis: 40000, f: 2.4,
      text: 'Jeder Schlag bricht mehrere Steine auf. Du siehst den besten.', wirk: function (l) { return (l + 1) + (l ? ' Steine' : ' Stein') + ' pro Schlag'; } },
    { id: 'sortier', name: 'Sortiermaschine', max: 1, basis: 6000, f: 1,
      text: 'Zermahlt Doppelte auf Wunsch von selbst (Schalter im Rucksack).', wirk: function (l) { return l ? 'freigeschaltet' : 'gesperrt'; } },
    { id: 'nacht', name: 'Nachtschicht', max: 15, basis: 8000, f: 1.7, braucht: 'auto',
      text: 'Die Automatik arbeitet auch, wenn das Spiel zu ist (länger und ergiebiger).',
      wirk: function (l) { return Math.min(95, 20 + l * 5) + ' % Leistung, bis ' + (2 + l * 0.5).toString().replace('.', ',') + ' Std.'; } },
    { id: 'kompass', name: 'Höhlenkompass', max: 10, basis: 15000, f: 1.9,
      text: 'Verstärkt den Bonus der Höhlen und zeigt die nächste Höhle.', wirk: function (l) { return 'Höhlenbonus ×' + (4 + l * 0.8).toString().replace('.', ','); } }
  ];
  KR.UPI = {}; KR.UPS.forEach(function (u) { KR.UPI[u.id] = u; });

  /* ---------- Erfolge (dauerhafter Glücksbonus in Prozent oder Splitter) ---------- */
  KR.ERFOLGE = [];
  (function () {
    function e(id, name, text, test, bonus) { KR.ERFOLGE.push({ id: id, name: name, text: text, test: test, bonus: bonus }); }
    [[100, 1], [1000, 2], [10000, 4], [100000, 8], [1000000, 16]].forEach(function (p) {
      e('schlaege' + p[0], p[0].toLocaleString('de-DE') + ' Steine', 'Brich ' + p[0].toLocaleString('de-DE') + ' Steine auf.',
        function (S) { return S.funde >= p[0]; }, p[1]);
    });
    [[1, 'Seltener Fund', 2], [2, 'Episches Glück', 3], [3, 'Legendäre Beute', 5], [4, 'Mythische Wende', 8], [5, 'Göttliche Fügung', 12], [6, 'Kosmisches Wunder', 20]].forEach(function (p) {
      e('stufe' + p[0], p[1], 'Finde einen Kristall der Stufe ' + KR.STUFEN[p[0] + 1].name + ' oder höher.',
        function (S) { return S.hoechsteStufe >= p[0] + 1; }, p[2]);
    });
    [[10, 2], [20, 3], [30, 5], [40, 8], [48, 20]].forEach(function (p) {
      e('sammlung' + p[0], p[0] + ' Kristalle entdeckt', 'Entdecke ' + p[0] + ' verschiedene Kristalle.',
        function (S) { return KR.anzahlEntdeckt() >= p[0]; }, p[1]);
    });
    [[1, 'Funkelnder Fund', 1], [2, 'Neon-Nacht', 2], [3, 'Schattenspiel', 3], [4, 'Goldrausch', 5], [5, 'Regenbogenglück', 8], [6, 'Blick in die Leere', 15]].forEach(function (p) {
      e('mut' + p[0], p[1], 'Finde einen Kristall mit der Mutation ' + KR.MUT[p[0]].name + '.',
        function (S) { return S.mutGefunden[p[0]] > 0; }, p[2]);
    });
  })();
})();
