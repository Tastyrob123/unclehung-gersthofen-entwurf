/* Aufnahmen jeder Ansicht von Besucher · Uncle Hung bei 1440 × 900 und 390 × 844 (ganze Seite), zum Ansehen mit dem Auge (pruefung/bilder/).
   node pruefung/aufnahmen.js [basis] [breiten]   Server 9476 muss laufen. Ohne feste Zeitzone (Fehlerbuch: falsches Datum auf Bildern). */
const PW = require('playwright'), path = require('path'), fs = require('fs');
const A = process.argv[2] || '/_werkzeuge/registre/';
const BREITEN = (process.argv[3] || '1440,390').split(',').map(Number);
const AUS = path.join(__dirname, 'bilder'); fs.mkdirSync(AUS, { recursive: true });
const V = ['start', 'besuche', 'herkunft', 'zeit', 'seiten', 'verlauf', 'buchung', 'zaehlung'];
(async () => {
  const b = await PW.chromium.launch(); const fehler = [];
  for (const w of BREITEN) {
    const ctx = await b.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 }, isMobile: w < 600, hasTouch: w < 600, reducedMotion: 'reduce' });
    await ctx.addInitScript(() => { try { localStorage.setItem('rundgang-unclehung-registre', '1'); } catch (e) {} });
    for (const v of V.concat(process.env.ANLEITUNG ? ['anleitung'] : [])) {
      const p = await ctx.newPage(); p.on('console', m => { if (m.type() === 'error') fehler.push(w + ' ' + v + ': ' + m.text()); }); p.on('pageerror', e => fehler.push(w + ' ' + v + ': ' + e.message));
      p.on('response', r => { if (r.status() >= 400) fehler.push(w + ' ' + v + ': ' + r.status() + ' ' + r.url()); });
      if (v === 'anleitung') { await p.goto(A + 'anleitung.html'); await p.waitForTimeout(1500); }
      else { await p.goto(A + '?gruss=tag#' + v); await p.waitForFunction(() => window.BG_REGISTRE === 1 && document.documentElement.classList.contains('auftakt-da')); await p.waitForTimeout(900); }
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); });
      await p.waitForTimeout(500);
      await p.screenshot({ path: path.join(AUS, `${v}-${w}.jpg`), fullPage: true, quality: 70, type: 'jpeg' });
      await p.close();
    }
    await ctx.close();
  }
  await b.close(); console.log(fehler.length ? 'Fehler:\n' + fehler.join('\n') : 'keine Konsolenfehler');
})();
