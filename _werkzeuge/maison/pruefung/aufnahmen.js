/* Aufnahmen des Kontrollpanels zum Ansehen (1440 und 390): erstes Bild, jeder Saal, Fuss. node pruefung/aufnahmen.js [chromium|webkit] */
const pw = require('playwright'), path = require('path');
const B = process.argv[2] || 'chromium', URL = '/_werkzeuge/maison/?gruss=tag';
(async () => {
  const br = await pw[B].launch();
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: 'de-DE' });
    await ctx.addInitScript(() => { try { localStorage.setItem('rundgang-unclehung-maison', '1'); } catch (e) {} });
    const p = await ctx.newPage(); const f = [];
    p.on('pageerror', e => f.push(String(e))); p.on('console', m => { if (m.type() === 'error') f.push(m.text()); });
    await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(2500);
    const o = n => path.join(__dirname, 'bilder', `${B}-${w}-${n}.png`);
    await p.screenshot({ path: o('0-empfang') });
    for (const id of ['bureau', 'carte', 'imprimerie', 'reception', 'livre', 'registre', 'fuss']) {
      await p.evaluate(i => document.getElementById(i).scrollIntoView(), id); await p.waitForTimeout(1600);
      await p.evaluate(i => { const r = document.getElementById(i).getBoundingClientRect(); scrollBy(0, r.top - 0); }, id); await p.waitForTimeout(1200);
      const hh = await p.evaluate(i => document.getElementById(i).offsetHeight, id);
      for (let y = 0; y < hh; y += 400) { await p.evaluate(d => scrollBy(0, 400), y); await p.waitForTimeout(250); }
      await p.waitForTimeout(1200);
      await p.locator('#' + id).screenshot({ path: o(id) });
    }
    const sw = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    console.log(w, 'Fehler:', f, 'seitlich:', sw);
    await ctx.close();
  }
  await br.close();
})();
