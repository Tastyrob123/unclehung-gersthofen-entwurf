// Bilder der Anleitung (bilder/rez-*.jpg) aus dem Werkzeug selbst, mit Wegwerf-Daten (eigener Server, die Daten des Werkzeugs bleiben unberührt).
//   node pruefung/anleitung_bilder.js      (aus _werkzeuge/reception/); danach python3 _bau/fassungen.py
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http'), { spawn } = require('child_process');
const { chromium } = require('playwright');
const HIER = path.dirname(__dirname), PROJ = path.dirname(path.dirname(HIER)), PORT = 9580, WZ = `http://127.0.0.1:${PORT}/_werkzeuge/reception/`;
const DATEN = fs.mkdtempSync(path.join(os.tmpdir(), 'uh-reception-bilder-'));
const srv = spawn('python3', [path.join(HIER, 'server.py'), String(PORT)], { cwd: PROJ, env: { ...process.env, RECEPTION_DATEN: DATEN }, stdio: 'ignore' });
process.on('exit', () => { try { srv.kill('SIGKILL'); } catch (e) { /* */ } fs.rmSync(DATEN, { recursive: true, force: true }); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const da = () => new Promise(ok => http.get(WZ, r => { r.resume(); ok(r.statusCode === 200); }).on('error', () => ok(false)));
(async () => {
  for (let i = 0; i < 40 && !(await da()); i++) await sleep(150);
  const ZIEL = path.join(HIER, 'bilder'); fs.mkdirSync(ZIEL, { recursive: true });
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await c.addInitScript(() => { try { ['reception', 'savoir'].forEach(k => localStorage.setItem('rundgang-uh-' + k, '1')); } catch (e) { /* */ } });
  const p = await c.newPage();
  const auf = async n => { await sleep(900); await p.screenshot({ path: path.join(ZIEL, `rez-${n}.jpg`), type: 'jpeg', quality: 80 }); console.log('rez-' + n); };
  const gehe = async a => { await p.goto('about:blank'); await p.goto(WZ + '#' + a); await p.waitForSelector('#ansicht > *'); await sleep(900); };
  await gehe('start'); await auf('uebersicht');
  await gehe('eingang'); await p.locator('.re-liste .re-a', { hasText: 'Sophie Lindner' }).click(); await sleep(600); await p.evaluate(() => document.querySelector('#detail').scrollIntoView()); await p.evaluate(() => scrollBy(0, -110)); await auf('eingang');
  await p.evaluate(() => document.querySelector('#brief').scrollIntoView({ block: 'start' })); await p.evaluate(() => scrollBy(0, -170)); await p.locator('#brief .gs--p').nth(1).click(); await sleep(500); await auf('gestalten');
  await p.click('.gs-werk [data-w="foto"]'); await p.waitForSelector('.gs-fotos'); await auf('foto'); await p.keyboard.press('Escape');
  await gehe('gefragt'); await auf('gefragt');
  await p.locator('.re-f.luecke [data-akt="nachtragen"]').first().click(); await p.waitForSelector('#f-antwort'); await auf('nachtragen'); await p.keyboard.press('Escape');
  await gehe('nachgetragen'); await auf('nachgetragen');
  await gehe('wissen'); await p.evaluate(() => document.querySelector('.sb').scrollIntoView()); await p.evaluate(() => scrollBy(0, -120)); await auf('wissen');
  await gehe('start'); await p.click('#k-probe'); await p.waitForSelector('#probe-t');
  for (const q of ['Habt ihr am Samstag offen?', 'Was kostet das Weihnachtsmenü?']) { await p.fill('#probe-t', q); await p.press('#probe-t', 'Enter'); await p.waitForFunction(() => !document.querySelector('#probe').dataset.laeuft); }
  await auf('probe');
  await b.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
