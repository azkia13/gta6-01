// Police helicopter: at wanted 5 the Porto Verde police send the eye in the
// sky. It circles Rico, pins him with a spotlight, and while it watches him
// his wanted level cools four times slower — the only way to shake it is to
// get busted, get wasted, or lose the heat another way. It leaves the moment
// the heat drops below 5 stars.
import { HELI } from './config.js';
export function createHeli() {
  return { active: false, orbit: Math.random() * Math.PI * 2, x: 0, y: 0, rotor: 0 };
}
export function spawnHeli(heli, px, py) {
  heli.active = true;
  heli.orbit = Math.random() * Math.PI * 2;
  heli.x = px + Math.cos(heli.orbit) * HELI.orbitR;
  heli.y = py + Math.sin(heli.orbit) * HELI.orbitR;
  heli.rotor = 0;
  return heli;
}
export function stepHeli(heli, dt, player) {
  if (!heli.active) return;
  heli.orbit += HELI.orbitSpeed * dt;
  heli.rotor += dt * 28;
  heli.x = player.x + Math.cos(heli.orbit) * HELI.orbitR;
  heli.y = player.y + Math.sin(heli.orbit) * HELI.orbitR;
}
export function despawnHeli(heli) {
  heli.active = false;
  return heli;
}
