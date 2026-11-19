// Story missions for Porto Verde + free-roam side jobs (taxi fares, package drops).
// Rico Vega, a driver-for-hire, is pulled back into the fixer game by his old contact
// Mama Luz. Nine story missions, then the finale pays out and the story completes.
import { dist, SIDEJOB } from './config.js';
export const MISSIONS = [
  {
    id: 1, title: 'Welcome Back, Rico', reward: 400,
    intro: 'Mama Luz: "Rico! The garage needs a driver. Pick up the package at the pier and bring it to the plaza. No questions."',
    steps: [
      { type: 'goto', label: 'Go to the pier package', x: 1545, y: 2140, r: 70 },
      { type: 'goto', label: 'Deliver the package to the plaza', x: 1600, y: 1100, r: 80 },
    ],
  },
  {
    id: 2, title: 'Hot Wheels', reward: 600,
    intro: 'Mama Luz: "The client wants a fast car. Steal the red sport coupe by the north lot — and lose the cops after."',
    steps: [
      { type: 'steal', label: 'Steal a car (press E near one)', x: 0, y: 0, r: 0 },
      { type: 'goto', label: 'Bring the car to the garage', x: 700, y: 500, r: 90 },
    ],
  },
  {
    id: 3, title: 'Shakedown at the Market', reward: 800,
    intro: 'Dario: "The market gang took our cut. Go to the market, deal with the two lookouts, then grab the cash bag."',
    steps: [
      { type: 'fight', label: 'Deal with the market lookouts (2)', x: 1250, y: 850, r: 120, count: 2 },
      { type: 'goto', label: 'Grab the cash bag and return to the plaza', x: 1600, y: 1100, r: 80 },
    ],
  },
  {
    id: 4, title: 'The Getaway', reward: 1200,
    intro: 'Mama Luz: "The bank job went loud. Grab the driver seat, pick up the crew at the beach, and outrun the police to the hideout."',
    steps: [
      { type: 'goto', label: 'Pick up the crew at the beach', x: 900, y: 2180, r: 90 },
      { type: 'escape', label: 'Reach the hideout with the cops behind you', x: 2700, y: 500, r: 100 },
    ],
  },
  {
    id: 5, title: 'The Fixer Slips the Net', reward: 1500,
    intro: 'Mama Luz: "The fixer was at the north docks — but his guards bought him time and he slipped away to the marina. Hit his crew, then follow him. This is not over."',
    steps: [
      { type: 'fight', label: 'Defeat the fixer\'s guards at the north docks (3)', x: 2600, y: 420, r: 150, count: 3 },
      { type: 'goto', label: 'Search the docks for where the fixer fled', x: 2600, y: 420, r: 90 },
    ],
  },
  {
    id: 6, title: 'Harbor Lights', reward: 2000,
    intro: 'Mama Luz: "The fixer is hiding his smuggled goods in the Marina district, south-east by the docks. Collect the three crates, then deliver them to the pier. Quietly."',
    steps: [
      {
        type: 'collect', label: 'Collect the smuggled crates at the marina', count: 3,
        crates: [
          { x: 2800, y: 1780, r: 40 },
          { x: 2400, y: 2100, r: 40 },
          { x: 3000, y: 2000, r: 40 },
        ],
      },
      { type: 'goto', label: 'Deliver the crates to the pier', x: 1545, y: 2140, r: 70 },
    ],
  },
  {
    id: 7, title: 'King of the Verde', reward: 3000,
    intro: 'Mama Luz: "The fixer is cornered at the north docks with his last guards. End it, lose the cops on the way to the hideout — but this is not the end. A storm is coming over Old Town, and the Don still holds his ledger."',
    steps: [
      { type: 'fight', label: 'Defeat the fixer and his guards (5)', x: 2600, y: 420, r: 150, count: 5 },
      { type: 'escape', label: 'Escape to the hideout with the cops behind you', x: 2700, y: 500, r: 100, minWanted: 2 },
      { type: 'goto', label: 'Meet Mama Luz at the plaza', x: 1600, y: 1100, r: 90 },
    ],
  },
  {
    id: 8, title: 'Storm Warning', reward: 3500,
    intro: 'Mama Luz: "The storm is here, Rico, and the Don\'s boys are moving his stash through Old Town while the rain hides them. Get to the church, grab the three crates in the wet, and shake the cops at the hideout. The roads are slick — drive like it."',
    steps: [
      { type: 'goto', label: 'Reach the Old Town church in the storm', x: 605, y: 615, r: 70 },
      {
        type: 'collect', label: 'Collect the Don\'s crates in Old Town', count: 3,
        crates: [
          { x: 560, y: 250, r: 40 },
          { x: 650, y: 270, r: 40 },
          { x: 830, y: 520, r: 40 },
        ],
      },
      { type: 'escape', label: 'Escape to the hideout with the cops behind you', x: 2700, y: 500, r: 100, minWanted: 2 },
    ],
  },
  {
    id: 9, title: "The Don's Ledger", reward: 5000,
    intro: 'Mama Luz: "It all ends tonight, Rico. The Don is holding court in the Old Town plaza with his guards, and his ledger names every crooked deal in Porto Verde. Take him down, take the ledger, lose the cops — then come home. The city will be yours."',
    steps: [
      { type: 'fight', label: 'Defeat the Don and his guards in Old Town (5)', x: 590, y: 250, r: 150, count: 5 },
      {
        type: 'collect', label: "Grab the Don's ledger", count: 1,
        crates: [{ x: 620, y: 290, r: 40 }],
      },
      { type: 'escape', label: 'Escape to the hideout with the cops behind you', x: 2700, y: 500, r: 100, minWanted: 2 },
      { type: 'goto', label: 'Meet Mama Luz at the plaza — story complete', x: 1600, y: 1100, r: 90 },
    ],
  },
];
export function createMissionState() {
  return { index: 0, step: 0, active: false, done: 0, message: '', sideJob: null, sideTimer: 0, enemies: [], collectThisStep: 0 };
}
export function currentMission(ms) { return MISSIONS[ms.index] || null; }
export function currentStep(ms) {
  const m = currentMission(ms);
  return m ? m.steps[ms.step] : null;
}
export function startMission(ms) {
  const m = currentMission(ms);
  if (!m) return null;
  ms.active = true; ms.step = 0; ms.message = m.intro; ms.collectThisStep = 0; ms.killsThisStep = 0;
  return m;
}
export function missionObjectiveText(ms) {
  const m = currentMission(ms);
  if (!m) return 'Story complete — free roam!';
  if (!ms.active) return 'Press ENTER to start: ' + m.title;
  const s = currentStep(ms);
  if (!s) return 'Mission ' + m.id + ' — ' + m.title;
  let label = s.label;
  if (s.type === 'collect') label += ' (' + (ms.collectThisStep || 0) + '/' + (s.count || 1) + ')';
  if (s.type === 'escape' && s.minWanted) label += ' (wanted ' + s.minWanted + '+)';
  return 'Mission ' + m.id + ' — ' + m.title + ': ' + label;
}
export function stepObjective(ms, player, onComplete) {
  // Returns 'mission-complete' | 'step' | null. Caller handles rewards.
  const m = currentMission(ms);
  if (!m || !ms.active) return null;
  const s = currentStep(ms);
  if (!s) return null;
  const px = player.inCar ? player.inCar.x : player.x;
  const py = player.inCar ? player.inCar.y : player.y;
  if (s.type === 'goto') {
    if (dist(px, py, s.x, s.y) < s.r) return advance(ms, onComplete);
  }
  if (s.type === 'escape') {
    // A getaway only counts while the heat is on: the cops must be behind you.
    const heat = s.minWanted || 0;
    if (dist(px, py, s.x, s.y) < s.r && player.wanted >= heat) return advance(ms, onComplete);
  }
  if (s.type === 'steal') {
    if (player.inCar && player.inCar.stolen) return advance(ms, onComplete);
  }
  if (s.type === 'fight') {
    if ((ms.killsThisStep || 0) >= (s.count || 1)) return advance(ms, onComplete);
  }
  if (s.type === 'collect') {
    // Crates are picked up by walking/driving over them (main.js counts them).
    if ((ms.collectThisStep || 0) >= (s.count || 1)) return advance(ms, onComplete);
  }
  return null;
}
function advance(ms, onComplete) {
  const m = currentMission(ms);
  ms.step += 1; ms.killsThisStep = 0; ms.collectThisStep = 0;
  if (ms.step >= m.steps.length) {
    ms.done += 1; ms.active = false; ms.index += 1;
    if (onComplete) onComplete(m);
    return 'mission-complete';
  }
  return 'step';
}
// Nearest living pedestrian to a point — the taxi fare waits on the sidewalk.
function nearestFarePed(peds, px, py, maxD) {
  let best = null, bd = maxD;
  for (const p of peds) {
    if (!p.alive) continue;
    const d = dist(px, py, p.x, p.y);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}
export function startSideJob(ms, player, rnd, forcedKind, peds, spawnThugCar) {
  if (ms.sideJob) return null;
  const kinds = ['taxi', 'package', 'vigilante'];
  const kind = forcedKind || kinds[Math.floor(rnd() * kinds.length)];
  const px = player.x, py = player.y;
  if (kind === 'taxi' && peds) {
    // A fare is a real person on the street: Rico picks them up where they
    // stand, then drops them at a marker across town against the clock.
    const ped = nearestFarePed(peds, px, py, 1100);
    if (ped) {
      const reward = 180 + Math.floor(dist(px, py, ped.x, ped.y) / 8);
      ms.sideJob = { kind, phase: 'pickup', ped, x: ped.x, y: ped.y, reward, label: 'Taxi fare — pick up ' + ped.name };
      ms.sideTimer = SIDEJOB.taxiPickupTime;
      return ms.sideJob;
    }
    // No fare nearby: fall through to a plain drop below.
  }
  if (kind === 'vigilante' && spawnThugCar) {
    // A thug's car is marked on the map: wreck it by ramming it at speed or
    // shooting it up, and the neighbourhood pays Rico for the favour.
    const car = spawnThugCar();
    ms.sideJob = { kind, car, x: car.x, y: car.y, reward: SIDEJOB.rewardVigilante, label: 'Vigilante — wreck the marked thug car' };
    ms.sideTimer = SIDEJOB.vigilanteTime;
    return ms.sideJob;
  }
  const tx = 300 + rnd() * 2400, ty = 300 + rnd() * 1700;
  const reward = kind === 'taxi' ? 120 + Math.floor(dist(px, py, tx, ty) / 10) : 150;
  ms.sideJob = { kind, x: tx, y: ty, reward, label: kind === 'taxi' ? 'Taxi fare — drive the passenger here' : 'Package drop — deliver here' };
  ms.sideTimer = 75;
  return ms.sideJob;
}
export function stepSideJob(ms, dt, player) {
  if (!ms.sideJob) return null;
  ms.sideTimer -= dt;
  const job = ms.sideJob;
  const px = player.inCar ? player.inCar.x : player.x;
  const py = player.inCar ? player.inCar.y : player.y;
  if (job.kind === 'taxi' && job.phase === 'pickup') {
    // The fare wanders while they wait, so the marker follows them.
    job.x = job.ped.x; job.y = job.ped.y;
    if (dist(px, py, job.ped.x, job.ped.y) < SIDEJOB.pickupR) {
      job.ped.alive = false; // they climb in and leave the sidewalk
      job.phase = 'drop';
      job.x = 300 + Math.random() * 2400; job.y = 300 + Math.random() * 1700;
      job.label = 'Taxi fare — drop ' + job.ped.name + ' at the marker';
      ms.sideTimer = SIDEJOB.taxiDropTime;
      return { pickedUp: job };
    }
  } else if (job.kind === 'vigilante') {
    // The marker tracks the thug car while it drives away from Rico.
    job.x = job.car.x; job.y = job.car.y;
    if (job.car.hp <= 0) {
      ms.sideJob = null;
      player.money += job.reward; player.score += job.reward;
      return { done: job };
    }
  } else if (dist(px, py, job.x, job.y) < 80) {
    ms.sideJob = null;
    player.money += job.reward; player.score += job.reward;
    return { done: job };
  }
  if (ms.sideTimer <= 0) { ms.sideJob = null; return { expired: true }; }
  return null;
}
