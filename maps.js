// Rendu SVG des cartes (pays en Mercator, départements en projection simple).
const R = (n) => Math.round(n * 100) / 100;
const mercY = (lat) => {
  const l = Math.max(-85, Math.min(85, lat));
  return -(180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (l * Math.PI) / 360));
};
const projWorld = (lon, lat) => [lon, mercY(lat)];

function polys(geom) {
  return geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
}

function build(feature, proj) {
  let d = '';
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let best = null;
  for (const poly of polys(feature.geometry)) {
    let pMinX = Infinity, pMaxX = -Infinity, pMinY = Infinity, pMaxY = -Infinity;
    for (const ring of poly) {
      const pts = ring.map(([lon, lat]) => {
        const [x, y] = proj(lon, lat);
        if (x < pMinX) pMinX = x; if (x > pMaxX) pMaxX = x;
        if (y < pMinY) pMinY = y; if (y > pMaxY) pMaxY = y;
        return R(x) + ' ' + R(y);
      });
      d += 'M' + pts.join('L') + 'Z';
    }
    minX = Math.min(minX, pMinX); maxX = Math.max(maxX, pMaxX);
    minY = Math.min(minY, pMinY); maxY = Math.max(maxY, pMaxY);
    const area = (pMaxX - pMinX) * (pMaxY - pMinY);
    if (!best || area > best.area) best = { area, minX: pMinX, maxX: pMaxX, minY: pMinY, maxY: pMaxY };
  }
  return { d, bbox: { minX, minY, maxX, maxY }, main: best };
}

const state = { pays: [], depts: [], paysIdx: new Map(), deptIdx: new Map(), metroBox: null };

export function initMaps(paysGeo, deptGeo, capitales = {}) {
  state.caps = capitales;
  state.pays = paysGeo.features.map((f) => ({ code: f.properties.code, nom: f.properties.nom, statut: f.properties.statut, ...build(f, projWorld) }));
  state.allPaysPath = state.pays.map((p) => p.d).join('');
  for (const p of state.pays) if (p.statut !== 'autre') state.paysIdx.set(p.code, p);
  const kx = Math.cos((46.5 * Math.PI) / 180);
  const projMetro = (lon, lat) => [lon * kx, -lat];
  state.depts = deptGeo.features.map((f) => {
    const code = f.properties.code;
    const overseas = code.startsWith('97');
    if (overseas) {
      const c = polys(f.geometry)[0][0][0];
      const k = Math.cos((c[1] * Math.PI) / 180);
      return { code, overseas, ...build(f, (lon, lat) => [lon * k, -lat]) };
    }
    return { code, overseas, ...build(f, projMetro) };
  });
  for (const d of state.depts) state.deptIdx.set(d.code, d);
  const metro = state.depts.filter((d) => !d.overseas);
  state.metroBox = {
    minX: Math.min(...metro.map((d) => d.bbox.minX)), maxX: Math.max(...metro.map((d) => d.bbox.maxX)),
    minY: Math.min(...metro.map((d) => d.bbox.minY)), maxY: Math.max(...metro.map((d) => d.bbox.maxY)),
  };
}

function svg(box, inner, extra = '') {
  const w = box.maxX - box.minX, h = box.maxY - box.minY;
  return `<svg class="map" viewBox="${R(box.minX)} ${R(box.minY)} ${R(w)} ${R(h)}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Carte">${inner}${extra}</svg>`;
}

const hit = (b, v) => b.maxX >= v.minX && b.minX <= v.maxX && b.maxY >= v.minY && b.minY <= v.maxY;

const WORLD = { minX: -180, maxX: 180, minY: mercY(80), maxY: mercY(-57) };
const escXml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function mapPays(code, capitalName = '') {
  const t = state.paysIdx.get(code);
  if (!t) return '';
  const m = t.main || t.bbox;
  const tw = m.maxX - m.minX, th = m.maxY - m.minY;
  const cap = state.caps[code] ? projWorld(...state.caps[code]) : null;
  let view;
  if (tw > 100) {
    view = WORLD;
  } else {
    const cx = (m.minX + m.maxX) / 2, cy = (m.minY + m.maxY) / 2;
    const w = Math.max(tw * 3.4, th * 3.4 * (4 / 3), 60);
    const h = w * 0.75;
    view = { minX: cx - w / 2, maxX: cx + w / 2, minY: cy - h / 2, maxY: cy + h / 2 };
  }
  const w = view.maxX - view.minX;
  const isWorld = view === WORLD;
  const near = state.pays.filter((p) => p.code !== code && hit(p.bbox, view));
  let inner = `<path class="bg" d="${near.map((p) => p.d).join('')}"/><path class="tgt" d="${t.d}"/>`;

  // Étiquettes : pays voisins (assez grands pour être lisibles), sans chevauchement.
  const fs = w / 38;
  const placed = [];
  const free = (x, y, text, size) => {
    const bw = text.length * size * 0.56, bh = size * 1.1;
    const box = { x0: x - bw / 2, x1: x + bw / 2, y0: y - bh / 2, y1: y + bh / 2 };
    if (box.x0 < view.minX || box.x1 > view.maxX || box.y0 < view.minY || box.y1 > view.maxY) return false;
    if (placed.some((b) => box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0)) return false;
    placed.push(box);
    return true;
  };
  let labels = '';
  if (!isWorld) {
    // Zone occupée par la mini-carte (en haut à droite) : pas d'étiquette dessous.
    const iw = w * 0.36, ih = iw * ((WORLD.maxY - WORLD.minY) / 360) + w * 0.02;
    placed.push({ x0: view.maxX - iw, x1: view.maxX, y0: view.minY, y1: view.minY + ih });
  }
  if (cap) {
    const [px, py] = cap;
    placed.push({ x0: px - fs * 0.6, x1: px + fs * 0.6, y0: py - fs * 0.6, y1: py + fs * 0.6 });
    if (capitalName && free(px + fs * 0.6 + capitalName.length * fs * 0.52 * 0.5 + fs * 0.2, py, capitalName, fs * 0.95)) {
      labels += `<text class="lbl cap" x="${R(px + fs * 0.7)}" y="${R(py)}" font-size="${R(fs * 0.95)}" text-anchor="start" dominant-baseline="central">${escXml(capitalName)}</text>`;
    }
  }
  if (!isWorld) {
    const tm = t.main || t.bbox;
    const tx = (tm.minX + tm.maxX) / 2, ty = (tm.minY + tm.maxY) / 2;
    const tname = state.pays.find((p) => p.code === code).nom;
    if (free(tx, ty, tname, fs * 1.15)) labels += `<text class="lbl self" x="${R(tx)}" y="${R(ty)}" font-size="${R(fs * 1.15)}" text-anchor="middle" dominant-baseline="central">${escXml(tname)}</text>`;
    const cands = near
      .map((p) => ({ p, mm: p.main || p.bbox }))
      .filter(({ mm }) => mm.maxX - mm.minX >= w / 16)
      .sort((a, b) => (b.mm.maxX - b.mm.minX) * (b.mm.maxY - b.mm.minY) - (a.mm.maxX - a.mm.minX) * (a.mm.maxY - a.mm.minY));
    for (const { p, mm } of cands) {
      const x = (mm.minX + mm.maxX) / 2, y = (mm.minY + mm.maxY) / 2;
      if (x < view.minX || x > view.maxX || y < view.minY || y > view.maxY) continue;
      if (free(x, y, p.nom, fs)) labels += `<text class="lbl" x="${R(x)}" y="${R(y)}" font-size="${R(fs)}" text-anchor="middle" dominant-baseline="central">${escXml(p.nom)}</text>`;
    }
  }
  let extra = '';
  if (cap) extra += `<circle class="pin" cx="${R(cap[0])}" cy="${R(cap[1])}" r="${R(w / 90)}"/>`;
  else extra += `<circle class="mk" cx="${R((m.minX + m.maxX) / 2)}" cy="${R((m.minY + m.maxY) / 2)}" r="${R(w / 40)}"/>`;
  const main = svg(view, inner + labels, extra);

  // Mini-carte du monde pour situer le pays par rapport au continent.
  let inset = '';
  if (!isWorld) {
    const ic = cap || [(m.minX + m.maxX) / 2, (m.minY + m.maxY) / 2];
    inset = `<div class="inset">${svg(WORLD, `<path class="bg" d="${state.allPaysPath}"/><path class="tgt" d="${t.d}"/>`, `<circle class="pinw" cx="${R(ic[0])}" cy="${R(ic[1])}" r="7"/>`)}</div>`;
  }
  return `<div class="mapwrap">${main}${inset}</div>`;
}

export function mapDept(code) {
  const t = state.deptIdx.get(code);
  if (!t) return '';
  if (t.overseas) {
    const b = t.bbox;
    const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
    const w = Math.max((b.maxX - b.minX) * 1.6, (b.maxY - b.minY) * 1.6 * (4 / 3));
    const h = w * 0.75;
    return svg({ minX: cx - w / 2, maxX: cx + w / 2, minY: cy - h / 2, maxY: cy + h / 2 }, `<path class="tgt" d="${t.d}"/>`);
  }
  const bg = state.depts.filter((d) => !d.overseas && d.code !== code).map((d) => `<path class="bg" d="${d.d}"/>`).join('');
  const m = state.metroBox;
  const pad = 0.4;
  return svg({ minX: m.minX - pad, maxX: m.maxX + pad, minY: m.minY - pad, maxY: m.maxY + pad }, bg + `<path class="tgt" d="${t.d}"/>`);
}
