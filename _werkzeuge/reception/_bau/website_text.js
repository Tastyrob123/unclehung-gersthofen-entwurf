// Wortlaut der Website von Uncle Hung, wie ein Gast ihn sieht (11.11.2026; Muster: _bau/website_text.js des Culinarium Hannover, nur gelesen).
// innerText jeder Seite, headless, nur lesen. Quelle für _bau/unclehung_wissen.py.
// Aufruf aus dem Projektordner: node _werkzeuge/reception/_bau/website_text.js [basis, Standard ]
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const BASIS = process.argv[2] || '';
const SEITEN = ['index', 'mittag', 'karte', 'matcha', 'abends', 'feiern', 'catering', 'besuch', 'impressum'];
const ZIEL = path.join(__dirname, 'website-text');
(async () => {
  const br = await chromium.launch({ headless: true });
  const c = await br.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await c.route(/^(mailto|tel|sms):/, r => r.abort());
  const p = await c.newPage();
  for (const s of SEITEN) {
    await p.goto(`${BASIS}/${s}.html`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(400);
    const t = await p.evaluate(() => {
      // Wortlaut, nicht die Versalien der Schrift; alles sichtbar machen, was beim Scrollen erst einschwebt
      const st = document.createElement('style'); st.textContent = '*{text-transform:none!important}'; document.head.appendChild(st);
      // Das Anfrage-Formular (Vorführung, «wird nicht verschickt») und sein Dank sind keine Angaben des Hauses; Skripte, Verstecktes weg
      document.querySelectorAll('script,noscript,style,[hidden],[aria-hidden="true"],form,.danke,.wahl-l,svg').forEach(e => e.remove());
      // Überschriften als «## …» (eine Zeile, wie gesprochen): daran teilt «Das weiss der Chat» die Seiten in Abschnitte
      document.querySelectorAll('main h1, main h2, main h3, section h1, section h2, section h3').forEach(h => { const t = (h.getAttribute('aria-label') || h.innerText).replace(/\s+/g, ' ').trim(); if (t) h.innerText = '## ' + t; });
      return document.body.innerText;
    });
    const zeilen = []; const da = new Set();
    // lange Zeilen nur einmal (Doppel aus Kopf und Fuss), Preise und Kurzes bleiben an ihrer Stelle
    for (let z of t.split('\n')) { z = z.replace(/\s+/g, ' ').trim(); if (!z || /^[0-9]$/.test(z) || (z.length >= 25 && da.has(z))) continue; da.add(z); zeilen.push(z); }
    fs.writeFileSync(path.join(ZIEL, s + '.txt'), `Quelle: ${BASIS}/${s}.html\nAbgerufen: ${new Date().toISOString().slice(0, 10)}\n\n` + zeilen.join('\n') + '\n');
    console.log(s, zeilen.length, 'Zeilen');
  }
  await br.close();
})();
