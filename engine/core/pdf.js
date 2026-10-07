// core/pdf.js — renders a template's HTML to a single-page US Letter PDF.
//
// Every template in core/render.js shares one sizing contract: a `.resume`
// element at 816x1056px (Letter @ 96dpi) with `font-size:var(--base,10px)`
// and all nested sizing in `em`. This module binary-searches --base so the
// content fills exactly one page — no dead space, no overflow onto a second
// page — then bakes the fitted value into the saved HTML so the .html file
// matches the exported PDF exactly.
//
// Requires `playwright` (peer dependency — not bundled, see package.json).

const fs = require('fs');

async function exportResume({ html, htmlPath, pdfPath }) {
  const { chromium } = require('playwright');

  fs.writeFileSync(htmlPath, html);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
  // Measure in PRINT media so the auto-fit matches the PDF exactly (screen
  // media has body padding that shrinks .resume and changes text wrapping).
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(400);

  const TARGET = 1038; // leave ~18px bottom breathing room under the 1056px page
  await page.evaluate(() => {
    const r = document.querySelector('.resume');
    if (r) { r.style.height = 'auto'; r.style.overflow = 'visible'; }
  });

  let lo = 7, hi = 15, best = 7;
  for (let i = 0; i < 9; i++) {
    const mid = (lo + hi) / 2;
    const h = await page.evaluate(fs => {
      const r = document.querySelector('.resume');
      r.style.setProperty('--base', fs + 'px');
      return r.scrollHeight;
    }, mid);
    if (h > TARGET) hi = mid; else { best = mid; lo = mid; }
  }
  await page.evaluate(fs => {
    const r = document.querySelector('.resume');
    r.style.setProperty('--base', fs + 'px');
    r.style.height = '1056px';
    r.style.overflow = 'hidden';
  }, best);
  const finalH = await page.evaluate(() => document.querySelector('.resume').scrollHeight);

  // Persist the fitted --base into the saved HTML (relies on the literal
  // ".resume {" substring every template's root rule opens with). Every
  // template's <style> block also contains PRINT_RESET's own
  // "@media print { ... .resume { box-shadow: none !important; } }", which
  // contains that same substring and appears EARLIER in the markup — a
  // naive first-match replace lands the --base declaration there instead
  // of on the real sizing rule. It still works in the exported PDF (print
  // media applies either way), but a screen-media preview of the saved
  // .html would silently stay unfitted. The real per-template sizing rule
  // is always the LAST ".resume {" in the file, so replace that one.
  const marker = '.resume {';
  const lastIdx = html.lastIndexOf(marker);
  const patchedHtml = lastIdx === -1
    ? html
    : html.slice(0, lastIdx) + `.resume { --base: ${best.toFixed(2)}px;` + html.slice(lastIdx + marker.length);
  fs.writeFileSync(htmlPath, patchedHtml);

  await page.pdf({ path: pdfPath, format: 'Letter', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await browser.close();

  return { baseFontPx: Number(best.toFixed(2)), contentHeightPx: finalH, htmlPath, pdfPath };
}

module.exports = { exportResume };
