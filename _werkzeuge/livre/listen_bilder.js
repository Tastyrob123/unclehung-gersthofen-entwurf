/* Markenbuch · Uncle Hung · Bilder (Vorlage: Taverne zum Schäfli) für die Liste «Schriften» (Robert 20.10.2026: «in allen Tools Bilder dazu»): je Schrift ein Ausschnitt der Website
   des Hauses, so wie sie dort steht, auf heller Fläche (nur lesen, unsichtbar, ein Browser, «weniger Bewegung», damit nichts mitten im Auftritt steht).
   Aufruf aus bau.py: node listen_bilder.js <zielordner> <seite.html> …  → listen/<name>.png (danach in bau.py zu WebP) */
const path = require('path');
const { chromium } = require('playwright');
const [, , ZIEL, ...SEITEN] = process.argv;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  // je Wunsch: erstes Element im Wunsch-Wähler, sichtbar, auf heller Fläche, mit dieser Schrift, 12 bis 120 Zeichen
  const WUNSCH = [['schrift-t', 'Fraunces', 'h2.titel, h2, h3, h1'], ['schrift-s', 'Instrument Sans', 'p.text.gross, p.text'], ['schrift-m', 'DM Mono', '.mono']];
  for (const [name, schrift, wahl] of WUNSCH) {
    let box = null;
    for (const SEITE of SEITEN) {
      await p.goto('file://' + SEITE, { waitUntil: 'load' });
      await p.evaluate(async () => { document.querySelectorAll('img').forEach(i => { i.loading = 'eager'; }); await document.fonts.ready; });
      for (let y = 0; y < 30000; y += 700) { const h = await p.evaluate(y => { scrollTo(0, y); return document.body.scrollHeight; }, y); await p.waitForTimeout(40); if (y > h) break; }
      const ziel = await p.evaluate(([schrift, wahl]) => {
        const hell = el => { let e = el; while (e && e !== document.documentElement) { const s = getComputedStyle(e); const c = s.backgroundColor; const m = c.match(/[\d.]+/g); if (s.backgroundImage && s.backgroundImage.includes('url(') && !s.backgroundImage.includes('tapete') && !s.backgroundImage.includes('svg')) return false; if (m && (m[3] === undefined || +m[3] > .5)) return (+m[0] + +m[1] + +m[2]) / 3 > 200; e = e.parentElement; } return true; };
        const el = [...document.querySelectorAll(wahl)].find(e => {
          const s = getComputedStyle(e), t = (e.textContent || '').trim().replace(/\s+/g, ' '), r = e.getBoundingClientRect();
          const rein = [...e.querySelectorAll('*')].every(k => getComputedStyle(k).fontFamily === s.fontFamily && getComputedStyle(k).color === s.color);
          return rein && (schrift !== 'Instrument Sans' || t.length >= 50) && s.fontFamily.includes(schrift) && t.length >= 12 && t.length <= (schrift === 'DM Mono' ? 40 : 200) && !/Vorrat|solange|so lange/.test(t) && r.width > 160 && r.height > 10 && r.height < 260 && s.visibility !== 'hidden' && +s.opacity > .9 && (schrift === 'DM Mono' || hell(e)) && !e.closest('nav,header,footer,.leiste,[aria-hidden="true"]');
        });
        if (!el) return null;
        el.setAttribute('data-livre-probe', '1'); return true;
      }, [schrift, wahl]);
      if (!ziel) continue;
      const loc = p.locator('[data-livre-probe]').first();
      await loc.scrollIntoViewIfNeeded(); await p.waitForTimeout(900);
      const r = await loc.boundingBox();
      box = { x: Math.max(0, r.x - 28), y: Math.max(0, r.y - 12), width: Math.min(r.width + 56, 1440 - Math.max(0, r.x - 28)), height: Math.min(r.height + 24, 900) };
      break;
    }
    if (!box) { console.log('nicht gefunden', name); continue; }
    await p.screenshot({ path: path.join(ZIEL, name + '.png'), clip: box });
    console.log('ok', name);
  }
  await b.close();
})();
