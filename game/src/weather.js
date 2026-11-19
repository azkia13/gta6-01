// Weather for Porto Verde: clear skies, drizzle, rain and full storms roll
// across the city on a timer. Rain makes the roads slick (less grip, shorter
// sight lines) and a storm at night throws lightning across the sky. The
// renderer draws the rain; the audio module hums its patter; driving physics
// reads the grip factor every frame.
import { WEATHER, clamp } from './config.js';

const ORDER = { clear: 'drizzle', drizzle: 'rain', rain: 'storm', storm: 'clear' };
// Screen-space streaks per state; a storm throws more, faster drops.
const DROPS = { clear: 0, drizzle: 70, rain: 170, storm: 280 };
const FALL = { clear: 0, drizzle: 620, rain: 920, storm: 1180 };

export function createWeather() {
  return {
    state: 'clear',
    timer: 75 + Math.random() * 60, // seconds until the sky changes its mind
    flash: 0, // lightning flash brightness, 1 just after a strike, fading out
    flashTimer: 5 + Math.random() * 6,
    drops: [], // screen-space rain streaks {x, y, len, speed}
    splashes: [], // rings where drops hit the ground {x, y, t}
    intensity: 0, // 0..1, eases toward the current state's target
  };
}
// Force a state (screenshot staging, playtesting). Drops rebuild at once so
// the rain is visible on the very next frame, not after a slow fade-in.
export function setWeather(w, state) {
  if (!ORDER[state]) return;
  w.state = state;
  w.timer = 75 + Math.random() * 60;
  w.intensity = state === 'clear' ? 0 : 1;
  w.flash = 0;
  seedDrops(w);
}
function seedDrops(w) {
  w.drops = [];
  const n = DROPS[w.state];
  for (let i = 0; i < n; i++) w.drops.push(spawnDrop(w, true));
}
function spawnDrop(w, anywhere) {
  return {
    x: Math.random() * 1360 - 40,
    y: anywhere ? Math.random() * 760 - 40 : -40 - Math.random() * 60,
    len: 14 + Math.random() * 14,
    speed: FALL[w.state] * (0.85 + Math.random() * 0.3),
  };
}
export function stepWeather(w, dt, clockMinutes) {
  w.timer -= dt;
  if (w.timer <= 0) {
    // The sky walks clear -> drizzle -> rain -> storm -> clear. Storms
    // linger longer at night, when the city lights make them worth seeing.
    const night = clockMinutes % 1440 < 300 || clockMinutes % 1440 >= 1200;
    w.state = ORDER[w.state];
    w.timer = w.state === 'storm' && night ? 100 + Math.random() * 60 : 60 + Math.random() * 70;
    if (w.state === 'clear') w.drops = [];
  }
  // Rain fades in and out instead of snapping on.
  const target = w.state === 'clear' ? 0 : 1;
  w.intensity += clamp(target - w.intensity, -dt * 0.5, dt * 0.5);
  // Keep the drop count near the state's target as the fade progresses.
  const want = Math.round(DROPS[w.state] * w.intensity);
  while (w.drops.length < want) w.drops.push(spawnDrop(w, false));
  if (w.drops.length > want) w.drops.length = want;
  // Drops fall slanting with the wind; a splash blooms where each lands.
  for (const d of w.drops) {
    d.y += d.speed * dt;
    d.x -= d.speed * 0.16 * dt;
    if (d.y > 730) {
      if (w.splashes.length < 60 && Math.random() < 0.5) {
        w.splashes.push({ x: d.x, y: 700 + Math.random() * 20, t: 0 });
      }
      Object.assign(d, spawnDrop(w, false));
    }
  }
  for (const sp of w.splashes) sp.t += dt;
  w.splashes = w.splashes.filter((sp) => sp.t < 0.35);
  // Lightning only in a storm, and only once the flash has fully faded.
  if (w.state === 'storm') {
    w.flashTimer -= dt;
    if (w.flashTimer <= 0) {
      w.flash = 1;
      w.flashTimer = 3 + Math.random() * 8;
    }
  }
  if (w.flash > 0) w.flash = Math.max(0, w.flash - dt * 2.4);
}
// How much of the dry-road grip the tyres keep right now. Rain Tires from
// the garage keep half the grip the rain would steal, so a storm that leaves
// 0.62 grip on stock tyres leaves 0.81 with them fitted.
export function gripFactor(w, upgrades) {
  const base = WEATHER.grip[w.state] ?? 1;
  if (upgrades && upgrades.rainTires) return 1 - (1 - base) * (1 - WEATHER.tiresKeep);
  return base;
}
// How far the driver can see through the rain (1 = clear-day sight).
export function visibilityFactor(w) { return WEATHER.visibility[w.state] ?? 1; }
// Extra darkness the storm clouds add on top of the day/night cycle.
export function stormDarkness(w) {
  if (w.state === 'storm') return WEATHER.stormDark;
  if (w.state === 'rain') return WEATHER.rainDark;
  return 0;
}
export function isRaining(w) { return w.state !== 'clear'; }
export function weatherName(w) { return w.state; }
// HUD line: what the sky is doing and what it means for the driver.
export function weatherLabel(w) {
  if (w.state === 'storm') return 'STORM — SLICK ROADS, POOR VISIBILITY';
  if (w.state === 'rain') return 'RAIN — SLICK ROADS';
  if (w.state === 'drizzle') return 'DRIZZLE';
  return 'CLEAR SKIES';
}
// Rain streaks + splashes, drawn in screen space over the world (under the
// HUD) so the rain reads at any camera position. Called by the renderer.
export function drawRain(ctx, w, vw, vh) {
  if (w.drops.length === 0) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(174,194,224,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (const d of w.drops) {
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x - d.len * 0.16, d.y + d.len);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(174,194,224,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const sp of w.splashes) {
    const r = 3 + sp.t * 26;
    ctx.ellipse(sp.x, sp.y, r, r * 0.35, 0, 0, Math.PI * 2);
  }
  ctx.stroke();
  ctx.restore();
}
