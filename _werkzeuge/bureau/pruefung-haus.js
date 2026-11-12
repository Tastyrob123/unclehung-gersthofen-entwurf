/* pruefung-haus.js · Prüfseite im Rahmen von Uncle Hung (11.11.2026, Kopie der Vorlage Schäfli): Name des Werkzeugs aus der einen Stelle, «Zum Werkzeug» führt in dieses Werkzeug, nicht in den Stamm. */
(function () {
  var z = document.getElementById('wsp-zurueck'); if (z) z.href = '/_werkzeuge/bureau/';
  var n = window.WO_HAUS && WO_HAUS.namen && WO_HAUS.namen.website;
  if (n) { document.querySelectorAll('[data-werkzeug]').forEach(function (e) { e.textContent = n; }); document.title = 'Prüfung · ' + n + ' · ' + WO_HAUS.name; }
})();
/* Auftritte (11.11.2026, wie anleitung.html): was unter dem ersten Bildschirm steht, schwebt beim Hereinscrollen herein; nur transform und opacity */
(function () {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  function los() {
    var H = innerHeight, n = 0, io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('as-da'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -6% 0px' });
    [].forEach.call(document.querySelectorAll('.wsp-seite > .wsp-teil'), function (e) {
      var r = e.getBoundingClientRect();
      if (r.top + scrollY > H * 1.02) { e.classList.add('as-k'); e.style.setProperty('--as-v', (n++ % 3) * 90 + 'ms'); io.observe(e); }
    });
    document.documentElement.classList.add('as-an');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', los); else los();
})();
