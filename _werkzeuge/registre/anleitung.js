/* Anleitung Besucher · Uncle Hung Gersthofen (Vorlage Schäfli): Bild gross mit Klick, Esc schließt; das Zeichen des Hauses (die Schale, kleid/unclehung-zeichen.svg)
   (eigene Datei: online laufen eingebettete Skripte ohne Prüfsumme nicht). */
(function () {
  var g = document.getElementById('gross'), im = g.querySelector('img');
  function zu() { g.hidden = true; }
  document.addEventListener('click', function (e) { var b = e.target.closest('.bild'); if (b) { im.src = b.querySelector('img').src; im.alt = b.querySelector('img').alt; g.hidden = false; } else if (e.target.closest('#gross')) zu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') zu(); });
  fetch('/assets/oberflaeche/kleid/unclehung-zeichen.svg').then(function (r) { return r.text(); }).then(function (t) { var m = t.match(/<svg[^>]*>([\s\S]*)<\/svg>/); if (m) document.getElementById('zeichen').innerHTML = m[1]; }).catch(function () {});
  /* Auftritte (Prüfpunkt 11): Themen und Kapitel unter dem ersten Bildschirm liegen tiefer und schweben beim Hereinscrollen herein; im ersten Bild steht alles sofort */
  if (!matchMedia('(prefers-reduced-motion:reduce)').matches && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('schwebt'); x.target.classList.remove('unten'); io.unobserve(x.target); } }); }, { rootMargin: '0px 0px -6% 0px' });
    [].forEach.call(document.querySelectorAll('.thema, .kap__t, .kap__b, .fuss'), function (el) { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('unten'); io.observe(el); } });
  }
})();
