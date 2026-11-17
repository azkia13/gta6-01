// Rico Vega on foot: movement, entering/exiting cars, health, wanted heat.
import { PLAYER, WORLD, clamp, dist } from './config.js';
import { collideBuildings, clampToWorld } from './world.js';
export function createPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0, health: PLAYER.maxHealth,
    money: 250, wanted: 0, wantedTimer: 0, inCar: null, invuln: 0,
    score: 0, kills: 0, crimes: 0, onFoot: true,
  };
}
export function addWanted(p, n) {
  p.wanted = Math.min(5, p.wanted + n);
  p.wantedTimer = 0;
  if (n > 0) p.crimes += 1;
}
export function stepPlayer(p, dt, input, city, cars, audio) {
  if (p.inCar) return; // driving is handled by vehicles.js
  const ax = input.axis();
  const len = Math.hypot(ax.x, ax.y) || 1;
  const sp = (input.run() ? PLAYER.runSpeed : PLAYER.walkSpeed);
  let nx = p.x, ny = p.y;
  if (ax.x || ax.y) {
    nx = p.x + (ax.x / len) * sp * dt;
    ny = p.y + (ax.y / len) * sp * dt;
    p.angle = Math.atan2(ax.y, ax.x);
    p.speed = sp;
  } else p.speed = 0;
  if (!collideBuildings(city, nx, p.y, PLAYER.radius)) p.x = nx;
  if (!collideBuildings(city, p.x, ny, PLAYER.radius)) p.y = ny;
  const c = clampToWorld(p.x, p.y, PLAYER.radius);
  p.x = c.x; p.y = c.y;
  if (p.invuln > 0) p.invuln -= dt;
}
export function nearestCar(p, cars, maxDist) {
  let best = null, bd = maxDist;
  for (const c of cars) {
    const d = dist(p.x, p.y, c.x, c.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
export function tryEnterCar(p, cars, audio) {
  const car = nearestCar(p, cars, 70);
  if (!car) return false;
  if (!car.stolen && car.kind !== 'player') {
    car.stolen = true;
    addWanted(p, 1);
    if (audio) audio.blip();
  }
  p.inCar = car; car.driver = 'player'; car.occupied = true;
  p.x = car.x; p.y = car.y;
  return true;
}
export function exitCar(p, city) {
  const car = p.inCar;
  if (!car) return;
  car.driver = null; car.occupied = false;
  p.inCar = null;
  const a = car.angle + Math.PI / 2;
  p.x = car.x + Math.cos(a) * 46; p.y = car.y + Math.sin(a) * 46;
  if (collideBuildings(city, p.x, p.y, PLAYER.radius)) { p.x = car.x - Math.cos(a) * 46; p.y = car.y - Math.sin(a) * 46; }
  const c = clampToWorld(p.x, p.y, PLAYER.radius);
  p.x = c.x; p.y = c.y;
}
export function damagePlayer(p, amount) {
  if (p.invuln > 0) return false;
  p.health -= amount;
  p.invuln = 0.35;
  return p.health <= 0;
}
