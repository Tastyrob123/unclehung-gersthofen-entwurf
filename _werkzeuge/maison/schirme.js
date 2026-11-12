#!/usr/bin/env node
/* Bildschirme der Werkzeuge für «Kontrollpanel» · Uncle Hung Gersthofen (M08, M23). Vorlage: schirme.js der Taverne zum Schäfli, umgestellt auf
   Chromium 1440 × 932 @2x (Auftrag 11.11.2026), nach roh/<name>.png. Adresse je Werkzeug aus stand_wege.json; nur Werkzeuge, deren Server antwortet.
   Rundgang-Merker und Begrüßungen gelten als gesehen (nur im Wegwerf-Profil der Aufnahme), keine feste Zeitzone (Datum und Gruß wie beim Betrachter).
   Jede Anfrage außer GET/HEAD wird abgewiesen (nichts wird geschrieben), ebenso jeder KI-Weg.
   Weitere Ansichten je Werkzeug über ansichten.json: {"livre-marke": {"von": "livre", "klick": "Text"}}.
   cd "Uncle Hung Gersthofen" && timeout 300 node _werkzeuge/maison/schirme.js [werkzeug …] && python3 _werkzeuge/maison/bau.py */
const path = require('path'), fs = require('fs');
const pw = require('playwright');
const HIER = __dirname;
const TEIL = { bureau: 'website', carte: 'karten', imprimerie: 'druck', reception: 'gaeste', livre: 'marke', registre: 'besuche' };
const ERSTE = { bureau: 'bureau', carte: 'carte', imprimerie: 'imprimerie', reception: 'reception', livre: 'livre', registre: 'registre' };
const SW = (() => { try { return JSON.parse(fs.readFileSync(path.join(HIER, 'stand_wege.json'), 'utf8')); } catch (e) { return {}; } })();
const ansichten = (() => { try { return JSON.parse(fs.readFileSync(path.join(HIER, 'ansichten.json'), 'utf8')); } catch (e) { return {}; } })();
(async () => {
  const nur = process.argv.slice(2);
  const browser = await pw.chromium.launch({ headless: true });
  const aus = [];
  fs.mkdirSync(path.join(HIER, 'roh'), { recursive: true });
  for (const k of Object.keys(TEIL)) {
    if (nur.length && !nur.includes(k)) continue;
    const adresse = (SW[k] || {}).adresse || '';
    if (!adresse) { aus.push({ k, uebersprungen: 'ohne Adresse' }); continue; }
    try { const r = await fetch(adresse, { signal: AbortSignal.timeout(6000) }); if (!r.ok) throw new Error(r.status); } catch (e) { aus.push({ k, uebersprungen: 'Server antwortet nicht' }); continue; }
    const auftraege = [[ERSTE[k], null]].concat(Object.entries(ansichten).filter(([, a]) => a.von === k).map(([n, a]) => [n, a]));
    for (const [name, a] of auftraege) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 932 }, deviceScaleFactor: 2, locale: 'de-DE' });
      await ctx.addInitScript(() => {
        try {   /* Rundgang und Begrüßung als gesehen: jeder Merker dieser Art liest «1» */
          const g = Storage.prototype.getItem;
          Storage.prototype.getItem = function (x) { return /rundgang|willkommen|begruess|begrüß|erstbesuch|intro/i.test(String(x)) ? '1' : g.call(this, x); };
        } catch (e) {}
      });
      const page = await ctx.newPage();
      const fehler = [];
      page.on('pageerror', e => fehler.push(String(e)));
      await page.route('**/*', r => { const q = r.request(); return (['GET', 'HEAD'].includes(q.method()) && !/\/api\/(gast|ki|entwurf\b)/.test(q.url())) ? r.continue() : r.abort(); });
      const ziel_url = (a && a.adresse) || adresse;
      await page.goto(ziel_url + (ziel_url.includes('?') ? '&' : '?') + 'gruss=tag', { waitUntil: 'load', timeout: 60000 });
      await page.waitForTimeout(2500);
      for (let n = 0; n < 2; n++) { const d = await page.$('dialog[open], [role="dialog"]:not([hidden])'); if (!d || !(await d.isVisible())) break;
        const zu = await d.$('button[aria-label*="chlie"], button.zu, .x, button:has-text("×")'); if (zu) await zu.click().catch(() => {}); else await page.keyboard.press('Escape'); await page.waitForTimeout(500); }
      if (a && a.klick) { await page.getByText(a.klick, { exact: false }).first().click({ timeout: 8000 }).catch(e => fehler.push('klick: ' + e.message.split('\n')[0])); await page.waitForTimeout(1500); }
      await page.evaluate(() => { document.querySelectorAll('.rdg-kegel,.rdg-karte,.rdg-sperre,.rdg-schild').forEach(x => x.remove()); window.scrollTo(0, 0); });
      await page.waitForTimeout(600);
      const ziel = path.join(HIER, 'roh', name + '.png');
      await page.screenshot({ path: ziel, type: 'png' });
      aus.push({ k, name, adresse: ziel_url, fehler });
      await ctx.close();
    }
  }
  await browser.close();
  console.log(JSON.stringify(aus, null, 1));
})().catch(e => { console.error(String(e)); process.exit(1); });
