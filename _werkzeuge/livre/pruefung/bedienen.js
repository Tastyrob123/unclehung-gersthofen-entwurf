// Markenbuch · Uncle Hung Gersthofen · Bedien-Durchlauf (Master Werkzeug-Bau: bedient, nicht nur geladen), gegen den laufenden Server :9475.
// Vorlage: bedienen.js des Markenbuchs Culinarium/Schäfli (dort nur gelesen), angepasst an Uncle Hung 11.11.2026.
//   node _werkzeuge/livre/pruefung/bedienen.js chromium|webkit 1440x900|390x844
// Schreibt nur in pruefung/ergebnisse/ (Downloads werden geprüft und wieder gelöscht). Nichts wird gespeichert, nichts geht nach aussen.
const pw = require('playwright'), fs = require('fs'), path = require('path'), os = require('os'), { execSync } = require('child_process');
const BASIS = process.env.BASIS || '/', U = BASIS + '_werkzeuge/livre/';
const motor = process.argv[2] || 'chromium', [W, H] = (process.argv[3] || '1440x900').split('x').map(Number);
const HANDY = W < 700, ERG = path.join(__dirname, 'ergebnisse'); fs.mkdirSync(ERG, { recursive: true });
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'livre-'));
const zeilen = []; let nr = 0;
const L = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'livre.json'), 'utf8')), N = L.fotos.length, ND = L.stand.dateien;
const KLEID = fs.readFileSync(path.join(__dirname, '..', '..', 'oberflaeche', 'kleid', 'unclehung.js'), 'utf8');
const NAMEN = Object.fromEntries([...KLEID.match(/namen:\s*\{([^}]*)\}/)[1].matchAll(/(\w+):\s*'([^']+)'/g)].map(m => [m[1], m[2]]));
const SG = L.fotos.find(f => f.k === 'nudeln'), OHNE = L.fotos.find(f => !f.ue), VN = 'v-ess01', FREMD = L.fotos.find(f => f.art === 'fremd');
const Z = (was, ok, beleg = '') => { nr++; zeilen.push(`${ok ? 'ok  ' : 'FEHL'} ${String(nr).padStart(2)} ${was}${beleg !== '' ? ' · ' + beleg : ''}`); };
const masse = f => execSync(`python3 -c "import sys;from PIL import Image;print(*Image.open(sys.argv[1]).size)" "${f}"`).toString().trim().split(' ').map(Number);

(async () => {
  const br = await pw[motor].launch();
  const ctx = await br.newContext({ viewport: { width: W, height: H }, acceptDownloads: true, reducedMotion: 'reduce',
    ...(HANDY ? { isMobile: motor === 'chromium', hasTouch: true } : {}) });
  await ctx.addInitScript(() => { try { localStorage.setItem('rundgang-unclehung-livre', '1'); } catch (e) {} });
  const p = await ctx.newPage(); const fehler = [];
  p.on('pageerror', e => fehler.push('JS ' + e.message));
  let abgebrochen = false;   // im Lauf «Netz weg» bricht der Lauf selbst eine Anfrage ab: das zählt nicht als Fehler
  p.on('console', m => { if (m.type() === 'error' && !(abgebrochen && /ERR_FAILED/.test(m.text()))) fehler.push('KONSOLE ' + m.text()); });
  p.on('response', r => { if (r.status() >= 400) fehler.push(r.status() + ' ' + r.url()); });
  const warte = ms => p.waitForTimeout(ms);
  const geh = async u => { await p.goto('about:blank'); await p.goto(u, { waitUntil: 'networkidle' }); await warte(500); };
  const n = s => p.locator(s).count();
  const ueber = async () => p.evaluate(w => document.documentElement.scrollWidth <= w, W);
  const randAuf = async () => { if (HANDY && await n('[data-wo-rand-knopf]')) { await p.locator('[data-wo-rand-knopf]').click(); await warte(400); } };
  const laden = async (loc) => { const [d] = await Promise.all([p.waitForEvent('download'), loc.click()]); const f = path.join(TMP, d.suggestedFilename()); await d.saveAs(f); return [d.suggestedFilename(), f]; };

  // Übersicht
  await geh(U + '#start');
  const t1 = (await p.locator('#ansicht').textContent());
  Z('Übersicht lädt mit Gruss nach Tageszeit', /Guten (Morgen|Tag|Abend)/.test(t1));
  Z(`Zahlen: ${N} Fotos, ${ND} Dateien im Kopf`, new RegExp(`${N} Fotos · ${ND} Dateien`).test(await p.locator('#kopf').textContent()));
  Z('Vier Kacheln Fotos, Logo & Dateien, Markenprüfung, Markenbuch', await n('#ansicht .wo-ag') === 4);
  Z('Kein seitliches Verrutschen (Übersicht)', await ueber());
  const kopfText = await p.locator('#kopf').textContent(), randText = await p.locator('#rand').textContent();
  Z(`Namen des Hauses aus dem Kleid: ${NAMEN.marke}, ${NAMEN.zentrale}; keine Namen anderer Häuser`, kopfText.includes(NAMEN.marke) && (randText + await p.locator('#kopf').innerHTML()).includes(NAMEN.zentrale) && !new RegExp(['Bildarchiv', 'Hafenbüro', 'Kartenpult', 'Schaufenster', 'Reservationsbuch', 'Besucherliste', 'Hausdruckerei', 'Das Hausbuch', 'Die Stube', 'Die Werkstatt', 'Der Gastgeber', 'Das Besucherbuch', 'Der Schreibtisch', 'Die Tafel', 'La Maison', 'Le Livre'].filter(x => !Object.values(NAMEN).some(v => v.includes(x))).join('|')).test(kopfText + randText + await p.locator('#ansicht').textContent()));
  // Rand
  for (const [k, titel] of [['bilder', 'Fotos'], ['dateien', 'Logo & Dateien'], ['pruefung', 'Markenprüfung'], ['start', 'Übersicht']]) {
    await randAuf();
    await p.locator(`#rand [data-gehe="${k}"]`).click(); await warte(500);
    const zu = HANDY ? !(await p.evaluate(() => document.documentElement.classList.contains('wo-rand-auf'))) : true;
    Z(`Rand → ${titel}: Ansicht und Titel wechseln${HANDY ? ', Menü schliesst' : ''}`, (await p.locator('#kopf .wo-kopf__mitte b').innerText()).includes(titel) && p.url().endsWith('#' + k) && zu);
  }
  // Wege in Kopf, Rand und Leiste antworten
  const wege = await p.evaluate(() => [...document.querySelectorAll('#kopf a[href], #rand a[href], #leiste a[href]')].map(a => a.href).filter(h => !h.endsWith('#')));
  const antw = [];
  const offline = [];   // Wege zu den anderen Werkzeugen: deren Server gehören nicht zu diesem Revier; antwortet einer gar nicht, steht er unter «aus»
  for (const h of [...new Set(wege)]) { try { const r = await p.request.get(h); if (r.status() !== 200) antw.push(r.status() + ' ' + h.replace(BASIS, '/')); } catch (e) { (h.startsWith(BASIS) ? antw : offline).push(h.replace(BASIS, '/')); } }
  Z('Alle Wege in Kopf, Rand und Leiste antworten (Wege zu anderen Werkzeugen über WO_HAUS.wege)', antw.length === 0, (antw.join(', ') || `${new Set(wege).size} Wege`) + (offline.length ? ' · Server noch aus: ' + offline.join(', ') : ''));
  const [zipName, zipF] = await laden(p.locator('#leiste a[download]'));
  Z('ZIP mit allen Dateien lädt', zipName === 'uncle-hung-marke.zip' && fs.statSync(zipF).size > 3e5, `${zipName}, ${(fs.statSync(zipF).size / 1e6).toFixed(1)} MB`);

  // Bildarchiv
  await geh(U + '#bilder');
  Z('Raster zeigt zuerst 48 Kacheln', await n('#li-raster .li-f') === 48, await n('#li-raster .li-f'));
  for (let i = 0; i < 6 && await n('#li-raster .li-f') < N; i++) { await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); await warte(700); }
  Z(`Nachladen beim Scrollen bis alle ${N} da sind`, await n('#li-raster .li-f') === N, await n('#li-raster .li-f'));
  const kaputt = await p.evaluate(async () => { const im = [...document.querySelectorAll('#li-raster img')]; for (const i of im) { i.loading = 'eager'; } await new Promise(r => setTimeout(r, 2500)); return im.filter(i => !i.complete || !i.naturalWidth).length; });
  Z(`Alle ${N} Vorschaubilder laden`, kaputt === 0, kaputt + ' fehlen');
  await p.evaluate(() => scrollTo(0, 0));
  await p.locator('#li-q').fill('pho'); await warte(500);
  const nq = await n('#li-raster .li-f');
  Z('Suche «pho» filtert, Zähler stimmt', nq > 0 && nq < N && (await p.locator('#li-n').textContent()).startsWith(`${nq} von ${N}`), nq);
  await p.locator('#li-q').fill('<script>alert(1)</script> 🎉 äöü'); await warte(500);
  Z('Suche mit <script>, Emoji, Umlauten: Hinweis statt Kacheln, nichts ausgeführt', await n('#li-raster .li-leer') === 1 && await n('#li-raster script') === 0);
  await p.locator('#li-q').fill('x'.repeat(5000)); await warte(400);
  Z('Suche mit 5000 Zeichen wird auf 200 begrenzt', (await p.locator('#li-q').inputValue()).length === 200);
  await p.locator('#li-reset').click(); await warte(500);
  Z('«Filter zurücksetzen» zeigt wieder alle', (await p.locator('#li-n').textContent()).startsWith(`${N} von ${N}`));
  for (const g of ['b', 's', 'f', 'h']) {
    const knoepfe = await p.locator(`[data-f="${g}"]`).evaluateAll(b => b.map(x => x.dataset.w));
    const zahlen = [];
    for (const w of knoepfe.filter(w => w !== 'alle')) { await p.locator(`[data-f="${g}"][data-w="${w}"]`).click(); await warte(350); zahlen.push(+(await p.locator('#li-n').textContent()).split(' ')[0]); }
    await p.locator(`[data-f="${g}"][data-w="alle"]`).click(); await warte(350);
    const ok = zahlen.every(x => x > 0 && x <= N) && (await p.locator('#li-n').textContent()).startsWith(`${N} von ${N}`);
    Z(`Filter ${{ b: 'Bereich', s: 'Saison', f: 'Format', h: 'Herkunft' }[g]}: ${zahlen.length} Knöpfe, jeder trifft, «Alle» löst`, ok, zahlen.join('/'));
  }
  // Foto öffnen, vier Grössen, Ausschnitt, Werkstatt
  await p.locator('#li-raster .li-f[data-k="nudeln"]').evaluate(e => e.scrollIntoView({ block: 'center' })); await warte(300); await p.locator('#li-raster .li-f[data-k="nudeln"]').click({ force: true });
  await p.waitForSelector('#fenster .li-det'); await warte(600);
  Z('Foto öffnet gross mit Beschreibung und Quelle (Canva-Seite, ohne fremden Weg)', (await p.locator('#fenster h2').innerText()).length > 10 && /heutigen Website des Hauses/.test(await p.locator('#fenster .li-meta').innerText()) && await n('#fenster .li-meta a.link') === 0);
  Z('Vier Grössen Instagram, Story, Website, Druck', await n('#fenster [data-laden]') === 4);
  const vorher = await p.locator('#fenster [data-laden="instagram"]').getAttribute('href');
  if (!HANDY) {
    await p.locator('#fenster .li-gr[data-g="instagram"]').hover(); await warte(300);
    const r = await p.locator('#li-rahmen').boundingBox();
    Z('Über «Instagram» zeigt den Rahmen im Bild', !!r && r.width > 20);
    const bild = await p.locator('#li-bild').boundingBox();
    await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await p.mouse.down(); const hochkant = SG.h > SG.w * 1.2; await p.mouse.move(hochkant ? r.x + r.width / 2 : bild.x + 2, hochkant ? bild.y + 2 : r.y + r.height / 2, { steps: 8 }); await p.mouse.up(); await warte(300);
    Z('Rahmen ziehen ändert den Ausschnitt im Download- und Werkstatt-Weg', (await p.locator('#fenster [data-laden="instagram"]').getAttribute('href')) !== vorher && (SG.h > SG.w * 1.2 ? /y=0\.0/ : /x=0\.0/).test(await p.locator('#fenster [data-imp="instagram"]').getAttribute('href')));
  }
  const wm = masse(path.join(__dirname, '..', '..', '..', 'website', SG.fl.replace(/^(\.\.\/)+/, ''))), k2 = Math.min(1, 2000 / Math.max(...wm));
  const soll = { instagram: [1080, 1350], story: [1080, 1920], web: [Math.round(wm[0] * k2), Math.round(wm[1] * k2)], druck: [SG.w, SG.h] };
  for (const g of ['instagram', 'story', 'web', 'druck']) {
    const [name, f] = await laden(p.locator(`#fenster [data-laden="${g}"]`)); const [mw, mh] = masse(f);
    Z(`Download ${g}: ${soll[g].join(' × ')}`, mw === soll[g][0] && mh === soll[g][1] && name.startsWith('uncle-hung-nudeln-'), `${name} ${mw}×${mh}`);
  }
  const imps = await p.locator('#fenster [data-imp]').evaluateAll(a => a.map(x => x.getAttribute('href')));
  Z(`Zwei Wege in ${NAMEN.druck} (eigener Server :9477, über WO_HAUS.wege) mit Foto, Haus und Ausschnitt`, imps.length === 2 && imps.every(u => u.startsWith('/_werkzeuge/imprimerie/?haus=unclehung&foto=nudeln&art=')), imps[0]);
  await p.keyboard.press('Escape'); await warte(300);
  Z('Esc schliesst das Fenster', await p.locator('#fenster').isHidden());
  // fremde Rechte, KI, Vorher/Nachher
  const oeffne = async k => { await p.locator('#li-q').fill(''); await warte(300); await p.locator(`[data-f="h"][data-w="alle"]`).click(); await warte(200);
    const l = p.locator(`#li-raster .li-f[data-k="${k}"]`); for (let i = 0; i < 8 && !(await l.count()); i++) { await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); await warte(500); }
    await l.evaluate(el => el.scrollIntoView({ block: 'center' })); await warte(300); await l.click({ force: true }); await p.waitForSelector('#fenster .li-det', { timeout: 8000 }); await warte(500); };
  await oeffne(FREMD.k);
  Z(`Foto eines anderen Kontos (fremde Rechte, ${L.stand.fremd} Fotos): Kennzeichen «Rechte», Hinweis und Weg zum Beitrag`, await n(`#li-raster .li-f[data-k="${FREMD.k}"] .li-ki--fremd`) === 1 && /anderen Instagram-Kontos/.test(await p.locator('#fenster').innerText()) && /^https:\/\/www\.instagram\.com\/p\//.test(await p.locator('#fenster .li-meta a.link').getAttribute('href')));
  await p.locator('#fenster [data-zu]').click(); await warte(300);
  Z('Kreuz schliesst das Fenster', await p.locator('#fenster').isHidden());
  Z('Kein Foto mit KI erzeugt oder verändert: kein Filter «KI», kein Kennzeichen', await n('[data-f="h"][data-w="ki"]') === 0 && L.stand.ki === 0);
  await oeffne('tisch');
  await p.mouse.click(5, H - 5); await warte(300);
  Z('Klick neben das Fenster schliesst es', await p.locator('#fenster').isHidden());
  await oeffne(VN);
  const vn = await n('#fenster [data-vn]');
  await p.locator('#fenster [data-vn="vorher"]').click(); await warte(200); const m1 = await p.locator('#li-bild').getAttribute('data-m');
  await p.locator('#fenster [data-vn="schieber"]').click(); await warte(200); const m2 = await p.locator('#li-bild').getAttribute('data-m');
  const orig = await p.request.get(U + 'original/' + VN + '.webp');
  Z('Vorher/Nachher (hochgerechnet): drei Knöpfe, Vorher und Schieber wirken, Vorher ladbar', vn === 3 && m1 === 'vorher' && m2 === 'schieber' && orig.status() === 200, `${m1}/${m2}`);
  await p.keyboard.press('Escape'); await warte(200);
  await oeffne(OHNE.k);
  Z('Nicht hochgerechnet: keine Vorher-Knöpfe', await n('#fenster [data-vn]') === 0);
  await p.keyboard.press('Escape');

  // Dateien
  await geh(U + '#dateien');
  const dl = await p.evaluate(() => [...document.querySelectorAll('#ansicht a[download]')].map(a => a.href));
  const tot = []; for (const h of new Set(dl)) { const r = await p.request.get(h); if (r.status() !== 200 || !(await r.body()).length) tot.push(h); }
  Z('Jede Datei der Ansicht ist abrufbar', tot.length === 0 && dl.length > 20, `${new Set(dl).size} Dateien${tot.length ? ', tot: ' + tot.join(' ') : ''}`);
  Z('Blöcke Wortmarke, Schale, Tapete, Farben, Schriften, Profilbild', await n('#ansicht .li-d') === 6, await n('#ansicht .li-d'));
  await p.locator('#ansicht .li-farbe').first().click(); await warte(400);
  const fgFotos = await p.locator('#ansicht .li-fg__b img').evaluateAll(a => a.map(x => x.getAttribute('src')));
  const fgSrc = await p.locator('#ansicht .li-fg__b img').evaluateAll(a => a.map(x => x.getAttribute('src')));
  Z('Farbgruppen mit dem Foto, aus dem die Farbe kommt (keins doppelt), auch Gold mit seinem Foto, jede Schrift mit Bild, eine Reihe je Gruppe', fgSrc.length === 5 && new Set(fgSrc).size === 5 && await n('#ansicht .li-fg') === 5 && await n('#ansicht .li-schrift') === await n('#ansicht .li-schrift__b img') && await p.evaluate(() => [...document.querySelectorAll('.li-farben')].every(f => { const t = [...f.children].map(c => Math.round(c.getBoundingClientRect().top / 12)); return innerWidth < 761 || new Set(t).size === 1; })), fgSrc.join(' '));
  Z('Jedes Foto genau einmal im Archiv', new Set(L.fotos.map(f => f.fs)).size === N && N === 187);
  Z('Farbe antippen meldet «Kopiert» mit dem Wert', /Kopiert · #4D5C4E/.test(await p.locator('#meldung').textContent()));
  const kaputtD = await p.evaluate(async () => { const im = [...document.querySelectorAll('#ansicht img')]; im.forEach(i => i.loading = 'eager'); await new Promise(r => setTimeout(r, 2000)); return im.filter(i => !i.naturalWidth).length; });
  Z('Alle Bilder der Ansicht laden', kaputtD === 0, kaputtD);
  Z('Kein seitliches Verrutschen (Dateien)', await ueber());

  // Markenprüfung
  await geh(U + '#pruefung');
  Z('Unter dem leeren Feld steht schon ein Beispiel', await n('#ansicht .li-erg') >= 1 || /Beispiel/.test(await p.locator('#ansicht').innerText()));
  fs.writeFileSync(path.join(TMP, 'falsch.txt'), 'kein Bild');
  await p.locator('#li-datei').setInputFiles(path.join(TMP, 'falsch.txt')); await warte(500);
  Z('Falscher Dateityp wird abgewiesen', /kein Bild und keine PDF/.test(await p.locator('body').innerText()));
  await p.locator('#li-datei').setInputFiles(path.join(__dirname, '..', 'beispiel', 'entwurf.png')); await warte(600);
  Z('Gewählte Datei: Name und «Prüfen»', /entwurf\.png/.test(await p.locator('#ansicht').innerText()) && await n('#li-los') === 1);
  await p.locator('#li-los').click();
  await p.waitForSelector('#ansicht .li-gesamt', { timeout: 60000 }); await warte(500);
  const txt = await p.locator('#ansicht').innerText();
  Z('Prüfung endet mit Ergebnis: gemessene Farben, Probe deutlich beschriftet', /in den Farben des Hauses/.test(txt) && /Probe/.test(txt));
  const [hName] = await laden(p.locator('[data-sichern]'));
  Z('«Ergebnis sichern» legt eine HTML-Datei ab', /^markenpruefung-uncle-hung-.*\.html$/.test(hName), hName);
  await p.locator('[data-kopie-erg]').click(); await warte(300);
  Z('«Als Text kopieren» meldet sich', /Kopiert/.test(await p.locator('#meldung').textContent()));
  await p.locator('[data-neu]').first().click(); await warte(400);
  Z('«Neuen Entwurf prüfen» setzt das Feld zurück', await n('#li-waehle') === 1);
  await p.locator('#li-bsp').click(); await warte(800);
  Z('«Beispiel ansehen»: als Beispiel beschriftet, «passt nicht» zuerst', /eigens für Uncle Hung gezeichnet/.test(await p.locator('#ansicht').innerText()));
  // Netz weg beim Prüfen
  await geh(U + '#pruefung');
  await p.locator('#li-datei').setInputFiles(path.join(__dirname, '..', 'beispiel', 'entwurf.png')); await warte(400);
  abgebrochen = true; await p.route('**/api/pruefen', r => r.abort());
  await p.locator('#li-los').click(); await warte(1500);
  Z('Netz weg beim Prüfen: Meldung, Datei bleibt gewählt', /Verbindung|antwortet nicht/.test(await p.locator('body').innerText()) && /entwurf\.png/.test(await p.locator('#ansicht').innerText()));
  await p.unroute('**/api/pruefen'); await warte(300); abgebrochen = false;

  // Neuladen bleibt in der Ansicht, Markenbuch
  await geh(U + '#dateien'); await p.reload({ waitUntil: 'networkidle' }); await warte(500);
  Z('Neuladen bleibt in der Ansicht', (await p.locator('#kopf .wo-kopf__mitte b').innerText()).includes('Logo'));
  await geh(U + 'buch.html');
  await p.evaluate(() => { window.__druck = 0; window.print = () => { window.__druck++; }; });
  await p.locator('#bu-pdf').click(); await warte(2500);
  Z('Markenbuch: zehn Blätter (Zeichen bis Welt), jede Farbkarte mit ihrem Foto, Stimmen 4,8 aus 1.057, «Als PDF sichern» öffnet den Druck', await n('section.blatt') === 10 && await n('.fz') === 5 && await n('.fz__heute') === 0 && await n('.fz__b img') === 5 && /4,8 bei Google/.test(await p.locator('#stimmen').innerText()) && await p.evaluate(() => window.__druck) === 1);
  const kaputtB = await p.evaluate(async () => { const im = [...document.images]; im.forEach(i => i.loading = 'eager'); await new Promise(r => setTimeout(r, 2500)); return im.filter(i => !i.naturalWidth).map(i => i.src); });
  Z('Markenbuch: alle Bilder laden', kaputtB.length === 0, kaputtB.join(' '));
  Z('Kein seitliches Verrutschen (Markenbuch)', await ueber());
  Z('Markenbuch: nichts Internes (Station, Tasty, andere Häuser, verworfene Wahl), kein Band als Baustein', !/_quelle|_kette|Station|Tasty|Wigoltingen|Carlton|Rivage|Ruedihus|Doldenhorn|Seiler|Schäfli|Schlössli|Zurbriggen|Platzhalter|Projekt Nummer|Welt B|PROBE|verworfene Wahl|nicht gewählt|Designstudie|Auf dem Band|AUF DEM BAND|Das Band statt Schrift|Das Band trägt/.test(await p.locator('body').textContent()));
  await geh(U + 'buch/logo-richtig-falsch/index.html');
  const kaputtL = await p.evaluate(async () => { const im = [...document.images]; im.forEach(i => i.loading = 'eager'); await new Promise(r => setTimeout(r, 1500)); return im.filter(i => !i.naturalWidth).length; });
  Z('Logo richtig und falsch: Seite und Bilder laden, Weg zurück ins Markenbuch', kaputtL === 0 && await n('a[href="../../buch.html#logo"]') >= 1 && await ueber(), kaputtL);
  await geh(U + 'anleitung.html');
  Z('Anleitung: neun Kapitel, Bilder laden', await n('.kap') === 9 && await p.evaluate(async () => { const im = [...document.querySelectorAll('.kap img')]; im.forEach(i => i.loading = 'eager'); await new Promise(r => setTimeout(r, 1500)); return im.length === 9 && im.every(i => i.naturalWidth); }));

  Z('Keine Fehler in der Konsole, keine toten Anfragen', fehler.length === 0, fehler.slice(0, 5).join(' | '));
  await br.close();
  fs.rmSync(TMP, { recursive: true, force: true });
  const kopf = `Markenbuch (livre) · Uncle Hung · ${motor} ${W} × ${H} · ${new Date().toLocaleString('de-DE')}`;
  const aus = [kopf, ...zeilen, `${zeilen.filter(z => z.startsWith('ok')).length} von ${zeilen.length} ok`].join('\n');
  fs.writeFileSync(path.join(ERG, `bedienen-${motor}-${W}.txt`), aus + '\n'); console.log(aus);
})().catch(e => { console.log(zeilen.slice(-3).join('\n')); console.log('ABBRUCH nach Zeile', nr, e.message.split('\n').slice(0, 3).join(' ')); process.exit(1); });
