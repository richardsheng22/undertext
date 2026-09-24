// Summarises a live-site run: for each site that loaded (bot walls left out), compares the bookmarklet capture
// with the pasted page source, and lists every flagged item so false alarms can be checked by hand.
// Usage: node tests/score-live.js <capture-dir> <scan.json>
const fs = require('fs');
const path = require('path');
const [dir, scanFile] = process.argv.slice(2);
const cap = JSON.parse(fs.readFileSync(path.join(dir, 'capture.json'), 'utf8'));
const scan = Object.fromEntries(JSON.parse(fs.readFileSync(scanFile, 'utf8')).map(r => [r.page, r]));
const num = s => +String(s || 0).replace(/[^\d]/g, '');
const hiddenOf = r => r && r.words ? num(r.words[1]) + num(r.words[2]) : 0;
const itemsOf = r => r && r.tally ? r.tally[2] + r.tally[0] + r.tally[1] : 0;

const ok = cap.filter(c => !c.blocked && !c.error);
console.log('| Site | Capture | Confirmed | Flags (capture) | Flags (source) | Hidden items, capture / source | Hidden words, capture / source |');
console.log('|---|---|---|---|---|---|---|');
let flagged = [];
for (const c of ok) {
  const s = scan[c.name + '__snap'], p = scan[c.name + '__src'];
  const fl = r => r && r.tally ? `${r.tally[0]} likely, ${r.tally[1]} look` : (r && r.error ? 'scan error' : 'n/a');
  console.log(`| ${c.name} | ${c.snapKB} KB | ${c.notice ? 'yes' : 'no'} | ${fl(s)} | ${fl(p)} | ${itemsOf(s)} / ${itemsOf(p)} | ${hiddenOf(s)} / ${hiddenOf(p)} |`);
  for (const [mode, r] of [['capture', s], ['source', p]]) for (const f of (r && r.findings) || []) flagged.push({ site: c.name, mode, ...f });
}
const blocked = cap.filter(c => c.blocked || c.error);
console.log(`\nLoaded: ${ok.length}/${cap.length}. Blocked or errored: ${blocked.map(c => `${c.name} (${c.status || c.error})`).join(', ')}`);
console.log(`Confirmation shown: ${ok.filter(c => c.notice).length}/${ok.length}`);
const tot = mode => ok.reduce((a, c) => { const r = scan[c.name + (mode === 'capture' ? '__snap' : '__src')]; return r && r.tally ? [a[0] + r.tally[0], a[1] + r.tally[1]] : a; }, [0, 0]);
console.log(`Flags, capture: ${tot('capture').join(' likely, ')} look. Flags, source: ${tot('source').join(' likely, ')} look.`);
console.log('\nFlagged items:');
for (const f of flagged) console.log(`- ${f.site} (${f.mode}) ${f.sev} | ${f.title} | ${f.text.replace(/\s+/g, ' ').slice(0, 160)}`);

// Planted payloads (runs made with PLANT=1): did each get the expected verdict in the bookmarklet capture?
const plantsFile = path.join(dir, 'plants.json');
if (fs.existsSync(plantsFile)) {
  const SEV = { 'Likely manipulation': 'likely', 'Worth a look': 'look' };
  const plants = JSON.parse(fs.readFileSync(plantsFile, 'utf8'));
  const sites = ok.filter(c => c.planted && c.planted.length);
  console.log('\n| Planted | Hidden by (stylesheet rule) | Expected | Result |\n|---|---|---|---|');
  let pass = [0, 0], ctl = [0, 0];
  for (const p of plants) {
    const got = sites.map(c => { const r = scan[c.name + '__snap']; const f = ((r && r.findings) || []).find(f => f.text.toLowerCase().includes(p.key.toLowerCase())); return f ? SEV[f.sev] : 'normal'; });
    const n = got.filter(g => g === p.expect).length;
    const acc = p.expect === 'normal' ? ctl : pass; acc[0] += n; acc[1] += got.length;
    const misses = sites.filter((c, i) => got[i] !== p.expect).map((c, i) => c.name);
    console.log(`| ${p.id} | \`${p.cls}\` | ${p.expect} | ${n}/${got.length}${misses.length ? ' (missed: ' + misses.join(', ') + ')' : ''} |`);
  }
  console.log(`\nPlanted injections caught: ${pass[0]}/${pass[1]}. Planted controls left alone: ${ctl[0]}/${ctl[1]}.`);
}
