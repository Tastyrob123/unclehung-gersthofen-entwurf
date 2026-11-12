/* schirm.js · Aufnahme einer Ansicht von «Website bearbeiten» (Uncle Hung). node schirm.js <ansicht|adresse> <name> [breite] [motor] [ganz]
   Gegen den laufenden Server (PORT, Standard 9472), Rundgang-Schild ausgeschaltet, ohne feste Zeitzone (Fehlerbuch: falsches Datum). */
const path = require('path'), pw = require('playwright');
const [ziel, name, breite = '1440', motor = 'chromium', ganz] = process.argv.slice(2);
const B = 'http://127.0.0.1:' + (process.env.PORT || 9472), W = +breite, H = W < 700 ? 844 : 900;
(async () => {
  const br = await pw[motor].launch({ headless: true });
  const ctx = await br.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: W < 700 });
  await ctx.addInitScript(() => { try { localStorage.setItem('rundgang-unclehung-bureau', '1'); } catch (e) {} });
  const p = await ctx.newPage(); const f = [];
  p.on('console', m => { if (m.type() === 'error') f.push(m.text()); }); p.on('pageerror', e => f.push(e.message));
  const url = /^(https?:|\/)/.test(ziel) ? (ziel.startsWith('/') ? B + ziel : ziel) : B + '/_werkzeuge/bureau/?ansicht=' + encodeURIComponent(ziel);
  await p.goto(url, { waitUntil: 'load' });
  if (!/^(https?:|\/)/.test(ziel)) await p.waitForFunction(a => document.querySelector('#ws-mitte') && document.querySelector('#ws-mitte').getAttribute('data-ws-bereit') === a, ziel, { timeout: 20000 }).catch(() => f.push('nicht bereit'));
  await p.waitForTimeout(+(process.env.WARTE || 3500));
  if (process.env.SCROLL) { await p.evaluate(y => scrollTo(0, +y), process.env.SCROLL); await p.waitForTimeout(1500); }
  const datei = path.join(__dirname, 'bilder', `${name}-${motor}-${W}.png`);
  await p.screenshot({ path: datei, fullPage: !!ganz });
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  console.log(datei, 'scrollWidth', sw, f.length ? 'FEHLER ' + f.join(' | ') : 'ohne Fehler');
  await br.close();
})();
