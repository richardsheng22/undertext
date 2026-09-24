// Runs Undertext against a folder of saved pages by driving the real UI:
// paste the source, click "Scan this page", read the report.
// Usage: NODE_PATH=$(npm root -g) node tests/run-corpus.js <pages-dir> <out.json> [page-name ...]
// Set ALLOW_NET=1 to let the preview load the page's images and stylesheets, as it would for a real user
// (use it for live captures; the saved corpus pages point at servers that no longer exist).
// <pages-dir> holds one sub-folder per page containing source.html (Mozilla Readability's layout),
// or plain .html files.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const [dir, outFile, ...only] = process.argv.slice(2);
const here = __dirname;


function listPages() {
  return fs.readdirSync(dir).flatMap(name => {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'source.html'))) return [{ name, file: path.join(p, 'source.html') }];
    if (name.endsWith('.html')) return [{ name: name.replace(/\.html$/, ''), file: p }];
    return [];
  }).filter(p => !only.length || only.includes(p.name));
}

(async () => {
  const net = !!process.env.ALLOW_NET;
  const browser = await chromium.launch(net ? { channel: 'chromium', proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined } : {});
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  // By default only local content: saved pages reference live images and scripts that would stall the load.
  if (!net) await page.route('**/*', r => (r.request().url().startsWith('file:') || r.request().url().startsWith('data:') || r.request().url().startsWith('about:')) ? r.continue() : r.abort());
  await page.goto('file://' + path.join(here, '..', 'index.html'));
  await page.waitForSelector('#verdict h2');

  const results = [];
  for (const p of listPages()) {
    const html = fs.readFileSync(p.file, 'utf8');
    const t0 = Date.now();
    try {
      await page.evaluate(() => { document.querySelector('#verdict').innerHTML = ''; });
      await page.evaluate(h => {
        if (document.querySelector('#pasteDrawer').hidden) document.querySelector('#openPaste').click();
        document.querySelector('#pasteInput').value = h;
        document.querySelector('#scanPaste').click();
      }, html);
      await page.waitForSelector('#verdict h2', { timeout: 60000 });
      const r = await page.evaluate(() => ({
        verdict: document.querySelector('#verdict h2').textContent,
        tally: [...document.querySelectorAll('.tally b')].map(b => +b.textContent),
        words: [...document.querySelectorAll('.words li b')].map(b => b.textContent),
        findings: [...document.querySelectorAll('.finding')].map(f => ({
          sev: f.querySelector('.pill').textContent,
          title: f.querySelector('h4').textContent,
          text: f.querySelector(".quote").textContent.slice(0, 600),
        })),
        normals: Object.fromEntries([...document.querySelectorAll('.normal summary')].map(s => [s.querySelector('b').textContent, +s.querySelector('.n').textContent])),
      }));
      results.push({ page: p.name, ms: Date.now() - t0, ...r });
      console.log(`${p.name.padEnd(34)} likely ${r.tally[0]}  look ${r.tally[1]}  normal ${r.tally[2]}  ${Date.now() - t0}ms`);
    } catch (e) {
      results.push({ page: p.name, error: String(e).slice(0, 200) });
      console.log(`${p.name.padEnd(34)} ERROR ${String(e).slice(0, 120)}`);
    }
  }
  fs.writeFileSync(outFile, JSON.stringify(results, null, 1));
  await browser.close();
})();
