// Police helicopter: at wanted 5 the Porto Verde police send the eye in the
// sky. It circles Rico, pins him with a spotlight, and while it watches him
// his wanted level cools four times slower — the only way to shake it is to
// get busted, get wasted, or lose the heat another way. It leaves the moment
// the heat drops below 5 stars.
import { HELI } from './config.js';
export function createHeli() {
  return { active: false, orbit: Math.random() * Math.PI * 2, x: 0, y: 0, rotor: 0, sweep: 0, sweepT: 0 };
}
export function spawnHeli(heli, px, py) {
  heli.active = true;
  heli.orbit = Math.random() * Math.PI * 2;
  heli.x = px + Math.cos(heli.orbit) * HELI.orbitR;
  heli.y = py + Math.sin(heli.orbit) * HELI.orbitR;
  heli.rotor = 0;
  heli.sweep = 0;
  heli.sweepT = 0;
  return heli;
}
export function stepHeli(heli, dt, player, raining) {
  if (!heli.active) return;
  heli.orbit += HELI.orbitSpeed * dt;
  heli.rotor += dt * 28;
  heli.x = player.x + Math.cos(heli.orbit) * HELI.orbitR;
  heli.y = player.y + Math.sin(heli.orbit) * HELI.orbitR;
  // In the rain the pilot sweeps the spotlight side to side, hunting for
  // Rico through the downpour instead of pinning him dead-on — so the beam
  // slides off him and back again, and the heat still cools slowly.
  heli.sweepT += dt;
  heli.sweep = raining ? Math.sin(heli.sweepT * 0.9) * 130 : 0;
}
export function despawnHeli(heli) {
  heli.active = false;
  return heli;
}
