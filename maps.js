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

export function initMaps(paysGeo, deptGeo) {
  state.pays = paysGeo.features.map((f) => ({ code: f.properties.code, statut: f.properties.statut, ...build(f, projWorld) }));
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

export function mapPays(code) {
  const t = state.paysIdx.get(code);
  if (!t) return '';
  const WORLD = { minX: -180, maxX: 180, minY: mercY(80), maxY: mercY(-57) };
  const m = t.main || t.bbox;
  const tw = m.maxX - m.minX, th = m.maxY - m.minY;
  let view;
  if (tw > 100) {
    view = WORLD;
  } else {
    const cx = (m.minX + m.maxX) / 2, cy = (m.minY + m.maxY) / 2;
    let w = Math.max(tw * 2.4, th * 2.4 * (4 / 3), 28);
    let h = w * 0.75;
    view = { minX: cx - w / 2, maxX: cx + w / 2, minY: cy - h / 2, maxY: cy + h / 2 };
  }
  const bg = state.pays.filter((p) => p.code !== code && hit(p.bbox, view)).map((p) => `<path class="bg" d="${p.d}"/>`).join('');
  const w = view.maxX - view.minX;
  const small = tw < 5 && th < 5;
  const cx = (m.minX + m.maxX) / 2, cy = (m.minY + m.maxY) / 2;
  const marker = small || view === WORLD ? `<circle class="mk" cx="${R(cx)}" cy="${R(cy)}" r="${R(w / (view === WORLD ? 60 : 22))}"/>` : '';
  return svg(view, bg + `<path class="tgt" d="${t.d}"/>`, marker);
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
