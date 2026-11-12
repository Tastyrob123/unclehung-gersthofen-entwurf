/* schreibung.js · ß-Schicht für «Website bearbeiten» (Uncle Hung Gersthofen, 11.11.2026). Uncle Hung liegt in Bayern: deutsche Schreibung mit ß (CLAUDE.md).
   Der Stamm (website.js, pruefung.js, Meldungen aus api.py) schreibt Schweizerisch («Grösse», «Fuss», «aussen»); der Stamm bleibt unverändert, diese Schicht
   ersetzt in Textknoten und in den Attributen title, placeholder, aria-label der Oberfläche eine feste Wortliste. Nicht angefasst werden: Eingabefelder,
   bearbeitbare Felder, die Website-Vorschau (iframe, eigenes Dokument), Code, Adressen. Die Liste ist aus den Fundstellen im Stamm gebaut (grep über
   website.js, pruefung.js, api.py am 11.11.2026); nur ganze Wörter, Gross-/Kleinschreibung wie gefunden. Bewusst nicht: «Masse» (dort ein Schlüssel,
   kein Wort), «Schluss», «Fluss», «Abschluss», «geschlossen», «Adresse», «lässt», «muss», «dass». Läuft im Werkzeug (nach website.js) und auf der Prüfseite. */
(function () {
  var W = {
    'Grösse': 'Größe', 'Grössen': 'Größen', 'grösser': 'größer', 'grösste': 'größte', 'Liefergrössen': 'Liefergrößen',
    'Gross': 'Groß', 'gross': 'groß', 'grosse': 'große', 'grossen': 'großen', 'grosser': 'großer',
    'Fuss': 'Fuß', 'Füsse': 'Füße', 'aussen': 'außen', 'Aussen': 'Außen', 'Aussenfoto': 'Außenfoto', 'ausserhalb': 'außerhalb', 'ausser': 'außer',
    'draussen': 'draußen', 'Schliessen': 'Schließen', 'schliessen': 'schließen', 'schliesst': 'schließt', 'Strasse': 'Straße',
    'heisst': 'heißt', 'liess': 'ließ', 'liesse': 'ließe', 'weiss': 'weiß', 'Mass': 'Maß', 'Massstab': 'Maßstab', 'gleichmässig': 'gleichmäßig', 'Grüsse': 'Grüße'
  };
  var RE = new RegExp('(^|[^A-Za-zÄÖÜäöüß])(' + Object.keys(W).sort(function (a, b) { return b.length - a.length; }).join('|') + ')(?![A-Za-zÄÖÜäöüß])', 'g');
  var NIE = 'input,textarea,select,option,script,style,code,pre,kbd,samp,iframe,[contenteditable=""],[contenteditable="true"],[data-uh-roh]';
  function tausch(t) { return t.replace(RE, function (m, vor, w) { return vor + W[w]; }); }
  function knoten(n) {
    if (n.nodeType === 3) {
      var p = n.parentElement; if (!p || p.closest(NIE)) return;
      var v = n.nodeValue; if (!v || !/ss|Füsse|Grüsse/.test(v) || /^\s*(https?:|\/|mailto:|tel:)/.test(v)) return;
      var neu = tausch(v); if (neu !== v) n.nodeValue = neu;
    } else if (n.nodeType === 1) {
      if (n.closest(NIE) && !/^(INPUT|TEXTAREA)$/.test(n.tagName)) return;
      ['title', 'placeholder', 'aria-label'].forEach(function (a) { var v = n.getAttribute(a); if (v && /ss/.test(v)) { var neu = tausch(v); if (neu !== v) n.setAttribute(a, neu); } });
      if (n.closest(NIE)) return;
      for (var c = n.firstChild; c; c = c.nextSibling) knoten(c);
    }
  }
  function alles() { knoten(document.body); if (/ss/.test(document.title)) document.title = tausch(document.title); }
  function los() {
    alles();
    new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        if (m.type === 'characterData') knoten(m.target);
        else if (m.type === 'attributes') knoten(m.target);
        else m.addedNodes.forEach(knoten);
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['title', 'placeholder', 'aria-label'] });
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', los) : los();
})();
