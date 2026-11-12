/* kleid/unclehung.js · Hauswerte für oberflaeche.js (Uncle Hung Gersthofen, vietnamesisches Familienbistro seit 2009, Dieselstraße 2; 11.11.2026).
   Im <head> VOR allen Stilen laden (ohne defer). Rahmen «Die Bühne» wie die Vorlage Taverne zum Schäfli: Kopf dunkel (Tief), Raum hell (Papier).
   Liegt unter _werkzeuge/oberflaeche/ und wird von den Werkzeug-Servern unter /assets/oberflaeche/ ausgeliefert (einziger Schreiber: Oberchef).
   Fotos und Schriften kommen aus der Website (/assets/bild/<schlüssel>-<720|1280|2000>.webp, /assets/schrift/), Zeichen und Wortmarke aus diesem Ordner
   (aus _quelle/extern/logo/zeichen-schale.svg und wortmarke-aus-profilbild.svg, Ausschnitt 196 600 1588 648 wie website/bau.py). */
window.WO_HAUS = { kurz: 'unclehung', name: 'Uncle Hung', voll: 'Uncle Hung Gersthofen', ort: 'Gersthofen', welt: 'land', rahmen: 'buehne', anrede: 'Sie',
  /* Aussenfoto des Startbilds: der Gastraum am Tag mit Palmentapete und Leuchtschrift (Bildregister website/bilder.json, Schlüssel «ig-raum»; ein Foto des Hauses von aussen gibt es in den Quellen nicht) */
  foto: '/assets/bild/ig-raum-1280.webp', fotoKlein: '/assets/bild/ig-raum-720.webp', fotoFarbe: '#6f6a5a', fotoAlt: 'Der Gastraum von Uncle Hung mit Palmentapete und Leuchtschrift',
  zeichen: '/assets/oberflaeche/kleid/unclehung-zeichen.svg', zeichenMass: 0.876, wortmarke: '/assets/oberflaeche/kleid/unclehung-wortmarke.svg', wortmarkeMass: 2.45,
  /* Namen der sieben Werkzeuge: für jedes Haus gleich (Robert 09.11.2026). Dateien, Schlüssel und Adressen bleiben (maison, bureau, carte …). Je Werkzeug ein Satz. */
  namen: { zentrale: 'Kontrollpanel', website: 'Website bearbeiten', karten: 'Karten & Preislisten', gaeste: 'Anfragen & Chat', marke: 'Markenbuch', besuche: 'Besucher', druck: 'Drucksachen & Feed' },
  saetze: { zentrale: 'Hier beginnt alles: ein Blick auf alle Werkzeuge und ihren Stand.',
    website: 'Die Website selbst pflegen: Texte, Fotos, Zeiten, Hinweise.',
    karten: 'Die Karte mit Lunchdeals, Rubriken und Drinks pflegen, daraus entstehen Website, Karte und PDF.',
    gaeste: 'Anfragen zu Tisch, Feier und Catering und der Chat für die Gäste, mit Antwortentwurf.',
    marke: 'Wortmarke, Schale, Fotos, Farben und Schriften des Hauses an einem Ort.',
    besuche: 'Wer die Website besucht: woher, wann, welche Seiten, wer anruft oder anfragt.',
    druck: 'Tageskarte, Aushang, Weihnachtsmenü, Gutschein, Tischaufsteller und der Feed im Stil des Hauses.' },
  wege: { zentrale: '/_werkzeuge/maison/', website: '/_werkzeuge/bureau/', karten: '/_werkzeuge/carte/', gaeste: '/_werkzeuge/reception/', marke: '/_werkzeuge/livre/', besuche: '/_werkzeuge/registre/', druck: '/_werkzeuge/imprimerie/' },
  /* Prüfserver je Werkzeug (cloud/haus.json); Wege zwischen Werkzeugen immer 127.0.0.1, nie localhost (Fehlerbuch 10a) */
  ports: { zentrale: 9471, website: 9472, karten: 9473, gaeste: 9474, marke: 9475, besuche: 9476, druck: 9477, werkbank: 9478, website_lokal: 9479 } };
/* Lokal (Prüfserver je Werkzeug) zeigen die Wege zu den ANDEREN Werkzeugen auf deren eigenen Server unter 127.0.0.1, nie auf den eigenen Port
   (Fehlerbuch 10a, Culinarium 28.10.2026). Online bleiben sie relativ. Nur Wege umschreiben, die noch mit «/» beginnen (WO_HAUS.wegeLokal = true zeigt, dass es hier geschah). */
(function () {
  if (!/^(127\.0\.0\.1|localhost)$/.test(location.hostname)) return;
  Object.keys(WO_HAUS.wege).forEach(function (k) {
    var p = WO_HAUS.ports[k], w = WO_HAUS.wege[k];
    if (p && String(p) !== location.port && w.charAt(0) === '/') WO_HAUS.wege[k] = 'http://127.0.0.1:' + p + w;
  });
  WO_HAUS.wegeLokal = true;
})();
document.documentElement.setAttribute('data-wo-haus', WO_HAUS.kurz);
document.documentElement.setAttribute('data-wo-rahmen', WO_HAUS.rahmen);
try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}
