// Génère data/prefectures.json : coordonnées [lon, lat] du centre de la commune préfecture de chaque département.
// Source : API Découpage administratif (geo.api.gouv.fr, Licence Ouverte Etalab). Usage : node scripts/build-prefectures.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const deps = JSON.parse(readFileSync('departements.json', 'utf8'));
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const out = {}, missing = [];

for (const d of deps) {
  const res = await fetch(`https://geo.api.gouv.fr/departements/${d.code}/communes?fields=nom,centre`);
  if (!res.ok) { missing.push(`${d.code} ${d.nom} : HTTP ${res.status}`); continue; }
  const communes = await res.json();
  const c = communes.find((x) => norm(x.nom) === norm(d.prefecture));
  if (!c?.centre) { missing.push(`${d.code} ${d.nom} : préfecture « ${d.prefecture} » introuvable`); continue; }
  out[d.code] = c.centre.coordinates.map((n) => Math.round(n * 1000) / 1000);
}
writeFileSync('prefectures.json', JSON.stringify(out));
console.log(Object.keys(out).length + '/' + deps.length);
console.log(missing.join('\n'));
