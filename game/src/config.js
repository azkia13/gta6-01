// Porto Verde tuning: every number and colour in one place.
// Original city, characters and story — nothing borrowed from any commercial game.
export const WORLD = { width: 3200, height: 2400, roadGap: 400, roadWidth: 96 };
export const PLAYER = { walkSpeed: 230, runSpeed: 330, radius: 14, maxHealth: 100 };
export const CAR = { accel: 520, maxSpeed: 430, reverse: 160, turn: 2.6, brake: 700 };
export const WANTED = { decayDelay: 9, decayRate: 0.35, max: 5 };
export const GARAGE = { x: 700, y: 500, r: 110, nitroCharges: 3 };
// Motorcycles: quicker off the line and sharper in the turn than any car,
// with a higher top speed — but no roof, so every crash hurts the same.
export const BIKE = { accelMul: 1.3, turnMul: 1.55, topBonus: 55 };
// Police helicopter: sent up at 5 stars, circles at this radius and speed.
export const HELI = { atWanted: 5, orbitR: 280, orbitSpeed: 0.4 };
// Sprint stamina on foot: Shift runs Rico faster until the tank is empty,
// then he is winded until it refills past the ready mark (see player.js).
export const STAMINA = { max: 100, drain: 24, regen: 16, readyAt: 25 };
// The van: a slow, boxy workhorse — slower off the line and a lower top
// speed, but it shrugs off crashes and holds the wet road better than a car.
export const VAN = { accelMul: 0.82, topPenalty: 70, rainGripKeep: 0.5, bounceMul: 0.5 };
// Side jobs: taxi fares (pick the fare up, then drop them off) and the
// vigilante job (wreck a marked thug car by ramming or shooting it).
export const SIDEJOB = { taxiPickupTime: 90, taxiDropTime: 75, pickupR: 60, vigilanteTime: 120, rewardVigilante: 350 };
export const VIGILANTE = { thugHp: 3, ramSpeed: 110, ramR: 56, ramCooldown: 0.9 };
// Marina district bounds (south-east corner) — see world.js generateCity.
export const MARINA = { x: 2350, y: 1550, w: 800, h: 800, label: 'MARINA' };
// Old Town district bounds (north-west corner) — see world.js generateCity.
export const OLD_TOWN = { x: 150, y: 150, w: 750, h: 650, label: 'OLD TOWN' };
// Weather: grip and visibility the rain leaves the driver, per state, and
// how much darker a storm makes the sky on top of the day/night cycle.
export const WEATHER = {
  grip: { clear: 1, drizzle: 0.92, rain: 0.78, storm: 0.62 },
  visibility: { clear: 1, drizzle: 0.94, rain: 0.82, storm: 0.66 },
  stormDark: 0.22, rainDark: 0.1,
  // Rain Tires (garage upgrade) keep this share of the grip the rain
  // would otherwise steal: a storm at 0.62 grip drives like 0.81 with them.
  tiresKeep: 0.5,
};
// Empire businesses: three fronts Rico can buy with cash. Each one earns its
// income into a pending pot (see empire.js) that Rico collects at the door;
// upgrades raise the income, and rival crews raid owned fronts on a timer.
export const EMPIRE = {
  attackFirstDelay: 75, attackGapMin: 90, attackGapMax: 150, attackCrew: 3,
  defendBonus: 150, nearR: 130,
  defs: [
    { id: 'laundromat', name: 'Spin Cycle Laundromat', short: 'LAUNDROMAT', price: 1500, income: 45, x: 1000, y: 300, color: '#7ec8e8' },
    { id: 'chopshop', name: "Rico's Chop Shop", short: 'CHOP SHOP', price: 3500, income: 110, x: 2100, y: 900, color: '#e8a04c' },
    { id: 'nightclub', name: 'Club Neon', short: 'NIGHTCLUB', price: 5000, income: 180, x: 1500, y: 1500, color: '#c86ae8' },
  ],
  // Income multiplier per level (index = level - 1) and what reaching that
  // level costs, as a share of the front's price.
  levelMul: [1, 1.6, 2.2],
  levelCostMul: [0, 0.6, 1.0],
};
// Police escalation: roadblocks from wanted 3, ramming from wanted 4, 4 cops at 5.
export const POLICE = { roadblockAt: 3, ramAt: 4, maxCops: 4, maxCopsLow: 3 };
export const SAVE_KEY = 'porto-verde.save.v1';
export const BEST_KEY = 'porto-verde.best.v1';
export const PALETTE = {
  grass: '#5da24a', grass2: '#548f43', road: '#3a3f46', roadLine: '#e8c93f',
  sidewalk: '#b9b3a4', building: '#c98a5e', building2: '#7fa3c9', building3: '#e0c06a',
  building4: '#9b7ec2', sand: '#ecd9a0', sea: '#2f7fb8', sea2: '#2a6ea3',
  pier: '#8a6a4a', park: '#4c8a3f', player: '#ffcf3f', police: '#2f6fd0',
  warehouse: '#8a7a5e', marinaWater: '#2e8f8a', boatHull: '#e8e4d8', boatCabin: '#c94f43',
  crate: '#a9713a', crateEdge: '#6d4a22', barricade: '#ff7a1a',
  cobble: '#8f8578', cobble2: '#7d7468', church: '#d8cbb2', churchRoof: '#7a4a3a',
  oldBrick: '#a86f4e', rainDrop: '#aec2e0',
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
