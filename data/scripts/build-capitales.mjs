// Génère data/capitales.json : coordonnées [lon, lat] de la capitale de chaque pays.
// Source : Natural Earth populated places 50m (domaine public), à télécharger dans /tmp/ne/pp.geojson.
// Usage : node scripts/build-capitales.mjs <chemin pp.geojson>
import { readFileSync, writeFileSync } from 'node:fs';

const pp = JSON.parse(readFileSync(process.argv[2], 'utf8')).features;
const pays = JSON.parse(readFileSync('pays.json', 'utf8'));
const geo = JSON.parse(readFileSync('geo/pays.geojson', 'utf8')).features;
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

const caps = pp.filter((f) => /^Admin-0 capital/i.test(f.properties.featurecla));
// Micro-États absents de Natural Earth 50m : coordonnées saisies à la main (capitale du pays).
const MANUAL = { cy: [33.365, 35.175], lb: [35.502, 33.894], ki: [173.018, 1.328], nr: [166.921, -0.547], pw: [134.624, 7.501], va: [12.453, 41.903], ae: [54.377, 24.454] };

function polys(g) { return g.type === 'Polygon' ? [g.coordinates] : g.coordinates; }
function inRing(x, y, ring) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function inside(g, x, y) { return polys(g).some((p) => inRing(x, y, p[0]) && !p.slice(1).some((h) => inRing(x, y, h))); }
function bboxDist(g, x, y) {
  let best = Infinity;
  for (const p of polys(g)) for (const [px, py] of p[0]) best = Math.min(best, Math.hypot(px - x, py - y));
  return best;
}

// Corrections : Natural Earth donne parfois une autre capitale (siège du gouvernement, ancien nom, etc.).
const OVERRIDE = { bi: [29.925, -3.427], sz: [31.137, -26.305], za: [28.188, -25.746], cl: [-70.669, -33.449], kz: [71.449, 51.169], my: [101.687, 3.139], lk: [79.918, 6.894], ps: [35.234, 31.78] };
const out = {}, notes = [];
for (const p of pays) {
  const gf = geo.find((f) => f.properties.code === p.code);
  const names = [p.capitale, ...(p.capitalesAutres || [])].map(norm);
  const byName = caps.filter((f) => [f.properties.name, f.properties.nameascii, f.properties.namealt, f.properties.namepar].some((n) => n && names.includes(norm(n))));
  let pick = null, how = '';
  for (const f of byName) {
    const [x, y] = f.geometry.coordinates;
    if (gf && (inside(gf.geometry, x, y) || bboxDist(gf.geometry, x, y) < 3)) { pick = f; how = 'nom'; break; }
  }
  if (!pick && gf) {
    const c = caps.filter((f) => inside(gf.geometry, ...f.geometry.coordinates));
    if (c.length >= 1) { pick = c.find((f) => f.properties.featurecla === 'Admin-0 capital') || c[0]; how = 'pip:' + c.map((f) => f.properties.name).join('/'); }
  }
  if (!pick && MANUAL[p.code]) { out[p.code] = MANUAL[p.code]; notes.push(`MANUEL ${p.code} ${p.nom}`); continue; }
  if (!pick) { notes.push(`MANQUE ${p.code} ${p.nom} (${p.capitale})`); continue; }
  const [x, y] = pick.geometry.coordinates;
  out[p.code] = [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000];
  if (how !== 'nom') notes.push(`CHECK  ${p.code} ${p.nom}: attendu ${p.capitale}, trouvé ${pick.properties.name} (${how})`);
}
Object.assign(out, OVERRIDE);
writeFileSync('capitales.json', JSON.stringify(out));
console.log(Object.keys(out).length + '/' + pays.length);
console.log(notes.join('\n'));
