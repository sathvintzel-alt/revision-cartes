// Stockage local (localStorage) + synchro Supabase (API REST, sans SDK).
import { CONFIG } from './config.js';

const BASE = CONFIG.supabaseUrl + '/rest/v1/progress';
const H = { apikey: CONFIG.supabaseKey, 'Content-Type': 'application/json' };
const COLS = ['profile', 'item_id', 'ease', 'interval_days', 'reps', 'lapses', 'due', 'last_review', 'created_at', 'updated_at'];

function read(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function write(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* stockage indisponible */ }
}

export const store = {
  get: (k, f) => read('rc.' + k, f),
  set: (k, v) => write('rc.' + k, v),
  records: (p) => read('rc.progress.' + p, {}),
  saveRecords: (p, r) => write('rc.progress.' + p, r),
  dirty: (p) => new Set(read('rc.dirty.' + p, [])),
  saveDirty: (p, s) => write('rc.dirty.' + p, [...s]),
};

function toRow(profile, itemId, rec) {
  const row = { profile, item_id: itemId };
  for (const c of COLS.slice(2)) row[c] = rec[c];
  return row;
}

// Récupère toute la progression d'un profil (pagination par 1000).
export async function pull(profile) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${BASE}?profile=eq.${encodeURIComponent(profile)}&select=*&order=item_id`, {
      headers: { ...H, Range: `${from}-${from + 999}`, 'Range-Unit': 'items' },
    });
    if (!res.ok) throw new Error('pull ' + res.status);
    const rows = await res.json();
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

export async function push(profile, records, ids) {
  const rows = ids.filter((id) => records[id]).map((id) => toRow(profile, id, records[id]));
  for (let i = 0; i < rows.length; i += 500) {
    const res = await fetch(`${BASE}?on_conflict=profile,item_id`, {
      method: 'POST',
      headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows.slice(i, i + 500)),
    });
    if (!res.ok) throw new Error('push ' + res.status + ' ' + (await res.text()).slice(0, 200));
  }
}

// Fusionne les lignes distantes dans le local : la plus récente gagne.
export function merge(local, remoteRows, dirty) {
  for (const row of remoteRows) {
    const l = local[row.item_id];
    if (!l || new Date(row.updated_at) > new Date(l.updated_at)) {
      const rec = {};
      for (const c of COLS.slice(2)) rec[c] = row[c];
      local[row.item_id] = rec;
      dirty.delete(row.item_id);
    }
  }
  return local;
}
