import fs from 'node:fs';
import { pays } from './pays-data.mjs';
const codes = pays.map(p => p.code);
console.log(pays.length, new Set(codes).size);
const fl = new Set(fs.readdirSync('_raw/flagicons/package/flags/4x3').map(f => f.replace('.svg', '')));
console.log('no flag', codes.filter(c => !fl.has(c)));
fs.mkdirSync('flags', { recursive: true });
for (const c of codes) fs.copyFileSync(`_raw/flagicons/package/flags/4x3/${c}.svg`, `flags/${c}.svg`);
fs.copyFileSync('_raw/flagicons/package/LICENSE', 'flags/LICENSE-flag-icons.txt');
fs.writeFileSync('pays.json', JSON.stringify(pays, null, 1) + '\n');
const dep = JSON.parse(fs.readFileSync('_raw/dep_draft.json', 'utf8'));
const keep = dep.filter(d => /^(0[1-9]|[1-8]\d|9[0-5]|2A|2B|971|972|973|974|976)$/.test(d.code));
console.log('deps', keep.length);
fs.writeFileSync('departements.json', JSON.stringify(keep, null, 1) + '\n');
const g = JSON.parse(fs.readFileSync('_raw/ne50s.geojson', 'utf8'));
const set = new Set(codes);
const found = new Set();
for (const f of g.features) {
  const p = f.properties;
  const c = [p.ISO_A2_EH, p.ISO_A2].find(x => x && x !== '-99');
  f._c = c ? c.toLowerCase() : null;
  if (set.has(f._c)) found.add(f._c);
}
console.log('missing in ne50', codes.filter(c => !found.has(c)));
console.log('unmapped ne', g.features.filter(f => !f._c).map(f => f.properties.NAME + '/' + f.properties.ADM0_A3).join(', '));
console.log('ne codes not in pays', g.features.filter(f => f._c && !set.has(f._c)).map(f => f._c + ':' + f.properties.NAME).join(', '));
