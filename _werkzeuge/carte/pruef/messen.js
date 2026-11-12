// Karten & Preislisten · Uncle Hung: misst im echten Satz (Chromium, satz.css, Schriften geladen) die Höhe jedes Blocks (.mx[data-i]) und den Platz
// der Spalten #platz1 (erste Seite), #platz (weitere Seiten), #platzL (letzte Seite mit Legende), alles in mm. Aufruf aus satz_bau.py.
// node pruef/messen.js <datei.html>
const { chromium } = require('playwright');
(async () => {
  const datei = process.argv[2];
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1000, height: 1400 } });
  await p.goto('file://' + datei);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(150);
  const r = await p.evaluate(() => {
    const mm = 96 / 25.4;
    const h = el => { const s = getComputedStyle(el); return (el.getBoundingClientRect().height + parseFloat(s.marginTop) + parseFloat(s.marginBottom)) / mm; };
    const hoehen = [...document.querySelectorAll('.mx')].map(el => {
      const k = el.firstElementChild; const s = getComputedStyle(k);
      return (el.getBoundingClientRect().height + parseFloat(s.marginTop) + parseFloat(s.marginBottom)) / mm;
    });
    const platz = id => { const el = document.getElementById(id); return el ? el.getBoundingClientRect().height / mm : 0; };
    return { hoehen, platz1: platz('platz1'), platz: platz('platz'), platzL: platz('platzL') };
  });
  console.log(JSON.stringify(r));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
