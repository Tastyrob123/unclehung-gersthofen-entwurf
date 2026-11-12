/* Anschluss des Anfrage-Formulars der Website an «Anfragen & Chat» · Uncle Hung Gersthofen (11.11.2026, Master Werkzeug-Bau E12/E24/E33; Muster: Baustein der Taverne zum Schäfli).
   NUR ANLEITUNG: Die Website bleibt, wie sie ist (Robert 11.11.2026: «ich bin zufrieden mit der Website»). Der Baustein liegt hier bereit, eingebaut wird er erst,
   wenn das Haus den Eingang im Betrieb nutzt (Anleitung: baustein/ANLEITUNG.md).
   Die Website hat ein Anfrage-Formular (catering.html, .anfrage[data-anfrage], gebaut von website/bau.py anfrage()): Name, Location, Anlass
   (Geburtstag | Hochzeit | Firmenfeier | Privat-Event | Feier bei Uncle Hung | Etwas anderes), Datum (Kalender mit 3 Tagen Vorlauf), Gruppengröße
   (bis 10 | 10 bis 25 | 25 bis 45 | 45 bis 70 | mehr als 70 Gäste), E-Mail, Persönliche Wünsche. Heute zeigt es nur «Danke dir» (Studie, nichts geht weg).
   Mit diesem Baustein geht die Anfrage in den Eingang von «Anfragen & Chat»; «Feier bei Uncle Hung» wird dort eine Feier, alles andere Catering.
   Erst wenn der Eingang sie angenommen hat, zeigt das Formular «Danke dir» (die Website setzt dafür .gesendet). Geht etwas schief, steht über dem Knopf eine Meldung
   mit der Telefonnummer des Hauses, die Eingaben bleiben. Nie mailto, nie ein Mailprogramm. Ein unsichtbares Feld «website» hält Maschinen ab.
   Der Baustein fängt das Abschicken im Fang-Durchlauf am Dokument ab, bevor assets/uh.js «gesendet» setzt; uh.js bleibt unverändert.
   Ziel: /_werkzeuge/reception/api/formular (anders mit <script … data-api="/pfad"> oder window.WS_ANFRAGE_API). */
(function () {
  'use strict';
  var D = document, skript = D.currentScript;
  var API = window.WS_ANFRAGE_API || (skript && skript.getAttribute('data-api')) || '/_werkzeuge/reception/api/formular';
  var TEL = '0821 / 2185710';
  var wert = function (f, n) { var e = f.querySelector('[name="' + n + '"]'); return e ? String(e.value || '').trim() : ''; };
  D.querySelectorAll('[data-anfrage] form').forEach(function (f) {   // Feld für Maschinen: Menschen sehen es nicht
    if (f.querySelector('[name="website"]')) return;
    var h = D.createElement('input'); h.type = 'text'; h.name = 'website'; h.tabIndex = -1; h.autocomplete = 'off'; h.setAttribute('aria-hidden', 'true');
    h.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0'; f.appendChild(h);
  });
  D.addEventListener('submit', function (e) {
    var f = e.target, box = f && f.closest && f.closest('[data-anfrage]');
    if (!box) return;
    e.preventDefault(); e.stopImmediatePropagation();
    var zeilen = ['Name: ' + wert(f, 'name'), 'Location: ' + (wert(f, 'ort') || 'nicht genannt'), 'Anlass: ' + wert(f, 'anlass'), 'Datum: ' + wert(f, 'datum'),
      'Gruppengröße: ' + wert(f, 'gaeste'), 'E-Mail: ' + wert(f, 'mail')];
    if (wert(f, 'wunsch')) zeilen.push('Persönliche Wünsche: ' + wert(f, 'wunsch'));
    var daten = { formular: 'catering', name: wert(f, 'name'), kontakt: wert(f, 'mail'), ort: wert(f, 'ort'), anlass: wert(f, 'anlass'), datum: wert(f, 'datum'),
      gruppe: wert(f, 'gaeste'), anliegen: (wert(f, 'anlass') || 'Anfrage') + ', ' + wert(f, 'gaeste'), nachricht: zeilen.join('\n'), website: wert(f, 'website'),
      seite: location.pathname + location.hash, seite_name: (D.title || '').split(/ · | \| /)[0].trim() || 'Catering', sprache: 'de' };
    var knopf = f.querySelector('[type=submit]'), alt = f.querySelector('.ws-fehler'); if (alt) alt.remove();
    if (knopf) knopf.disabled = true;
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(daten) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.fehler || 'Fehler ' + r.status); return d; }); })
      .then(function () { box.classList.add('gesendet'); })
      .catch(function (x) {
        var m = D.createElement('p'); m.className = 'hinweis ws-fehler'; m.setAttribute('role', 'alert');
        m.textContent = String(x.message || x).replace(/^[A-ZÄÖÜ]+ · /, '') + ' Deine Eingaben sind noch da. Oder ruf uns an: ' + TEL + '.';
        var u = f.querySelector('.unten'); (u || f).insertBefore(m, u ? u.firstChild : null);
      })
      .then(function () { if (knopf) knopf.disabled = false; });
  }, true);
})();
