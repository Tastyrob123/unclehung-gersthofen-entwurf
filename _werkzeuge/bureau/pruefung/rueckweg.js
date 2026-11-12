/* rueckweg.js · «Zur Werkbank» (R19) einmal in WebKit und Chromium: aus der Werkbank geöffnet (?wb, wbo, wbu, wy) erscheint der Knopf, führt an die alte Stelle
   der Werkbank (/werkbank/index.html?y=…), bleibt nach Neuladen; ohne Herkunft erscheint nichts. node rueckweg.js [webkit|chromium] */
const path = require('path'), pw = require('playwright');
const MOTOR = process.argv[2] || 'webkit', B = 'http://127.0.0.1:' + (process.env.PORT || 9472);
let rot = 0; const pruef = (ok, was, m) => { console.log((ok ? 'gut    ' : 'FEHLT  ') + was + (!ok && m ? '  → ' + m : '')); if (!ok) rot++; };
(async () => {
  const br = await pw[MOTOR].launch({ headless: true }), ctx = await br.newContext({ viewport: { width: 1440, height: 900 } }), p = await ctx.newPage();
  await p.goto(B + '/_werkzeuge/bureau/?ansicht=start', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  pruef(!(await p.locator('#zur-werkbank').count()), 'ohne Herkunft aus der Werkbank kein Knopf');
  const q = '?wb=de.werkzeuge&wbo=' + encodeURIComponent('') + '&wbu=' + encodeURIComponent('/') + '&wy=2345';
  await p.goto(B + '/_werkzeuge/bureau/' + q, { waitUntil: 'load' }); await p.waitForTimeout(2000);
  const href = () => p.evaluate(() => { const w = document.getElementById('zur-werkbank'); const a = w && (w.shadowRoot || w).querySelector('a'); return a ? a.href : ''; });
  let h = await href();
  pruef(h === '/werkbank/index.html?y=2345', 'Knopf «Zur Werkbank» führt an die alte Stelle', h);
  pruef(!/wb=|wbu=|wy=/.test(p.url()), 'Herkunft wieder aus der Adresse genommen', p.url());
  await p.screenshot({ path: path.join(__dirname, 'bilder', `rueckweg-${MOTOR}-1440.png`) });
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1500); h = await href();
  pruef(h === '/werkbank/index.html?y=2345', 'nach Neuladen noch da', h);
  const r = await fetch('/werkbank/index.html').catch(() => null);
  pruef(r && r.ok, 'Werkbank antwortet (' + (r ? r.status : 'nicht erreichbar') + ')');
  await br.close();
  console.log((rot ? 'NICHT BESTANDEN' : 'BESTANDEN') + ' · Rückweg · ' + MOTOR); process.exit(rot ? 1 : 0);
})();
