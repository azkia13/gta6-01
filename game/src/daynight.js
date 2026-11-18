// Day/night cycle for Porto Verde: the in-game clock drives the sky, and after
// dark every car's headlights switch on and the street lamps pool light.
// The clock runs 0.5 game-minutes per real second (see main.js), so a full day
// takes about 48 real minutes — long enough to run a whole story arc in
// daylight, short enough that night driving actually happens.
import { clamp } from './config.js';

// Darkness keyframes: [minutes after midnight, darkness 0..1].
// Night 20:00-05:00, dawn 05:00-07:00, day 07:00-18:00, dusk 18:00-20:00.
const KEYFRAMES = [
  [0, 0.9], [300, 0.9], [420, 0], [1080, 0], [1200, 0.9], [1440, 0.9],
];
export function darknessAt(clockMinutes) {
  const m = ((clockMinutes % 1440) + 1440) % 1440;
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    const t0 = KEYFRAMES[i][0], d0 = KEYFRAMES[i][1];
    const t1 = KEYFRAMES[i + 1][0], d1 = KEYFRAMES[i + 1][1];
    if (m >= t0 && m <= t1) {
      const f = t1 === t0 ? 0 : (m - t0) / (t1 - t0);
      return clamp(d0 + (d1 - d0) * f, 0, 1);
    }
  }
  return 0.9;
}
export function isNight(clockMinutes) { return darknessAt(clockMinutes) > 0.5; }
export function phaseName(clockMinutes) {
  const m = ((clockMinutes % 1440) + 1440) % 1440;
  if (m < 300) return 'night';
  if (m < 420) return 'dawn';
  if (m < 1080) return 'day';
  if (m < 1200) return 'dusk';
  return 'night';
}
// Full-screen tint drawn over the world (under the HUD). Dusk gets a warm
// orange wash, dawn a pink one, night a cold blue one; full daylight needs
// no tint at all, so this returns null and the renderer skips the pass.
export function skyOverlay(clockMinutes) {
  const d = darknessAt(clockMinutes);
  if (d <= 0.02) return null;
  const m = ((clockMinutes % 1440) + 1440) % 1440;
  const dusk = m >= 1020 && m < 1260;
  const dawn = m >= 240 && m < 480;
  const r = dusk || dawn ? 255 : 16;
  const g = dusk ? 120 : dawn ? 150 : 24;
  const b = dusk ? 50 : dawn ? 120 : 64;
  return 'rgba(' + r + ',' + g + ',' + b + ',' + (d * 0.45).toFixed(3) + ')';
}
// A headlight cone in world space: bright at the bumper, fading with distance.
export function headlightBeam(ctx, x, y, angle, len, spread) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const g = ctx.createLinearGradient(0, 0, len, 0);
  g.addColorStop(0, 'rgba(255,240,170,0.32)');
  g.addColorStop(1, 'rgba(255,240,170,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(len, -spread);
  ctx.lineTo(len, spread);
  ctx.lineTo(0, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
// Street lamps sit at every road junction; at night each one pools light on
// the asphalt below. Positions come straight from the generated road grid.
export function lampPositions(city) {
  const lamps = [];
  for (const rx of city.roadsX) {
    for (const ry of city.roadsY) lamps.push({ x: rx, y: ry });
  }
  return lamps;
}
