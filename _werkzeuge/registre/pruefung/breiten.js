/* Messlauf Besucher · Uncle Hung (Fehlerbuch 10a, 21.10.2026): jede Ansicht bei 390, 920, 1000, 1100, 1180, 1240, 1366 und 1440 px auf
   abgeschnittenen Text (scrollWidth > clientWidth bei verstecktem Überlauf, Auslassung), seitliches Überragen (jedes Element gegen die Fensterbreite)
   und Zusammenstossen in Zeilen mit festen Spalten (Text eines Feldes gegen das nächste Feld). node pruefung/breiten.js [browser] */
const PW = require('playwright');
const A = '/_werkzeuge/registre/';
const V = ['start', 'besuche', 'herkunft', 'zeit', 'seiten', 'verlauf', 'buchung', 'zaehlung'];
const BR = [390, 920, 1000, 1100, 1180, 1240, 1366, 1440];
(async () => {
  const art = process.argv[2] || 'chromium', b = await PW[art].launch(); let funde = 0, n = 0;
  for (const w of BR) {
    const ctx = await b.newContext({ viewport: { width: w, height: w === 1366 ? 650 : w < 600 ? 844 : 900 }, reducedMotion: 'reduce' });
    await ctx.addInitScript(() => { try { localStorage.setItem('rundgang-unclehung-registre', '1'); } catch (e) {} });
    const p = await ctx.newPage();
    for (const v of V) {
      await p.goto('about:blank'); await p.goto(A + '?gruss=tag#' + v); await p.waitForFunction(() => window.BG_REGISTRE === 1 && document.documentElement.classList.contains('auftakt-da')); await p.waitForTimeout(400);
      const r = await p.evaluate(W => {
        const out = [], sicht = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && s.display !== 'none'; };
        if (document.documentElement.scrollWidth > W + 1) out.push('Seite breiter: ' + document.documentElement.scrollWidth);
        document.querySelectorAll('#ansicht *, #kopf *, #leiste *').forEach(e => {
          if (!sicht(e) || !e.textContent.trim()) return; const s = getComputedStyle(e), r = e.getBoundingClientRect();
          if (r.right > W + 1 && s.position !== 'fixed' && !e.closest('.rang__b,.saeulen,.raster')) out.push('ragt hinaus: ' + (e.className || e.tagName) + ' «' + e.textContent.trim().slice(0, 24) + '» ' + Math.round(r.right));
          if ((/hidden|clip/.test(s.overflowX) || s.textOverflow === 'ellipsis') && e.scrollWidth > e.clientWidth + 1 && e.children.length === 0) out.push('abgeschnitten: ' + (e.className || e.tagName) + ' «' + e.textContent.trim().slice(0, 30) + '»');
        });
        /* Zusammenstossen: Kinder einer Zeile mit festen Spalten (Rangliste, Vergleich, Wochen, Tabelle, Besuchszeile) */
        document.querySelectorAll('.rang li, .vz, .wochen li, .zeile, .besuch, .angaben > div').forEach(z => {
          const k = [...z.children].filter(sicht).map(c => [c, c.getBoundingClientRect()]);
          for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) { const a = k[i][1], c = k[j][1]; const x = Math.min(a.right, c.right) - Math.max(a.left, c.left), y = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top); if (x > 2 && y > 2 && !k[i][0].contains(k[j][0])) out.push('stösst: ' + z.className + ' «' + k[i][0].textContent.trim().slice(0, 18) + '» × «' + k[j][0].textContent.trim().slice(0, 18) + '»'); }
          [...z.querySelectorAll('*')].filter(e => e.children.length === 0 && sicht(e)).forEach(e => { if (e.scrollWidth > e.clientWidth + 1 && /hidden|clip/.test(getComputedStyle(e).overflowX)) out.push('abgeschnitten in Zeile: «' + e.textContent.trim().slice(0, 24) + '»'); });
        });
        return [...new Set(out)].slice(0, 8);
      }, w);
      n++; if (r.length) { funde += r.length; console.log(w, v, r.join(' | ')); }
    }
    await ctx.close();
  }
  await b.close(); console.log(art + ': ' + n + ' Ansichten gemessen, ' + funde + ' Funde');
})();
