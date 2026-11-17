// City generation for Porto Verde: roads grid, building blocks, beach + pier,
// parks, plazas. Pure data — rendering lives in render.js, collisions here.
import { WORLD, mulberry32 } from './config.js';
export function generateCity(seed) {
  const rnd = mulberry32(seed);
  const buildings = [];
  const parks = [];
  const lots = [];
  const roadsX = [], roadsY = [];
  for (let x = WORLD.roadGap; x < WORLD.width - 100; x += WORLD.roadGap) roadsX.push(x);
  for (let y = WORLD.roadGap; y < WORLD.height - 300; y += WORLD.roadGap) roadsY.push(y);
  for (let bx = 0; bx < roadsX.length; bx++) {
    for (let by = 0; by < roadsY.length; by++) {
      const x0 = roadsX[bx] + WORLD.roadWidth / 2 + 14;
      const y0 = roadsY[by] + WORLD.roadWidth / 2 + 14;
      const x1 = (roadsX[bx + 1] ?? WORLD.width - 60) - WORLD.roadWidth / 2 - 14;
      const y1 = (roadsY[by + 1] ?? WORLD.height - 360) - WORLD.roadWidth / 2 - 14;
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      const r = rnd();
      if (r < 0.16) { parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, trees: 8 + Math.floor(rnd() * 8) }); continue; }
      const cols = rnd() < 0.5 ? 2 : 3, rows = rnd() < 0.5 ? 2 : 3;
      const cw = (x1 - x0) / cols, ch = (y1 - y0) / rows;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        if (rnd() < 0.12) continue;
        const bw = cw * (0.62 + rnd() * 0.22), bh = ch * (0.62 + rnd() * 0.22);
        buildings.push({
          x: x0 + i * cw + (cw - bw) / 2, y: y0 + j * ch + (ch - bh) / 2,
          w: bw, h: bh, color: Math.floor(rnd() * 4), height: 1 + Math.floor(rnd() * 3),
          label: LABELS[Math.floor(rnd() * LABELS.length)],
        });
      }
    }
  }
  for (let i = 0; i < 6; i++) lots.push({ x: 260 + i * 480, y: 300 + (i % 2) * 800, w: 150, h: 70 });
  return {
    seed, buildings, parks, lots, roadsX, roadsY,
    beach: { y: WORLD.height - 260 },
    pier: { x: 1500, y: WORLD.height - 260, w: 90, h: 230 },
    plaza: { x: 1480, y: 980, w: 240, h: 240 },
    hospital: { x: 620, y: 620, w: 200, h: 140 },
  };
}
const LABELS = ['CAFE', 'HOTEL', 'MARKET', 'GARAGE', 'BANK', 'CLUB', 'OFFICE', 'DOCK', 'GYM', 'CINEMA'];
export function isRoad(city, x, y) {
  if (y > city.beach.y) return false;
  for (const rx of city.roadsX) if (Math.abs(x - rx) < WORLD.roadWidth / 2) return true;
  for (const ry of city.roadsY) if (Math.abs(y - ry) < WORLD.roadWidth / 2) return true;
  return false;
}
export function collideBuildings(city, x, y, r) {
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}
export function clampToWorld(x, y, r) {
  return { x: Math.max(r, Math.min(WORLD.width - r, x)), y: Math.max(r, Math.min(WORLD.height - r, y)) };
}
export function nearestRoadPoint(city, x, y) {
  let best = null, bd = 1e9;
  for (const rx of city.roadsX) for (const ry of city.roadsY) {
    const d = Math.hypot(x - rx, y - ry);
    if (d < bd) { bd = d; best = { x: rx, y: ry }; }
  }
  return best;
}
