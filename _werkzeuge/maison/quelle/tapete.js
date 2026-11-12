/* Tapeten des Kleids (_werkzeuge/oberflaeche/kleid/unclehung-tapete*.svg: Schale mit zwei Stäbchen) einmal als Bild mit doppelter Dichte rechnen
   (Vorlage Schäfli, Regel 55: ein SVG-Muster kostet am Handy beim ersten Scrollen ein Bild über 33 ms, das gerechnete Bild nicht).
   node _werkzeuge/maison/quelle/tapete.js → quelle/tapete-<art>@2x.png */
const path = require('path'), fs = require('fs');
const pw = require('playwright');
(async () => {
  const b = await pw.chromium.launch({ headless: true });
  for (const art of ['dunkel', 'hell']) {
    const svg = fs.readFileSync(path.resolve(__dirname, '../../oberflaeche/kleid/' + (art === 'dunkel' ? 'unclehung-tapete' : 'unclehung-tapete-hell') + '.svg'), 'utf8');
    const page = await b.newPage({ viewport: { width: 120, height: 120 }, deviceScaleFactor: 2 });
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg}`);
    await page.screenshot({ path: path.join(__dirname, `tapete-${art}@2x.png`), omitBackground: true, clip: { x: 0, y: 0, width: 120, height: 120 } });
    await page.close();
  }
  await b.close();
})();
