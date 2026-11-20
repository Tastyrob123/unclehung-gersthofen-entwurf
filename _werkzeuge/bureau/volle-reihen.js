/* Volle Reihen für die Fotos eines Abschnitts (Uncle Hung 12.11.2026, Robert: «4 oben 3 2. reihe? das war doch bei den anderen tools auch nicht so.»).
   Der Stamm legt die Fotos eines Seitenabschnitts (.ws-fotos) als Raster «so viele, wie hineinpassen» an; bei 3, 5, 7 oder 9 Fotos blieb die letzte Reihe
   halb leer oder Spalten blieben frei. Hier wählt das Haus je Gruppe eine Spaltenzahl, die die Anzahl teilt (5 → 5, 6 → 3, 9 → 3), mit Vorschaubildern
   zwischen 64 und 260 px Breite, möglichst nahe an der Breite des Stamms (92 px). Nur Spalten, keine gestreckten Kacheln. Die Dateien des Stamms bleiben. */
(function () {
  'use strict';
  var MIN = 64, MAX = 260, NATUR = 92, LUFT = 8;
  function ordne(g) {
    var kinder = [].filter.call(g.children, function (k) { return k.offsetParent !== null; });
    var n = kinder.length; if (!n) return;
    var cs = getComputedStyle(g), w = g.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (w <= 0) return;
    var luft = parseFloat(cs.columnGap) || LUFT, c0 = Math.max(1, Math.floor((w + luft) / (NATUR + luft))), best = 0;
    for (var d = 1; d <= n; d++) {
      if (n % d) continue;
      var b = (w - luft * (d - 1)) / d;
      if (b < MIN || b > MAX) continue;
      if (!best || Math.abs(d - c0) < Math.abs(best - c0) || (Math.abs(d - c0) === Math.abs(best - c0) && d > best)) best = d;
    }
    if (!best) best = n <= c0 ? n : 1;
    var wert = 'repeat(' + best + ',minmax(0,1fr))';
    if (g.style.gridTemplateColumns !== wert) g.style.gridTemplateColumns = wert;
  }

  /* Kacheln der Übersicht (Häufig gebraucht, Bereiche): jede Reihe voll (Prüfung 20.11.2026, Leerraum-Regel).
     Spaltenzahl nach Breite (Mindestbreite wie im Stamm), Stücke gleichmässig auf die Reihen verteilt (7 → 4+3, 9 → 3+3+3),
     die Stücke einer kürzeren Reihe werden breiter, damit keine Spalte leer bleibt. */
  function ggt(a, b) { return b ? ggt(b, a % b) : a; }
  function kacheln(g, min) {
    var kinder = [].filter.call(g.children, function (k) { return k.offsetParent !== null; });
    var n = kinder.length; if (!n) return;
    var cs = getComputedStyle(g), luft = parseFloat(cs.columnGap) || 16, w = g.clientWidth;
    if (w <= 0) return;
    var c = Math.max(1, Math.min(n, Math.floor((w + luft) / (min + luft))));
    var reihen = Math.ceil(n / c), basis = Math.floor(n / reihen), rest = n % reihen, zahlen = [];
    for (var r = 0; r < reihen; r++) zahlen.push(basis + (r < rest ? 1 : 0));
    var spalten = zahlen.reduce(function (a, z) { return a * z / ggt(a, z); }, 1);
    var wert = 'repeat(' + spalten + ',minmax(0,1fr))';
    if (g.style.gridTemplateColumns !== wert) g.style.gridTemplateColumns = wert;
    var i = 0;
    zahlen.forEach(function (z) { for (var k = 0; k < z; k++, i++) { var sp = 'span ' + (spalten / z); if (kinder[i].style.gridColumn !== sp) kinder[i].style.gridColumn = sp; } });
  }
  function uebersicht() {
    document.querySelectorAll('.ws-aufgaben').forEach(function (g) { kacheln(g, 230); });
    document.querySelectorAll('.ws-bereiche').forEach(function (g) { kacheln(g, 260); });
  }
  function alle() { document.querySelectorAll('.ws-fotos').forEach(ordne); uebersicht(); }
  var bald = 0;
  function spaeter() { if (bald) return; bald = requestAnimationFrame(function () { bald = 0; alle(); }); }
  function los() {
    var m = document.getElementById('ws-mitte') || document.body;
    new MutationObserver(spaeter).observe(m, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'hidden', 'class', 'aria-expanded'] });
    addEventListener('resize', spaeter);
    alle();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', los); else los();
})();
