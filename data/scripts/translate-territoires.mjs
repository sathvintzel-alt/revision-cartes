// Traduit en français les noms des territoires de fond de carte (statut « autre ») de geo/pays.geojson.
import { readFileSync, writeFileSync } from 'node:fs';
const p = 'geo/pays.geojson';
const g = JSON.parse(readFileSync(p, 'utf8'));
const FR = {
  mp: 'Îles Mariannes du Nord', vi: 'Îles Vierges américaines', gu: 'Guam', as: 'Samoa américaines', pr: 'Porto Rico',
  gs: 'Géorgie du Sud', io: "Territoire britannique de l'océan Indien", sh: 'Sainte-Hélène', pn: 'Îles Pitcairn',
  ai: 'Anguilla', fk: 'Îles Malouines', ky: 'Îles Caïmans', bm: 'Bermudes', vg: 'Îles Vierges britanniques',
  tc: 'Îles Turques-et-Caïques', ms: 'Montserrat', je: 'Jersey', gg: 'Guernesey', im: 'Île de Man', tw: 'Taïwan',
  nu: 'Niue', ck: 'Îles Cook', aw: 'Aruba', cw: 'Curaçao', eh: 'Sahara occidental', xk: 'Kosovo',
  pm: 'Saint-Pierre-et-Miquelon', wf: 'Wallis-et-Futuna', mf: 'Saint-Martin', bl: 'Saint-Barthélemy',
  pf: 'Polynésie française', nc: 'Nouvelle-Calédonie', tf: 'Terres australes françaises', ax: 'Åland',
  gl: 'Groenland', fo: 'Îles Féroé', mo: 'Macao', hk: 'Hong Kong', hm: 'Îles Heard-et-MacDonald',
  nf: 'Île Norfolk', sx: 'Saint-Martin (Pays-Bas)',
};
let n = 0;
for (const f of g.features) if (f.properties.statut === 'autre' && FR[f.properties.code]) { f.properties.nom = FR[f.properties.code]; n++; }
writeFileSync(p, JSON.stringify(g));
console.log(n + ' noms traduits');
