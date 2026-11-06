// Rendu SVG des cartes : pays (Mercator) et départements (projection simple centrée sur la France).
const R = (n) => Math.round(n * 100) / 100;
const mercY = (lat) => {
  const l = Math.max(-85, Math.min(85, lat));
  return -(180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (l * Math.PI) / 360));
};
const projWorld = (lon, lat) => [lon, mercY(lat)];
const KX = Math.cos((46.5 * Math.PI) / 180);
const projMetro = (lon, lat) => [lon * KX, -lat];
const WORLD = { minX: -180, maxX: 180, minY: mercY(80), maxY: mercY(-57) };
const escXml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function polys(geom) {
  return geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
}

// Chemin SVG, emprise, plus grand polygone (emprise + centroïde) d'une entité.
function build(feature, proj) {
  let d = '';
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let best = null;
  for (const poly of polys(feature.geometry)) {
    let pMinX = Infinity, pMaxX = -Infinity, pMinY = Infinity, pMaxY = -Infinity;
    let A = 0, cx = 0, cy = 0;
    poly.forEach((ring, ri) => {
      const pts = ring.map(([lon, lat]) => proj(lon, lat));
      for (const [x, y] of pts) {
        if (x < pMinX) pMinX = x; if (x > pMaxX) pMaxX = x;
        if (y < pMinY) pMinY = y; if (y > pMaxY) pMaxY = y;
      }
      if (ri === 0) {
        for (let i = 0; i < pts.length; i++) {
          const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
          const c = x0 * y1 - x1 * y0;
          A += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c;
        }
      }
      d += 'M' + pts.map(([x, y]) => R(x) + ' ' + R(y)).join('L') + 'Z';
    });
    minX = Math.min(minX, pMinX); maxX = Math.max(maxX, pMaxX);
    minY = Math.min(minY, pMinY); maxY = Math.max(maxY, pMaxY);
    const area = Math.abs(A / 2);
    const cen = Math.abs(A) > 1e-9 ? [cx / (3 * A), cy / (3 * A)] : [(pMinX + pMaxX) / 2, (pMinY + pMaxY) / 2];
    if (!best || area > best.area) best = { area, minX: pMinX, maxX: pMaxX, minY: pMinY, maxY: pMaxY, cen };
  }
  return { d, bbox: { minX, minY, maxX, maxY }, main: best, cen: best.cen };
}

function lonLatBox(f) {
  let a = Infinity, b = Infinity, c = -Infinity, e = -Infinity;
  for (const poly of polys(f.geometry)) for (const [lon, lat] of poly[0]) {
    if (lon < a) a = lon; if (lon > c) c = lon; if (lat < b) b = lat; if (lat > e) e = lat;
  }
  return { minLon: a, minLat: b, maxLon: c, maxLat: e };
}

const S = { pays: [], paysIdx: new Map(), depts: [], deptIdx: new Map(), caps: {}, prefs: {}, paysGeo: null, ctx: null, allPays: '', allMetro: '', metroBox: null };

export function initMaps(paysGeo, deptGeo, capitales = {}, prefectures = {}) {
  S.caps = capitales;
  S.prefs = prefectures;
  S.paysGeo = paysGeo;
  S.pays = paysGeo.features.map((f) => ({ code: f.properties.code, nom: f.properties.nom, statut: f.properties.statut, ...build(f, projWorld) }));
  S.paysIdx = new Map(S.pays.filter((p) => p.statut !== 'autre').map((p) => [p.code, p]));
  S.allPays = S.pays.map((p) => p.d).join('');
  S.depts = deptGeo.features.map((f) => {
    const code = f.properties.code;
    const overseas = code.startsWith('97');
    let proj = projMetro;
    if (overseas) {
      const c = polys(f.geometry)[0][0][0];
      const k = Math.cos((c[1] * Math.PI) / 180);
      proj = (lon, lat) => [lon * k, -lat];
    }
    return { code, nom: f.properties.nom, overseas, proj, ...build(f, proj) };
  });
  S.deptIdx = new Map(S.depts.map((d) => [d.code, d]));
  const metro = S.depts.filter((d) => !d.overseas);
  S.metroBox = {
    minX: Math.min(...metro.map((d) => d.bbox.minX)), maxX: Math.max(...metro.map((d) => d.bbox.maxX)),
    minY: Math.min(...metro.map((d) => d.bbox.minY)), maxY: Math.max(...metro.map((d) => d.bbox.maxY)),
  };
  S.allMetro = metro.map((d) => d.d).join('');
}

// Pays voisins de la France (fond gris clair autour des départements), calculés à la première utilisation.
function ctxCountries() {
  if (S.ctx !== null) return S.ctx;
  S.ctx = S.paysGeo.features
    .filter((f) => f.properties.code !== 'fr')
    .filter((f) => { const b = lonLatBox(f); return b.maxLon >= -12 && b.minLon <= 18 && b.maxLat >= 36 && b.minLat <= 56; })
    .map((f) => build(f, projMetro).d)
    .join('');
  return S.ctx;
}

// ---------- Outils de composition ----------
const hit = (b, v) => b.maxX >= v.minX && b.minX <= v.maxX && b.maxY >= v.minY && b.minY <= v.maxY;

function viewAround(b, w) {
  const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2, h = w * 0.75;
  return { minX: cx - w / 2, maxX: cx + w / 2, minY: cy - h / 2, maxY: cy + h / 2 };
}

function pad(b, p) {
  return { minX: b.minX - p, maxX: b.maxX + p, minY: b.minY - p, maxY: b.maxY + p };
}

function svg(view, inner) {
  const w = view.maxX - view.minX, h = view.maxY - view.minY;
  return `<svg class="map" viewBox="${R(view.minX)} ${R(view.minY)} ${R(w)} ${R(h)}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Carte">${inner}</svg>`;
}

// Le contour (halo) est en unités de carte : on le dimensionne d'après la taille du texte.
const text = (cls, x, y, size, anchor, s, halo = false) =>
  `<text class="${cls}" x="${R(x)}" y="${R(y)}" font-size="${R(size)}" text-anchor="${anchor}" dominant-baseline="central"${halo ? ` stroke-width="${R(size * 0.22)}"` : ''}>${escXml(s)}</text>`;

// Placement d'étiquettes sans chevauchement.
function labeler(view) {
  const placed = [];
  const free = (b) =>
    b.x0 >= view.minX && b.x1 <= view.maxX && b.y0 >= view.minY && b.y1 <= view.maxY &&
    !placed.some((p) => b.x0 < p.x1 && b.x1 > p.x0 && b.y0 < p.y1 && b.y1 > p.y0);
  return {
    block: (b) => placed.push(b),
    place(x, y, s, size, anchor = 'middle') {
      const tw = s.length * size * 0.56, th = size * 1.1;
      const x0 = anchor === 'start' ? x : anchor === 'end' ? x - tw : x - tw / 2;
      const b = { x0, x1: x0 + tw, y0: y - th / 2, y1: y + th / 2 };
      if (!free(b)) return false;
      placed.push(b);
      return true;
    },
  };
}

// Réserve la zone de la mini-carte (en haut à droite) pour ne pas y mettre d'étiquette.
function blockInset(L, view, ref, ratio) {
  const w = view.maxX - view.minX;
  const iw = w * ratio;
  const ih = iw * ((ref.maxY - ref.minY) / (ref.maxX - ref.minX)) + w * 0.03;
  L.block({ x0: view.maxX - iw - w * 0.02, x1: view.maxX, y0: view.minY, y1: view.minY + ih });
}

// Point rouge (capitale ou préfecture) et son nom, à droite, à gauche ou au-dessus selon la place.
function pin(L, pt, name, fs, r) {
  if (!pt) return '';
  const [x, y] = pt;
  L.block({ x0: x - r * 1.5, x1: x + r * 1.5, y0: y - r * 1.5, y1: y + r * 1.5 });
  const size = fs * 1.15;
  let label = '';
  if (name) {
    const gap = r * 1.8;
    if (L.place(x + gap, y, name, size, 'start')) label = text('lbl pinlbl', x + gap, y, size, 'start', name, true);
    else if (L.place(x - gap, y, name, size, 'end')) label = text('lbl pinlbl', x - gap, y, size, 'end', name, true);
    else if (L.place(x, y - gap - size * 0.5, name, size)) label = text('lbl pinlbl', x, y - gap - size * 0.5, size, 'middle', name, true);
  }
  return label + `<circle class="pin" cx="${R(x)}" cy="${R(y)}" r="${R(r)}"/>`;
}

// Noms des voisins : les plus grands d'abord, seulement si le nom tient à peu près dans la forme.
function neighborLabels(L, view, items, fs) {
  return items
    .filter((it) => it.nom && it.main)
    .sort((a, b) => b.main.area - a.main.area)
    .map((it) => {
      const [x, y] = it.cen;
      if (x < view.minX || x > view.maxX || y < view.minY || y > view.maxY) return '';
      if (it.nom.length * fs * 0.56 > (it.main.maxX - it.main.minX) * 1.6) return '';
      return L.place(x, y, it.nom, fs) ? text('lbl', x, y, fs, 'middle', it.nom) : '';
    })
    .join('');
}

// ---------- Cartes ----------
export function mapPays(code, capitalName = '') {
  const t = S.paysIdx.get(code);
  if (!t) return '';
  const m = t.main;
  const tw = m.maxX - m.minX, th = m.maxY - m.minY;
  const isWorld = tw > 100;
  const view = isWorld ? WORLD : viewAround(m, Math.max(tw * 3.4, th * 3.4 * (4 / 3), 60));
  const w = view.maxX - view.minX;
  const fs = w / 50;
  const near = S.pays.filter((p) => p.code !== code && hit(p.bbox, view));
  const L = labeler(view);
  if (!isWorld) blockInset(L, view, WORLD, 0.36);
  const cap = S.caps[code] ? projWorld(...S.caps[code]) : t.cen;
  const pinSvg = pin(L, cap, S.caps[code] ? capitalName : '', fs, w / 100);
  const labels = isWorld ? '' : neighborLabels(L, view, near, fs);
  const main = svg(view, `<path class="bg" d="${near.map((p) => p.d).join('')}"/><path class="tgt" d="${t.d}"/>${labels}${pinSvg}`);
  if (isWorld) return `<div class="mapwrap">${main}</div>`;
  const inset = svg(WORLD, `<path class="bg" d="${S.allPays}"/><path class="tgt" d="${t.d}"/><circle class="pinw" cx="${R(cap[0])}" cy="${R(cap[1])}" r="7"/>`);
  return `<div class="mapwrap">${main}<div class="inset">${inset}</div></div>`;
}

export function mapDept(code, prefName = '') {
  const t = S.deptIdx.get(code);
  if (!t) return '';
  const pref = S.prefs[code] ? t.proj(...S.prefs[code]) : null;
  if (t.overseas) {
    const b = t.bbox;
    const view = viewAround(b, Math.max((b.maxX - b.minX) * 1.8, (b.maxY - b.minY) * 1.8 * (4 / 3)));
    const w = view.maxX - view.minX;
    const L = labeler(view);
    return `<div class="mapwrap">${svg(view, `<path class="tgt" d="${t.d}"/>${pin(L, pref, prefName, w / 46, w / 100)}`)}</div>`;
  }
  const b = t.bbox;
  const tw = b.maxX - b.minX, th = b.maxY - b.minY;
  const view = viewAround(b, Math.max(tw * 3, th * 2.6 * (4 / 3), 2.8));
  const w = view.maxX - view.minX;
  const fs = w / 46;
  const near = S.depts.filter((d) => !d.overseas && d.code !== code && hit(d.bbox, view));
  const L = labeler(view);
  blockInset(L, view, S.metroBox, 0.26);
  const pinSvg = pin(L, pref, prefName, fs, w / 100);
  const labels = neighborLabels(L, view, near, fs);
  const main = svg(view, `<path class="ctx" d="${ctxCountries()}"/><path class="bg" d="${near.map((d) => d.d).join('')}"/><path class="tgt" d="${t.d}"/>${labels}${pinSvg}`);
  const mb = pad(S.metroBox, 0.3);
  const dot = pref ? `<circle class="pinw" cx="${R(pref[0])}" cy="${R(pref[1])}" r="${R((mb.maxX - mb.minX) / 40)}"/>` : '';
  const inset = svg(mb, `<path class="bg" d="${S.allMetro}"/><path class="tgt" d="${t.d}"/>${dot}`);
  return `<div class="mapwrap">${main}<div class="inset sm">${inset}</div></div>`;
}
