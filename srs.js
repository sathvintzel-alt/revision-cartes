// Répétition espacée : variante simple de SM-2 (algorithme public) avec 4 boutons.
const DAY = 86400000;
const MAX_DAYS = 365;

export const GRADES = [
  { k: 0, label: 'Raté', cls: 'g0' },
  { k: 1, label: 'Difficile', cls: 'g1' },
  { k: 2, label: 'Bien', cls: 'g2' },
  { k: 3, label: 'Facile', cls: 'g3' },
];

export function newRecord(now = Date.now()) {
  const iso = new Date(now).toISOString();
  return { ease: 2.5, interval_days: 0, reps: 0, lapses: 0, due: iso, last_review: null, created_at: iso, updated_at: iso };
}

// Retourne { rec, days } : nouvel état et délai en jours (0 = revoir dans 10 min).
export function applyGrade(rec, grade, now = Date.now()) {
  const r = { ...(rec || newRecord(now)) };
  let days;
  if (grade === 0) {
    r.lapses += 1;
    r.reps = 0;
    r.ease = Math.max(1.3, r.ease - 0.2);
    days = 0;
  } else {
    const prev = r.interval_days;
    if (r.reps === 0) days = [0, 1, 2, 4][grade];
    else if (r.reps === 1) days = [0, 2, 4, 7][grade];
    else if (grade === 1) days = Math.max(prev * 1.2, prev + 1);
    else if (grade === 2) days = prev * r.ease;
    else days = prev * r.ease * 1.3 + 1;
    days = Math.min(MAX_DAYS, Math.round(days));
    if (grade === 1) r.ease = Math.max(1.3, r.ease - 0.15);
    if (grade === 3) r.ease = r.ease + 0.15;
    r.reps += 1;
  }
  r.interval_days = days;
  r.due = new Date(now + (days === 0 ? 10 * 60000 : days * DAY)).toISOString();
  r.last_review = new Date(now).toISOString();
  r.updated_at = r.last_review;
  return { rec: r, days };
}

export function endOfToday(now = Date.now()) {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

// Dû aujourd'hui : échéance avant la fin de la journée.
export function isDue(rec, now = Date.now()) {
  return !!rec && new Date(rec.due).getTime() <= endOfToday(now);
}

export function labelDays(days) {
  if (days === 0) return '10 min';
  if (days < 30) return days + ' j';
  if (days < 365) return Math.round(days / 30) + ' mois';
  return '1 an';
}
