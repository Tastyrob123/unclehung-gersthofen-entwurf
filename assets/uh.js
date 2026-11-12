/* Uncle Hung · Laden, Auftritte, Leiste, Fenster, Zahlen, Favoriten, «heute», Auswahl und Kalender im Hausstil, Vorführ-Anfrage.
   Nur transform und opacity, nativer Scroll. Aufbau nach der Vorlage Walk on the Wild Side (wild.js). */
(function () {
  'use strict';
  var html = document.documentElement;
  var ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]ruhig/.test(location.search);
  if (ruhig) html.classList.add('ruhig');
  var IO = 'IntersectionObserver' in window;
  var PFEIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  /* ---------- Bilder: drei Bildschirme voraus, danach alles Übrige im Leerlauf */
  function zeigen(img) {
    if (img.complete && img.naturalWidth) { img.classList.add('geladen'); return; }
    img.classList.add('lad');
    function fertig() { img.classList.add('geladen', 'blende'); }
    img.addEventListener('load', fertig, { once: true }); img.addEventListener('error', fertig, { once: true });
  }
  function laden(img) {
    if (!img.dataset.srcset) return;
    img.sizes = img.dataset.sizes || '100vw'; img.srcset = img.dataset.srcset; img.removeAttribute('data-srcset'); zeigen(img);
  }
  document.querySelectorAll('img:not([data-srcset])').forEach(zeigen);
  var lader = IO ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { laden(e.target); lader.unobserve(e.target); } });
  }, { rootMargin: '300% 0px 300% 0px' }) : null;
  document.querySelectorAll('img[data-srcset]').forEach(function (img) {
    if (img.closest('.fb')) { laden(img); return; }   /* Fensterbilder stehen fest im Bildschirm: gleich laden */
    lader ? lader.observe(img) : laden(img);
  });
  addEventListener('load', function () {
    var rest = [].slice.call(document.querySelectorAll('img[data-srcset]'));
    var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 200); };
    (function weiter() { if (!rest.length) return; idle(function () { for (var n = 0; n < 3 && rest.length; n++) laden(rest.shift()); weiter(); }); })();
  });

  /* ---------- Auftritte: sobald der Bereich den Rand berührt, einmal */
  var auf = IO && !ruhig ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('da'); auf.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -7% 0px' }) : null;
  document.querySelectorAll('.auf').forEach(function (el) {
    if (el.id === 'auftakt') return;
    auf ? auf.observe(el) : el.classList.add('da');
  });

  /* ---------- Erster Blick komplett: zeigen, wenn alle Bilder im ersten Bild geladen sind */
  var auftakt = document.getElementById('auftakt'), an = false;
  function los() {
    if (an) return; an = true;
    document.querySelectorAll('img').forEach(function (i) { if (i.complete && i.naturalWidth) { i.classList.add('geladen'); i.classList.remove('blende'); } });
    html.classList.add('offen');
    if (auftakt) requestAnimationFrame(function () { auftakt.classList.add('da'); });
  }
  var erste = [].slice.call(document.querySelectorAll('img')).filter(function (b) {
    var r = b.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && !b.closest('.fb');
  });
  if (auftakt) auftakt.querySelectorAll('img').forEach(function (b) { if (erste.indexOf(b) < 0) erste.push(b); });
  erste.forEach(function (b) { b.decoding = 'sync'; laden(b); });
  Promise.all(erste.map(function (b) {
    return new Promise(function (ok) { if (b.complete && b.naturalWidth) ok(); else { b.addEventListener('load', ok, { once: true }); b.addEventListener('error', ok, { once: true }); } });
  })).then(los);
  setTimeout(los, 8000);   /* Rückfall, falls ein Bild nie meldet */
  addEventListener('pageshow', function (e) { if (e.persisted) los(); });
  setInterval(function () { document.querySelectorAll('img.lad:not(.geladen)').forEach(function (i) { if (i.complete && i.naturalWidth) i.classList.add('geladen'); }); }, 700);

  /* ---------- Fenster: Bild steht nur, solange sein Ausschnitt im Bild ist; der Satz rollt bei 38 % */
  document.querySelectorAll('.fenster').forEach(function (f) {
    if (IO) new IntersectionObserver(function (es) { es.forEach(function (e) { f.classList.toggle('an', e.isIntersecting); }); }, { rootMargin: '12% 0px 12% 0px' }).observe(f);
    else f.classList.add('an');
    var z = f.querySelector('.fs');
    if (!z) return;
    if (!IO || ruhig) { z.classList.add('da'); return; }
    var o = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { z.classList.add('da'); o.disconnect(); } }); }, { rootMargin: '0px 0px -38% 0px' });
    o.observe(f);
  });

  /* ---------- Leiste: im Auftakt nie, danach beim Hinaufscrollen; auf Unterseiten oben sichtbar */
  var leiste = document.getElementById('leiste');
  if (leiste) {
    var y0 = scrollY, richt = 0, anker = y0, tick = false;
    var start = auftakt && !auftakt.classList.contains('sk');   /* nur auf der Startseite verbirgt der Auftakt die Leiste */
    var grenze = function () { return start ? auftakt.offsetHeight * .82 : 90; };
    function rechnen() {
      var y = scrollY;
      if ((y - y0) * richt < 0 || (!richt && y !== y0)) { richt = y > y0 ? 1 : -1; anker = y0; }
      var runter = richt > 0 && y - anker > 24, hoch = richt < 0 && anker - y > 24;
      if (start) { if (y < grenze() || runter) leiste.classList.add('weg'); else if (hoch) leiste.classList.remove('weg'); }
      else { if (y < grenze() || hoch) leiste.classList.remove('weg'); else if (runter && y > 200) leiste.classList.add('weg'); }
      y0 = y; tick = false;
    }
    if (start) leiste.classList.add('weg');
    addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(rechnen); } }, { passive: true });
  }
  var mv = document.getElementById('mvoll');
  document.querySelectorAll('[data-menue]').forEach(function (b) { b.addEventListener('click', function () { mv.classList.add('auf-m'); }); });
  if (mv) mv.querySelectorAll('a,.zu').forEach(function (a) { a.addEventListener('click', function () { mv.classList.remove('auf-m'); }); });

  /* ---------- Grosse Zahlen zählen hoch (nur die letzten Schritte bei Jahreszahlen) */
  function zaehlen(el) {
    var ziel = el.dataset.zahl, komma = ziel.indexOf(',') >= 0, wert = parseFloat(ziel.replace('.', '').replace(',', '.'));
    var start = el.dataset.ab ? parseFloat(el.dataset.ab) : 0, t0 = null, dauer = 1900;
    var tausend = ziel.indexOf('.') >= 0;
    function fmt(v) {
      if (komma) return v.toFixed(1).replace('.', ',');
      var s = String(Math.round(v)); return tausend ? s.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : s;
    }
    function schritt(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / dauer), e = 1 - Math.pow(1 - p, 4); el.firstChild.nodeValue = fmt(start + (wert - start) * e); if (p < 1) requestAnimationFrame(schritt); }
    el.firstChild.nodeValue = fmt(start); requestAnimationFrame(schritt);
  }
  var zo = IO && !ruhig ? new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { zaehlen(e.target); zo.unobserve(e.target); } }); }, { rootMargin: '0px 0px -12% 0px' }) : null;
  function zaehlInit(r) { (r || document).querySelectorAll('[data-zahl]').forEach(function (el) { if (zo) zo.observe(el); }); }
  zaehlInit();

  /* ---------- Favoriten: das Gericht steigt aus der Bühne herauf, der Rest bleibt stehen */
  document.querySelectorAll('[data-fav]').forEach(function (box) {
    var knoepfe = [].slice.call(box.querySelectorAll('.fav-liste button')), bilder = [].slice.call(box.querySelectorAll('.bb'));
    var tn = box.querySelector('[data-fav-name]'), tp = box.querySelector('[data-fav-preis]'), tz = box.querySelector('[data-fav-nr]');
    var jetzt = 0;
    function waehle(i) {
      if (i === jetzt) return;
      var bi = +knoepfe[i].dataset.bild, bj = +knoepfe[jetzt].dataset.bild;
      knoepfe[jetzt].classList.remove('an'); knoepfe[i].classList.add('an');
      if (bi !== bj) {
        bilder.forEach(function (b) { b.classList.remove('alt'); });
        bilder[bj].classList.remove('an'); bilder[bj].classList.add('alt');
        var neu = bilder[bi]; neu.classList.remove('an'); void neu.offsetWidth; neu.classList.add('an');
        var lb = neu.querySelector('img[data-srcset]'); if (lb) laden(lb);
      }
      var tafel = box.querySelector('.fav-tafel'), tb = box.querySelector('[data-fav-bs]'), k = knoepfe[i];
      if (tafel) { tafel.classList.add('wechsel'); clearTimeout(tafel._t); tafel._t = setTimeout(function () { tn.textContent = k.dataset.name; tp.textContent = k.dataset.preis; tz.textContent = k.dataset.nr; if (tb) tb.textContent = k.dataset.bs || ''; tafel.classList.remove('wechsel'); }, 180); }
      else { tn.textContent = k.dataset.name; tp.textContent = k.dataset.preis; tz.textContent = k.dataset.nr; }
      jetzt = i;
    }
    knoepfe.forEach(function (k, i) { k.addEventListener('click', function () { waehle(i); }); k.addEventListener('mouseenter', function () { if (matchMedia('(hover:hover)').matches) waehle(i); }); });
  });

  /* ---------- Heute: offen, geschlossen, wann wieder (Mo–Fr 11–14:30 und 17–20:30) */
  function heute() {
    var d = new Date(), t = d.getDay(), m = d.getHours() * 60 + d.getMinutes();
    var werktag = t >= 1 && t <= 5, satz, offen = false;
    var tage = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    if (werktag && m >= 660 && m < 870) { satz = 'Jetzt offen · Lunch bis 14.30 Uhr'; offen = true; }
    else if (werktag && m >= 1020 && m < 1230) { satz = 'Jetzt offen · bis 20.30 Uhr'; offen = true; }
    else if (werktag && m < 660) satz = 'Heute ab 11.00 Uhr';
    else if (werktag && m >= 870 && m < 1020) satz = 'Heute wieder ab 17.00 Uhr';
    else { var n = (t + 1) % 7, k = 1; while (n === 0 || n === 6) { n = (n + 1) % 7; k++; } satz = (k === 1 ? 'Morgen' : 'Am ' + tage[n]) + ' ab 11.00 Uhr'; }
    document.querySelectorAll('[data-heute]').forEach(function (el) { el.querySelector('span').textContent = satz; el.classList.toggle('zu', !offen); });
  }
  heute(); setInterval(heute, 60000);

  /* ---------- Auswahl im Hausstil (nie die Liste des Browsers) */
  function schliesseAlle(aus) { document.querySelectorAll('.wahl.offen').forEach(function (w) { if (w !== aus) w.classList.remove('offen'); }); }
  document.addEventListener('click', function (e) { if (!e.target.closest('.wahl')) schliesseAlle(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') schliesseAlle(); });
  function wahlInit(r) { (r || document).querySelectorAll('.wahl[data-optionen]').forEach(function (w) {
    if (w.dataset.init) return; w.dataset.init = '1';
    var k = w.querySelector('.wahl-k'), l = w.querySelector('.wahl-l'), feld = w.querySelector('input[type=hidden]');
    w.dataset.optionen.split('|').forEach(function (o, i) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = o; if (i === 0) b.classList.add('gew');
      b.addEventListener('click', function () { l.querySelectorAll('button').forEach(function (x) { x.classList.remove('gew'); }); b.classList.add('gew'); k.textContent = o; feld.value = o; w.classList.remove('offen'); });
      l.appendChild(b);
    });
    k.textContent = w.dataset.optionen.split('|')[0]; feld.value = k.textContent;
    k.addEventListener('click', function () { schliesseAlle(w); w.classList.toggle('offen'); });
  });
  }
  wahlInit();

  /* ---------- Kalender im Hausstil */
  var MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  document.querySelectorAll('.wahl[data-kalender]').forEach(function (w) {
    var k = w.querySelector('.wahl-k'), l = w.querySelector('.wahl-l'), feld = w.querySelector('input[type=hidden]');
    var heuteD = new Date(); heuteD.setHours(0, 0, 0, 0);
    var min = new Date(heuteD); min.setDate(min.getDate() + (+w.dataset.vorlauf || 0));
    var gew = new Date(min), ansicht = new Date(min.getFullYear(), min.getMonth(), 1);
    function fmt(d) { return d.getDate() + '. ' + MON[d.getMonth()] + ' ' + d.getFullYear(); }
    function bau() {
      var h = '<div class="kk2"><button type="button" data-z="-1" aria-label="Voriger Monat">‹</button><b>' + MON[ansicht.getMonth()] + ' ' + ansicht.getFullYear() + '</b><button type="button" data-z="1" aria-label="Nächster Monat">›</button></div><div class="tage">';
      ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].forEach(function (t) { h += '<span>' + t + '</span>'; });
      var erst = (ansicht.getDay() + 6) % 7, tageM = new Date(ansicht.getFullYear(), ansicht.getMonth() + 1, 0).getDate();
      for (var i = 0; i < erst; i++) h += '<span></span>';
      for (var d = 1; d <= tageM; d++) {
        var dd = new Date(ansicht.getFullYear(), ansicht.getMonth(), d), aus = dd < min;
        h += '<button type="button" data-t="' + d + '"' + (aus ? ' disabled' : '') + (dd.getTime() === gew.getTime() ? ' class="gew"' : '') + '>' + d + '</button>';
      }
      l.innerHTML = h + '</div>';
      l.querySelectorAll('[data-z]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); ansicht.setMonth(ansicht.getMonth() + (+b.dataset.z)); bau(); }); });
      l.querySelectorAll('[data-t]').forEach(function (b) { b.addEventListener('click', function () { gew = new Date(ansicht.getFullYear(), ansicht.getMonth(), +b.dataset.t); k.textContent = fmt(gew); feld.value = fmt(gew); w.classList.remove('offen'); bau(); }); });
    }
    k.textContent = fmt(gew); feld.value = fmt(gew); bau();
    k.addEventListener('click', function () { schliesseAlle(w); w.classList.toggle('offen'); });
  });

  /* ---------- Anfrage: Vorführung, geht nirgendwohin */
  document.querySelectorAll('[data-anfrage]').forEach(function (box) {
    var f = box.querySelector('form');
    f.addEventListener('submit', function (e) { e.preventDefault(); box.classList.add('gesendet'); });
  });

  /* ---------- Kartenseite: Rubrik in der Leiste markieren */
  var rn = document.querySelector('.rubriknav');
  if (rn && IO) {
    var links = {}; rn.querySelectorAll('a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var ro = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { rn.querySelectorAll('a').forEach(function (a) { a.classList.remove('an'); }); var a = links[e.target.id]; if (a) { a.classList.add('an'); var bx = a.parentElement; bx.scrollLeft = a.offsetLeft - (bx.clientWidth - a.offsetWidth) / 2; } } }); }, { rootMargin: '-30% 0px -60% 0px' });
    document.querySelectorAll('.rubrik[id]').forEach(function (r) { ro.observe(r); });
  }
  /* ---------- Auftakt-Fassungen: ‹ Nummer · Name ›, Pfeiltasten, Wahl bleibt in der Adresse (?held=N) */
  var hw = document.getElementById('heldwahl'), at = document.getElementById('auftakt');
  if (hw && at) {
    var vorlagen = [].slice.call(document.querySelectorAll('template[id^="held-"]')), aktuell = 0;
    function zeige(n, sofort) {
      n = (n + vorlagen.length) % vorlagen.length;
      var t = vorlagen[n];
      at.className = 'auftakt ' + t.dataset.cls;
      at.innerHTML = t.innerHTML;
      at.dataset.held = n; aktuell = n;
      hw.querySelector('b').textContent = n; hw.querySelector('em').textContent = t.dataset.name;
      try { var u = new URL(location.href); u.searchParams.set('held', n); history.replaceState(null, '', u); } catch (e) {}
      heute();
      var bilder = [].slice.call(at.querySelectorAll('img'));
      bilder.forEach(function (b) { b.classList.add('geladen'); });
      var fertig = false;
      function auf() { if (fertig) return; fertig = true; void at.offsetWidth; requestAnimationFrame(function () { at.classList.add('da'); }); }
      if (sofort) { auf(); return; }
      Promise.all(bilder.map(function (b) { return new Promise(function (ok) { if (b.complete && b.naturalWidth) ok(); else { b.addEventListener('load', ok, { once: true }); b.addEventListener('error', ok, { once: true }); } }); })).then(auf);
      setTimeout(auf, 3000);
    }
    var start = parseInt(new URLSearchParams(location.search).get('held'), 10);
    if (start > 0 && start < vorlagen.length) zeige(start, false);
    hw.querySelectorAll('[data-hw]').forEach(function (b) { b.addEventListener('click', function () { zeige(aktuell + (+b.dataset.hw)); }); });
    addEventListener('keydown', function (e) {
      if (/INPUT|TEXTAREA/.test(document.activeElement.tagName) || hw.classList.contains('weg')) return;
      if (e.key === 'ArrowRight') zeige(aktuell + 1); else if (e.key === 'ArrowLeft') zeige(aktuell - 1);
    });
    if (IO) new IntersectionObserver(function (es) { es.forEach(function (e) { hw.classList.toggle('weg', !e.isIntersecting); }); }, { threshold: .35 }).observe(at);
  }

  /* ---------- Wahlleisten für Seitenkopf und Fuss: ‹ Nummer · Name ›, Pfeiltasten, nur sichtbar, solange der Teil im Bild ist (?kopf=N, ?fuss=N) */
  document.querySelectorAll('.wahlleiste[data-wahl]').forEach(function (bar) {
    var g = bar.dataset.wahl, ziel = document.querySelector('[data-wahl-ziel="' + g + '"]');
    var vl = [].slice.call(document.querySelectorAll('template[data-wahl="' + g + '"]'));
    if (!ziel || !vl.length) return;
    var basis = ziel.dataset.basis || '', jetzt = 0, sichtbar = false;
    function zeige(n, ohneAdresse) {
      n = (n + vl.length) % vl.length; var t = vl[n];
      ziel.className = (basis + ' ' + (t.dataset.cls || '')).trim();
      ziel.innerHTML = t.innerHTML; jetzt = n;
      bar.querySelector('b').textContent = n; bar.querySelector('em').textContent = t.dataset.name;
      if (!ohneAdresse) try { var u = new URL(location.href); u.searchParams.set(g, n); history.replaceState(null, '', u); } catch (e) {}
      heute(); wahlInit(ziel); zaehlInit(ziel); if (window.uhKv) window.uhKv(ziel);
      ziel.querySelectorAll('img[data-srcset]').forEach(laden);
      var bilder = [].slice.call(ziel.querySelectorAll('img'));
      bilder.forEach(function (b) { b.classList.add('geladen'); });
      var fertig = false;
      function auf() { if (fertig) return; fertig = true; void ziel.offsetWidth; requestAnimationFrame(function () { ziel.classList.add('da'); ziel.querySelectorAll('.auf').forEach(function (x) { x.classList.add('da'); }); }); }
      Promise.all(bilder.map(function (b) { return new Promise(function (ok) { if (b.complete && b.naturalWidth) ok(); else { b.addEventListener('load', ok, { once: true }); b.addEventListener('error', ok, { once: true }); } }); })).then(auf);
      setTimeout(auf, 2500);
    }
    var start = parseInt(new URLSearchParams(location.search).get(g), 10);
    if (start > 0 && start < vl.length) zeige(start, true);
    bar.querySelectorAll('[data-w]').forEach(function (b) { b.addEventListener('click', function () { zeige(jetzt + (+b.dataset.w)); }); });
    addEventListener('keydown', function (e) {
      if (!sichtbar || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
      if (e.key === 'ArrowRight') zeige(jetzt + 1); else if (e.key === 'ArrowLeft') zeige(jetzt - 1);
    });
    if (IO) new IntersectionObserver(function (es) { es.forEach(function (e) { sichtbar = e.isIntersecting; bar.classList.toggle('weg', !sichtbar); }); }, { threshold: g === 'fuss' ? .25 : .35 }).observe(ziel);
    else bar.classList.remove('weg');
    if (location.hash === '#fuss' && g === 'fuss') setTimeout(function () { ziel.scrollIntoView(); }, 600);
  });

  window.UH = { PFEIL: PFEIL };
})();

/* ---------- Verhalten der Seitenköpfe (data-kv), auch nach dem Wechsel einer Fassung */
(function () {
  var TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  var MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  function stunde() { var d = new Date(); return d.getHours() + d.getMinutes() / 60; }
  function offen() { var d = new Date(), t = d.getDay(), h = stunde(); if (t === 0 || t === 6) return 0; if (h >= 11 && h < 14.5) return 1; if (h >= 17 && h < 20.5) return 2; return 0; }
  function eins(el, sel) { return el.querySelector(sel); }
  function knoepfe(el, sel, fn) { var bs = [].slice.call(el.querySelectorAll(sel)); bs.forEach(function (b, i) { b.addEventListener('click', function () { bs.forEach(function (x) { x.classList.remove('an'); }); b.classList.add('an'); fn(b, i); }); b.addEventListener('mouseenter', function () { if (matchMedia('(hover:hover)').matches) b.click(); }); }); }
  var V = {
    anzahl: function (el) { knoepfe(el, '.n-wahlen button', function (b) { el.querySelectorAll('.n-ergebnis').forEach(function (x) { x.hidden = x.dataset.e !== b.dataset.a; }); }); },
    wochentag: function (el) { var t = new Date().getDay(), s = el.querySelector('[data-t="' + (t === 0 ? 7 : t) + '"]'); if (s) s.classList.add('an'); var p = eins(el, '[data-satz]'); p.textContent = (t === 0 || t === 6) ? 'Heute ist ' + TAGE[t] + ', Lunch wieder ab Montag, 11.00 Uhr.' : 'Heute ist ' + TAGE[t] + ': Lunchdeals bis 14.00 Uhr.'; },
    lnummer: function (el) { var z = eins(el, '[data-name-ziel]'); knoepfe(el, 'button', function (b) { z.textContent = b.dataset.name; }); },
    spur: function (el) {
      var bilder = JSON.parse(el.dataset.bilder), n = 0, letzte = 0, lx = -999, ly = -999;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, jetzt = performance.now();
        if (Math.hypot(x - lx, y - ly) < 110 || jetzt - letzte < 90) return; lx = x; ly = y; letzte = jetzt;
        var i = document.createElement('img'); i.src = bilder[n++ % bilder.length]; i.className = 'n-spurbild'; i.alt = '';
        i.style.left = x + 'px'; i.style.top = y + 'px'; el.appendChild(i);
        requestAnimationFrame(function () { i.classList.add('da'); });
        setTimeout(function () { i.classList.add('weg'); }, 700); setTimeout(function () { i.remove(); }, 1500);
      });
    },
    rubriktabs: function (el) {
      var R = JSON.parse(el.dataset.r), t = eins(el, '[data-t]'), l = eins(el, '[data-l]'), a = eins(el, '[data-a]');
      function zeig(i) { var r = R[i]; t.textContent = r[0]; l.innerHTML = r[2].map(function (x) { return '<li>' + x.replace(/</g, '&lt;') + '</li>'; }).join('') + (r[3] > 6 ? '<li class="mehr">und ' + (r[3] - 6) + ' weitere</li>' : ''); a.href = '#' + r[1]; a.textContent = 'Zur Rubrik ' + r[0]; }
      knoepfe(el, '.n-tabliste button', function (b, i) { zeig(i); }); zeig(0);
    },
    suche: function (el) {
      var A = JSON.parse(el.dataset.alle), inp = eins(el, 'input'), ul = eins(el, '[data-erg]');
      function such() { var q = inp.value.trim().toLowerCase(); if (q.length < 2) { ul.innerHTML = ''; return; }
        var t = A.filter(function (x) { return (x[0] + ' ' + x[1]).toLowerCase().indexOf(q) >= 0; }).slice(0, 5);
        ul.innerHTML = t.length ? t.map(function (x) { return '<li><b>' + (x[2] || '') + '</b><span>' + x[0] + '</span><small>' + x[1] + '</small></li>'; }).join('') : '<li class="leer">Nichts gefunden, frag gern am Tisch.</li>'; }
      inp.addEventListener('input', such);
    },
    zufall: function (el) {
      var A = JSON.parse(el.dataset.alle), r = eins(el, '[data-r]'), t = eins(el, '[data-t]'), b = eins(el, '[data-b]'), letzt = -1;
      function neu() { var i; do { i = Math.floor(Math.random() * A.length); } while (i === letzt && A.length > 1); letzt = i; el.classList.remove('neu'); void el.offsetWidth; el.classList.add('neu'); r.textContent = A[i][1]; t.textContent = A[i][0]; b.textContent = A[i][2] || ''; }
      eins(el, 'button').addEventListener('click', neu); neu();
    },
    allergen: function (el) { var z = eins(el, '[data-w-ziel]'); knoepfe(el, 'button', function (b) { z.innerHTML = '<b>' + b.textContent + '</b> ' + b.dataset.w; }); },
    tagabend: function (el) { var h = stunde(), abend = h >= 16.5 || h < 6; el.classList.toggle('abend', abend); var s = el.parentNode.querySelector('[data-satz]'); if (s) s.textContent = abend ? 'Jetzt am Abend' : 'Heute ab 17.00 Uhr'; },
    raumwahl: function (el) { var bs = el.querySelectorAll('.n-ortbilder .hk'); knoepfe(el, '.n-ortworte button', function (b, i) { bs.forEach(function (x, j) { x.classList.toggle('an', j === i); }); }); },
    schieber: function (el) {
      var o = eins(el, '.n-oben'), g = eins(el, '.n-griff'), zieh = false;
      function set(x) { var r = el.getBoundingClientRect(), p = Math.max(.04, Math.min(.96, (x - r.left) / r.width)); o.style.clipPath = 'inset(0 ' + (100 - p * 100) + '% 0 0)'; g.style.transform = 'translateX(' + (p * r.width) + 'px)'; }
      el.addEventListener('pointerdown', function (e) { zieh = true; el.setPointerCapture(e.pointerId); set(e.clientX); });
      el.addEventListener('pointermove', function (e) { if (zieh || matchMedia('(hover:hover)').matches) set(e.clientX); });
      el.addEventListener('pointerup', function () { zieh = false; });
      var r = el.getBoundingClientRect(); set(r.left + r.width * .5);
    },
    persona: function (el) { var bs = el.querySelectorAll('.hk'); knoepfe(el.parentNode, '.n-personawahl button', function (b, i) { bs.forEach(function (x, j) { x.classList.toggle('an', j === i); }); }); },
    ziehen: function (el) {
      var i = eins(el, '.n-breit'), x = 0, sx = 0, start = 0, zieh = false;
      function max() { return Math.max(0, i.offsetWidth - el.offsetWidth); }
      function set(v) { x = Math.max(-max(), Math.min(0, v)); i.style.transform = 'translateX(' + x + 'px)'; }
      el.addEventListener('pointerdown', function (e) { zieh = true; sx = e.clientX; start = x; el.setPointerCapture(e.pointerId); el.classList.add('zieht'); });
      el.addEventListener('pointermove', function (e) { if (zieh) set(start + e.clientX - sx); });
      el.addEventListener('pointerup', function () { zieh = false; el.classList.remove('zieht'); });
      set(-max() / 2);
    },
    datum: function (el) { var d = new Date(); eins(el, '[data-tag]').textContent = TAGE[d.getDay()] + ', ' + d.getDate() + '. ' + MON[d.getMonth()]; },
    status: function (el) { var o = offen(), b = eins(el, '[data-gross]'); b.textContent = o === 1 ? 'Jetzt offen, mittags.' : o === 2 ? 'Jetzt offen, abends.' : 'Gerade geschlossen.'; el.classList.toggle('zu', !o); },
    essen: function (el) { el.querySelectorAll('.n-antworten button').forEach(function (b) { b.addEventListener('click', function () { el.querySelectorAll('.n-antworten button').forEach(function (x) { x.classList.toggle('an', x === b); }); el.querySelectorAll('.n-antwort').forEach(function (x) { x.hidden = x.dataset.x !== b.dataset.a; }); }); }); },
    gantt: function (el) {
      var d = new Date(), t = (d.getDay() + 6) % 7, h = stunde(), j = eins(el, '[data-jetzt]');
      var sp = el.querySelectorAll('.n-gspur')[t]; if (sp) sp.parentNode.classList.add('heute');
      if (h < 10 || h > 22) { j.hidden = true; return; }
      j.style.setProperty('--h', h); j.style.setProperty('--z', t);
    },
    chat: function (el) {
      var f = eins(el, 'form'), inp = eins(el, 'input'), v = eins(el, '[data-verlauf]');
      f.addEventListener('submit', function (e) { e.preventDefault(); var q = inp.value.trim(); if (!q) return; inp.value = '';
        var a = document.createElement('div'); a.className = 'n-blase du'; a.textContent = q; v.appendChild(a);
        setTimeout(function () { var b = document.createElement('div'); b.className = 'n-blase von'; b.textContent = 'Danke dir! Am schnellsten erreichst du uns unter 0821 / 2185710, Montag bis Freitag mittags und abends.'; v.appendChild(b); }, 900); });
    }
  };
  function init(root) { (root || document).querySelectorAll('[data-kv]').forEach(function (el) { if (el.dataset.kvInit) return; el.dataset.kvInit = '1'; var f = V[el.dataset.kv]; if (f) try { f(el); } catch (e) { console.warn(e); } }); }
  window.uhKv = init;
  if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', function () { init(); });
})();

/* Allergen-Seite: Karten nach echter Höhe auf drei Spalten verteilen, damit die Spalten ohne grosse Lücke bündig enden */
(function () {
  function ausgleich() {
    document.querySelectorAll('[data-ausgleich]').forEach(function (g) {
      var sp = [].slice.call(g.querySelectorAll(':scope > .alg-sp')), K = sp.length; if (K < 2 || K > 3) return;
      var k = []; sp.forEach(function (s) { k = k.concat([].slice.call(s.children)); });
      if (getComputedStyle(g).gridTemplateColumns.split(' ').length < K) return;
      k.forEach(function (x) { x.style.flexGrow = '0'; });
      var h = k.map(function (x) { return x.getBoundingClientRect().height + 26; }), n = k.length, best = null;
      function summe(a, b) { var z = 0; for (var t = a; t < b; t++) z += h[t]; return z; }
      if (K === 2) { for (var i = 1; i < n; i++) { var m = Math.max(summe(0, i), summe(i, n)); if (!best || m < best[0]) best = [m, i, n]; } }
      else for (var i2 = 1; i2 < n - 1; i2++) for (var j = i2 + 1; j < n; j++) { var m2 = Math.max(summe(0, i2), summe(i2, j), summe(j, n)); if (!best || m2 < best[0]) best = [m2, i2, j]; }
      k.forEach(function (x, t) { sp[t < best[1] ? 0 : t < best[2] ? 1 : 2].appendChild(x); x.style.flexGrow = ''; });
    });
  }
  if (document.querySelector('[data-ausgleich]')) { addEventListener('load', ausgleich); var zt; addEventListener('resize', function () { clearTimeout(zt); zt = setTimeout(ausgleich, 200); }); if (document.fonts) document.fonts.ready.then(ausgleich); }
})();
