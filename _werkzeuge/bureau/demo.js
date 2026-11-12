/* demo.js · Website bearbeiten · Uncle Hung (11.11.2026). Rahmen des Hauses um das Werkzeug des Stamms, ändert keine Datei des Stamms.
   1. Demo-Hinweis als ruhige Zeile im Fluss (Master M26, Fehlerbuch 10a «Demo-Sperre»): unter dem Startbild der Übersicht, im Entwurf, in den
      früheren Fassungen und im Fenster «Veröffentlichen». Veröffentlichen schreibt in der Demo nur in die Probe-Kopie, die Website bleibt, wie sie ist.
   2. Hausworte: das Suchfeld in «Zeiten & Preise» nennt Beispiele dieses Hauses statt der Vorlage (Frühstück, CHF, Sauna).
   Nur Text, keine Bewegung, keine Farbe ausser den Werten des Kleids. */
(function () {
  var SATZ = 'Demo: Veröffentlichen schreibt in eine Probe-Kopie der Website. Die Website von Uncle Hung bleibt, wie sie ist.';
  var css = document.createElement('style');
  css.textContent = '.uh-demo{display:flex;align-items:center;gap:10px;margin:-14px 0 26px;font:400 14px/1.5 var(--wo-sans);color:var(--wo-leise)}' +
    '.uh-demo::before{content:"";flex:none;width:7px;height:7px;border-radius:50%;background:var(--wo-akzent)}' +
    '[data-ws-fenster] .uh-demo{margin:14px 0 4px}' +
    '@media (max-width:700px){.uh-demo{margin:-8px 0 20px}}';
  document.head.appendChild(css);
  function zeile() { var p = document.createElement('p'); p.className = 'uh-demo'; p.setAttribute('data-uh-demo', ''); p.textContent = SATZ; return p; }
  function nach() {
    var m = document.getElementById('ws-mitte');
    var a = m && m.getAttribute('data-ws-bereit');
    if (m && /^(start|entwurf|verlauf)$/.test(a || '')) {
      var t = m.querySelector(':scope > .ws-titel--wo, :scope > .wo-sb, :scope > header');
      if (t && !m.querySelector('[data-uh-demo]')) t.insertAdjacentElement('afterend', zeile());
    }
    var f = document.querySelector('[data-ws-fenster="veroeffentlichen"]');
    if (f && !f.querySelector('[data-uh-demo]')) {
      var ort = f.querySelector('.ws-fenster__kn');
      if (ort) ort.insertAdjacentElement('beforebegin', zeile()); else f.appendChild(zeile());
    }
    var s = document.getElementById('ws-suche');
    if (s && /CHF|Sauna/.test(s.placeholder)) s.placeholder = 'zum Beispiel Lunch, €, Uhr';
  }
  var plan = 0;
  function los() {
    new MutationObserver(function () { if (!plan) plan = requestAnimationFrame(function () { plan = 0; nach(); }); })
      .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-ws-bereit'] });
    nach();
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', los) : los();
})();
