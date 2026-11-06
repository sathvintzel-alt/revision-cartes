import { CONFIG } from './config.js';
import { GRADES, applyGrade, isDue, labelDays, newRecord } from './srs.js';
import { store, pull, push, merge } from './sync.js';
import { initMaps, mapPays, mapDept } from './maps.js';

const $app = document.getElementById('app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const DECKS = [
  { id: 'dept', name: 'Départements', sub: '101 départements : numéro, nom, préfecture, région' },
  { id: 'pays', name: 'Pays', sub: '195 pays : capitale, drapeau, situation' },
];

const S = {
  profile: store.get('profile', null),
  settings: store.get('settings', { newPerDay: CONFIG.defaultNewPerDay }),
  depts: [], pays: [], items: [], byId: new Map(),
  records: {}, dirty: new Set(),
  sync: { state: 'idle', msg: '' },
  session: null, view: 'home',
};

// ---------- Données et cartes de révision ----------
function buildItems() {
  const items = [];
  for (const d of S.depts) {
    for (const t of ['num2nom', 'nom2num', 'nom2pref', 'nom2region']) items.push({ id: `dept:${d.code}:${t}`, deck: 'dept', type: t, ref: d });
  }
  for (const p of S.pays) {
    for (const t of ['pays2cap', 'cap2pays', 'flag2pays']) items.push({ id: `pays:${p.code}:${t}`, deck: 'pays', type: t, ref: p });
  }
  S.items = items;
  S.byId = new Map(items.map((i) => [i.id, i]));
}

function question(it) {
  const r = it.ref;
  switch (it.type) {
    case 'num2nom': return { label: 'Quel département porte le numéro', big: r.code, answer: r.nom };
    case 'nom2num': return { label: 'Quel est le numéro du département', big: r.nom, answer: r.code };
    case 'nom2pref': return { label: 'Quelle est la préfecture de', big: r.nom, answer: r.prefecture };
    case 'nom2region': return { label: 'Dans quelle région se trouve', big: r.nom, answer: r.region };
    case 'pays2cap': return { label: 'Quelle est la capitale de', big: r.nom, answer: r.capitale };
    case 'cap2pays': return { label: 'De quel pays est la capitale', big: r.capitale, answer: r.nom };
    case 'flag2pays': return { label: 'À quel pays appartient ce drapeau ?', flag: r.drapeau, answer: r.nom };
  }
}

// ---------- Vérification de la réponse tapée (tolère les fautes proches) ----------
const ALIASES = {
  'capitale:Kiev': ['Kyiv', 'Kyïv'], 'capitale:Naypyidaw': ['Nay Pyi Taw'],
  'pays:mm': ['Myanmar'], 'pays:cz': ['République tchèque'], 'pays:sz': ['Swaziland'], 'pays:tl': ['Timor-Leste'],
  'pays:us': ['USA', 'États-Unis d\'Amérique'], 'pays:gb': ['Angleterre', 'UK'], 'pays:ae': ['Emirats arabes unis'],
};

function norm(s) {
  return String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .replace(/\bsaint(e?)\b/g, 'st$1')
    .replace(/[^a-z0-9]/g, '');
}

function lev(a, b) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

const tolerance = (len) => (len <= 3 ? 0 : len <= 8 ? 1 : len <= 12 ? 2 : 3);

function accepted(it) {
  const r = it.ref;
  let list;
  switch (it.type) {
    case 'num2nom': list = [r.nom]; break;
    case 'nom2num': return [r.code];
    case 'nom2pref': list = [r.prefecture]; break;
    case 'nom2region': list = [r.region]; break;
    case 'pays2cap': list = [r.capitale, ...(r.capitalesAutres || [])]; break;
    default: list = [r.nom];
  }
  const extra = it.type === 'pays2cap' ? ALIASES['capitale:' + r.capitale] : ['num2nom', 'cap2pays', 'flag2pays'].includes(it.type) && it.deck === 'pays' ? ALIASES['pays:' + r.code] : null;
  list = [...list, ...(extra || [])];
  // « Congo (Brazzaville) » accepte aussi « Congo ».
  return list.flatMap((x) => [x, x.replace(/\s*\(.*?\)\s*/g, '')]);
}

// Retourne 'exact', 'close' ou 'wrong'.
function check(it, input) {
  const typed = String(input ?? '').trim();
  if (!typed) return 'wrong';
  if (it.type === 'nom2num') {
    const norm2 = (s) => String(s).trim().toUpperCase().replace(/^0+(?=\d)/, '');
    return norm2(typed) === norm2(it.ref.code) ? 'exact' : 'wrong';
  }
  const t = norm(typed);
  let best = Infinity;
  for (const a of accepted(it)) {
    const n = norm(a);
    if (t === n) return typed.trim().toLowerCase() === a.toLowerCase() ? 'exact' : 'close';
    const d = lev(t, n);
    if (d <= tolerance(n.length)) best = Math.min(best, d);
  }
  return best < Infinity ? 'close' : 'wrong';
}

function details(it) {
  const r = it.ref;
  if (it.deck === 'dept') {
    return `<dl class="facts"><dt>Numéro</dt><dd>${esc(r.code)}</dd><dt>Département</dt><dd>${esc(r.nom)}</dd><dt>Préfecture</dt><dd>${esc(r.prefecture)}</dd><dt>Région</dt><dd>${esc(r.region)}</dd></dl>` + mapDept(r.code, r.prefecture);
  }
  const autres = r.capitalesAutres?.length ? ` <span class="muted small">(aussi : ${esc(r.capitalesAutres.join(', '))})</span>` : '';
  return `<div class="facts-head"><img src="data/${esc(r.drapeau)}" alt="Drapeau"><dl class="facts"><dt>Pays</dt><dd>${esc(r.nom)}</dd><dt>Capitale</dt><dd>${esc(r.capitale)}${autres}</dd></dl></div>` + mapPays(r.code, r.capitale);
}

// ---------- Progression et synchro ----------
function loadProfile() {
  S.records = store.records(S.profile);
  S.dirty = store.dirty(S.profile);
}
function persist() {
  store.saveRecords(S.profile, S.records);
  store.saveDirty(S.profile, S.dirty);
}

let pushTimer = null;
function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(syncNow, 1500);
}

async function syncNow() {
  if (!S.profile) return;
  const profile = S.profile;
  try {
    S.sync = { state: 'pending', msg: 'Synchro…' };
    renderSyncDot();
    const remote = await pull(profile);
    if (profile !== S.profile) return;
    merge(S.records, remote, S.dirty);
    if (S.dirty.size) await push(profile, S.records, [...S.dirty]);
    S.dirty.clear();
    persist();
    S.sync = { state: 'ok', msg: 'Synchronisé' };
  } catch (e) {
    const offline = !navigator.onLine || e instanceof TypeError;
    S.sync = { state: offline ? 'pending' : 'err', msg: offline ? `Hors ligne${S.dirty.size ? `, ${S.dirty.size} en attente` : ''}` : 'Erreur de synchro : ' + e.message };
  }
  renderSyncDot();
  if (S.view === 'home') render();
}
window.addEventListener('online', syncNow);

function renderSyncDot() {
  const el = document.getElementById('sync');
  if (el) el.innerHTML = `<span class="dot ${S.sync.state}"></span>${esc(S.sync.msg)}`;
}

// ---------- Sessions ----------
function introducedToday(deck) {
  const today = new Date().toDateString();
  let n = 0;
  for (const [id, rec] of Object.entries(S.records)) {
    if (id.startsWith(deck + ':') && new Date(rec.created_at).toDateString() === today) n++;
  }
  return n;
}

function stats(deckId) {
  const decks = deckId === 'all' ? DECKS.map((d) => d.id) : [deckId];
  let due = 0, unseen = 0, newLeft = 0;
  for (const d of decks) {
    const its = S.items.filter((i) => i.deck === d);
    due += its.filter((i) => isDue(S.records[i.id])).length;
    const u = its.filter((i) => !S.records[i.id]).length;
    unseen += u;
    newLeft += Math.min(u, Math.max(0, S.settings.newPerDay - introducedToday(d)));
  }
  return { due, unseen, newLeft };
}

function startSession(deckId) {
  const decks = deckId === 'all' ? DECKS.map((d) => d.id) : [deckId];
  let due = [], news = [];
  for (const d of decks) {
    const its = S.items.filter((i) => i.deck === d);
    due.push(...its.filter((i) => isDue(S.records[i.id])));
    const room = Math.max(0, S.settings.newPerDay - introducedToday(d));
    news.push(...shuffle(its.filter((i) => !S.records[i.id])).slice(0, room));
  }
  shuffle(due);
  // Intercale les nouvelles cartes parmi les révisions.
  const queue = [...due];
  news.forEach((n, i) => queue.splice(Math.min(queue.length, 2 + i * 3), 0, n));
  if (!queue.length) return;
  S.session = { queue, total: queue.length, done: 0, good: 0, answered: 0, revealed: false, deckId };
  S.view = 'study';
  render();
}

function grade(g) {
  const s = S.session;
  const it = s.queue.shift();
  const { rec } = applyGrade(S.records[it.id], g);
  S.records[it.id] = rec;
  S.dirty.add(it.id);
  persist();
  schedulePush();
  s.answered++;
  if (g >= 2) s.good++;
  if (g === 0) {
    s.queue.splice(Math.min(s.queue.length, 4), 0, it);
  } else {
    s.done++;
  }
  s.revealed = false;
  if (!s.queue.length) s.finished = true;
  render();
}

// ---------- Vues ----------
function render() {
  if (!S.profile) return renderProfilePicker();
  if (S.view === 'study' && S.session) return S.session.finished ? renderDone() : renderStudy();
  if (S.view === 'settings') return renderSettings();
  renderHome();
}

function renderProfilePicker() {
  $app.innerHTML = `<h1>Qui révise ?</h1><div class="profiles">${CONFIG.profiles.map((p) => `<button class="btn" data-profile="${p.id}">${esc(p.name)}</button>`).join('')}</div>`;
  $app.querySelectorAll('[data-profile]').forEach((b) => b.addEventListener('click', () => chooseProfile(b.dataset.profile)));
}

function chooseProfile(id) {
  S.profile = id;
  store.set('profile', id);
  S.view = 'home';
  S.sync = { state: 'idle', msg: '' };
  loadProfile();
  render();
  syncNow();
}

function renderHome() {
  const name = CONFIG.profiles.find((p) => p.id === S.profile)?.name;
  const all = stats('all');
  $app.innerHTML = `
    <div class="row"><h1>Bonjour ${esc(name)}</h1><button class="iconbtn" id="open-settings" aria-label="Réglages">⚙︎</button></div>
    <p class="muted small" id="sync"></p>
    ${DECKS.map((d) => {
      const st = stats(d.id);
      return `<div class="card deck"><div><h2>${esc(d.name)}</h2><p class="muted small">${esc(d.sub)}</p></div>
        <div class="counts"><div><b>${st.due}</b><span class="muted small">à revoir</span></div><div><b>${st.newLeft}</b><span class="muted small">nouvelles</span></div><div><b>${st.unseen}</b><span class="muted small">jamais vues</span></div></div>
        <button class="btn" data-deck="${d.id}" ${st.due + st.newLeft === 0 ? 'disabled' : ''}>Réviser</button></div>`;
    }).join('')}
    <button class="btn ghost" data-deck="all" ${all.due + all.newLeft === 0 ? 'disabled' : ''}>Tout réviser (${all.due + all.newLeft})</button>`;
  $app.querySelectorAll('[data-deck]').forEach((b) => b.addEventListener('click', () => startSession(b.dataset.deck)));
  document.getElementById('open-settings').addEventListener('click', () => { S.view = 'settings'; render(); });
  renderSyncDot();
}

function renderStudy() {
  const s = S.session;
  const it = s.queue[0];
  const q = question(it);
  const pct = Math.round((s.done / s.total) * 100);
  let html = `<div class="row"><button class="iconbtn" id="quit" aria-label="Quitter">✕</button><div class="prog"><i style="width:${pct}%"></i></div><span class="muted small">${s.done}/${s.total}</span></div>
    <div class="card q"><p class="label">${esc(q.label)}</p>${q.big ? `<p class="big">${esc(q.big)}</p>` : `<img class="flag" src="data/${esc(q.flag)}" alt="Drapeau à identifier">`}</div>`;
  const days = (g) => labelDays(applyGrade(S.records[it.id], g).days);
  if (!s.revealed) {
    html += `<form id="f" class="stack" autocomplete="off"><input id="ans" type="text" placeholder="Ta réponse" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done" aria-label="Ta réponse"><button class="btn" type="submit">Valider</button></form>
      <button class="btn ghost" id="idk" type="button">Je ne sais pas</button>`;
  } else {
    const v = s.verdict;
    const banner = v === 'exact' ? `<p class="verdict ok">✓ Correct</p>`
      : v === 'close' ? `<p class="verdict close">≈ Presque. Tu as écrit « ${esc(s.typed)} », l'orthographe exacte est :</p>`
      : `<p class="verdict bad">${s.typed ? `✗ Tu as écrit « ${esc(s.typed)} ». La réponse était :` : 'La réponse était :'}</p>`;
    html += `${banner}<p class="answer">${esc(q.answer)}</p><div class="card stack">${details(it)}</div>`;
    if (v === 'wrong') {
      html += `<div class="stack"><button class="btn g0" data-g="0">Continuer (revue dans ${days(0)})</button><button class="btn ghost" data-g="2">J'avais bon (orthographe ou variante acceptable)</button></div>`;
    } else {
      html += `<div class="grades three">${GRADES.slice(1).map((g) => `<button class="${g.cls}" data-g="${g.k}">${g.label}<small>${days(g.k)}</small></button>`).join('')}</div>`;
    }
  }
  $app.innerHTML = html;
  document.getElementById('quit').addEventListener('click', () => { S.session = null; S.view = 'home'; render(); });
  const reveal = (typed) => { s.typed = typed; s.verdict = check(it, typed); s.revealed = true; render(); window.scrollTo(0, 0); };
  document.getElementById('f')?.addEventListener('submit', (e) => { e.preventDefault(); reveal(document.getElementById('ans').value); });
  document.getElementById('idk')?.addEventListener('click', () => { s.typed = ''; s.verdict = 'wrong'; s.revealed = true; render(); window.scrollTo(0, 0); });
  $app.querySelectorAll('[data-g]').forEach((b) => b.addEventListener('click', () => { grade(+b.dataset.g); window.scrollTo(0, 0); }));
  if (!s.revealed && !matchMedia('(pointer: coarse)').matches) document.getElementById('ans')?.focus();
}

function renderDone() {
  const s = S.session;
  const rate = s.answered ? Math.round((s.good / s.answered) * 100) : 0;
  $app.innerHTML = `<div class="card center stack"><h1>Session terminée</h1><p>${s.done} cartes validées, ${s.answered} réponses, ${rate} % de réussite.</p><button class="btn" id="back">Retour</button></div>`;
  document.getElementById('back').addEventListener('click', () => { S.session = null; S.view = 'home'; render(); });
}

function renderSettings() {
  const name = CONFIG.profiles.find((p) => p.id === S.profile)?.name;
  $app.innerHTML = `
    <div class="row"><button class="iconbtn" id="back" aria-label="Retour">←</button><h1>Réglages</h1><span></span></div>
    <div class="card stack"><h2>Nouvelles cartes par jour et par paquet</h2>
      <div class="stepper"><button id="minus" aria-label="Moins">−</button><b id="npd">${S.settings.newPerDay}</b><button id="plus" aria-label="Plus">+</button></div></div>
    <div class="card stack"><h2>Profil : ${esc(name)}</h2><button class="btn ghost" id="switch">Changer de profil</button></div>
    <div class="card stack"><h2>Synchronisation</h2><p class="small" id="sync"></p><button class="btn ghost" id="sync-btn">Synchroniser maintenant</button></div>`;
  const setN = (n) => { S.settings.newPerDay = Math.max(0, Math.min(100, n)); store.set('settings', S.settings); document.getElementById('npd').textContent = S.settings.newPerDay; };
  document.getElementById('back').addEventListener('click', () => { S.view = 'home'; render(); });
  document.getElementById('minus').addEventListener('click', () => setN(S.settings.newPerDay - 5));
  document.getElementById('plus').addEventListener('click', () => setN(S.settings.newPerDay + 5));
  document.getElementById('switch').addEventListener('click', () => { S.profile = null; store.set('profile', null); render(); });
  document.getElementById('sync-btn').addEventListener('click', syncNow);
  renderSyncDot();
}

document.addEventListener('keydown', (e) => {
  if (S.view !== 'study' || !S.session || S.session.finished) return;
  const s = S.session;
  if (!s.revealed || e.repeat) return;
  if (e.key === 'Enter') { e.preventDefault(); grade(s.verdict === 'wrong' ? 0 : 2); }
  else if (s.verdict !== 'wrong' && '234'.includes(e.key)) grade(+e.key - 1);
});

// ---------- Démarrage ----------
async function init() {
  $app.innerHTML = '<p class="muted center">Chargement…</p>';
  try {
    const [depts, pays, dg, pg, caps, prefs] = await Promise.all(
      ['data/departements.json', 'data/pays.json', 'data/geo/departements.geojson', 'data/geo/pays.geojson', 'data/capitales.json', 'data/prefectures.json'].map((u) => fetch(u).then((r) => r.json()))
    );
    S.depts = depts; S.pays = pays;
    initMaps(pg, dg, caps, prefs);
    buildItems();
  } catch (e) {
    $app.innerHTML = `<p class="center">Impossible de charger les données. Vérifie ta connexion puis recharge la page.</p>`;
    return;
  }
  if (S.profile) loadProfile();
  render();
  if (S.profile) syncNow();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
init();
