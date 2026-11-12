/* Prüfseite · Markenbuch · Uncle Hung (R23). Prüft ohne das Werkzeug: Browser, Server-Teil (api/stand), Daten (livre.json), Markenbuch, Anleitung,
   Dateien (Marken-ZIP, Beispiel, Vorschauen), die mitgeschriebenen Browserfehler (hier im Browser und auf dem Server) und erklärt jedes Stichwort. */
'use strict';
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LEX = [
    ['BROWSER', 'Eine Funktion des Browsers fehlt.', 'Sehr alter Browser oder ein privates Fenster mit Sperren.', 'Aktuellen Safari, Chrome oder Firefox nehmen.'],
    ['SERVER', 'Der Server-Teil antwortet nicht.', 'Der Server des Markenbuchs läuft nicht.', 'Server starten: python3 _werkzeuge/livre/server.py 9475, dann neu laden.'],
    ['DATEN', 'livre.json fehlt oder ist unvollständig.', 'Der Bau ist nicht gelaufen oder abgebrochen.', 'python3 _werkzeuge/livre/bau.py laufen lassen.'],
    ['BUCH', 'Das Markenbuch öffnet nicht.', 'buch.html fehlt.', 'Neu bauen (bau.py baut das Buch mit).'],
    ['DATEI', 'Eine Datei der Marke fehlt.', 'Der Bau ist nicht ganz durchgelaufen.', 'Neu bauen und hier noch einmal prüfen.'],
    ['PRUEFUNG', 'Die Markenprüfung antwortet mit Probe.', 'Die Prüfung mit KI ist in der Demo ausgeschaltet; die Farben werden trotzdem gemessen.', 'Nichts zu tun. Eingeschaltet wird sie nur auf Wunsch.'],
    ['FEHLER', 'Im Browser ist ein Skriptfehler aufgetreten.', 'Steht unten mit Zeit, Seite und Stelle.', 'Seite neu laden; bleibt er, die Zeile weitergeben.']];
  $('#lex').innerHTML = LEX.map(([k, s, g, t]) => `<article id="lex-${k.toLowerCase()}"><h3>${k.replace('UE', 'Ü')}</h3><p><b>Sehen:</b> ${esc(s)}</p><p><b>Grund:</b> ${esc(g)}</p><p><b>Tun:</b> ${esc(t)}</p></article>`).join('');
  const zeile = (stufe, was, satz, stw) => `<div class="z ${stufe}"><i></i><b>${esc(was)}</b><span>${esc(satz)}</span>${stw ? `<a href="#lex-${stw.toLowerCase()}">${stw.replace('UE', 'Ü')}</a>` : '<a></a>'}</div>`;
  async function holen(u, art) { try { const r = await fetch(u, { cache: 'no-store', method: art || 'GET' }); return r; } catch (e) { return null; } }
  async function pruefe() {
    const z = [];
    const fehlt = ['fetch', 'IntersectionObserver', 'Promise'].filter(x => !(x in window));
    let ls = true; try { localStorage.setItem('uh-livre-probe', '1'); localStorage.removeItem('uh-livre-probe'); } catch (e) { ls = false; }
    z.push(fehlt.length ? zeile('rot', 'Browser', 'Es fehlt: ' + fehlt.join(', '), 'BROWSER') : zeile(ls ? '' : 'gelb', 'Browser', ls ? 'Alle Funktionen da.' : 'Alle Funktionen da; der Browser merkt sich keine Ansicht (privates Fenster).', ls ? '' : 'BROWSER'));
    const st = await holen('api/stand');
    let j = null; if (st && st.ok) try { j = await st.json(); } catch (e) { j = null; }
    z.push(j ? zeile('', 'Server-Teil', `Antwortet: ${j.fotos} Fotos, ${j.dateien} Dateien, Stand ${j.datum}.`, '') : zeile('rot', 'Server-Teil', 'Keine Antwort von api/stand.', 'SERVER'));
    if (j) z.push(zeile(j.pruefung_ki ? '' : '', 'Markenprüfung', j.pruefung_ki ? 'Mit KI eingeschaltet.' : 'Farben gemessen ohne KI, der Rest antwortet als Probe (Demo).', 'PRUEFUNG'));
    const d = await holen('livre.json');
    let L = null; if (d && d.ok) try { L = await d.json(); } catch (e) { L = null; }
    const form = L && Array.isArray(L.fotos) && Array.isArray(L.farben) && Array.isArray(L.dateien) && L.stand;
    z.push(form ? zeile('', 'Daten', `livre.json mit ${L.fotos.length} Fotos in ${L.bereiche.length} Bereichen, ${L.farben.length} Farben, ${L.schriften.length} Schriften.`, '') : zeile('rot', 'Daten', 'livre.json fehlt oder ist unvollständig.', 'DATEN'));
    for (const [u, was, stw] of [['buch.html', 'Markenbuch', 'BUCH'], ['anleitung.html', 'Anleitung', 'BUCH'], ['dateien/uncle-hung-marke.zip', 'Alle Dateien (ZIP)', 'DATEI'], ['dateien/uncle-hung-schriften.zip', 'Schriften (ZIP)', 'DATEI'], ['beispiel/pruefung.json', 'Beispiel der Markenprüfung', 'DATEI']]) {
      const r = await holen(u, 'HEAD');
      z.push(r && r.ok ? zeile('', was, 'Abrufbar (' + u.split('/').pop() + ').', '') : zeile('rot', was, 'Nicht abrufbar (' + (r ? r.status : 'kein Netz') + ').', stw));
    }
    if (form) {
      const probe = L.fotos.filter((f, i) => i % 23 === 0);
      let ok = 0; for (const f of probe) { const r = await holen(f.fs, 'HEAD'); if (r && r.ok) ok++; }
      z.push(ok === probe.length ? zeile('', 'Vorschauen', `${ok} von ${probe.length} Stichproben abrufbar.`, '') : zeile('gelb', 'Vorschauen', `${ok} von ${probe.length} Stichproben abrufbar.`, 'DATEI'));
    }
    $('#stand').innerHTML = z.join('');
    let lok = []; try { lok = JSON.parse(localStorage.getItem('uh-livre-fehler') || '[]'); } catch (e) { lok = []; }
    const fs = await holen('api/fehlerliste');
    let srv = null; if (fs && fs.ok) try { srv = await fs.json(); } catch (e) { srv = null; }
    const liste = lok.map(e => ['Dieser Browser', e]).concat(((srv && srv.letzte) || []).map(e => ['Server', e]));
    $('#fehler').innerHTML = liste.length ? liste.map(([wo, e]) => zeile('gelb', wo + ' · ' + String(e.zeit || e.eingang || '').slice(0, 16).replace('T', ' '), `${e.text || ''} · ${e.seite || ''} · ${e.wo || ''}`, 'FEHLER')).join('')
      : `<p class="leer">Keine Fehler mitgeschrieben${srv ? ' (Server: ' + srv.anzahl + ')' : ''}.</p>`;
  }
  $('#neu').onclick = pruefe;
  let sicher = false;
  $('#leeren').onclick = e => {
    if (!sicher) { sicher = true; e.target.textContent = 'Wirklich löschen? Noch einmal tippen'; setTimeout(() => { sicher = false; e.target.textContent = 'Fehler in diesem Browser löschen'; }, 4000); return; }
    try { localStorage.removeItem('uh-livre-fehler'); } catch (x) { /* privat */ }
    sicher = false; e.target.textContent = 'Fehler in diesem Browser löschen'; pruefe();
  };
  /* Auftritte: was unter dem ersten Bildschirm steht, schwebt beim Hereinscrollen an seinen Platz */
  pruefe().then(() => {
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('da'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -6% 0px' }) : null;
    document.querySelectorAll('[data-a]').forEach(el => { const b = el.getBoundingClientRect(); if (!io || b.top < innerHeight) el.classList.add('da'); else io.observe(el); });
  });
})();
