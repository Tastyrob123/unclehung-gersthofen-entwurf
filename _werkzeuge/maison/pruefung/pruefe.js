/* Bedienprobe Kontrollpanel · Uncle Hung (Vorlage: pruefung/pruefe.js der Häuser). Bedient, nicht nur geladen.
   timeout 300 node _werkzeuge/maison/pruefung/pruefe.js chromium|webkit  → pruefung/ergebnis-<browser>.json */
const pw = require('playwright'), fs = require('fs'), path = require('path');
const B = process.argv[2] || 'chromium', BASIS = '/_werkzeuge/maison/';
const erg = []; const ok = (n, b, d = '') => { erg.push({ n, ok: !!b, d: String(d).slice(0, 300) }); console.log((b ? '✓ ' : '✗ ') + n + (b ? '' : ' · ' + d)); };
const RG = () => { try { localStorage.setItem('rundgang-unclehung-maison', '1'); } catch (e) {} };
(async () => {
  const br = await pw[B].launch();
  for (const [w, h, mobil] of [[1440, 900, false], [390, 844, true]]) {
    const T = `${w}: `;
    const ctx = await br.newContext({ viewport: { width: w, height: h }, hasTouch: mobil, isMobile: mobil && B === 'chromium', locale: 'de-DE' });
    await ctx.addInitScript(RG);
    const p = await ctx.newPage(); const f = [];
    p.on('pageerror', e => f.push(String(e))); p.on('console', m => { if (m.type() === 'error') f.push(m.text()); });
    p.on('response', r => { if (r.status() >= 400) f.push(r.status() + ' ' + r.url()); });
    for (let n = 0; n < 2; n++) { const r = await p.goto(BASIS, { waitUntil: 'load' }); ok(T + 'Antwort 200 (' + (n + 1) + ')', r.status() === 200, r.status()); await p.waitForTimeout(1800); }
    ok(T + 'Startfehler-Tür zu', await p.evaluate(() => document.getElementById('tuer').hidden && window.MAISON_BEREIT === true));
    ok(T + 'kein seitliches Verrutschen', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const sechs = await p.evaluate(() => [...document.querySelectorAll('.hz-z')].map(z => { const r = z.getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.top >= 0; }));
    if (!mobil) ok(T + 'erstes Bild: sechs Werkzeuge ganz', sechs.length === 6 && sechs.every(Boolean), JSON.stringify(sechs));
    else ok(T + 'sechs Karten da', sechs.length === 6);
    const gruss = {};
    for (const g of ['morgen', 'tag', 'abend']) { await p.goto(BASIS + '?gruss=' + g, { waitUntil: 'load' }); gruss[g] = await p.textContent('#gruss'); }
    ok(T + 'Gruß morgen/tag/abend', gruss.morgen === 'Guten Morgen.' && gruss.tag === 'Guten Tag.' && gruss.abend === 'Guten Abend.', JSON.stringify(gruss));
    ok(T + 'Datum ausgeschrieben', /\d{1,2}\. \w+ 20\d\d/.test(await p.textContent('#datum')), await p.textContent('#datum'));
    await p.waitForTimeout(2000);
    const st = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-stand$="-kurz"]')].map(x => [x.dataset.stand, x.textContent.trim()])));
    ok(T + 'Stand je Werkzeug gesetzt', Object.keys(st).length === 6 && Object.values(st).every(x => x && x !== ' '), JSON.stringify(st));
    ok(T + 'Zahlenzeile aus Besucher', /\d/.test(await p.textContent('[data-stand="registre-heute"]')) && !(await p.isHidden('.m-zeile__bsp')));
    if (!mobil) {   /* M23: Vorschau je Werkzeug, Ruhe zurück, nichts hüpft */
      const zs = await p.$$('.hz-z a'); let gut = 0; const vor = await p.evaluate(() => document.querySelector('.hz-rahmen').getBoundingClientRect().top);
      for (let i = 0; i < zs.length; i++) { await zs[i].hover(); await p.waitForTimeout(450);
        const an = await p.evaluate(i => { const e = document.querySelector('[data-vorschau].an:not(span)'); return e && e.getAttribute('data-vorschau') === String(i); }, i); if (an) gut++; }
      ok(T + 'Vorschau beim Darüberfahren (6)', gut === 6, gut);
      await p.mouse.move(5, 5); await p.waitForTimeout(500);
      ok(T + 'Ruhe zurück', await p.evaluate(() => document.querySelector('[data-vorschau="ruhe"].an') !== null));
      ok(T + 'nichts hüpft', Math.abs(vor - await p.evaluate(() => document.querySelector('.hz-rahmen').getBoundingClientRect().top)) < 1);
      await p.focus('.hz-z:nth-child(3) a'); await p.waitForTimeout(400);
      ok(T + 'Tastatur-Fokus zeigt Vorschau', await p.evaluate(() => (document.querySelector('[data-vorschau].an:not(span)') || {}).getAttribute?.('data-vorschau') === '2'));
      const lu = await p.evaluate(() => { const r = document.querySelector('.hz-rahmen').getBoundingClientRect(), t = document.querySelector('.uh-wand').getBoundingClientRect(); return [r.top - t.top, r.bottom - t.bottom]; });
      ok(T + 'Bühne und Karten bündig', Math.abs(lu[0]) < 2 && Math.abs(lu[1]) < 2, lu);
      ok(T + 'Leiste: nichts unter einem Knopf', await p.evaluate(() => { const i = document.querySelector('.m-insel').getBoundingClientRect(), e = [...document.querySelectorAll('.m-oben__ecke')].map(x => x.getBoundingClientRect()); return e.every(r => r.right <= i.left || r.left >= i.right); }));
    }
    /* Taste 1 bis 6 */
    const hrefs = await p.evaluate(() => [...document.querySelectorAll('.hz-z a')].map(a => a.href));
    let tasten = 0;
    for (let i = 0; i < 6; i++) { await p.goto(BASIS, { waitUntil: 'load' }).catch(() => p.goto(BASIS, { waitUntil: 'load' })); await p.waitForTimeout(500);
      const nav = p.waitForRequest(r => r.isNavigationRequest() && r.url().startsWith(hrefs[i].split('#')[0]), { timeout: 4000 }).then(() => 1, () => 0);
      await p.keyboard.press(String(i + 1)); tasten += await nav; await p.waitForTimeout(800); }
    f.length = 0;   /* Fehler der geöffneten Werkzeuge gehören nicht zum Kontrollpanel */
    ok(T + 'Taste 1 bis 6 öffnet das Werkzeug', tasten === 6, tasten);
    await p.goto(BASIS, { waitUntil: 'load' }).catch(() => p.goto(BASIS, { waitUntil: 'load' })); await p.waitForTimeout(1500); f.length = 0;
    /* Auftritte: durchscrollen, alles da */
    const H = await p.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < H; y += 500) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(120); }
    await p.waitForTimeout(1500);
    ok(T + 'alle Stücke aufgetreten', await p.evaluate(() => [...document.querySelectorAll('[data-r]')].every(x => x.classList.contains('da'))));
    ok(T + 'keine kaputten Bilder', await p.evaluate(() => [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src).length === 0));
    ok(T + 'kein roher Code im Text', await p.evaluate(() => !/\{\w+\}|undefined|NaN|\[object/.test(document.body.innerText)));
    const weg = await p.evaluate(() => [...document.querySelectorAll('[data-wg$="-satz"]')].map(x => x.textContent));
    ok(T + 'Weg zur Anfrage ohne Anteil über 100 %', weg.every(t => !(/(\d+) %/.exec(t) && +/(\d+) %/.exec(t)[1] > 100)) && /begonnen/i.test(await p.textContent('#registre')), weg.join(' | '));
    ok(T + 'kein mailto/tel/Formular', await p.evaluate(() => !document.querySelector('a[href^="mailto"],a[href^="tel"],form')));
    /* Laufband nur im Bild */
    await p.evaluate(() => document.querySelector('[data-laufband]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(400);
    const l1 = await p.evaluate(() => document.querySelector('[data-laufband]').classList.contains('laeuft'));
    await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(400);
    const l2 = await p.evaluate(() => document.querySelector('[data-laufband]').classList.contains('laeuft'));
    const lh = await p.evaluate(() => document.querySelector('.m-band').getBoundingClientRect().height);
    ok(T + 'Laufband läuft nur im Bild, 40–44 px', l1 && !l2 && lh >= 40 && lh <= 44, [l1, l2, lh]);
    /* Ecke: Marke nach oben, Anleitungen zum Fuß */
    await p.evaluate(() => scrollTo(0, 1200)); await p.waitForTimeout(300); await p.evaluate(() => scrollTo(0, 1100)); await p.waitForTimeout(400);
    await p.click('.m-ecke'); await p.waitForTimeout(1200);
    ok(T + 'Marke springt nach oben', await p.evaluate(() => scrollY < 50));
    if (!mobil) { await p.click('.m-oben__ecke--l'); await p.waitForTimeout(1500); ok(T + '«Anleitungen» springt zum Fuß', await p.evaluate(() => document.getElementById('fuss').getBoundingClientRect().top < innerHeight)); }
    ok(T + 'Konsole leer, keine 404', f.length === 0, f.join(' | '));
    /* Rundgang auf Klick (?rundgang) */
    await p.goto(BASIS + '?rundgang', { waitUntil: 'load' }); await p.waitForSelector('.rdg-karte', { timeout: 10000 }).catch(() => {}); await p.waitForTimeout(600);
    let schritte = 0, imBild = true;
    for (let i = 0; i < 8; i++) { const k = await p.$('.rdg-karte'); if (!k) break; schritte++;
      const r = await k.boundingBox(); if (!r || r.y < 0 || r.y + r.height > h + 1 || r.x < 0 || r.x + r.width > w + 1) imBild = false;
      const weiter = await p.$('.rdg-karte .rdg-los');
      if (weiter) await weiter.click(); else await p.keyboard.press('ArrowRight'); await p.waitForTimeout(900); }
    ok(T + 'Rundgang fünf Schritte, Karte im Bild, danach zu', schritte === 5 && imBild && !(await p.$('.rdg-karte')), [schritte, imBild]);
    await ctx.close();
    /* Weniger Bewegung */
    const c2 = await br.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' }); await c2.addInitScript(RG);
    const p2 = await c2.newPage(); await p2.goto(BASIS, { waitUntil: 'load' }); await p2.waitForTimeout(800);
    ok(T + 'Weniger Bewegung: Laufband steht', await p2.evaluate(() => { const b = document.querySelector('[data-laufband]'); b.scrollIntoView(); return new Promise(r => setTimeout(() => r(!b.classList.contains('laeuft')), 300)); }));
    /* Startfehler-Tür bei fehlendem Skript */
    await p2.route('**/maison.js*', r => r.abort()); await p2.goto(BASIS, { waitUntil: 'load' }); await p2.waitForTimeout(800);
    ok(T + 'Startfehler-Tür bei fehlendem Skript', await p2.evaluate(() => !document.getElementById('tuer').hidden && /maison\.js/.test(document.getElementById('tuer-t').textContent)));
    await c2.close();
  }
  /* Umleitung ZUR_STUBE: localhost → 127.0.0.1:9471 */
  const c3 = await br.newContext(); await c3.addInitScript(RG); const p3 = await c3.newPage();
  await p3.goto('/_werkzeuge/maison/', { waitUntil: 'load' }); await p3.waitForTimeout(800);
  ok('Umleitung localhost → 127.0.0.1:9471', p3.url().startsWith('/_werkzeuge/maison/'), p3.url());
  /* Aus der Werkbank: «Zur Werkbank» erscheint und führt zur Werkbank */
  await p3.goto(BASIS + '?wb=de.werkzeuge&wy=1200&wbo=' + encodeURIComponent(''), { waitUntil: 'load' }); await p3.waitForTimeout(1500);
  const zw = await p3.$('a:has-text("Zur Werkbank"), button:has-text("Zur Werkbank")');
  let ziel = '';
  if (zw) { const href = await zw.getAttribute('href'); if (href && !href.startsWith('#') && !href.startsWith('javascript')) ziel = href; else { await zw.click(); await p3.waitForTimeout(1500); ziel = p3.url(); } }
  ok('«Zur Werkbank» erscheint und führt zur Werkbank', !!zw && /127\.0\.0\.1:9478\/werkbank\//.test(ziel), ziel);
  await c3.close();
  await br.close();
  fs.writeFileSync(path.join(__dirname, `ergebnis-${B}.json`), JSON.stringify({ browser: B, zeit: new Date().toISOString(), gruen: erg.filter(x => x.ok).length, von: erg.length, zeilen: erg }, null, 1));
  console.log(`${B}: ${erg.filter(x => x.ok).length}/${erg.length}`);
})().catch(e => { console.error(e); process.exit(1); });
