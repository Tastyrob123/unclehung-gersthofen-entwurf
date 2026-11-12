// Flüssigkeit (Chromium 1440, CPU 4× gedrosselt): Wechsel der Ansichten und Scrollen, Bildrate und lange Bilder. node pruefung/fluss.js [basis]
const { chromium } = require('playwright');
const BASIS = process.argv[2] || '';
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await c.addInitScript(() => { try { ['reception', 'savoir'].forEach(k => localStorage.setItem('rundgang-uh-' + k, '1')); } catch (e) { /* */ } });
  const p = await c.newPage(); const s = await c.newCDPSession(p); await s.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.goto(BASIS + '/_werkzeuge/reception/#start', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  await p.evaluate(() => { window.__b = []; let l = performance.now(); const f = t => { window.__b.push(t - l); l = t; requestAnimationFrame(f); }; requestAnimationFrame(f); });
  for (const a of ['gefragt', 'wissen', 'start']) { await p.evaluate(a => { location.hash = a; }, a); await p.waitForTimeout(900); for (let i = 0; i < 12; i++) { await p.mouse.wheel(0, 260); await p.waitForTimeout(60); } await p.waitForTimeout(400); }
  const r = await p.evaluate(() => { const b = window.__b.slice(5), sum = b.reduce((x, y) => x + y, 0), m = [...b].sort((x, y) => x - y)[Math.floor(b.length / 2)]; return { fps: Math.round(b.length / (sum / 1000)), median: +m.toFixed(1), ueber50: b.filter(x => x > 50).length, laengstes: Math.round(Math.max(...b)) }; });
  console.log(JSON.stringify(r)); await b.close();
})();
