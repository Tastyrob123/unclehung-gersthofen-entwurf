/* Anleitung Markenbuch · Bild groß: Klick macht das Bild groß, ein zweiter Klick oder Esc schließt (eigene Datei, keine eingebetteten Skripte, Falle 9). */
'use strict';
(function () {
  var g = document.getElementById('gross'), im = g.querySelector('img');
  function zu() { g.hidden = true; }
  document.addEventListener('click', function (e) { var b = e.target.closest('.bild'); if (b) { im.src = b.querySelector('img').src; im.alt = b.querySelector('img').alt; g.hidden = false; } else if (e.target.closest('#gross')) zu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') zu(); });
})();

/* Auftritte (Fehlerbuch 10a 09.11.2026): was unter dem ersten Bildschirm steht, schwebt beim Hereinscrollen an seinen Platz; nur transform */
(function () {
  document.documentElement.classList.add('js');
  var els = document.querySelectorAll('.kap,.thema,.inhalt>h2,.inhalt>p');
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) { els.forEach(function (e) { e.classList.add('da'); }); return; }
  var io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('da'); io.unobserve(x.target); } }); }, { rootMargin: '0px 0px -6% 0px' });
  els.forEach(function (e) { if (e.getBoundingClientRect().top < innerHeight) e.classList.add('da'); else io.observe(e); });
})();
