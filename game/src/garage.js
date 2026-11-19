// Garage upgrades: bought with cash at the garage (700,500), saved with the game.
// Engine raises top speed, Armor cuts damage taken, Nitro gives Shift-boost charges
// that refill free whenever Rico visits the garage.
import { GARAGE, CAR } from './config.js';
import { dist } from './config.js';
export const UPGRADES = [
  { id: 'engine1', name: 'Engine Mk I', price: 800, desc: '+60 top speed' },
  { id: 'engine2', name: 'Engine Mk II', price: 1500, desc: '+120 top speed (needs Mk I)', needs: 'engine1' },
  { id: 'armor1', name: 'Armor Plating', price: 600, desc: 'Take 25% less damage' },
  { id: 'armor2', name: 'Heavy Armor', price: 1200, desc: 'Take 45% less damage (needs Plating)', needs: 'armor1' },
  { id: 'nitro', name: 'Nitro Kit', price: 500, desc: 'Hold Shift to boost — refills free at the garage' },
  { id: 'rainTires', name: 'Rain Tires', price: 700, desc: 'Keep half the grip the rain steals' },
];
export function createUpgrades() {
  return { engine: 0, armor: 0, nitro: false, nitroCharges: 0, rainTires: false, owned: [] };
}
export function isNearGarage(p) {
  return dist(p.x, p.y, GARAGE.x, GARAGE.y) < GARAGE.r;
}
export function upgradeOwned(up, id) { return up.owned.includes(id); }
export function upgradeAvailable(up, id) {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u || upgradeOwned(up, id)) return false;
  return !u.needs || upgradeOwned(up, u.needs);
}
export function buyUpgrade(up, player, id) {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u) return { ok: false, reason: 'No such upgrade.' };
  if (upgradeOwned(up, id)) return { ok: false, reason: u.name + ' already installed.' };
  if (u.needs && !upgradeOwned(up, u.needs)) return { ok: false, reason: u.name + ' needs ' + u.needs + ' first.' };
  if (player.money < u.price) return { ok: false, reason: 'Not enough cash for ' + u.name + ' ($' + u.price + ').' };
  player.money -= u.price;
  up.owned.push(id);
  if (id === 'engine1') up.engine = 1;
  if (id === 'engine2') up.engine = 2;
  if (id === 'armor1') up.armor = 1;
  if (id === 'armor2') up.armor = 2;
  if (id === 'nitro') { up.nitro = true; up.nitroCharges = GARAGE.nitroCharges; }
  if (id === 'rainTires') up.rainTires = true;
  return { ok: true, reason: u.name + ' installed — $' + u.price + '.' };
}
// Top speed of a car with these upgrades fitted.
export function carTopSpeed(up) {
  return CAR.maxSpeed + (up.engine || 0) * 60;
}
// Damage multiplier after armor (1 = no armor, 0.75 / 0.55 with armor tiers).
export function armorFactor(up) {
  if (up.armor >= 2) return 0.55;
  if (up.armor >= 1) return 0.75;
  return 1;
}
export function hasRainTires(up) { return !!up.rainTires; }
export function hasNitro(up) { return !!up.nitro && (up.nitroCharges || 0) > 0; }
// Spend one nitro charge; returns true when a boost is available.
export function useNitro(up) {
  if (!hasNitro(up)) return false;
  up.nitroCharges -= 1;
  return true;
}
export function refillNitro(up) {
  if (up.nitro) up.nitroCharges = GARAGE.nitroCharges;
}
