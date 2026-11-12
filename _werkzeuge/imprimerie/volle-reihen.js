/* Volle Reihen (Uncle Hung 12.11.2026, Robert: «4 oben 3 2. reihe? das war doch bei den anderen tools auch nicht so.»; Fehlerbuch 10a).
   Die Raster des Studios stehen «so viele, wie hineinpassen» (auto-fill) oder fest in drei Spalten; bei 10 Hinweisen, 7 Newsletter-Bildern,
   16 Arten oder 177 Fotos blieb die letzte Reihe halb leer. Hier wählt das Haus je Raster eine Spaltenzahl, die die Anzahl teilt (16 → 4, 10 → 5,
   177 → 3, 6 → 3), möglichst nahe an der Spaltenzahl der Vorlage und mit Kacheln in einer sinnvollen Breite. Geht keine Teilung auf (5 Entwürfe am Tablet, 13 Farben), steht eine je Reihe. Nur Spalten, keine gestreckten Kacheln.
   «Meine Medien»: «Neues Medium» ist ein Knopf im Kopf der Gruppe (index.html), die Medien selbst stehen in vollen Reihen.
   Die Dateien der Vorlage (start.js, studio.css) bleiben, wie sie sind. */
(function () {
  'use strict';
  var RASTER = [
    { sel: '#start .atelier', min: 180, max: 440, zoom: true, eins: true },   // z. B. fünf Entwürfe am Tablet: eine je Reihe statt 2 + 2 + 1
    { sel: '#msNewsletter .ms-wochen--abt', min: 200, max: 420 },
    { sel: '#start .ms-fotos', min: 150, max: 420 },
    { sel: '.studio .links #vorlagen', min: 120, max: 400, eins: true },   // Studio, Reiter «Vorlagen»: 13 Vorlagen eine je Reihe statt 6 × 2 + 1
    { sel: '.studio .links #fotos', min: 80, max: 260 },                     // Studio, Reiter «Fotos»: 177 Fotos in 3 Spalten statt 88 × 2 + 1
    { sel: '#start .mb__farben', min: 80, max: 400, eins: true }   // 13 Farben des Markenbuchs: geht keine Teilung auf, eine je Reihe wie am Rechner
  ];
  function spalten(g) { return getComputedStyle(g).gridTemplateColumns.split(' ').filter(Boolean).length; }
  function wahl(n, w, luft, c0, min, max) {
    var best = 0;
    for (var d = 1; d <= n; d++) {
      if (n % d) continue;
      var b = (w - luft * (d - 1)) / d;
      if (b < min || b > max) continue;
      if (!best || Math.abs(d - c0) < Math.abs(best - c0) || (Math.abs(d - c0) === Math.abs(best - c0) && d > best)) best = d;
    }
    return best;
  }
  function ordne(g, r) {
    if (g.offsetParent === null) return;
    var vorher = g.style.gridTemplateColumns;
    g.style.gridTemplateColumns = '';
    var cs = getComputedStyle(g);
    if (cs.display.indexOf('grid') < 0) { g.style.gridTemplateColumns = vorher; return; }
    var c0 = spalten(g), w = g.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), luft = parseFloat(cs.columnGap) || 0;
    var neu = g.querySelector(':scope > [data-akt="neu"]');
    if (neu) neu.style.display = '';
    [].forEach.call(g.querySelectorAll(':scope > * > .stueck__buehne'), function (b) { b.style.zoom = ''; });
    var kinder = [].filter.call(g.children, function (k) { return k.offsetParent !== null && getComputedStyle(k).position !== 'absolute'; });
    if (kinder.some(function (k) { var gc = getComputedStyle(k).gridColumnEnd; return gc && gc.indexOf('span') === 0 && gc !== 'span 1'; })) { g.style.gridTemplateColumns = vorher; return; }
    var n = kinder.length; if (n < 2 || w <= 0) { g.style.gridTemplateColumns = vorher; return; }
    var d = wahl(n, w, luft, c0, r.min, r.max);
    if (!d && neu && n > 2) { var d2 = wahl(n - 1, w, luft, c0, r.min, r.max); if (d2) { neu.style.display = 'none'; d = d2; } }
    if (!d && r.eins) d = 1;   // geht keine Teilung auf: eine Kachel je Reihe (in ihrer Grösse, nicht gestreckt)
    if (!d) { g.style.gridTemplateColumns = vorher; return; }
    g.style.gridTemplateColumns = 'repeat(' + d + ',minmax(0,1fr))';
    if (d === 1 && c0 > 1) g.setAttribute('data-vr-eins', ''); else g.removeAttribute('data-vr-eins');
    if (g.style.gridTemplateColumns !== vorher) geaendert = true;
    if (r.zoom) {   // die Blätter sind für die Spalten der Vorlage bemessen (3 / 2 / 1, start.js); stehen mehr je Reihe, werden sie im selben Verhältnis kleiner
      var f = Math.min(1, ((w - luft * (d - 1)) / d) / ((w - luft * (c0 - 1)) / c0)), z = f < 0.999 ? String(Math.round(f * 1000) / 1000) : '';
      kinder.forEach(function (k) { var b = k.querySelector('.stueck__buehne'); if (b && b.style.zoom !== z) b.style.zoom = z; });
    }
  }
  var geaendert = false, bald = 0;
  function alle() {
    geaendert = false;
    RASTER.forEach(function (r) { document.querySelectorAll(r.sel).forEach(function (g) { ordne(g, r); }); });
    if (geaendert) dispatchEvent(new Event('resize'));   // start.js gleicht die Höhen je Reihe beim Ändern der Fenstergrösse neu an
  }
  function spaeter() { if (bald) return; bald = requestAnimationFrame(function () { bald = 0; alle(); }); }
  function los() {
    var st = document.createElement('style');   // eine Vorlage je Reihe im Studio: Vorschaufläche flacher statt quadratisch (sonst 320 × 346 px je Vorlage)
    st.textContent = '.vorlagen[data-vr-eins] .vk__bild{aspect-ratio:16/9}';
    document.head.appendChild(st);
    var s = document.getElementById('start') || document.body;
    new MutationObserver(alle).observe(s,   // gleich nach dem Aufbau (vor dem Bild, in dem start.js die Höhen je Reihe angleicht)
      { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    var links = document.querySelector('.studio .links');   // linke Spalte des Studios: nachgeordnet im nächsten Bild (dort wird viel geschrieben)
    if (links) new MutationObserver(spaeter).observe(links, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
    addEventListener('resize', function (e) { if (e.isTrusted) spaeter(); });
    alle();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', los); else los();
})();
