/* bedienen.js · Abnahme von «Website bearbeiten» (Uncle Hung Gersthofen, 11.11.2026). Kopie und Zusammenschnitt der Vorlage Schäfli (democheck/democheck.js)
   und des Laufs des Culinarium (pruefung/bedienen.js): jede Funktion aus Master 3 (R01–R24) und 4.2 wird BEDIENT, nicht nur geladen.
   node bedienen.js [chromium|webkit] [1440|390]
   Eigener Server (freier Port) mit Wegwerf-Daten (WERKZEUGE_DATEN) und Wegwerf-Kopie der Seiten (WEBSITE_PROBE), beides am Ende gelöscht (auch bei Abbruch),
   Browser unsichtbar, ohne feste Zeitzone. Die Website des Hauses (website/) und die echten Daten (_Werkzeuge/daten/unclehung) werden nie angefasst:
   Prüfsummen vorher/nachher. Handy (390): Tippen statt Klicken. Bilder in pruefung/bilder/bedienen-<motor>-<breite>-*.png. */
const fs = require('fs'), path = require('path'), os = require('os'), net = require('net'), crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');
const pw = require('playwright');
const MOTOR = process.argv[2] || 'chromium', BREITE = +(process.argv[3] || 1440), HOEHE = BREITE < 700 ? 844 : 900, HANDY = BREITE < 700;
const HIER = __dirname, BUREAU = path.resolve(HIER, '..'), PROJEKT = path.resolve(BUREAU, '../..');
const STAMM = path.join(os.homedir(), 'Desktop/Website-Projekte/_Werkzeuge'), WS = path.join(STAMM, 'werkzeuge/website');
const HAUS = 'unclehung';
const DATEN = fs.mkdtempSync(path.join(os.tmpdir(), 'bureau-uh-')), PROBE = path.join(WS, `_probe-bedienen-${process.pid}`);
const BILDER = path.join(HIER, 'bilder'); fs.mkdirSync(BILDER, { recursive: true });
let n = 0; const rot = [];
function pruef(ok, was, mehr) { n++; console.log((ok ? 'gut    ' : 'FEHLT  ') + was + (!ok && mehr ? '  → ' + String(mehr).slice(0, 400) : '')); if (!ok) rot.push(was); return ok; }
const warte = ms => new Promise(r => setTimeout(r, ms));
async function bis(fn, ms = 8000) { for (const e = Date.now() + ms; Date.now() < e; await warte(120)) { try { if (await fn()) return true; } catch (x) { } } return false; }
const freierPort = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function baum(d) { const o = {}; if (!fs.existsSync(d)) return o; (function g(x) { for (const e of fs.readdirSync(x, { withFileTypes: true })) { const p = path.join(x, e.name); if (e.isDirectory()) g(p); else o[path.relative(d, p)] = sha(p); } })(d); return o; }
const webSumme = () => execFileSync('bash', [path.join(HIER, 'website_summe.sh')]).toString().trim();
/* Nur der Status einer Adresse, Antwort ganz gelesen und Verbindung geschlossen (fetch ohne gelesene Antwort brachte undici zum Absturz, 11.11.2026) */
const holen = (u, kopf = {}) => new Promise(r => { const q = require('http').get(u, { headers: Object.assign({ Connection: 'close' }, kopf) }, a => { a.resume(); a.on('end', () => r({ status: a.statusCode, ok: a.statusCode >= 200 && a.statusCode < 300, ort: a.headers.location })); }); q.on('error', () => r({ status: 0, ok: false })); q.setTimeout(20000, () => { q.destroy(); r({ status: 0, ok: false }); }); });

(async () => {
  const webVorher = webSumme(), datenVorher = JSON.stringify(baum(path.join(STAMM, 'daten', HAUS)));
  const PORT = Number(process.env.PORT) || await freierPort(), B = `http://127.0.0.1:${PORT}`;
  execFileSync('python3', [path.join(WS, 'probe.py'), HAUS], { env: { ...process.env, WEBSITE_PROBE: PROBE } });
  const srv = spawn('python3', [path.join(BUREAU, 'serve.py'), String(PORT)], { env: { ...process.env, WERKZEUGE_DATEN: DATEN, WEBSITE_PROBE: PROBE, BUREAU_PRUEFLAUF: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  const weg = () => { try { srv.kill('SIGKILL'); } catch (e) { } try { fs.rmSync(PROBE, { recursive: true, force: true }); fs.rmSync(DATEN, { recursive: true, force: true }); } catch (e) { } };
  process.on('exit', weg); process.on('SIGINT', () => process.exit(130)); process.on('SIGTERM', () => process.exit(143));
  process.on('unhandledRejection', e => { console.log('FEHLT  Lauf ohne Abbruch  → ' + (e && e.stack || e)); process.exit(1); });
  let serverText = ''; srv.stdout.on('data', d => serverText += d); srv.stderr.on('data', d => serverText += d);
  await bis(async () => (await holen(B + '/_werkzeuge/bureau/')).ok, 15000);
  const ONLINE = path.join(PROBE, HAUS, 'online'), GRUND = path.join(PROBE, HAUS, 'grundlage');
  const seiten = fs.readdirSync(ONLINE).filter(f => f.endsWith('.html'));
  const vorher = Object.fromEntries(seiten.map(f => [f, sha(path.join(ONLINE, f))]));
  const br = await pw[MOTOR].launch({ headless: true });
  const ctx = await br.newContext({ viewport: { width: BREITE, height: HOEHE }, deviceScaleFactor: 1, hasTouch: HANDY, isMobile: HANDY && MOTOR === 'chromium', acceptDownloads: false });
  await ctx.route(/^(mailto|tel):/, r => r.abort());
  const p = await ctx.newPage(); const konsole = [], fremd = [], schlecht = []; let netzWeg = false;   // während «Netz weg» meldet der Browser absichtlich Ladefehler
  p.on('console', m => { if (m.type() === 'error' && !netzWeg && !/409 \(Conflict\)|status of 4(09|13|22|23)|Failed to load resource: the server responded with a status of 4(13|22|23)/.test(m.text())) konsole.push(m.text().slice(0, 200)); });
  p.on('pageerror', e => konsole.push('SEITE: ' + e.message));
  p.on('dialog', d => d.accept());
  ctx.on('request', r => { const u = r.url(); if (!/^(http:\/\/127\.0\.0\.1|data:|blob:|about:)/.test(u)) fremd.push(u.slice(0, 120)); });
  ctx.on('response', r => { if (r.status() >= 400 && !/api\/x\/website\/(aendern|hochladen)|api\/fehler/.test(r.url())) schlecht.push(r.status() + ' ' + r.url().replace(B, '')); });
  const bild = async (name, ganz) => p.screenshot({ path: path.join(BILDER, `bedienen-${MOTOR}-${BREITE}-${name}.png`), fullPage: !!ganz });
  const druck = async loc => { await loc.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => { }); await warte(60); if (HANDY && MOTOR === 'chromium') await loc.tap(); else await loc.click(); };
  const ueberlauf = async was => pruef(await p.evaluate(b => document.documentElement.scrollWidth <= b + 1 && document.body.scrollWidth <= b + 1, BREITE), `${was}: kein seitliches Verrutschen bei ${BREITE}`);
  const ruhe = async () => { for (let i = 0, s = 0; i < 120 && s < 2; i++) { s = (await p.evaluate(() => document.documentElement.getAttribute('data-ws-laeuft')).catch(() => '0')) === '0' ? s + 1 : 0; await warte(120); } };
  const bereit = a => p.evaluate(x => document.querySelector('#ws-mitte') && document.querySelector('#ws-mitte').getAttribute('data-ws-bereit') === x, a);
  const geh = async (ansicht, q = '') => { await p.goto('about:blank'); await p.goto(B + '/_werkzeuge/bureau/?ansicht=' + encodeURIComponent(ansicht) + q, { waitUntil: 'load', timeout: 60000 }); return bis(() => bereit(ansicht), 20000); };
  const randAuf = async () => { if (BREITE >= 900) return; const k = p.locator('[data-wo-rand-knopf]'); if (await k.count() && (await k.getAttribute('aria-expanded')) !== 'true') { await druck(k); await warte(400); } };
  const stand = async () => (await fetch(B + `/api/x/website/stand/${HAUS}`)).json();
  const speichern = async () => { await druck(p.locator('#ws-speichern')); await bis(() => p.locator('[data-ws-quittung], [data-ws-meldung]').count(), 10000); await ruhe(); };
  const frame = () => p.frameLocator('iframe[data-ws-frame="entwurf"]');
  const fotosOk = async sel => p.evaluate(async s => { const im = [...document.querySelectorAll(s)]; for (const i of im) { i.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 60)); } await new Promise(r => setTimeout(r, 900)); return im.map(i => i.getBoundingClientRect().width > 40 && i.naturalWidth > 0); }, sel);
  const post = async (weg, daten, herkunft = B) => { const r = await fetch(B + weg, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: herkunft }, body: typeof daten === 'string' ? daten : JSON.stringify(daten) }); const t = await r.text(); return { status: r.status, json: async () => JSON.parse(t) }; };
  const veroeffentlichen = async notiz => {
    await geh('entwurf'); await ruhe(); await druck(p.locator('#ws-raus'));
    await bis(() => p.locator('[data-ws-fenster="veroeffentlichen"]').count());
    if (notiz && await p.locator('#ws-notiz').count()) await p.locator('#ws-notiz').fill(notiz);
    await druck(p.locator('[data-ws-fenster="veroeffentlichen"] .kn--d').last());
    return bis(() => p.locator('[data-ws-veroeffentlicht]').count(), 30000);
  };
  try {
    // ================= Übersicht, Rahmen (R01, R05, R16, R21, B)
    pruef(await geh('start'), 'Übersicht öffnet'); await warte(900);
    const wn = await p.evaluate(() => WO_HAUS.namen.website);
    pruef(wn === 'Website bearbeiten' && (await p.locator('.wo-kopf').textContent()).includes(wn), 'R05 Kopf: Name «Website bearbeiten» aus der einen Stelle');
    pruef(await p.locator('#ws-kopf, #ws-rand, #ws-mitte, #ws-leiste, #ws-fenster, #ws-quittung').count() === 6, 'R01 Aufbau: Kopf, Rand, Hauptfläche, Leiste, Fenster, Quittung');
    pruef(await p.locator('[data-ws-anleitung]').count() >= 1, 'Startbild: Knopf «Anleitung»');
    pruef(/Demo: Veröffentlichen schreibt in eine Probe-Kopie/.test(await p.locator('#ws-mitte').innerText()), 'M26 Demo-Hinweis als ruhige Zeile im Fluss');
    const dz = await p.evaluate(() => { const d = document.querySelector('[data-uh-demo]').getBoundingClientRect(); return [...document.querySelectorAll('#ws-mitte h1, #ws-mitte h2, #ws-mitte button, #ws-mitte a')].every(e => { const r = e.getBoundingClientRect(); return r.bottom <= d.top + 1 || r.top >= d.bottom - 1 || r.right <= d.left || r.left >= d.right; }); });
    pruef(dz, 'M26 Demo-Hinweis verdeckt keinen Titel, Knopf oder Link');
    const ag = await p.locator('.wo-aufg > .wo-ag').count(); pruef(ag === 8, 'Häufig gebraucht: acht Kacheln (' + ag + ')');
    const af = await fotosOk('.wo-aufg .wo-ag img'); pruef(af.length === 8 && af.every(Boolean), 'Häufig gebraucht: jede Kachel mit geladenem Foto', JSON.stringify(af));
    const reihe = await p.evaluate(() => { document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { } }); const k = [...document.querySelectorAll('.wo-aufg > .wo-ag')].map(e => e.getBoundingClientRect()); const top = [...new Set(k.map(r => Math.round(r.top)))]; const zeilen = top.map(t => k.filter(r => Math.round(r.top) === t)); const w = document.querySelector('.wo-aufg').getBoundingClientRect(); return zeilen.map(z => [z.length, Math.round(z[0].left - w.left), Math.round(w.right - z[z.length - 1].right)]); });
    pruef(reihe.every(([n, l, r]) => n === reihe[0][0] && Math.abs(l) <= 3 && Math.abs(r) <= 3), 'Häufig gebraucht: volle Reihen, jede Reihe gleich viele Kacheln von Rand zu Rand (Robert 12.11.2026)', JSON.stringify(reihe));
    const bk = await fotosOk('.wo-ber .wo-bk__b img'); pruef(bk.length === 9 && bk.every(Boolean), 'Bereiche: neun Kacheln, jede mit sichtbarem Foto (Foto > 40 px)', JSON.stringify(bk));
    pruef(!(await p.locator('#ws-raus').count()) && !(await p.locator('#ws-vgl').count()), 'Leiste: ohne Entwurf keine ausgegrauten Knöpfe (leiste_klar)');
    pruef(await p.locator('#ws-speichern[data-ws-lage="ruhig"]').count() === 1, 'R09 Speichern-Knopf sichtbar und ruhig');
    await p.evaluate(() => scrollTo(0, 0)); await warte(300);
    await ueberlauf('Übersicht'); await bild('01-uebersicht');
    // jede Kachel «Häufig gebraucht»
    const zielAg = await p.$$eval('.wo-aufg > .wo-ag', a => a.map(x => x.getAttribute('data-gehe') || x.getAttribute('href')));
    for (let i = 0; i < zielAg.length; i++) {
      const z = zielAg[i];
      if (z && /^(http|\/)/.test(z)) { const r = await holen(new URL(z, B).href); pruef(/^http:\/\/127\.0\.0\.1:9473\/_werkzeuge\/carte\//.test(z), `Häufig gebraucht ${i + 1} führt zu «Karten & Preislisten» auf 9473 (${z}, ${r.status || 'antwortet noch nicht'})`); continue; }
      await geh('start'); await warte(300); await druck(p.locator('.wo-aufg > .wo-ag').nth(i));
      pruef(await bis(() => bereit(z), 20000), `Häufig gebraucht ${i + 1} öffnet «${z}»`);
    }
    // jede Bereich-Kachel
    await geh('start'); const bks = await p.$$eval('.wo-ber > .wo-bk', a => a.map(x => x.getAttribute('data-gehe')));
    for (const z of bks) { await geh('start'); await warte(300); await druck(p.locator(`.wo-ber > .wo-bk[data-gehe="${z}"]`)); pruef(await bis(() => bereit(z), 25000), `Bereich-Kachel öffnet «${z}»`); }
    // ================= Rand (R06, R07): jeder Eintrag, jede Seite in der Vorschau mit Konsole und Netz (Fehlerbuch 21.10.)
    await geh('start'); await randAuf();
    const navs = await p.$$eval('#ws-rand button[data-ws-nav]', a => a.map(x => x.getAttribute('data-ws-nav')));
    pruef(navs.length >= 15, 'Rand: alle Einträge da (' + navs.length + ')');
    pruef(/127\.0\.0\.1:9473\/_werkzeuge\/carte\//.test(await p.locator('#ws-rand a[data-ws-nav="karten"]').getAttribute('href')), 'Rand: Weg zu «Karten & Preislisten» auf Port 9473 (über WO_HAUS.wege)');
    if (HANDY) await bild('02-rand-offen');
    for (const z of navs) {
      await geh('start'); await randAuf(); await druck(p.locator(`#ws-rand button[data-ws-nav="${z}"]`));
      pruef(await bis(() => bereit(z), 25000), `Rand öffnet «${z}»`);
      if (HANDY) pruef(!(await p.evaluate(() => document.documentElement.classList.contains('wo-rand-auf'))), `R07 Handy: Rand schliesst sich nach «${z}»`);
      await ruhe(); await warte(500); await ueberlauf('Ansicht ' + z);
      if (z.startsWith('b:')) {
        pruef(await bis(() => frame().locator('[data-ws-e]').count(), 20000), `Vorschau lädt mit Stellen (${z})`);
        pruef(await p.locator('#ws-gruppen .ws-st').count() > 0, `Stellen-Liste gefüllt (${z})`);
        const reiter = await p.locator('.ws-reiter [role=radio], .ws-reiter button').count();
        for (let r = 1; r < reiter; r++) { await druck(p.locator('.ws-reiter [role=radio], .ws-reiter button').nth(r)); await ruhe(); await warte(500); pruef(await p.locator('#ws-gruppen .ws-st').count() > 0 && await bis(() => frame().locator('[data-ws-e]').count(), 15000), `${z}: Seite ${r + 1} von ${reiter} öffnet mit Stellen und Vorschau`); }
        const such = p.locator('#ws-such'); if (await such.count()) { await such.fill('zzzqqq'); await warte(300); const s = await p.locator('#ws-gruppen .ws-st:visible').count(); await such.fill(''); pruef(s === 0, `${z}: Suche filtert die Stellen`); }
        const hk = p.locator('.ws-geraet [role=radio], .ws-geraet button, [data-ws-geraet]').filter({ hasText: /Handy/i }).first();
        if (await hk.count()) { await druck(hk); await warte(700); const w = await p.evaluate(() => Math.round(document.querySelector('iframe[data-ws-frame="entwurf"]').getBoundingClientRect().width)); pruef(w >= 380 && w <= 400, `${z}: Vorschau Handy 390 (${w} px)`); const rk = p.locator('.ws-geraet [role=radio], .ws-geraet button, [data-ws-geraet]').filter({ hasText: /Rechner/i }).first(); if (await rk.count()) await druck(rk); await warte(400); }
      }
      await bild('03-' + z.replace(/:/g, '-'));
    }
    // gesperrte Karten-Stelle: in der Vorschau markiert, Server lehnt ab (423)
    await geh('b:karte'); await ruhe(); await bis(() => frame().locator('[data-ws-zu]').count(), 15000);
    pruef(await frame().locator('[data-ws-zu]').count() > 0, 'Karte: Gerichte und Preise in der Vorschau als gesperrt markiert (Weg zu den Karten)');
    const zuSt = await p.evaluate(() => { const d = document.querySelector('iframe[data-ws-frame="entwurf"]').contentDocument; const e = d.querySelector('[data-ws-zu] [data-ws-e], [data-ws-e][data-ws-zu]'); return e ? { h: e.dataset.wsE, n: e.dataset.wsN } : null; });
    let st0 = await stand();
    if (zuSt) { const r = await post(`/api/x/website/aendern/${HAUS}`, { ops: [{ art: 'text', seite: 'karte.html', h: zuSt.h, n: +zuSt.n, neu: 'Probe' }], erwartet: st0.kennung, wer: 'Prüflauf' }); pruef(r.status === 423, 'Gesperrte Karten-Stelle: Server lehnt jede Änderung ab (423)', r.status); }
    else pruef(false, 'gesperrte Stelle in der Vorschau gefunden');
    // ================= Text ändern: Klick in der Vorschau (C), Vorschau schreibt mit, Speichern (R09–R11), neu laden
    await geh('b:start'); await ruhe(); await bis(() => frame().locator('[data-ws-e]').count(), 15000); await warte(1500);
    const kand = await p.evaluate(() => { const d = document.querySelector('iframe[data-ws-frame="entwurf"]').contentDocument; const z = {}; [...d.querySelectorAll('[data-ws-e]')].forEach(e => z[e.dataset.wsE] = (z[e.dataset.wsE] || 0) + 1);
      return [...d.querySelectorAll('main p[data-ws-e], p[data-ws-e]')].filter(e => !e.closest('[data-ws-zu]') && e.children.length === 0 && e.getBoundingClientRect().width > 40 && z[e.dataset.wsE] === 1).map(e => ({ h: e.dataset.wsE, n: e.dataset.wsN, t: e.textContent.trim() })).filter(x => x.t.length > 30 && x.t.length < 160)[0]; });
    pruef(!!kand, 'Startseite: Textstelle in der Vorschau gefunden', JSON.stringify(kand));
    const ziel = frame().locator(`[data-ws-e="${kand.h}"][data-ws-n="${kand.n}"]`);
    await ziel.evaluate(e => e.scrollIntoView({ block: 'center' })); await warte(300);
    try { if (HANDY && MOTOR === 'chromium') await ziel.tap({ timeout: 6000 }); else await ziel.click({ timeout: 6000 }); } catch (e) { pruef(false, 'Stelle in der Vorschau direkt anklickbar', e.message.split('\n')[0]); await ziel.dispatchEvent('click'); }
    pruef(await bis(() => p.locator(`[data-ws-form="text"][data-ws-wahl$="|${kand.h}|${kand.n}"]`).count(), 15000), 'C Klick in der Seite öffnet das Feld der Stelle');
    await ruhe(); await warte(700);
    const lage = await p.evaluate(() => { const f = document.querySelector('[data-ws-form="text"]'); const r = f.getBoundingClientRect(); return { top: Math.round(r.top), h: innerHeight }; });
    pruef(lage.top >= 0 && lage.top < lage.h * 0.7, 'C geöffnete Stelle steht oben im Bild (Fehlerbuch 19.10.)', JSON.stringify(lage));
    await bild('04-stelle-offen');
    const ed = p.locator('[data-ws-form="text"] [contenteditable], [data-ws-form="text"] textarea, [data-ws-form="text"] input[type=text]').first();
    await ed.click(); await p.keyboard.press('Control+A'); await p.keyboard.type('Probe der Abnahme: ' + kand.t.slice(0, 40));
    pruef(await bis(() => frame().locator(`[data-ws-e="${kand.h}"][data-ws-n="${kand.n}"]`).textContent().then(t => t.includes('Probe der Abnahme')), 4000), 'C Tippen zeigt sofort in der Vorschau');
    pruef(/1 Eingabe/.test(await p.locator('#ws-leiste').textContent()) && await p.locator('#ws-speichern[data-ws-lage="offen"]').count() === 1, 'R10 Eingabe wartet («1 Eingabe noch nicht gespeichert», Knopf leuchtet)');
    await speichern();
    pruef(await p.locator('[data-ws-quittung]').count() >= 1, 'R11 Quittung nach dem Speichern'); await bild('05-quittung');
    pruef(await p.locator('#ws-speichern[data-ws-lage="gespeichert"]').count() === 1, 'R09 Speichern-Knopf «Gespeichert»');
    let st = await stand(); pruef(st.aenderungen.some(a => a.art === 'text'), 'Änderung liegt im Entwurf');
    pruef(sha(path.join(ONLINE, 'index.html')) === vorher['index.html'], 'Speichern ändert die Seite noch nicht (erst Veröffentlichen)');
    await p.reload({ waitUntil: 'load' }); await bis(() => bereit('b:start'), 20000); await bis(() => frame().locator('[data-ws-e]').count(), 15000); await warte(800);
    pruef(await bis(() => frame().locator(`[data-ws-e="${kand.h}"][data-ws-n="${kand.n}"]`).textContent().then(t => t.includes('Probe der Abnahme')), 8000), 'Speichern → neu laden → Änderung noch da (R15 Ansicht gemerkt)');
    // ================= Zeiten & Preise (F): Rückgängig, Filter, Suche, «In der Seite»
    await geh('zahlen'); await ruhe();
    const zw = p.locator('.ws-zl__wert').nth(1); await druck(zw); await bis(() => p.locator('[data-ws-form="text"]').count(), 8000);
    const ed2 = p.locator('[data-ws-form="text"] [contenteditable], [data-ws-form="text"] textarea, [data-ws-form="text"] input[type=text]').first();
    await ed2.click(); await p.keyboard.press('Control+A'); await p.keyboard.type('bis 14.30 Uhr.');
    await speichern(); await bild('06-zahlen-gespeichert');
    const rk = p.locator('[data-ws-quittung] button, [data-ws-quittung] a').filter({ hasText: 'Rückgängig' }).first();
    pruef(await rk.count() === 1, 'R11 Quittung hat «Rückgängig»');
    if (await rk.count()) { await druck(rk); await bis(async () => !JSON.stringify((await stand()).aenderungen).includes('bis 14.30 Uhr.'), 8000); }
    pruef(!JSON.stringify((await stand()).aenderungen).includes('bis 14.30 Uhr.'), 'Rückgängig nimmt die letzte Änderung zurück');
    await geh('zahlen'); await ruhe();
    pruef(/Lunch, €, Uhr/.test(await p.locator('#ws-suche').getAttribute('placeholder')), 'Zeiten & Preise: Suchfeld mit Beispielen des Hauses');
    pruef(await p.evaluate(() => [...document.querySelectorAll('#ws-mitte button, #ws-mitte [role=radio]')].some(e => e.textContent.trim() === 'Größen und Dauer')) && !/Grösse|Fuss\b|aussen|heisst/.test(await p.evaluate(() => document.body.textContent)), 'ß-Schicht: Texte des Stamms in deutscher Schreibung («Größen und Dauer»)');
    const zPreise = (await (await fetch(B + `/api/x/website/zahlen/${HAUS}`)).text()).includes('€');
    for (const f of ['Preise', 'Zeiten', 'Größen und Dauer', 'Alle']) { const k = p.locator('#ws-mitte [role=radio], #ws-mitte button').filter({ hasText: f }).first(); if (await k.count()) { await druck(k); await warte(250); const z = await p.locator('.ws-zl').count(); pruef(z > 0 || (f === 'Preise' && !zPreise), `F Filter «${f}» bedient (${z} Zeilen${f === 'Preise' && !zPreise ? ', alle Preise stehen in den gesperrten Karten-Stellen' : ''})`); } }
    { const tx = await p.locator('#ws-mitte').innerText(); pruef(!/CHF|Fr\.\s?\d|Wigoltingen|Schäfli|\+41/.test(tx), 'Zeiten & Preise: nur Angaben dieses Hauses, keine fremde Währung'); }
    await p.locator('#ws-suche').fill('14.30'); await warte(300); pruef(await p.locator('.ws-zl').count() >= 1, 'F Suche findet «14.30»'); await p.locator('#ws-suche').fill('');
    await druck(p.locator('.ws-zl a, .ws-zl button').filter({ hasText: 'In der Seite' }).first());
    pruef(await bis(() => p.evaluate(() => (document.querySelector('#ws-mitte').getAttribute('data-ws-bereit') || '').startsWith('b:')), 20000), 'F «In der Seite» springt in den Bereich');
    // ================= Angaben des Hauses (E): Telefon an allen Stellen und in allen Links zum Anrufen
    await geh('angaben');
    const tel = p.locator('[data-ws-angabe="telefon"]');
    pruef(await tel.inputValue() === '0821 / 2185710', 'E Telefon steht mit dem Wert der Website (0821 / 2185710)');
    pruef(/Steht \d+× und als \d+ Links auf \d+ Seiten/.test(await p.locator('#ws-mitte').innerText()), 'E «steht n× und als n Links auf m Seiten»');
    await tel.fill('0821 2185799');
    pruef(/1 Eingabe/.test(await p.locator('#ws-leiste').textContent()), 'E Eingabe wartet in der Leiste');
    const igl = p.locator('[data-ws-angabe="instagram"]'); await igl.fill('instagram ohne https');
    pruef(await p.locator('.ws-ang__warn:not([hidden])').count() >= 1, 'E Prüfung beim Tippen: Link ohne https:// wird gemeldet');
    await igl.fill('https://www.instagram.com/unclehung.official/');
    await speichern(); await warte(500);
    st = await stand();
    pruef(st.aenderungen.filter(a => a.art === 'text').length >= 10 && st.aenderungen.filter(a => a.art === 'link').length >= 10, 'E Telefon an allen Stellen und in allen Links geändert (' + st.aenderungen.length + ')');
    await geh('angaben');
    pruef(await p.locator('[data-ws-angabe="telefon"]').inputValue() === '0821 2185799', 'Speichern → neu laden → noch da (Telefon)');
    const r422 = await post(`/api/x/website/aendern/${HAUS}`, { ops: [{ art: 'angabe', key: 'telefon', neu: 'kein telefon' }], erwartet: st.kennung });
    pruef(r422.status === 422 && (await r422.json()).stichwort === 'angabe-telefon', 'E Server weist ungültiges Telefon ab (422, Stichwort)');
    const ort = p.locator('[data-ws-angabe="strasse"]');
    await ort.fill('<script>alert(1)</script> Dieselstraße 2 🍜 Ä Ö Ü'); await speichern(); await warte(400);
    const bs = await (await fetch(B + `/api/x/website/vorschau/${HAUS}/entwurf/de/besuch.html`)).json();
    pruef(!/<script>alert\(1\)/.test(bs.html) && /🍜 Ä Ö Ü/.test(bs.html), 'Ungewöhnlich: <script> kommt nicht auf die Seite, Emoji und Umlaute schon');
    await geh('angaben'); await p.locator('[data-ws-angabe="strasse"]').fill(''); await speichern(); await warte(300);
    pruef(await p.locator('[data-ws-meldung="leer"]').count() >= 1, 'Ungewöhnlich: leeres Feld wird mit Stichwort abgewiesen');
    await geh('angaben'); await p.locator('[data-ws-angabe="strasse"]').fill('x'.repeat(5000)); await speichern(); await warte(300);
    pruef(await p.locator('[data-ws-meldung="zu-lang"]').count() >= 1, 'Ungewöhnlich: 5000 Zeichen werden mit Stichwort abgewiesen');
    await geh('angaben'); await p.locator('[data-ws-angabe="strasse"]').fill('Dieselstraße 4');
    netzWeg = true; await ctx.setOffline(true); await druck(p.locator('#ws-speichern'));
    pruef(await bis(() => p.locator('[data-ws-meldung="keine-verbindung"]').count()), 'Netz weg: Meldung mit Stichwort');
    pruef(/1 Eingabe/.test(await p.locator('#ws-leiste').textContent()), 'Netz weg: Eingabe bleibt offen');
    await ctx.setOffline(false); await warte(300); netzWeg = false; await speichern(); await warte(300);
    await geh('angaben'); pruef(await p.locator('[data-ws-ang-zurueck="strasse"]').count() === 1, 'E04 «Wie ursprünglich» bei geänderter Angabe');
    await ueberlauf('Angaben'); await bild('07-angaben');
    // ================= Google-Texte (I)
    await geh('google');
    const gt = p.locator('[data-ws-seo="mittag.html"] [data-ws-gt="titel"]');
    await gt.fill('Mittags bei Uncle Hung · Lunchdeals in Gersthofen');
    pruef(/^\d+ \/ 60$/.test((await p.locator('[data-ws-seo="mittag.html"] .ws-gt__zahl').first().textContent()).trim()), 'I Zähler 60 beim Titel');
    pruef(/Mittags bei Uncle Hung/.test(await p.locator('[data-ws-seo="mittag.html"] .ws-gt__vt').textContent()), 'I Vorschau wie bei Google schreibt mit');
    await speichern(); await geh('google');
    pruef(await p.locator('[data-ws-seo="mittag.html"] [data-ws-gt="titel"]').inputValue() === 'Mittags bei Uncle Hung · Lunchdeals in Gersthofen', 'Speichern → neu laden → noch da (Google-Titel)');
    const gb = await p.evaluate(() => [...document.querySelectorAll('.ws-gt__bild img')].map(i => i.getAttribute('src')));
    pruef(gb.length === 10 && new Set(gb).size === 10, 'I jede Seite mit eigenem Foto, keins doppelt', gb.length + '/' + new Set(gb).size);
    await ueberlauf('Google-Texte'); await bild('08-google');
    // ================= Stimmen der Gäste: Liste mit Bild, Foto tauschen, eigenes Foto hochladen (D), Ausblenden / Wieder zeigen
    await geh('haus:stimmen'); await ruhe(); await warte(500);
    pruef(await p.locator('details.ws-eintrag').count() === 6, 'Stimmen der Gäste: sechs Einträge (Startseite und Besuch)');
    const eb = await fotosOk('.ws-eintrag__b img'); pruef(eb.length === 6 && eb.every(Boolean), 'Stimmen: jeder Eintrag mit Foto', JSON.stringify(eb));
    const karten = await p.evaluate(() => { document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { } }); const k = [...document.querySelectorAll('details.ws-eintrag')].map(e => e.getBoundingClientRect()); return [...new Set(k.map(r => Math.round(r.top)))].map(t => k.filter(r => Math.round(r.top) === t).length); });
    pruef(karten.every(x => x === karten[0]), 'Stimmen: Bildkarten gleichmässig auf Reihen (' + karten.join(' + ') + ')');
    await bild('09-stimmen');
    const e1 = p.locator('details.ws-eintrag').nth(1); await druck(e1.locator('summary')); await warte(500);
    await druck(e1.locator('button.ws-foto').first());
    pruef(await bis(() => p.locator('[data-ws-fenster="bild"]').count()), 'D Fenster «Foto tauschen» öffnet');
    const wahl = await p.locator('[data-ws-fenster="bild"] .ws-fwahl').count(); pruef(wahl > 50, 'D Fotos des Hauses zur Wahl (' + wahl + ')');
    const ganz = await p.evaluate(() => [...document.querySelectorAll('[data-ws-fenster="bild"] .ws-fwahl__b')].slice(0, 12).map(b => b.getBoundingClientRect()).every(r => r.height > 50 && r.width > 50));
    pruef(ganz, 'D Foto-Auswahl zeigt ganze Kacheln, nie gestaucht');
    const jpg = n => path.join(DATEN, n);
    execFileSync('python3', ['-c', `from PIL import Image\nImage.new('RGB',(1600,1067),(77,92,78)).save('${jpg('gross.jpg')}',quality=90)\nImage.new('RGB',(400,300),(77,92,78)).save('${jpg('klein.jpg')}')\nopen('${jpg('text.jpg')}','w').write('kein bild')`]);
    await p.locator('#ws-hoch').setInputFiles(jpg('klein.jpg'));
    pruef(await bis(() => p.locator('[data-ws-meldung="bild-klein"]').count()), 'D Foto mit 400 px wird abgewiesen (bild-klein)');
    await p.locator('#ws-hoch').setInputFiles({ name: 'brief.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
    pruef(await bis(() => p.locator('[data-ws-meldung="bild-art"]').count()), 'D Datei ohne Bild wird abgewiesen (bild-art)');
    await p.locator('#ws-hoch').setInputFiles({ name: 'riesig.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(30 * 1024 * 1024) });
    pruef(await bis(() => p.locator('[data-ws-meldung="bild-gross"]').count()), 'D Foto mit 30 MB schon im Browser abgewiesen (S03)');
    await p.locator('#ws-hoch').setInputFiles(jpg('gross.jpg'));
    pruef(await bis(() => p.locator('[data-ws-fenster="bild"]').textContent().then(t => /übernommen \(1600 × 1067/.test(t)), 20000), 'D eigenes Foto hochgeladen, neu gesetzt (1600 × 1067, vier Größen)');
    const eig = fs.existsSync(path.join(DATEN, HAUS, 'website-fotos')) ? fs.readdirSync(path.join(DATEN, HAUS, 'website-fotos')).filter(f => f.endsWith('.webp')) : [];
    pruef(eig.length === 4 && fs.existsSync(path.join(GRUND, 'assets/bild', eig[0] || 'x')), 'D vier Liefergrössen als WebP in assets/bild der Kopie', eig.join(','));
    await bild('10-foto-fenster');
    await druck(p.locator('[data-ws-fenster="bild"] .kn--d').last());
    pruef(await bis(() => p.locator('[data-ws-quittung]').count(), 8000), 'D Quittung nach Fototausch');
    st = await stand(); pruef(st.aenderungen.some(a => a.art === 'bild' && /^u-/.test(a.nachher)), 'D getauschtes Foto im Entwurf');
    await geh('haus:stimmen'); await ruhe(); await druck(p.locator('details.ws-eintrag summary').nth(2)); await warte(500);
    const aus = p.locator('details.ws-eintrag[open] button').filter({ hasText: /Ausblenden/ }).first();
    pruef(await aus.count() === 1, 'C «Ausblenden» statt Löschen');
    if (await aus.count()) {
      await druck(aus); await bis(() => p.locator('[data-ws-quittung]').count(), 8000); await ruhe();
      pruef((await stand()).aenderungen.some(a => a.art === 'aus'), 'Ausblenden liegt im Entwurf');
      await geh('haus:stimmen'); await ruhe(); await druck(p.locator('details.ws-eintrag summary').nth(2)); await warte(500);
      const wz = p.locator('button').filter({ hasText: /Wieder zeigen/ }).first(); pruef(await wz.count() === 1, '«Wieder zeigen» steht da');
      if (await wz.count()) { await druck(wz); await ruhe(); await warte(700); pruef(!(await stand()).aenderungen.some(a => a.art === 'aus'), 'Wieder zeigen nimmt das Ausblenden zurück'); }
    }
    // ================= Hinweis für Gäste (H)
    await geh('hinweis'); await ruhe();
    await druck(p.locator('[data-ws-form="hinweis"] [role=radio], [data-ws-form="hinweis"] button').filter({ hasText: 'Eingeschaltet' }).first());
    await p.locator('#ws-h-text').fill('Am Freitag, 20. November, ist die Küche abends für eine Feier reserviert.');
    await p.locator('#ws-h-von').fill('16.11.2026'); await p.locator('#ws-h-bis').fill('20.11.2026');
    await speichern(); await bild('11-hinweis');
    pruef((await stand()).aenderungen.some(a => a.art === 'hinweis'), 'H Hinweis für Gäste liegt im Entwurf');
    // ================= Entwurf & Vergleich (K), Veröffentlichen (R12) nur in die Wegwerf-Kopie, Frühere Fassungen (R14)
    await geh('entwurf'); await ruhe(); await warte(500);
    const zahlA = await p.locator('[data-ws-aenderung]').count(); pruef(zahlA >= 4, 'K Entwurf listet die Änderungen (' + zahlA + ')');
    pruef(await p.locator('[data-uh-demo]').count() === 1, 'M26 Demo-Hinweis auch im Entwurf');
    await bild('12-entwurf'); await ueberlauf('Entwurf');
    pruef(await p.locator('#ws-vgl').count() === 1 && await p.locator('#ws-raus').count() === 1, 'R08 Leiste mit Entwurf: «Vorher, nachher» und «Veröffentlichen»');
    await druck(p.locator('#ws-vgl')); pruef(await bis(() => p.locator('#ws-vergleich, [data-ws-vgl]').count(), 10000), 'K «Vorher, nachher» öffnet den Vergleich'); await warte(900); await bild('13-vergleich');
    await p.keyboard.press('Escape'); await warte(400);
    const zn = p.locator('[data-ws-aenderung] button, [data-ws-aenderung] a').filter({ hasText: 'Zurücknehmen' }).first();
    if (await zn.count()) { const v0 = (await stand()).aenderungen.length; await druck(zn); await bis(async () => (await stand()).aenderungen.length < v0, 8000); pruef((await stand()).aenderungen.length < v0, 'K einzelne Änderung «Zurücknehmen»'); } else pruef(false, 'K Knopf «Zurücknehmen» je Änderung');
    // R13 Verlassen mit offener Eingabe fragt nach
    await geh('angaben'); await p.locator('[data-ws-angabe="ort"]').fill('86368 Gersthofen-Nord');
    const frag = await p.evaluate(() => { const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented || e.returnValue === false || !!e.returnValue; });
    pruef(frag, 'R13 Verlassen mit offener Eingabe: der Browser fragt nach');
    await p.locator('[data-ws-angabe="ort"]').fill('86368 Gersthofen');
    // Veröffentlichen
    const websiteVorVer = webSumme();
    await geh('entwurf'); await druck(p.locator('#ws-raus')); await bis(() => p.locator('[data-ws-fenster="veroeffentlichen"]').count());
    pruef(await bis(() => p.locator('[data-ws-fenster="veroeffentlichen"] [data-uh-demo]').count(), 3000), 'Fenster «Veröffentlichen» sagt: Demo, die Website bleibt, wie sie ist');
    await bild('14-veroeffentlichen-fenster');
    if (await p.locator('#ws-notiz').count()) await p.locator('#ws-notiz').fill('Abnahme Website bearbeiten');
    await druck(p.locator('[data-ws-fenster="veroeffentlichen"] .kn--d').last());
    pruef(await bis(() => p.locator('[data-ws-veroeffentlicht]').count(), 30000), 'R12 «Ist online.» nach Veröffentlichen'); await bild('15-veroeffentlicht');
    pruef(webSumme() === websiteVorVer, 'Demo-Sperre: Veröffentlichen schreibt nie nach website/ (Prüfsumme gleich)');
    const besuch = fs.readFileSync(path.join(ONLINE, 'besuch.html'), 'utf8');
    pruef(/0821 2185799/.test(besuch) && /tel:\+498212185799/.test(besuch) && /Dieselstraße 4/.test(besuch), 'Probe-Kopie zeigt Telefon, Link zum Anrufen (+49) und Straße neu');
    pruef(/<title>Mittags bei Uncle Hung · Lunchdeals in Gersthofen<\/title>/.test(fs.readFileSync(path.join(ONLINE, 'mittag.html'), 'utf8')), 'Probe-Kopie: Google-Titel auf der Seite');
    pruef(/assets\/bild\/u-[0-9a-f]{12}-\d+\.webp/.test(fs.readFileSync(path.join(ONLINE, 'index.html'), 'utf8')), 'Probe-Kopie: eigenes Foto auf der Seite');
    pruef(/Küche abends für eine Feier reserviert/.test(fs.readFileSync(path.join(ONLINE, 'index.html'), 'utf8')), 'Probe-Kopie: Hinweis für Gäste auf der Seite');
    const web = await (await fetch(B + '/werkzeuge/website/' + path.basename(PROBE) + `/${HAUS}/online/besuch.html`)).text();
    pruef(/0821 2185799/.test(web), '«Website ansehen» liefert den neuen Stand');
    // Frühere Fassungen: Ursprung zurückholen → Byte für Byte
    await geh('verlauf'); await ruhe(); await bild('16-verlauf');
    const fass = p.locator('[data-ws-fassung]'); pruef(await fass.count() >= 1, 'R14 Frühere Fassungen mit Datum und Notiz (' + await fass.count() + ')');
    pruef(/Ursprünglicher Stand/.test(await fass.last().textContent()), 'R14 «Ursprünglicher Stand» steht unten');
    pruef(!(await p.locator('#ws-wer').count()), 'Fehlerbuch: keine Namensabfrage');
    await druck(fass.last().locator('button').filter({ hasText: /Zurückholen|In den Entwurf/ }).first());
    await bis(() => p.locator('.ws-fenster__blatt').count()); await druck(p.locator('.ws-fenster__blatt .kn--d').first());
    await bis(async () => (await stand()).offen, 8000);
    pruef((await stand()).offen && /0821 2185799/.test(fs.readFileSync(path.join(ONLINE, 'besuch.html'), 'utf8')), 'R14 Zurückholen legt in den Entwurf, Kopie bleibt bis zum Veröffentlichen');
    pruef(await veroeffentlichen('Zurück auf den Ursprung'), 'Ursprung veröffentlicht');
    const anders = seiten.filter(f => sha(path.join(ONLINE, f)) !== vorher[f]);
    pruef(!anders.length, `Zurück auf den Ursprung: alle ${seiten.length} Seiten Byte für Byte wie vorher`, anders.join(','));
    // Verwerfen
    await geh('hinweis'); await p.locator('#ws-h-text').fill('Probe zum Verwerfen'); await druck(p.locator('[data-ws-form="hinweis"] [role=radio], [data-ws-form="hinweis"] button').filter({ hasText: 'Eingeschaltet' }).first()); await speichern();
    await geh('entwurf'); const vw = p.locator('button, a').filter({ hasText: /^Verwerfen|Alles verwerfen|Entwurf verwerfen/ }).first();
    pruef(await vw.count() === 1, 'K «Entwurf verwerfen» da');
    if (await vw.count()) { await druck(vw); await bis(() => p.locator('.ws-fenster__blatt').count()); await druck(p.locator('.ws-fenster__blatt button').filter({ hasText: /verwerfen/i }).last()); await bis(async () => !(await stand()).offen, 8000); pruef(!(await stand()).offen, 'K Verwerfen leert den Entwurf'); }
    // ================= Zwei Fenster (L13)
    st = await stand();
    const k1 = await post(`/api/x/website/aendern/${HAUS}`, { ops: [{ art: 'hinweis', an: true, text: 'Fenster eins' }], erwartet: st.kennung });
    const k2 = await post(`/api/x/website/aendern/${HAUS}`, { ops: [{ art: 'hinweis', an: true, text: 'Fenster zwei' }], erwartet: st.kennung });
    pruef(k1.status === 200 && k2.status === 409, 'L13 zweites Fenster mit altem Stand bekommt 409 KONFLIKT, nichts überschrieben', k1.status + '/' + k2.status);
    await fetch(B + `/api/entwurf/${HAUS}/website`, { method: 'DELETE', headers: { Origin: B } }).then(r => r.text());
    // ================= Kopf und Wege: jeder Link antwortet, Wege zu anderen Werkzeugen über WO_HAUS.wege
    await geh('start');
    const links = await p.$$eval('a[href]', a => [...new Set(a.map(x => x.getAttribute('href')))]);
    for (const h of links) {
      if (/^(mailto|tel):/.test(h)) { pruef(false, 'kein mailto/tel im Werkzeug', h); continue; }
      const u = new URL(h, B + '/_werkzeuge/bureau/');
      if (u.host !== '127.0.0.1:' + PORT) { pruef(/^127\.0\.0\.1:94(7[1-9])$/.test(u.host), 'Weg zu einem Werkzeug des Hauses: ' + h); continue; }
      const r = await holen(u.href);
      pruef(r.ok || r.status === 302, `Weg ${h} antwortet (${r.status})`);
    }
    const kz = await p.$$eval('.wo-kopf a[href]', a => a.map(x => x.href));
    pruef(kz.some(h => /127\.0\.0\.1:9471\/_werkzeuge\/maison\//.test(h)), 'R05 runder Knopf «Kontrollpanel» im Kopf auf Port 9471', kz.join(' '));
    // ================= Prüfseite (R23, M) im Kleid des Hauses
    // vor dem Blick auf die Prüfseite: die Meldungen, die dieser Lauf absichtlich ausgelöst hat (400 px, Netz weg, zu lang), aus dem Browser räumen (Fehlerbuch 10a 21.10.: «Fehlerlisten leeren» vor der Demo)
    await p.evaluate(() => Object.keys(localStorage).filter(k => /^ws-/.test(k)).forEach(k => localStorage.removeItem(k)));
    await p.goto(B + `/werkzeuge/website/pruefung.html?haus=${HAUS}`, { waitUntil: 'load' }); await warte(3000);
    await bis(() => p.locator('#wsp-server .wsp-punkt').count(), 10000); await warte(1500);
    const rotP = await p.$$eval('.wsp-punkt[data-gut="nein"]', a => a.map(e => e.innerText.replace(/\s+/g, ' ')));
    pruef(!rotP.length && await p.locator('.wsp-punkt').count() >= 10, 'R23 Prüfseite: jeder Punkt in Ordnung (' + await p.locator('.wsp-punkt').count() + ')', rotP.join(' | '));
    pruef(!(await p.locator('[data-welt-knopf]').count()) && /Website bearbeiten/.test(await p.locator('.wsp-kopf').innerText()), 'Prüfseite: Name «Website bearbeiten», kein Weltknopf');
    pruef(/\/_werkzeuge\/bureau\/$/.test(await p.locator('#wsp-zurueck').getAttribute('href')), 'Prüfseite: «Zum Werkzeug» führt zurück');
    await ueberlauf('Prüfseite'); await bild('17-pruefseite');
    // Anleitung
    await p.goto(B + '/_werkzeuge/bureau/anleitung.html', { waitUntil: 'load' }); await warte(800);
    const ab = await p.evaluate(async () => { const im = [...document.querySelectorAll('img')]; for (const i of im) { i.scrollIntoView(); await new Promise(r => setTimeout(r, 80)); } await new Promise(r => setTimeout(r, 900)); return im.map(i => i.naturalWidth > 0); });
    pruef(ab.length >= 7 && ab.every(Boolean), 'Anleitung: jedes Bild geladen (' + ab.length + ')');
    pruef(/Website bearbeiten/.test(await p.title()) && /Uncle Hung/.test(await p.title()), 'Anleitung: Titel mit Werkzeug und Haus');
    await ueberlauf('Anleitung');
    // ================= Rundgang nur auf Klick (R18, Fehlerbuch 07.11.)
    await geh('start'); await warte(3500);
    pruef(!(await p.locator('.rdg-schild, .rdg-karte').count()), 'R18 kein Rundgang und kein Schild von selbst');
    await randAuf(); await druck(p.locator('#ws-rand .rdg-wieder'));
    pruef(await bis(() => p.locator('.rdg-karte').count(), 8000), 'R18 «Kurzer Rundgang» im Rand startet ihn');
    let schritte = 0; while (await p.locator('.rdg-karte').count() && schritte < 8) { schritte++; if (schritte === 2) await bild('18-rundgang'); await druck(p.locator('.rdg-karte .rdg-los')); await warte(500); }
    pruef(schritte >= 4 && schritte <= 5, 'R18 Rundgang: vier bis fünf Schritte, dann zu (' + schritte + ')');
    // ================= Fehlermelder (R03)
    await p.evaluate(() => setTimeout(() => { throw new Error('Probe-Fehler aus der Abnahme'); }, 0)); await warte(800);
    const fl = await (await fetch(B + '/_werkzeuge/bureau/api/fehler')).json();
    pruef(fl.fehler.some(f => /Probe-Fehler aus der Abnahme/.test(f.text)), 'R03 Skriptfehler kommt beim Server an (Wegwerf-Protokoll)');
    // ================= Sicherheit (S01–S03)
    const fremdH = await post(`/api/x/website/aendern/${HAUS}`, '{}', 'https://boese.example'); pruef(fremdH.status === 403, 'S01 fremde Herkunft 403', fremdH.status);
    const gross = await new Promise(r => { const q = require('http').request(B + `/api/x/website/aendern/${HAUS}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: B, 'Content-Length': 3_100_000 } }, a => { a.resume(); r(a.statusCode); }); q.on('error', () => r('getrennt')); q.end('x'.repeat(3_100_000)); });
    pruef(gross === 413, 'S03 Anfrage über 3 MB 413', gross);
    const py = await holen(B + '/_werkzeuge/bureau/serve.py'); pruef(py.status === 404, 'Server-Code nicht abrufbar (404)');
    const fd = await holen(B + '/_werkzeuge/bureau/_daten/fehler.jsonl'); pruef(fd.status === 404, 'Fehlerprotokoll nicht abrufbar (404)');
    const host = await holen(B + '/api/x/website/haus/unclehung', { Host: 'boese.example' }); pruef(host.status === 421, 'Host-Prüfung: fremder Host 421', host.status);
  } catch (e) { pruef(false, 'Lauf ohne Abbruch', (e.stack || e).toString().split('\n').slice(0, 3).join(' ')); await bild('zz-abbruch').catch(() => { }); }
  const echt = konsole.filter(t => !/Probe-Fehler aus der Abnahme|ERR_INTERNET_DISCONNECTED/.test(t));   // Netz weg ist ein absichtlicher Schritt
  pruef(!echt.length, 'keine Fehler in der Konsole (ausser dem absichtlichen Probe-Fehler)', [...new Set(echt)].join(' | '));
  pruef(!fremd.length, 'keine Anfrage an fremde Server', [...new Set(fremd)].slice(0, 6).join(' | '));
  pruef(!schlecht.length, 'keine unerwartete Antwort 4xx/5xx', [...new Set(schlecht)].slice(0, 8).join(' | '));
  await br.close(); weg();
  pruef(webSumme() === webVorher, 'Website des Hauses (website/) unberührt (Prüfsumme vorher = nachher)');
  pruef(JSON.stringify(baum(path.join(STAMM, 'daten', HAUS))) === datenVorher, 'Echte Daten (_Werkzeuge/daten/unclehung) unberührt');
  if (rot.length && process.env.LAUT) console.log(serverText.slice(-3000));
  console.log((rot.length ? 'NICHT BESTANDEN · ' + rot.length + ' von ' : 'BESTANDEN · ') + n + ' Prüfungen · ' + MOTOR + ' ' + BREITE);
  process.exit(rot.length ? 1 : 0);
})();
