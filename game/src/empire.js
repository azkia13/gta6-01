// Empire businesses: fronts Rico buys, upgrades, collects from — and defends.
// A front earns its income (dollars per game minute) into a pending pot while
// Rico plays; the money only lands in his pocket when he collects it at the
// door (B panel, or the 1/2/3 key for that front). Rival crews raid owned
// fronts on a timer: a raided front stops earning until its crew is beaten,
// and a raid on every front at once is the story of mission 11.
import { EMPIRE, dist } from './config.js';

export function businessDef(id) {
  return EMPIRE.defs.find((d) => d.id === id) || null;
}
export function createEmpire() {
  // owned: id -> { level, pending } — pending is uncollected income in dollars.
  return {
    owned: {},
    totalCollected: 0,
    attackTimer: EMPIRE.attackFirstDelay,
    raid: null, // { defId, enemies } while a front is under attack
    raidAll: false, // mission 11: every front is hit at once
    raidStarted: false,
  };
}
export function empireOwnedCount(emp) {
  return Object.keys(emp.owned).length;
}
export function empireIsOwned(emp, id) {
  return !!emp.owned[id];
}
export function empireLevel(emp, id) {
  return emp.owned[id] ? emp.owned[id].level : 0;
}
export function empireIncomePerMin(emp, id) {
  const def = businessDef(id);
  const own = emp.owned[id];
  if (!def || !own) return 0;
  return Math.round(def.income * EMPIRE.levelMul[own.level - 1]);
}
export function empireTotalIncomePerMin(emp) {
  let total = 0;
  for (const id of Object.keys(emp.owned)) total += empireIncomePerMin(emp, id);
  return total;
}
export function empirePendingTotal(emp) {
  let total = 0;
  for (const id of Object.keys(emp.owned)) total += emp.owned[id].pending;
  return Math.floor(total);
}
export function empireUnderAttack(emp, id) {
  return !!emp.raid && (emp.raidAll || emp.raid.defId === id);
}
export function empireAttacksActive(emp) {
  if (!emp.raid) return 0;
  return emp.raidAll ? empireOwnedCount(emp) : 1;
}
export function empireFirstOwnedDef(emp) {
  const ids = Object.keys(emp.owned);
  return ids.length ? businessDef(ids[0]) : null;
}
export function nearestBusiness(emp, x, y, maxD) {
  let best = null, bd = maxD;
  for (const def of EMPIRE.defs) {
    const d = dist(x, y, def.x, def.y);
    if (d < bd) { bd = d; best = def; }
  }
  return best;
}
// Buy a front: cash up front, level 1, empty pending pot. Returns a result
// object the panel and the playtest hooks can both read.
export function buyBusiness(emp, player, id) {
  const def = businessDef(id);
  if (!def) return { ok: false, reason: 'No such business.' };
  if (emp.owned[id]) return { ok: false, reason: def.name + ' is already yours.' };
  if (player.money < def.price) {
    return { ok: false, reason: 'Not enough cash for ' + def.name + ' ($' + def.price + ').' };
  }
  player.money -= def.price;
  emp.owned[id] = { level: 1, pending: 0 };
  return { ok: true, reason: def.name + ' is yours — $' + def.income + '/min. Collect the payout with B.' };
}
export function upgradeCost(emp, id) {
  const def = businessDef(id);
  const own = emp.owned[id];
  if (!def || !own || own.level >= EMPIRE.levelMul.length) return null;
  return Math.round(def.price * EMPIRE.levelCostMul[own.level]);
}
export function upgradeBusiness(emp, player, id) {
  const def = businessDef(id);
  const own = emp.owned[id];
  if (!def || !own) return { ok: false, reason: 'Buy ' + (def ? def.name : 'that front') + ' first.' };
  const cost = upgradeCost(emp, id);
  if (cost === null) return { ok: false, reason: def.name + ' is already max level.' };
  if (player.money < cost) return { ok: false, reason: 'Upgrade costs $' + cost + ' — not enough cash.' };
  player.money -= cost;
  own.level += 1;
  return { ok: true, reason: def.name + ' upgraded to level ' + own.level + ' — now $' + empireIncomePerMin(emp, id) + '/min.' };
}
// Collect a front's pending pot into Rico's pocket. Collecting is what the
// mission 10 payout step watches (emp.totalCollected).
export function collectBusiness(emp, player, id) {
  const def = businessDef(id);
  const own = emp.owned[id];
  if (!def || !own) return { ok: false, reason: 'You do not own that front yet.' };
  const amount = Math.floor(own.pending);
  if (amount <= 0) return { ok: false, reason: 'Nothing to collect at ' + def.name + ' yet — income is still dripping in.' };
  own.pending = 0;
  player.money += amount;
  player.score += amount;
  emp.totalCollected += amount;
  return { ok: true, reason: 'Collected $' + amount + ' from ' + def.name + '.', amount };
}
export function collectAllBusinesses(emp, player) {
  let total = 0;
  for (const id of Object.keys(emp.owned)) {
    const r = collectBusiness(emp, player, id);
    if (r.ok) total += r.amount;
  }
  return total;
}
// Income tick: every owned front that is NOT under attack drips its income
// into its pending pot. Called once per frame with the frame's dt (seconds).
export function empireIncomeTick(emp, dt) {
  for (const id of Object.keys(emp.owned)) {
    if (empireUnderAttack(emp, id)) continue;
    emp.owned[id].pending += (empireIncomePerMin(emp, id) / 60) * dt;
  }
}
// Raid timer: counts down while Rico owns at least one front and no raid is
// running. Fires a raid on a random owned front; the caller spawns the crew
// (see main.js startEmpireRaid) and clears it when the crew is beaten.
export function empireAttackTick(emp, dt, canRaid) {
  if (empireOwnedCount(emp) === 0 || emp.raid || !canRaid) return null;
  emp.attackTimer -= dt;
  if (emp.attackTimer > 0) return null;
  emp.attackTimer = EMPIRE.attackGapMin + Math.random() * (EMPIRE.attackGapMax - EMPIRE.attackGapMin);
  const ids = Object.keys(emp.owned);
  const defId = ids[Math.floor(Math.random() * ids.length)];
  emp.raid = { defId, enemies: [] };
  return businessDef(defId);
}
// Mission 11: the rival crew hits EVERY front at once. The raid clears only
// when its whole crew is beaten (main.js watches the enemies list).
export function empireAttackAll(emp) {
  if (empireOwnedCount(emp) === 0) return null;
  emp.raid = { defId: null, enemies: [] };
  emp.raidAll = true;
  emp.raidStarted = true;
  return Object.keys(emp.owned).map((id) => businessDef(id));
}
export function empireClearRaid(emp) {
  emp.raid = null;
  emp.raidAll = false;
}
// A raid is beaten when every crew member the raid spawned is dead.
export function empireRaidBeaten(emp) {
  if (!emp.raid) return true;
  return emp.raid.enemies.length > 0 && emp.raid.enemies.every((e) => !e.alive);
}
// One-line status for the HUD chip and the empire panel header.
export function empireSummary(emp) {
  const n = empireOwnedCount(emp);
  if (n === 0) return 'NO BUSINESS YET — PRESS B';
  const under = empireAttacksActive(emp);
  const base = 'EMPIRE $' + empireTotalIncomePerMin(emp) + '/min · ' + n + ' FRONT' + (n > 1 ? 'S' : '') + ' · PENDING $' + empirePendingTotal(emp);
  return under > 0 ? base + ' · UNDER ATTACK!' : base;
}
// Save/load shape: plain data only, no live enemy references.
export function empireSave(emp) {
  return {
    owned: emp.owned,
    totalCollected: emp.totalCollected,
    attackTimer: emp.attackTimer,
  };
}
export function empireLoad(emp, data) {
  if (!data) return;
  if (data.owned) emp.owned = data.owned;
  if (typeof data.totalCollected === 'number') emp.totalCollected = data.totalCollected;
  if (typeof data.attackTimer === 'number') emp.attackTimer = data.attackTimer;
  emp.raid = null; emp.raidAll = false; emp.raidStarted = false;
}
