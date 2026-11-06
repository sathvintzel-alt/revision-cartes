import fs from 'node:fs';
import { pays } from './pays-data.mjs';
const byCode = Object.fromEntries(pays.map(p => [p.code, p]));
const g = JSON.parse(fs.readFileSync('_raw/ne50s.geojson', 'utf8'));
const out = [];
const dropped = [];
for (const f of g.features) {
  const p = f.properties;
  const c = [p.ISO_A2_EH, p.ISO_A2].find(x => x && x !== '-99');
  if (!c) { dropped.push(p.NAME); continue; }
  const code = c.toLowerCase();
  if (code === 'aq') { dropped.push(p.NAME); continue; }
  let geom = f.geometry;
  if (code === 'fr' && geom.type === 'MultiPolygon') {
    // ne garder la France métropolitaine + Corse (NE 50m inclut les DROM dans le même objet)
    const keep = geom.coordinates.filter(poly => poly[0].every(([x, y]) => x > -6 && x < 10 && y > 41 && y < 52));
    geom = { type: 'MultiPolygon', coordinates: keep };
  }
  const pf = byCode[code];
  out.push({
    type: 'Feature',
    properties: { code, nom: pf ? pf.nom : p.NAME, statut: pf ? pf.statut : 'autre' },
    geometry: geom,
  });
}
fs.mkdirSync('geo', { recursive: true });
fs.writeFileSync('geo/pays.geojson', JSON.stringify({ type: 'FeatureCollection', features: out }));
console.log('features', out.length, 'dropped', dropped.join(', '));
const fr = out.find(f => f.properties.code === 'fr');
console.log('fr polygons', fr.geometry.coordinates.length);
