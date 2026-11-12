/* Besucher · Uncle Hung Gersthofen: Zählung auf der Website (Tasty Studios 11.11.2026). NUR VORSCHLAG, nicht eingebaut: die Website läuft lokal auf einem
   reinen Dateiserver (python3 -m http.server), der /api/registre nicht annimmt; jede Seite zeigte dann den Konsolenfehler «501» (Fehlerbuch 10a, 28.10.2026).
   Eingebaut wird sie erst, wenn der Server der Website /api/registre annimmt, und auf das gemeinsame Wort mit der Familie (dann als assets/messung.js,
   auf jeder Seite vor </body> nach uh.js). Vorlage: vorschlag/messung.js der Taverne zum Schäfli, Ereignisse von Uncle Hung.

   Je Seite geht eine Zeile an /api/registre (lokal der Server «Besucher», später der Hausserver, gleiche Adresse):
       r1 <seitenaufruf> <datei> <sprache> <geraet> <sekunden> <ereignisse|-> <herkunft|->
   einmal beim Öffnen (0 Sekunden), bei jedem gezählten Klick und beim Verlassen (Sekunden, in denen die Seite sichtbar war).
   Ohne Cookies und ohne Kennung im Gerät: «seitenaufruf» ist eine Zufallsfolge, die nur in dieser Variablen lebt und mit der Seite endet.
   «herkunft» ist nur der Name der Website, von der der Gast kam (zum Beispiel www.instagram.com), nie die ganze Adresse.
   Nicht gezählt: automatische Browser, Seiten im Rahmen, Werkzeuge und Werkbank, Geräte mit der Marke «unclehung-nicht-zaehlen» im localStorage.

   Ereignisse (Schlüssel wie in allen Häusern, Bedeutung bei Uncle Hung; aus website/bau.py und website/assets/uh.js):
     anruf    Telefonnummer gewählt: jeder Link tel:+498212185710 («Anrufen», «Tisch reservieren», Nummer im Fuss und auf «Besuch»)
     mail     Mail-Adresse angeklickt (mailto:v.nguyen2@gmx.de)
     route    «Route planen» (Link zu google.com/maps/dir)
     tisch    Anfrage begonnen: Link zu #anfrage («Feier anfragen», «Catering anfragen», «Jetzt anfragen») oder die erste Eingabe im Formular [data-anfrage]
     anfrage  Catering-Anfrage abgeschickt: erst wenn das Formular sein «Danke dir.» zeigt (uh.js setzt dann die Klasse «gesendet» an [data-anfrage])
     fenster  auf der Startseite einen Favoriten gewählt (Knopf in .fav-liste der Schalen-Bühne [data-fav])
     buchung, booking, chat: bei Uncle Hung ohne Weg, werden nie gesendet */
(function () {
  'use strict';
  var n = navigator, d = document, w = window;
  if (w.__registre || !n.sendBeacon || n.webdriver || w.self !== w.top) return;
  try { if (w.localStorage.getItem('unclehung-nicht-zaehlen') === '1') return; } catch (e) { /* privat: zählt normal */ }
  var teile = location.pathname.split('/'), datei = teile.pop() || 'index.html';
  if (teile.length > 2 || /^(_werkzeuge|werkzeuge|werkbank|_werkbank|drucksachen|feed|unterlagen|material|sticker|mails|_sicherung)$/.test(teile[1] || '')) return;   /* nur Seiten in der Wurzel der Website */
  if (!/^[a-z0-9-]{1,60}\.html$/.test(datei)) return;
  w.__registre = 1;
  var SPRACHEN = ' de en fr it nl es pt zh ja ko ar ';
  var sp = String(n.language || 'de').slice(0, 2).toLowerCase();
  if (SPRACHEN.indexOf(' ' + sp + ' ') < 0) sp = 'xx';
  var breit = function (px) { return !!(w.matchMedia && w.matchMedia('(max-width:' + px + 'px)').matches); };
  var geraet = breit(700) ? 'handy' : breit(1060) ? 'tablet' : 'rechner';
  var her = '-';
  try { var r = d.referrer ? new URL(d.referrer).hostname.toLowerCase() : ''; if (r && r !== location.hostname && /^[a-z0-9.-]{3,60}$/.test(r)) her = r; } catch (e) {}
  var HAUS_TEL = /^tel:\+?(498212185710|08212185710)$/;
  var pv, war, liste, sichtbar, seit, gesendet;
  function neu() {
    pv = (Math.random().toString(36) + '000000').slice(2, 8);
    war = {}; liste = []; sichtbar = 0; gesendet = '';
    seit = d.visibilityState === 'hidden' ? 0 : Date.now();
    sende();
  }
  function sek() { return Math.min(1800, Math.round((sichtbar + (seit ? Date.now() - seit : 0)) / 1000)); }
  function sende() {
    var zeile = 'r1 ' + pv + ' ' + datei + ' ' + sp + ' ' + geraet + ' ' + sek() + ' ' + (liste.length ? liste.join(',') : '-') + ' ' + her;
    if (zeile === gesendet) return;
    gesendet = zeile;
    try { n.sendBeacon('/api/registre', zeile); } catch (e) {}   /* wartet auf keine Antwort */
  }
  function zaehle(was) {
    if (war[was]) return;
    war[was] = 1; liste.push(was);
    sende();
  }
  function weg() { if (seit) { sichtbar += Date.now() - seit; seit = 0; } sende(); }
  neu();
  d.addEventListener('visibilitychange', function () { if (d.visibilityState === 'hidden') weg(); else if (!seit) seit = Date.now(); });
  w.addEventListener('pagehide', weg);
  w.addEventListener('pageshow', function (e) { if (e.persisted) neu(); });   /* zurück aus dem Seitenspeicher des Browsers: neuer Aufruf */

  /* Catering-Anfrage: begonnen mit der ersten Eingabe, abgeschickt erst mit «Danke dir.» (Klasse «gesendet», uh.js prüft vorher die Pflichtfelder) */
  var box = d.querySelector('[data-anfrage]');
  if (box) {
    box.addEventListener('input', function () { zaehle('tisch'); }, true);
    box.addEventListener('click', function (e) { if (e.target && e.target.closest && e.target.closest('input,textarea,.wahl-k')) zaehle('tisch'); }, true);
    box.addEventListener('submit', function () {
      var bis = Date.now() + 20000;
      (function schau() { if (box.classList.contains('gesendet')) { zaehle('tisch'); zaehle('anfrage'); return; } if (Date.now() < bis) setTimeout(schau, 250); })();
    }, true);
  }

  d.addEventListener('click', function (e) {
    var t = e.target; if (!t || !t.closest) return;
    if (t.closest('[data-fav] .fav-liste button')) { zaehle('fenster'); return; }
    var a = t.closest('a[href]'); if (!a) return;
    var h = (a.getAttribute('href') || '').replace(/\s/g, ''), host = (a.hostname || '').toLowerCase();
    if (/^tel:/i.test(h)) { if (HAUS_TEL.test(h)) zaehle('anruf'); }
    else if (/^mailto:/i.test(h)) zaehle('mail');
    else if (/(^|\.)google\.[a-z.]+$/.test(host) && /\/maps\/dir/.test(a.pathname || '')) zaehle('route');
    else if (/#anfrage$/.test(h)) zaehle('tisch');
  }, true);
})();
