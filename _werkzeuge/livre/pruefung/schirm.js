/* Bilder je Ansicht (1440 × 900 und 390 × 844), Markenbuch · Uncle Hung. node pruefung/schirm.js [ordner] [browser]
   Ohne feste Zeitzone (Falle 9: falsches Datum). */
const { chromium, webkit } = require('playwright'); const path = require('path'); const fs = require('fs');
const A = '/_werkzeuge/livre/';
const AUS = process.argv[2] || path.join(__dirname, 'belege', 'schirm'); fs.mkdirSync(AUS, { recursive: true });
const BR = process.argv[3] === 'webkit' ? webkit : chromium;
const w = (p, ms) => p.waitForTimeout(ms);
const V = [
  ['uebersicht', '#start', null, false],
  ['fotos', '#bilder', null, false],
  ['foto', '#bilder', async p => { await p.evaluate(() => document.querySelector('#li-raster .li-f[data-k="nudeln"]').scrollIntoView({ block: 'center' })); await w(p, 400); await p.locator('#li-raster .li-f[data-k="nudeln"]').click({ force: true }); await p.waitForSelector('#fenster .li-det'); await w(p, 1200); }, false],
  ['dateien', '#dateien', null, true],
  ['pruefung', '#pruefung', null, true],
  ['markenbuch', 'buch.html', null, true],
  ['anleitung', 'anleitung.html', null, false],
  ['pruefseite', 'pruefung.html', null, false]];
(async () => {
  const b = await BR.launch();
  for (const [name, ziel, vor, ganz] of V) for (const [vw, vh] of [[1440, 900], [390, 844]]) {
    const c = await b.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 }); const p = await c.newPage();
    const fehler = []; p.on('pageerror', e => fehler.push(e.message)); p.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); });
    await p.goto(ziel.endsWith('.html') ? A + ziel : A + ziel, { waitUntil: 'load' }); await w(p, 2600);
    if (vor) await vor(p);
    if (ganz) { const h = await p.evaluate(() => document.documentElement.scrollHeight); for (let y = 0; y < h; y += 500) { await p.evaluate(y => scrollTo(0, y), y); await w(p, 120); } await p.evaluate(() => scrollTo(0, 0)); await w(p, 900); }
    await p.screenshot({ path: path.join(AUS, `livre-${name}-${vw}.png`), fullPage: ganz && vw === 390 ? false : ganz });
    const breit = await p.evaluate(vw => document.documentElement.scrollWidth - vw, vw);
    console.log(name, vw, fehler.length ? 'FEHLER ' + fehler.join(' | ').slice(0, 300) : 'ok', breit > 0 ? 'ÜBERLAUF ' + breit : '');
    await c.close();
  }
  await b.close();
})();
