// Prüflauf «Anfragen & Chat» · Uncle Hung Gersthofen (11.11.2026, Muster: Prüfläufe der Taverne zum Schäfli und des Culinarium Hannover).
// Bedient statt lädt (Master 8/9a), headless, eigener Server mit Wegwerf-Daten (RECEPTION_DATEN in einem Ordner unter /tmp, nie die Daten des Werkzeugs).
//   node pruefung/unclehung.js [chromium|webkit] [breite] [bilder-ordner]      (aus _werkzeuge/reception/)
// Räumt in process.on('exit') auf: Server beendet, Wegwerf-Daten gelöscht (Fehlerbuch 10a, 28.10.2026).
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http'), { spawn, execSync } = require('child_process');
const pw = require('playwright');
const SCHUTZ = require('./schutz');
const [, , MOTOR = 'chromium', BREITE = '1440', BILDER = ''] = process.argv;
const W = +BREITE, HANDY = W < 700, H = HANDY ? 844 : 900;
const PORT = 9574 + (MOTOR === 'webkit' ? 1 : 0) + (HANDY ? 2 : 0), BASIS = `http://127.0.0.1:${PORT}`, WZ = BASIS + '/_werkzeuge/reception/';
const HIER = path.dirname(__dirname), PROJ = path.dirname(path.dirname(HIER));
const DATEN = fs.mkdtempSync(path.join(os.tmpdir(), 'uh-reception-probe-'));
const srv = spawn('python3', [path.join(HIER, 'server.py'), String(PORT)], { cwd: PROJ, env: { ...process.env, RECEPTION_DATEN: DATEN }, stdio: 'ignore' });
process.on('exit', () => { try { srv.kill('SIGKILL'); } catch (e) { /* */ } try { fs.rmSync(DATEN, { recursive: true, force: true }); } catch (e) { /* */ } });
process.on('SIGINT', () => process.exit(1));
const res = [], fehler = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const status = (u, opt = {}, body) => new Promise(ok => { const x = new URL(u); const r = http.request({ host: x.hostname, port: x.port, path: x.pathname + x.search, method: opt.method || 'GET', agent: false, headers: { ...(opt.headers || {}), ...(body != null ? { 'Content-Length': Buffer.byteLength(body) } : {}) } }, y => { let d = ''; y.on('data', c => d += c); y.on('end', () => ok({ s: y.statusCode, d })); }); r.on('error', () => ok({ s: 'aus', d: '' })); if (body) r.write(body); r.end(); });

(async () => {
  for (let i = 0; i < 40 && (await status(WZ)).s !== 200; i++) await sleep(150);
  const br = await SCHUTZ.start(pw, MOTOR);
  const ctxOpt = { viewport: { width: W, height: H }, locale: 'de-DE', acceptDownloads: true, hasTouch: HANDY, isMobile: HANDY && MOTOR === 'chromium' };
  const ctx = await SCHUTZ.kontext(br, ctxOpt);
  await ctx.addInitScript(() => { try { ['reception', 'savoir'].forEach(k => localStorage.setItem('rundgang-uh-' + k, '1')); } catch (e) { /* */ } });
  if (MOTOR === 'chromium') await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASIS });
  const p = await ctx.newPage(); p.setDefaultTimeout(20000);
  p.on('pageerror', e => fehler.push('JS ' + String(e).slice(0, 160)));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) fehler.push('Konsole ' + m.text().slice(0, 160)); });
  let erwartet = 0; p.on('response', r => { if (r.status() >= 400 && !(erwartet && r.status() === 422) && !/favicon|api\/formular/.test(r.url())) fehler.push(r.status() + ' ' + r.url().replace(BASIS, '')); });
  let dialoge = 0; p.on('dialog', d => { dialoge++; d.accept().catch(() => {}); });
  const schritt = async (nr, name, fn) => { const f0 = fehler.length, t0 = Date.now(); try { const info = await fn(); const neu = fehler.slice(f0); res.push({ nr, name, ok: !neu.length, info: (neu.length ? neu.join(' | ') + ' · ' : '') + (info || '') }); }
    catch (e) { res.push({ nr, name, ok: false, info: String(e.message || e).split('\n')[0].slice(0, 240) }); } const r = res[res.length - 1]; console.log((r.ok ? 'ok   ' : 'ROT  ') + `[${nr}] ` + name + ' · ' + r.info + ` (${Date.now() - t0} ms)`); };
  const ok = (b, was) => { if (!b) throw new Error(was); };
  const api = async (was, d, kopf = {}) => p.evaluate(async ([w, d, k]) => { const r = await fetch(w, d ? { method: 'POST', headers: { 'Content-Type': 'application/json', ...k }, body: JSON.stringify(d) } : {}); return { s: r.status, j: await r.json().catch(() => ({})) }; }, [WZ + 'api/' + was, d, kopf]);
  const gehe = async (a, q = '') => { await p.goto('about:blank'); await p.goto(WZ + q + '#' + a, { waitUntil: 'load' }); await p.waitForSelector('#ansicht > *'); await sleep(700); };
  const ueber = async () => p.evaluate(w => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - w, W);
  const kaputt = async () => p.evaluate(() => [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src') && i.loading !== 'lazy').map(i => i.getAttribute('src')));
  const bild = async n => { if (BILDER) { fs.mkdirSync(BILDER, { recursive: true }); await p.screenshot({ path: path.join(BILDER, `${MOTOR}-${W}-${n}.jpg`), quality: 72, type: 'jpeg' }); } };
  const karte = async re => { const k = p.locator('.re-liste .re-a', { hasText: re }).first(); await k.evaluate(e => e.scrollIntoView({ block: 'center' })); await k.click(); await p.waitForFunction(r => new RegExp(r).test(document.querySelector('#detail h2')?.textContent || ''), re.source); await sleep(500); };
  const hinw = async () => (await p.locator('#detail .re-hinw').count()) ? (await p.locator('#detail .re-hinw').innerText()).replace(/\s+/g, ' ') : '';
  const ANS = ['start', 'eingang', 'gefragt', 'nachgetragen', 'wissen'];

  for (const a of ANS) await schritt('R01/R15', `Ansicht ${a}: zweimal geladen, kein Fehler, kein seitliches Verrutschen, keine kaputten Bilder`, async () => {
    for (let i = 0; i < 2; i++) { await gehe(a); const u = await ueber(), k = await kaputt(); ok(u <= 0, 'überläuft um ' + u + ' px'); ok(!k.length, 'kaputte Bilder ' + k.join(', ')); }
    await bild(a); return (await p.locator('#kopf').innerText()).replace(/\s+/g, ' ').slice(0, 70); });

  await schritt('E01/R05/R06', 'Übersicht mit Zahlen; jeder Link in Kopf und Rand antwortet, Kontrollpanel auf 127.0.0.1:9471', async () => {
    await gehe('start'); const t = await p.locator('.wo-lage').innerText(); ok(/neue Anfrage|offen/i.test(t) && /Frage/.test(t), 'Zahlen fehlen: ' + t.slice(0, 80));
    const l = await p.evaluate(() => [...document.querySelectorAll('#kopf a[href], #rand a[href]')].map(a => a.href).filter(h => /^http/.test(h)));
    ok(l.some(h => /127\.0\.0\.1:9471\/_werkzeuge\/maison\//.test(h)), 'kein Weg zum Kontrollpanel auf 9471'); ok(!l.some(h => /localhost/.test(h)), 'localhost in einem Weg');
    const st = {}; for (const h of [...new Set(l.map(x => x.split('#')[0]))]) st[h.replace(BASIS, '')] = (await status(h)).s;
    const eigen = Object.entries(st).filter(([h]) => !/^http/.test(h)); ok(eigen.every(([, c]) => c === 200), JSON.stringify(eigen));
    return Object.entries(st).map(([h, c]) => h.replace('http://127.0.0.1:', ':') + ' ' + c).join(' · '); });

  await schritt('E28/10a', 'Kein roher Code, kein mailto:/tel:, keine Namensabfrage, keine fremden Hausangaben, keine Platzhalter-Klammern, in jeder Ansicht und jeder Anfrage', async () => {
    const pruef = async wo => p.evaluate(wo => { const t = document.body.innerText, f = [];
      (t.match(/\{[^}\n]{0,40}\}|\bundefined\b|\bNaN\b|\bNone\b|\bnull\b/g) || []).forEach(x => f.push(wo + ' roh ' + x));
      if (document.querySelectorAll('a[href^="mailto:"],a[href^="tel:"],a[href^="sms:"]').length) f.push(wo + ' mailto/tel');
      if (/Wer arbeitet hier|Wer trägt ein/.test(t)) f.push(wo + ' Namensabfrage');
      (t.match(/Schäfli|Schaefli|Wigoltingen|Kuchler|Schlössli|Bottighofen|Rivage|Interlaken|Culinarium|Carlton|Festsaal|Zenchef|CHF|Franken|Grüezi|Trüffel/g) || []).forEach(x => f.push(wo + ' fremd ' + x));
      (t.match(/\[[^\]\n]{2,40}\]/g) || []).forEach(x => f.push(wo + ' Klammer ' + x)); return f; }, wo);
    const f = [];
    for (const a of ANS) { await gehe(a); f.push(...await pruef(a)); }
    await gehe('eingang'); const n = await p.locator('.re-liste .re-a').count();
    for (let i = 0; i < n; i++) { const c = p.locator('.re-liste .re-a').nth(i); await c.evaluate(e => e.scrollIntoView({ block: 'center' })); await c.click(); await sleep(450); f.push(...await pruef('Anfrage ' + (i + 1))); }
    ok(!f.length, f.slice(0, 6).join(' | ')); ok(!(await p.evaluate(() => window.__abgefangen || 0)), 'ein Programm wäre geöffnet worden'); return `${ANS.length} Ansichten, ${n} Anfragen sauber`; });

  await schritt('R21/10a', 'Bilder in jeder Liste: jeder Eintrag hat sein geladenes Foto; keine Systemauswahl sichtbar', async () => {
    const z = {};
    for (const [a, sel, b] of [['eingang', '.re-liste .re-a', '.re-a__bild'], ['gefragt', '.re-f', '.re-f__bild'], ['nachgetragen', '.re-n', '.re-n__bild'], ['wissen', '.sb-z', '.sb-z__bild']]) {
      await gehe(a); await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 70)); } scrollTo(0, 0); }); await sleep(900);
      z[a] = await p.evaluate(([s, b]) => { const e = [...document.querySelectorAll(s)]; return [e.length, e.filter(x => { const i = x.querySelector(b + ' img'); return !i || !(i.complete && i.naturalWidth > 0); }).length]; }, [sel, b]); }
    const schlecht = Object.entries(z).filter(([, [n, o]]) => !n || o); ok(!schlecht.length, JSON.stringify(z));
    const sys = await p.evaluate(() => [...document.querySelectorAll('select, input[type=date]')].filter(e => { const r = e.getBoundingClientRect(), st = getComputedStyle(e); return r.width > 2 && r.height > 2 && st.opacity !== '0' && st.visibility !== 'hidden'; }).length);
    ok(sys === 0, sys + ' Systemfelder sichtbar'); return Object.entries(z).map(([k, [n]]) => k + ' ' + n).join(', '); });

  await schritt('E02/E29/E30', 'Hinweise aus den Hauswerten bei den richtigen Anfragen (Lunch 14 Uhr, mehr als 45, Allergene als Klartext, vegan; ohne Grund kein Hinweis)', async () => {
    await gehe('eingang');
    await karte(/Katrin Albers/); const k = await hinw(); ok(/Lunchdeals gibt es nur bis 14\.00 Uhr/.test(k), 'Katrin: ' + k);
    await karte(/Sophie Lindner/); const s = await hinw(); ok(/im Haus bis 45, der Wintergarten fasst 25 weitere/.test(s) && /A: glutenhaltiges Getreide/.test(s), 'Sophie: ' + s);
    await karte(/Melanie Rothmann/); const m = await hinw(); ok(/E: Erdnüsse/.test(m) && /Vegan/.test(m), 'Melanie: ' + m);
    const kue = await p.locator('#detail .re-angaben--ort').innerText(); ok(/Werkhalle/.test(kue) && /Firmenfeier/.test(kue), 'Location/Anlass fehlen: ' + kue);
    await karte(/Daniel Hofbauer/); ok(!(await hinw()), 'Daniel: Hinweis ohne Grund ' + await hinw());
    await bild('anfrage'); return 'Katrin, Sophie, Melanie, Daniel'; });

  await schritt('E29', 'Hinweise rechnen richtig: Samstag, Feiertag, Vorlauf unter 3 Tagen, Weihnachtsmenü im Januar und für 1 Person, mehr als 70, Uhrzeit ausserhalb', async () => {
    const out = execSync(`python3 -c "
import sys,json; sys.path.insert(0,'.'); import reception as r
f=lambda **a: [h['text'] for h in r.hinweise(a)]
print(json.dumps([f(art='tisch',datum='Samstag, 14. November 2026'), f(art='feier',datum='25. Dezember 2026'), f(art='catering',datum='13. November 2026',zeit='2026-11-11T10:00:00+01:00'),
 f(art='weihnachten',datum='15. Januar 2027',personen=1), f(art='feier',gruppe='mehr als 70 Gäste'), f(art='tisch',datum='Montag, 16. November 2026',uhrzeit='15.30 Uhr'), f(art='tisch',datum='Montag, 16. November 2026',uhrzeit='12.00 Uhr')],ensure_ascii=False))"`, { cwd: HIER }).toString();
    const [sa, ft, vl, xm, gr, ze, gut] = JSON.parse(out);
    ok(/Samstag: geschlossen/.test(sa.join()), 'Samstag ' + sa); ok(/1\. Weihnachtstag \(Feiertag\)/.test(ft.join()), 'Feiertag ' + ft); ok(/Nur 2 Tage Vorlauf/.test(vl.join()), 'Vorlauf ' + vl);
    ok(/November und Dezember/.test(xm.join()) && /ab 2 Personen/.test(xm.join()), 'Weihnachten ' + xm); ok(/mehr als Haus/.test(gr.join()), 'Gruppe ' + gr); ok(/15\.30 Uhr: außerhalb/.test(ze.join()), 'Zeit ' + ze); ok(!gut.length, 'ohne Grund: ' + gut);
    return 'Samstag, Feiertag, Vorlauf, Weihnachten, 70+, Uhrzeit, ohne Grund leer'; });

  await schritt('E03/E17/E21', 'Brief: «Nur Text» ändern, sichern, neu laden, noch da; zweites Fenster mit alter Fassung → KONFLIKT, nichts überschrieben', async () => {
    await gehe('eingang'); await karte(/Daniel Hofbauer/);
    await p.click('[data-akt="bearbeiten"]'); await p.waitForSelector('#e-text');
    const marke = 'Wir freuen uns sehr auf euren Abend am Feuer.';
    const id = await p.locator('#brief, .brief--bearb').first().evaluate(() => (document.querySelector('.re-a.aktiv') || {}).dataset?.wahl || '');
    const alt = await api('anfragen'); const a0 = alt.j.anfragen.find(x => x.name === 'Daniel Hofbauer'); const fass0 = a0.entwurf.fassung || 0;
    await p.fill('#e-text', (await p.inputValue('#e-text')).replace('Bis bald bei Uncle Hung', marke + '\n\nBis bald bei Uncle Hung')); await p.click('[data-akt="sichern"]'); await sleep(900);
    await gehe('eingang'); await karte(/Daniel Hofbauer/); const t = await p.locator('#brief').innerText(); ok(t.includes(marke), 'nach Neuladen nicht mehr da');
    erwartet = 1; const k = await api('anfrage', { id: a0.id, entwurf_text: 'Altes Fenster', betreff: 'x', fassung: fass0 }); await sleep(200); erwartet = 0; ok(k.s === 422 && /^KONFLIKT/.test(k.j.fehler || ''), 'kein Konflikt: ' + k.s + ' ' + (k.j.fehler || ''));
    const n = (await api('anfragen')).j.anfragen.find(x => x.id === a0.id); ok(n.entwurf.text.includes(marke), 'überschrieben');
    await bild('brief'); void id; return 'gesichert, neu geladen, Konflikt 422, nichts überschrieben'; });

  await schritt('10a «Nur Text» = Gestalten', 'Beide Ansichten zeigen dasselbe Blatt: Wortmarke als einziges Logo, gleiche Schrift, Betreff bricht um', async () => {
    await gehe('eingang'); await karte(/Sophie Lindner/);
    const g = await p.evaluate(() => ({ logos: document.querySelectorAll('#brief img').length, wm: !!document.querySelector('#brief img.wortmarke'), f: getComputedStyle(document.querySelector('#brief .gs--p')).fontFamily }));
    ok(g.logos === 1 && g.wm, 'Logos im Brief: ' + g.logos); await bild('brief-gestalt');
    await p.click('[data-akt="bearbeiten"]'); await p.waitForSelector('#e-text');
    const t = await p.evaluate(() => ({ logos: document.querySelectorAll('.brief--bearb img').length, f: getComputedStyle(document.querySelector('#e-text')).fontFamily, kante: getComputedStyle(document.querySelector('#e-text')).borderTopWidth }));
    ok(t.logos === 1, 'Logos in Nur Text: ' + t.logos); ok(t.f.split(',')[0] === g.f.split(',')[0], 'Schrift ' + t.f + ' / ' + g.f); await bild('brief-text');
    await p.click('[data-akt="lesen"]'); return 'ein Logo, Schrift ' + g.f.split(',')[0]; });

  await schritt('E16/E28', '«Als PDF speichern»: A4 vom Server, Dateiname «Uncle Hung – Name – Datum.pdf», eine Seite, Wortmarke einmal, Text Wort für Wort lesbar', async () => {
    await gehe('eingang'); await karte(/Melanie Rothmann/);
    const [d] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click('[data-akt="pdf"]')]);
    const ziel = path.join(DATEN, 'probe.pdf'); await d.saveAs(ziel); await sleep(300); const name = (await p.locator('#meldung').innerText()).split('\n').map(x => x.trim()).find(x => /\.pdf$/.test(x)) || d.suggestedFilename();
    ok(/^Uncle Hung – Melanie Rothmann – \d\d\.\d\d\.\d{4}\.pdf$/.test(name), 'Name ' + name);
    const info = execSync(`pdfinfo "${ziel}"`).toString(), txt = execSync(`pdftotext -layout "${ziel}" -`).toString();
    ok(/A4/.test(info), 'kein A4'); ok(/Pages:\s+1/.test(info), 'Seiten: ' + (info.match(/Pages:\s+(\d+)/) || [])[1]); ok(/Hallo Melanie/.test(txt) && /Dieselstraße 2/.test(txt), 'Text fehlt');
    ok(!/\b[A-ZÄÖÜ] [A-ZÄÖÜ] [A-ZÄÖÜ] [A-ZÄÖÜ]\b/.test(txt), 'gesperrte Einzelbuchstaben im PDF'); if (BILDER) fs.copyFileSync(ziel, path.join(BILDER, `${MOTOR}-${W}-brief.pdf`));
    return name; });

  await schritt('E28', '«Text kopieren» legt Betreff und Brief in die Zwischenablage, kein Mailprogramm', async () => {
    await gehe('eingang'); await karte(/Sophie Lindner/); await p.click('[data-akt="kopieren"]'); await sleep(600);
    const q = await p.locator('#meldung').innerText(); ok(/Kopiert|Nicht kopiert/.test(q), 'keine Quittung: ' + q);
    if (MOTOR === 'chromium') { const c = await p.evaluate(() => navigator.clipboard.readText()); ok(/^Betreff: Deine Feier/.test(c), 'Zwischenablage: ' + c.slice(0, 40)); }
    ok(!(await p.evaluate(() => window.__abgefangen || 0)), 'Mailprogramm'); return q.split('\n')[0]; });

  await schritt('E06/E15', 'Erledigt ↔ wieder offen, Filter Neu/Offen/Erledigt und Abteilungen zählen wie der Server', async () => {
    await gehe('eingang'); await karte(/Katrin Albers/); await p.click('#detail [data-akt="erledigt"]'); await sleep(700);
    let a = (await api('anfragen')).j.anfragen.find(x => x.name === 'Katrin Albers'); ok(a.status === 'erledigt', 'nicht erledigt');
    await karte(/Katrin Albers/); await p.click('#detail [data-akt="offen"]'); await sleep(700); a = (await api('anfragen')).j.anfragen.find(x => x.name === 'Katrin Albers'); ok(a.status !== 'erledigt', 'nicht wieder offen');
    const an = (await api('anfragen')).j.anfragen, z = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.re-filter [data-filter]')].map(b => [b.dataset.filter, +b.querySelector('i').textContent])));
    ok(z.alle === an.length && z.erledigt === an.filter(x => x.status === 'erledigt').length && z.offen === an.filter(x => x.status !== 'erledigt').length, 'Filter ' + JSON.stringify(z));
    await p.click('.re-abt [data-abt="Catering"]'); await sleep(500); const nCat = await p.locator('.re-liste .re-a').count(); ok(nCat === an.filter(x => (x.abteilung || '') === 'Catering' || x.art === 'catering').length, 'Abteilung Catering zeigt ' + nCat);
    await p.click('.re-abt [data-abt="alle"]'); return JSON.stringify(z) + ', Catering ' + nCat; });

  await schritt('E07/E08/E10', 'Das wurde gefragt: zwei Fragen ohne Antwort; Kinderstuhl nachtragen → Karte unter «Vom Team nachgetragen» → entfernen', async () => {
    await gehe('gefragt'); const l = await p.locator('.re-f.luecke').count(); ok(l === 2, l + ' Lücken');
    const f = p.locator('.re-f.luecke', { hasText: 'Kinderstuhl' }).first(); await f.evaluate(e => e.scrollIntoView({ block: 'center' })); await f.locator('[data-akt="nachtragen"]').click();
    await p.waitForSelector('#f-antwort'); await p.fill('#f-antwort', 'QA Probe-Nachtrag, wird gleich entfernt.'); await p.click('#f-los'); await sleep(900);
    await gehe('nachgetragen'); const k = p.locator('.re-n', { hasText: 'QA Probe-Nachtrag' }); ok(await k.count() === 1, 'Karte fehlt'); await bild('nachgetragen-probe');
    await k.locator('[data-akt="weg"]').click(); await p.click('#f-los'); await sleep(800); ok(await p.locator('.re-n', { hasText: 'QA Probe-Nachtrag' }).count() === 0, 'nicht entfernt');
    return '2 Lücken, nachgetragen und entfernt'; });

  await schritt('E09/E27', 'Das weiß der Chat: Suche «Pho» trifft; «Kinderwagen» → Abteilung fragen → offen → Antwort eintragen → steht im Wissen → entfernen; Angabe anlegen → neu laden → noch da → entfernen; Chat prüfen', async () => {
    await gehe('wissen'); await p.fill('#w-such', 'Pho'); await sleep(700); const t = await p.locator('#w-ergebnis').innerText(); ok(/12,50 €/.test(t), 'Pho nicht gefunden');
    await p.fill('#w-such', 'Kinderwagen'); await sleep(700); await p.waitForSelector('.sb-fehlt'); await p.click('#fe-frag'); await sleep(900);
    await p.waitForSelector('.sb-offen__z'); await p.locator('.sb-offen__z', { hasText: 'Kinderwagen' }).locator('[data-akt="antwort"]').click(); await p.waitForSelector('#f-text');
    await p.fill('#f-text', 'QA Probe: Platz für den Kinderwagen.'); await p.click('#f-los'); await sleep(900);
    let w = await api('wissen'); const e = w.j.eintraege.find(x => /QA Probe/.test(x.text)); ok(e, 'Eintrag fehlt'); ok(!(w.j.offen || []).some(x => x.thema === 'Kinderwagen'), 'noch offen');
    await api('wissen_eintrag_weg', { wid: e.wid, von: 'QA' });
    await p.click('#w-neu'); await p.waitForSelector('#f-titel'); await p.fill('#f-titel', 'QA Angabe'); await p.fill('#f-text', 'QA Probe-Angabe, wird entfernt.'); await p.click('#f-los'); await sleep(800);
    await gehe('wissen'); w = await api('wissen'); const e2 = w.j.eintraege.find(x => x.titel === 'QA Angabe'); ok(e2, 'nach Neuladen weg'); await api('wissen_eintrag_weg', { wid: e2.wid, von: 'QA' });
    await p.fill('#w-probe', 'Gibt es Parkplätze?'); await p.click('#w-probe-f button[type=submit]'); await p.waitForSelector('#w-antwort:not([hidden]):not(.lade)'); const pr = await p.locator('#w-antwort').innerText();
    ok(/kostenlos/i.test(pr), 'Chat prüfen: ' + pr.slice(0, 60)); w = await api('wissen'); ok(!w.j.eintraege.some(x => /QA/.test(x.titel + x.text)), 'QA-Spur bleibt');
    return 'Suche, Abteilung fragen, Antwort, Angabe, Chat prüfen'; });

  await schritt('E32/10a', 'Chat ausprobieren: Handy 9/19, zehn Fragen hintereinander, jede beantwortet, Eingabefeld bleibt sichtbar, nur die Liste rollt; mit Mail → Beispiel-Anfrage im Eingang', async () => {
    await gehe('start'); if (HANDY) { await p.click('#kopf .wo-kopf__ber'); await p.click('#rand [data-probe]'); } else await p.click('#k-probe'); await p.waitForSelector('#probe-t');
    const fr = ['Habt ihr am Samstag offen?', 'Bis wann gibt es die Lunchdeals?', 'Habt ihr etwas Veganes?', 'Was kostet das Weihnachtsmenü?', 'Gibt es Parkplätze?', 'Wie lange kocht die Brühe für die Pho?', 'Kann ich einen Tisch reservieren?', 'Habt ihr einen Kinderstuhl?', 'Wie viele Leute passen für eine Feier rein?', 'Was kostet ein Matcha?'];
    for (const q of fr) { await p.fill('#probe-t', q); await p.press('#probe-t', 'Enter'); await p.waitForFunction(() => !document.querySelector('#probe').dataset.laeuft, null, { timeout: 15000 }); }
    const m = await p.evaluate(() => { const f = document.querySelector('#probe-t').getBoundingClientRect(), h = document.querySelector('.ws-handy').getBoundingClientRect(), l = document.querySelector('#probe-l');
      return { unten: f.bottom, vh: innerHeight, v: h.width / h.height, haus: [...document.querySelectorAll('.ws-bl--haus')].slice(1).map(x => x.textContent), rollt: l.scrollHeight > l.clientHeight, tech: /Schlüssel|KI-Guthaben|Probe-Antwort|API/.test(document.querySelector('.ws-handy').innerText) }; });
    ok(m.unten <= m.vh, 'Eingabefeld unter dem Fenster'); ok(m.haus.length >= 10 && m.haus.every(x => x.length > 20), 'nicht jede Frage beantwortet'); ok(m.rollt, 'Liste rollt nicht'); ok(!m.tech, 'Technikwort im Chat');
    if (!HANDY) ok(Math.abs(m.v - 9 / 19) < 0.02, 'Handy-Form ' + m.v.toFixed(3));
    await bild('chat');
    await p.fill('#probe-t', 'Wir möchten am 18. Dezember mit 12 Personen Weihnachten feiern, Hot Pot. Ich bin QA Prüferin, qa.pruefung@example.com'); await p.press('#probe-t', 'Enter');
    await p.waitForFunction(() => !document.querySelector('#probe').dataset.laeuft); await p.click('#probe-eingang'); await sleep(900);
    const an = (await api('anfragen')).j.anfragen.find(x => /qa\.pruefung/.test(x.kontakt)); ok(an && an.beispiel && an.art === 'weihnachten', 'Anfrage aus dem Chat: ' + JSON.stringify(an && { art: an.art, b: an.beispiel }));
    await api('weg', { id: an.id }); return `Feld ${Math.round(m.unten)}/${m.vh} px, Verhältnis ${m.v.toFixed(3)}, Anfrage «weihnachten» als Beispiel, entfernt`; });

  await schritt('E13', 'Anfrage löschen fragt zuerst, dann Quittung «Gelöscht»', async () => {
    const neu = await api('formular', { name: 'QA Löschprobe', kontakt: 'qa.loesch@example.com', formular: 'catering', anlass: 'Geburtstag', datum: '4. Dezember 2026', gruppe: 'bis 10 Gäste', nachricht: 'Persönliche Wünsche: QA' });
    ok(neu.s === 200, 'Formular ' + neu.s); await gehe('eingang'); await karte(/QA Löschprobe/); await p.click('#detail [data-akt="weg"]'); await p.waitForSelector('#f-los'); await p.click('#f-los'); await sleep(800);
    const q = await p.locator('#meldung').innerText(); ok(/Gelöscht/.test(q), 'Quittung: ' + q); ok(!(await api('anfragen')).j.anfragen.some(x => /QA Löschprobe/.test(x.name)), 'noch da'); return 'gelöscht'; });

  await schritt('E33 Baustein', 'Baustein (nur im Prüfbrowser geladen, die Website bleibt unverändert): Catering-Formular der Website legt die Anfrage in den Eingang, «Danke dir» erst nach der Annahme, mit <script> und Emoji entschärft', async () => {
    await p.goto(BASIS + '/catering.html', { waitUntil: 'networkidle' }); await p.addScriptTag({ url: WZ + 'baustein/anfrage.js' }); await sleep(300);
    await p.evaluate(() => document.querySelector('[data-anfrage]').scrollIntoView({ block: 'center' }));
    await p.fill('#a-name', 'QA Baustein <script>x</script> 🎉'); await p.fill('#a-ort', 'Gersthofen'); await p.fill('#a-mail', 'qa.baustein@example.com'); await p.fill('#a-wunsch', 'QA Probe, wird entfernt.');
    await p.click('[data-anfrage] [type=submit]'); await p.waitForSelector('[data-anfrage].gesendet', { timeout: 8000 });
    const an = JSON.parse((await status(WZ + 'api/anfragen', { headers: { 'Sec-Fetch-Site': 'same-origin' } })).d).anfragen.find(x => /qa\.baustein/.test(x.kontakt));
    ok(an && an.web && an.art === 'catering' && an.formular === 'catering' && /Gersthofen/.test(an.ort), 'Anfrage: ' + JSON.stringify(an && [an.art, an.formular, an.ort]));
    await gehe('eingang'); await karte(/QA Baustein/); const txt = await p.locator('#detail').innerText(); ok(/QA Baustein <script>x<\/script>/.test(txt) && !(await p.evaluate(() => !!document.querySelector('#detail script'))), 'nicht entschärft');
    await api('weg', { id: an.id }); return 'Catering, ' + an.gruppe + ', entschärft, entfernt'; });

  await schritt('E12/E24', 'Weg «formular»: Catering-Formular landet mit Location, Anlass, Gruppe im Eingang; Feier bei Uncle Hung wird Feier; 403 fremd, 422 ungültig, 413 über 12 kB, Maschinenfeld legt nichts ab, 429 nach sechs je Minute', async () => {
    const h = { 'Content-Type': 'application/json', Origin: BASIS }, u = WZ + 'api/formular';
    const ab = (await api('anfragen')).j.anfragen.length;
    const a = await status(u, { method: 'POST', headers: h }, JSON.stringify({ name: 'QA Formular <script>x</script> 🎉', kontakt: 'qa.formular@example.com', formular: 'catering', anlass: 'Feier bei Uncle Hung', datum: '29. Januar 2027', gruppe: '45 bis 70 Gäste', ort: 'Bei Uncle Hung', nachricht: 'Persönliche Wünsche: QA' }));
    ok(a.s === 200, 'gültig ' + a.s); const x = (await api('anfragen')).j.anfragen.find(y => /qa\.formular/.test(y.kontakt)); ok(x && x.art === 'feier' && x.gruppe === '45 bis 70 Gäste' && x.anlass === 'Feier bei Uncle Hung', 'Angaben: ' + JSON.stringify(x && [x.art, x.gruppe, x.anlass]));
    const f = await status(u, { method: 'POST', headers: { ...h, Origin: 'http://boese.example' } }, '{}'); ok(f.s === 403, 'fremd ' + f.s);
    const i = await status(u, { method: 'POST', headers: h }, JSON.stringify({ name: 'QA', kontakt: 'keine adresse' })); ok(i.s === 422, 'ungültig ' + i.s);
    const g = await status(u, { method: 'POST', headers: h }, JSON.stringify({ name: 'QA', kontakt: 'qa@example.com', nachricht: 'x'.repeat(13000) })); ok(g.s === 413, 'groß ' + g.s);
    const m = await status(u, { method: 'POST', headers: h }, JSON.stringify({ name: 'QA Maschine', kontakt: 'qa.m@example.com', website: 'http://spam' })); ok(m.s === 200, 'Maschinenfeld ' + m.s);
    let s429 = -1; for (let n = 0; n < 8; n++) { const r = await status(u, { method: 'POST', headers: h }, JSON.stringify({ name: 'QA', kontakt: 'x' })); if (r.s === 429) { s429 = n; break; } } ok(s429 >= 0, 'kein 429');
    const an = (await api('anfragen')).j.anfragen; ok(!an.some(y => /QA Maschine/.test(y.name)), 'Maschinenfeld legte ab');
    for (const y of an.filter(y => /qa\./.test(y.kontakt))) await api('weg', { id: y.id });
    ok((await api('anfragen')).j.anfragen.length === ab, 'Spuren bleiben'); return `200 (Feier, 45 bis 70), 403, 422, 413, Maschinenfeld still, 429 nach ${s429 + 1} weiteren`; });

  await schritt('E14 / Kontrollpanel', 'Stand-Weg /_werkzeuge/reception/api/ueberblick liefert anfragen_neu, anfragen_offen, ohne_antwort, fragen_gesamt', async () => {
    const r = await api('ueberblick'); ok(r.s === 200 && ['anfragen_neu', 'anfragen_offen', 'ohne_antwort', 'fragen_gesamt'].every(k => typeof r.j[k] === 'number'), JSON.stringify(r.j)); return JSON.stringify({ neu: r.j.anfragen_neu, offen: r.j.anfragen_offen, ohne: r.j.ohne_antwort, fragen: r.j.fragen_gesamt }); });

  if (HANDY) await schritt('R07', 'Handy: «Bereiche» klappt den Rand auf und schließt ihn nach der Wahl; kein seitliches Verrutschen bei 390', async () => {
    await gehe('start'); await p.click('#kopf .wo-kopf__ber'); await sleep(300); ok(await p.evaluate(() => document.documentElement.classList.contains('wo-rand-auf')), 'geht nicht auf');
    await p.click('#rand [data-gehe="gefragt"]'); await sleep(600); ok(!(await p.evaluate(() => document.documentElement.classList.contains('wo-rand-auf'))), 'bleibt offen'); ok(await ueber() <= 0, 'überläuft'); return 'auf und zu'; });
  else await schritt('10a Rand läuft mit', 'Der Rand klebt beim Scrollen (sticky), an drei Tiefen sichtbar; Kopftitel überdeckt keinen Knopf', async () => {
    await gehe('eingang'); const t = []; for (const y of [0, 900, 1800]) { await p.evaluate(y => scrollTo(0, y), y); await sleep(400); t.push(await p.evaluate(() => Math.round(document.querySelector('#rand').getBoundingClientRect().top))); }
    ok(t.every(x => x >= 0 && x < 200), 'Rand oben bei ' + t.join('/'));
    const ue = await p.evaluate(() => { const m = document.querySelector('.wo-kopf__mitte'); if (!m || getComputedStyle(m).display === 'none') return 0; const a = m.getBoundingClientRect(); return [...document.querySelectorAll('#kopf .wo-kopf__r > *')].filter(k => { const b = k.getBoundingClientRect(); return b.width && a.right > b.left + 1 && a.left < b.right; }).length; });
    ok(!ue, 'Titel überdeckt ' + ue + ' Knopf'); return 'Rand oben ' + t.join('/') + ' px'; });

  await schritt('R19', '«Zur Werkbank»: aus der Werkbank geöffnet erscheint der Knopf und führt an die alte Stelle (127.0.0.1:9478/werkbank/…?y=1234); ohne Herkunft kein Knopf', async () => {
    await gehe('start'); ok(!(await p.evaluate(() => !!document.getElementById('zur-werkbank'))), 'Knopf ohne Herkunft');
    await gehe('start', '?wb=de.werkzeuge&wy=1234&wbo=http%3A%2F%2F127.0.0.1%3A9478&wbu=http%3A%2F%2F127.0.0.1%3A9478%2F'); await sleep(600);
    const z = await p.evaluate(() => { const w = document.getElementById('zur-werkbank'); if (!w) return null; const a = (w.shadowRoot || w).querySelector('a') || w; return { href: a.href || a.getAttribute('href'), adr: location.search }; });
    ok(z, 'kein Knopf'); ok(/^http:\/\/127\.0\.0\.1:9478\/werkbank\/index\.html\?y=1234/.test(z.href), 'Ziel ' + z.href); ok(!/wb=|wbu=/.test(z.adr), 'Herkunft bleibt in der Adresse'); return z.href; });

  await schritt('R13/E17', 'Verlassen mit ungespeicherter Eingabe: der Browser fragt nach', async () => {
    await gehe('eingang'); await karte(/Daniel Hofbauer/); await p.click('[data-akt="bearbeiten"]'); await p.waitForSelector('#e-text'); await p.fill('#e-text', (await p.inputValue('#e-text')) + ' QA');
    const d0 = dialoge; await p.goto('about:blank').catch(() => {}); await sleep(500);
    const nachher = JSON.parse((await status(WZ + 'api/anfragen', { headers: { 'Sec-Fetch-Site': 'same-origin' } })).d).anfragen.find(x => x.name === 'Daniel Hofbauer');
    ok(dialoge > d0 || / QA$/.test(nachher.entwurf.text), 'weder gefragt noch gesichert');
    return dialoge > d0 ? 'Browser fragte nach' : 'sofort gesichert'; });

  await schritt('R23/E19/E20', 'Prüfseite ohne Rot, Lexikon, Datenexport als ZIP', async () => {
    await p.goto(WZ + 'pruefung.html', { waitUntil: 'networkidle' }); await sleep(1500);
    const rot = await p.evaluate(() => [...document.querySelectorAll('#punkte .rot, #punkte [data-stand="rot"], #punkte .p-rot')].map(x => x.textContent.trim().slice(0, 60)));
    const satz = await p.locator('#satz').innerText(); ok(!rot.length && !/rot|nicht in Ordnung/i.test(satz), 'Rot: ' + rot.join(' | ') + ' · ' + satz);
    const z = await status(WZ + 'api/export', { headers: { 'Sec-Fetch-Site': 'same-origin' } }); ok(z.s === 200 && z.d.slice(0, 2) === 'PK', 'Export ' + z.s);
    await bild('pruefung'); return satz.slice(0, 80); });

  await schritt('Anleitung', 'Anleitung: Kopfbild und jedes Bild geladen, jeder Kapitel-Sprung trifft, kein Überlaufen', async () => {
    await p.goto(WZ + 'anleitung.html', { waitUntil: 'networkidle' }); await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); } }); await sleep(800);
    const z = await p.evaluate(() => ({ bilder: [...document.images].length, kaputt: [...document.images].filter(i => i.getAttribute('src') && !(i.complete && i.naturalWidth > 0)).map(i => i.getAttribute('src')),
      spruenge: [...document.querySelectorAll('.inhalt a')].filter(a => !document.querySelector(a.getAttribute('href'))).length, kopf: getComputedStyle(document.querySelector('.hero')).backgroundImage }));
    ok(!z.kaputt.length, 'kaputt ' + z.kaputt.join(', ')); ok(!z.spruenge, z.spruenge + ' Sprünge ins Leere'); ok(/ig-abend/.test(z.kopf), 'Kopfbild ' + z.kopf.slice(0, 80)); ok(await ueber() <= 0, 'überläuft');
    return z.bilder + ' Bilder'; });

  const gut = res.filter(r => r.ok).length;
  const log = `Prüflauf Anfragen & Chat · Uncle Hung · ${MOTOR} ${W}×${H} · ${new Date().toISOString().slice(0, 16)}\n` + res.map(r => `${r.ok ? 'ok ' : 'ROT'} [${r.nr}] ${r.name} · ${r.info}`).join('\n') + `\n${gut}/${res.length}\n`;
  fs.writeFileSync(path.join(__dirname, `lauf-${MOTOR}-${W}.txt`), log);
  console.log(`${gut}/${res.length}`);
  await br.close(); process.exit(gut === res.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
