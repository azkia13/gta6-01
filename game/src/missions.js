// Story missions for Porto Verde + free-roam side jobs (taxi fares, package drops).
// Rico Vega, a driver-for-hire, is pulled back into the fixer game by his old contact
// Mama Luz. Five story missions, then the finale pays out and the story completes.
import { dist } from './config.js';
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
    id: 5, title: 'King of Porto Verde', reward: 2500,
    intro: 'Mama Luz: "One last job, Rico. The fixer who betrayed us is at the north docks with his guards. End it — then the city is yours."',
    steps: [
      { type: 'fight', label: 'Defeat the fixer and his guards (3)', x: 2600, y: 420, r: 150, count: 3 },
      { type: 'goto', label: 'Meet Mama Luz at the plaza — story complete', x: 1600, y: 1100, r: 90 },
    ],
  },
];
export function createMissionState() {
  return { index: 0, step: 0, active: false, done: 0, message: '', sideJob: null, sideTimer: 0, enemies: [] };
}
export function currentMission(ms) { return MISSIONS[ms.index] || null; }
export function currentStep(ms) {
  const m = currentMission(ms);
  return m ? m.steps[ms.step] : null;
}
export function startMission(ms) {
  const m = currentMission(ms);
  if (!m) return null;
  ms.active = true; ms.step = 0; ms.message = m.intro;
  return m;
}
export function missionObjectiveText(ms) {
  const m = currentMission(ms);
  if (!m) return 'Story complete — free roam!';
  if (!ms.active) return 'Press ENTER to start: ' + m.title;
  const s = currentStep(ms);
  return 'Mission ' + m.id + ' — ' + m.title + ': ' + (s ? s.label : '');
}
export function stepObjective(ms, player, onComplete) {
  // Returns 'mission-complete' | 'step' | null. Caller handles rewards.
  const m = currentMission(ms);
  if (!m || !ms.active) return null;
  const s = currentStep(ms);
  if (!s) return null;
  const px = player.inCar ? player.inCar.x : player.x;
  const py = player.inCar ? player.inCar.y : player.y;
  if (s.type === 'goto' || s.type === 'escape') {
    if (dist(px, py, s.x, s.y) < s.r) return advance(ms, onComplete);
  }
  if (s.type === 'steal') {
    if (player.inCar && player.inCar.stolen) return advance(ms, onComplete);
  }
  if (s.type === 'fight') {
    if ((ms.killsThisStep || 0) >= (s.count || 1)) return advance(ms, onComplete);
  }
  return null;
}
function advance(ms, onComplete) {
  const m = currentMission(ms);
  ms.step += 1; ms.killsThisStep = 0;
  if (ms.step >= m.steps.length) {
    ms.done += 1; ms.active = false; ms.index += 1;
    if (onComplete) onComplete(m);
    return 'mission-complete';
  }
  return 'step';
}
export function startSideJob(ms, player, rnd) {
  if (ms.sideJob) return null;
  const kinds = ['taxi', 'package'];
  const kind = kinds[Math.floor(rnd() * kinds.length)];
  const px = player.x, py = player.y;
  const tx = 300 + rnd() * 2400, ty = 300 + rnd() * 1700;
  const reward = kind === 'taxi' ? 120 + Math.floor(dist(px, py, tx, ty) / 10) : 150;
  ms.sideJob = { kind, x: tx, y: ty, reward, label: kind === 'taxi' ? 'Taxi fare — drive the passenger here' : 'Package drop — deliver here' };
  ms.sideTimer = 75;
  return ms.sideJob;
}
export function stepSideJob(ms, dt, player) {
  if (!ms.sideJob) return null;
  ms.sideTimer -= dt;
  const px = player.inCar ? player.inCar.x : player.x;
  const py = player.inCar ? player.inCar.y : player.y;
  if (dist(px, py, ms.sideJob.x, ms.sideJob.y) < 80) {
    const job = ms.sideJob; ms.sideJob = null;
    player.money += job.reward; player.score += job.reward;
    return { done: job };
  }
  if (ms.sideTimer <= 0) { ms.sideJob = null; return { expired: true }; }
  return null;
}
