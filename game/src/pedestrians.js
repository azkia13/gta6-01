// Pedestrians: wander sidewalks and plazas, flee from danger, react to crimes.
import { WORLD, dist, mulberry32 } from './config.js';
import { collideBuildings } from './world.js';
const SKINS = ['#e88ca0', '#8ca0e8', '#a0e88c', '#e8d28c', '#d28ce8', '#8ce8d8', '#e8a06a', '#b0b8c8'];
const NAMES = ['Mara', 'Tomas', 'Lena', 'Omar', 'Sofia', 'Dario', 'Ines', 'Paco', 'Nadia', 'Rui', 'Celia', 'Bruno'];
export function spawnPedestrians(city, count, rnd) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    const x = 200 + rnd() * (WORLD.width - 400);
    const y = 200 + rnd() * (WORLD.height - 600);
    peds.push({
      x, y, angle: rnd() * Math.PI * 2, speed: 28 + rnd() * 30,
      skin: SKINS[i % SKINS.length], name: NAMES[i % NAMES.length],
      state: 'walk', panic: 0, tx: x, ty: y, retarget: rnd() * 4, alive: true, hp: 30, umbrella: false,
    });
  }
  // Marina foot traffic: dockworkers and strollers along the south-east docks,
  // so the new district feels lived-in instead of empty.
  for (let i = 0; i < 6; i++) {
    const x = 2420 + rnd() * 680, y = 1620 + rnd() * 480;
    peds.push({
      x, y, angle: rnd() * Math.PI * 2, speed: 24 + rnd() * 26,
      skin: SKINS[(count + i) % SKINS.length], name: NAMES[(count + i) % NAMES.length],
      state: 'walk', panic: 0, tx: x, ty: y, retarget: rnd() * 4, alive: true, hp: 30, umbrella: false,
    });
  }
  return peds;
}
export function stepPedestrians(peds, dt, city, player, danger, raining) {
  for (const p of peds) {
    if (!p.alive) continue;
    if (p.panic > 0) p.panic -= dt;
    // Rain puts an umbrella up over every pedestrian — and slows the
    // strollers down, since nobody hurries through a Porto Verde downpour
    // except the ones running from gunfire.
    p.umbrella = !!raining;
    const dPlayer = dist(p.x, p.y, player.x, player.y);
    if (danger && dPlayer < 260) { p.state = 'flee'; p.panic = 2.5; }
    if (p.state === 'flee' && p.panic <= 0) p.state = 'walk';
    p.retarget -= dt;
    if (p.retarget <= 0) {
      p.retarget = 2 + Math.random() * 4;
      if (p.state === 'flee') {
        // Fleeing peds pick a far target and stick with it: they run for
        // the next block, not just a few steps away from the trouble.
        const a = Math.atan2(p.y - player.y, p.x - player.x);
        p.tx = p.x + Math.cos(a) * 380; p.ty = p.y + Math.sin(a) * 380;
      } else {
        p.tx = p.x + (Math.random() - 0.5) * 500;
        p.ty = p.y + (Math.random() - 0.5) * 500;
      }
      p.tx = Math.max(60, Math.min(WORLD.width - 60, p.tx));
      p.ty = Math.max(60, Math.min(WORLD.height - 60, p.ty));
    }
    const sp = p.state === 'flee' ? p.speed * 2.7 : p.speed * (raining ? 0.85 : 1);
    const a = Math.atan2(p.ty - p.y, p.tx - p.x);
    if (dist(p.x, p.y, p.tx, p.ty) > 12) {
      p.angle = a;
      const nx = p.x + Math.cos(a) * sp * dt, ny = p.y + Math.sin(a) * sp * dt;
      if (!collideBuildings(city, nx, ny, 10)) { p.x = nx; p.y = ny; }
      else p.retarget = 0;
    }
  }
}
export function nearestPed(peds, x, y, maxDist) {
  let best = null, bd = maxDist;
  for (const p of peds) {
    if (!p.alive) continue;
    const d = dist(p.x, p.y, x, y);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}
