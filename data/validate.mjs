// Usage : node validate.mjs  (depuis le dossier data)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const D = path.dirname(fileURLToPath(import.meta.url));
const rd = f => fs.readFileSync(path.join(D, f), 'utf8');
let errors = 0;
const fail = m => { errors++; console.log('ERREUR  ' + m); };
const ok = m => console.log('OK      ' + m);
const check = (cond, okMsg, failMsg) => cond ? ok(okMsg) : fail(failMsg);

for (const f of ['departements.json', 'pays.json', 'geo/pays.geojson', 'geo/departements.geojson']) {
  const b = fs.readFileSync(path.join(D, f));
  if (b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) fail(`${f} : BOM présent`);
  if (/—/.test(b.toString('utf8'))) fail(`${f} : tiret long présent`);
}

// Départements
const deps = JSON.parse(rd('departements.json'));
const dcodes = deps.map(d => d.code);
check(deps.length === 101, '101 départements', `${deps.length} départements`);
check(new Set(dcodes).size === deps.length, 'codes départements uniques', 'codes départements en double');
const expected = [];
for (let i = 1; i <= 95; i++) { if (i === 20) { expected.push('2A', '2B'); continue; } expected.push(String(i).padStart(2, '0')); }
expected.push('971', '972', '973', '974', '976');
const missExp = expected.filter(c => !dcodes.includes(c)), extraExp = dcodes.filter(c => !expected.includes(c));
check(!missExp.length && !extraExp.length, 'liste des codes conforme (01-95, 2A, 2B, 971-976)', `codes manquants ${missExp} / en trop ${extraExp}`);
const badDep = deps.filter(d => !d.nom?.trim() || !d.prefecture?.trim() || !d.region?.trim());
check(!badDep.length, 'nom, préfecture, région renseignés', 'champs vides : ' + badDep.map(d => d.code));
const regions = new Set(deps.map(d => d.region));
check(regions.size === 18, `18 régions (${regions.size})`, `${regions.size} régions : ${[...regions]}`);
const dg = JSON.parse(rd('geo/departements.geojson'));
const dgc = dg.features.map(f => f.properties.code);
const dMiss = dcodes.filter(c => !dgc.includes(c)), dExtra = dgc.filter(c => !dcodes.includes(c));
check(!dMiss.length, 'tous les départements ont une forme', 'départements sans forme : ' + dMiss);
check(!dExtra.length, 'aucune forme orpheline (départements)', 'formes sans département : ' + dExtra);
check(dg.features.every(f => f.geometry && f.geometry.coordinates.length), 'géométries départements non vides', 'géométrie vide (départements)');

// Pays
const pays = JSON.parse(rd('pays.json'));
const pcodes = pays.map(p => p.code);
check(pays.length === 195, '195 pays', `${pays.length} pays`);
check(new Set(pcodes).size === pays.length, 'codes pays uniques', 'codes pays en double');
check(pays.every(p => /^[a-z]{2}$/.test(p.code)), 'codes ISO alpha-2 minuscules', 'code mal formé');
const onu = pays.filter(p => p.statut === 'membre_onu').length;
check(onu === 193, '193 membres ONU + 2 observateurs', `${onu} membres ONU`);
const noCap = pays.filter(p => !p.capitale?.trim()), noNom = pays.filter(p => !p.nom?.trim()), noCont = pays.filter(p => !p.continent);
check(!noCap.length && !noNom.length && !noCont.length, 'nom, capitale, continent renseignés', `vides : cap ${noCap.map(p => p.code)} nom ${noNom.map(p => p.code)} cont ${noCont.map(p => p.code)}`);
check(pays.every(p => Array.isArray(p.capitalesAutres)), 'capitalesAutres = tableau', 'capitalesAutres invalide');
const flagMiss = pays.filter(p => { const f = path.join(D, p.drapeau); return !fs.existsSync(f) || !fs.readFileSync(f, 'utf8').includes('<svg'); });
check(!flagMiss.length, 'chaque pays a un drapeau SVG valide', 'drapeaux manquants : ' + flagMiss.map(p => p.code));
const pg = JSON.parse(rd('geo/pays.geojson'));
const pgc = new Set(pg.features.map(f => f.properties.code));
const pMiss = pcodes.filter(c => !pgc.has(c));
check(!pMiss.length, 'tous les pays ont une forme', 'pays sans forme : ' + pMiss);
const emptyGeom = pg.features.filter(f => !f.geometry || !f.geometry.coordinates.length).map(f => f.properties.code);
check(!emptyGeom.length, 'géométries pays non vides', 'géométries vides : ' + emptyGeom);
const orphans = [...pgc].filter(c => !pcodes.includes(c));
console.log(`INFO    ${orphans.length} formes hors liste des 195 (territoires, Kosovo, Taïwan...) : fond de carte uniquement`);

for (const f of ['geo/pays.geojson', 'geo/departements.geojson']) {
  const s = fs.statSync(path.join(D, f)).size;
  check(s < 3 * 1024 * 1024, `${f} ${(s / 1024).toFixed(0)} Ko (< 3 Mo)`, `${f} trop lourd`);
}
console.log(errors ? `\n${errors} erreur(s)` : '\nTout est valide.');
process.exit(errors ? 1 : 0);
