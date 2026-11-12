/* Markenbuch · «Als PDF sichern» fünfmal hintereinander, direkt nach dem Öffnen (Fehlerbuch 10a 21.10.2026: Warten über addEventListener, nie onload),
   Chromium und WebKit, 1440 und 390; dazu die PDF selbst (Chromium, A4 quer) → belege/markenbuch-als-pdf.pdf.  node pruefung/pdf5.js */
const pw = require('playwright'), path = require('path');
const U = (process.env.BASIS || '/') + '_werkzeuge/livre/buch.html';
(async () => {
  const zeilen = [];
  for (const m of ['chromium', 'webkit']) for (const [w, h] of [[1440, 900], [390, 844]]) {
    const b = await pw[m].launch(); const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.addInitScript(() => { window.__druck = 0; window.print = () => { window.__druck++; }; });
    let n = 0;
    for (let i = 0; i < 5; i++) {
      await p.goto(U, { waitUntil: 'domcontentloaded' });
      await p.locator('#bu-pdf').click(); if (i % 2) await p.locator('#bu-pdf').click();
      await p.waitForFunction(() => window.__druck > 0, null, { timeout: 15000 }).catch(() => {});
      if (await p.evaluate(() => window.__druck > 0 && [...document.images].every(x => x.complete && x.naturalWidth))) n++;
    }
    zeilen.push(`${m} ${w}: ${n} von 5 Mal Druck, alle Bilder geladen`);
    if (m === 'chromium' && w === 1440) { await p.emulateMedia({ media: 'print' }); await p.pdf({ path: path.join(__dirname, 'belege', 'markenbuch-als-pdf.pdf'), format: 'A4', landscape: true, printBackground: true, preferCSSPageSize: true }); }
    await b.close();
  }
  console.log(zeilen.join('\n'));
})();
