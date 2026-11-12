/* pruefung-vorher.js · Prüfseite im Rahmen von Uncle Hung (11.11.2026), vor pruefung.js des Stamms geladen. Die Prüfseite fragt Dateien des Werkzeugs
   (website.js, website.css, welt.css, welt.js) nur nach dem Status ab und liest die Antwort nie; im Browser bleiben diese Abrufe dann offen, die Seite kommt
   nie zur Ruhe (oberflaeche_pruefen.js Punkt 7: «Seite lädt nicht», networkidle). Hier wird die Antwort solcher Abrufe still zu Ende gelesen. Sonst nichts. */
(function () {
  var alt = window.fetch; if (!alt) return;
  window.fetch = function (u) {
    return alt.apply(this, arguments).then(function (r) {
      try { if (typeof u === 'string' && /^(index\.html|website\.(js|css)|\/stamm\/welt\.(css|js))$/.test(u)) r.clone().arrayBuffer().catch(function () {}); } catch (e) { }
      return r;
    });
  };
})();
