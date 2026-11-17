// Porto Verde tuning: every number and colour in one place.
// Original city, characters and story — nothing borrowed from any commercial game.
export const WORLD = { width: 3200, height: 2400, roadGap: 400, roadWidth: 96 };
export const PLAYER = { walkSpeed: 230, runSpeed: 330, radius: 14, maxHealth: 100 };
export const CAR = { accel: 520, maxSpeed: 430, reverse: 160, turn: 2.6, brake: 700 };
export const WANTED = { decayDelay: 9, decayRate: 0.35, max: 5 };
export const SAVE_KEY = 'porto-verde.save.v1';
export const BEST_KEY = 'porto-verde.best.v1';
export const PALETTE = {
  grass: '#5da24a', grass2: '#548f43', road: '#3a3f46', roadLine: '#e8c93f',
  sidewalk: '#b9b3a4', building: '#c98a5e', building2: '#7fa3c9', building3: '#e0c06a',
  building4: '#9b7ec2', sand: '#ecd9a0', sea: '#2f7fb8', sea2: '#2a6ea3',
  pier: '#8a6a4a', park: '#4c8a3f', player: '#ffcf3f', police: '#2f6fd0',
  text: '#f4f1e6', muted: '#c9c4b2', panel: 'rgba(12,16,24,0.82)',
  hudGreen: '#7ee787', hudRed: '#ff6b5e', gold: '#ffd23f',
};
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
export function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
export function fmtMoney(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
export function fmtClock(minutes) {
  const h = Math.floor(minutes / 60) % 24, m = Math.floor(minutes % 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
