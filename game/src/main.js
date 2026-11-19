// Porto Verde — boot, loop, screens, wanted/police, missions, save/load, shot staging.
// ?seed=N fixes the city. ?shot=chase|menu|street|mission stages that scene and sets
// window.__shotReady. window.__game exposes live state for playtesting.
import { WORLD, SAVE_KEY, BEST_KEY, POLICE, HELI, VIGILANTE, mulberry32, clamp, dist } from './config.js';
import { generateCity } from './world.js';
import { createPlayer, stepPlayer, tryEnterCar, exitCar, addWanted, damagePlayer } from './player.js';
import { spawnTraffic, stepTraffic, stepPolice, stepDriving, makeCar, carHitsPed } from './vehicles.js';
import { spawnPedestrians, stepPedestrians, nearestPed } from './pedestrians.js';
import { MISSIONS, createMissionState, currentMission, currentStep, startMission, missionObjectiveText, stepObjective, startSideJob, stepSideJob } from './missions.js';
import { createCombat, spawnEnemies, shoot, punch, stepCombat } from './combat.js';
import { createAudio } from './audio.js';
import { createInput, ACTION_START, ACTION_PAUSE, ACTION_ENTER, ACTION_MUTE, ACTION_GARAGE, ACTION_PUNCH, ACTION_CONTINUE, ACTION_LIGHTS } from './input.js';
import { createRenderer, SCREEN_MENU, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_BUSTED, SCREEN_WASTED, SCREEN_WIN } from './render.js';
import { UPGRADES, isNearGarage, buyUpgrade, refillNitro } from './garage.js';
import { createHeli, spawnHeli, stepHeli } from './heli.js';
import { darknessAt } from './daynight.js';
import { createWeather, stepWeather, gripFactor, setWeather, isRaining, weatherLabel } from './weather.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;
const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const input = createInput(canvas);
const renderer = createRenderer(canvas);

function newGameState() {
  const rnd = mulberry32(seed);
  const city = generateCity(seed);
  const player = createPlayer(1600, 1100);
  const cars = spawnTraffic(city, 16, rnd);
  const peds = spawnPedestrians(city, 34, rnd);
  return {
    city, player, cars, peds,
    combat: createCombat(),
    missionState: createMissionState(),
    pickups: [{ x: 1700, y: 1000, kind: 'health' }, { x: 900, y: 600, kind: 'cash' }, { x: 2400, y: 1500, kind: 'cash' }],
    police: [], roadblocks: [], heli: null, time: 0, clock: 8 * 60 + 15, toast: '', toastT: 0,
    weather: createWeather(),
    screen: SCREEN_MENU, best: readBest(), missionTarget: null, objectiveText: '',
    sideJobTimer: 12, enemiesSpawnedFor: -1, cratesSpawnedFor: -1,
    garageOpen: false, garageSel: 0, garageMsg: '', garageItems: UPGRADES, nearGarage: false,
    won: false, bustedCount: 0,
  };
}
let s = newGameState();
function readBest() { try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { return 0; } }
function saveBest(v) { try { window.localStorage.setItem(BEST_KEY, String(v)); } catch { /* storage off */ } }
function saveGame() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: s.player.money, score: s.player.score, mission: s.missionState.index,
      done: s.missionState.done, x: s.player.x, y: s.player.y, health: s.player.health,
      upgrades: s.player.upgrades,
    }));
  } catch { /* storage off */ }
}
function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function toast(msg, secs) { s.toast = msg; s.toastT = secs || 4; }
function announce(msg) { status.textContent = msg; }
function updateObjective() {
  s.objectiveText = missionObjectiveText(s.missionState);
  const st = currentStep(s.missionState);
  if (s.missionState.active && st && st.type === 'collect') {
    // Point the marker at the nearest crate still on the ground.
    let best = null, bd = 1e9;
    for (const pk of s.pickups) {
      if (pk.kind !== 'crate') continue;
      const d = dist(s.player.x, s.player.y, pk.x, pk.y);
      if (d < bd) { bd = d; best = pk; }
    }
    s.missionTarget = best ? { x: best.x, y: best.y } : null;
    return;
  }
  s.missionTarget = (s.missionState.active && st && (st.type === 'goto' || st.type === 'escape' || st.type === 'fight'))
    ? { x: st.x, y: st.y } : (s.missionState.sideJob ? { x: s.missionState.sideJob.x, y: s.missionState.sideJob.y } : null);
}
function startPlaying(fromSave) {
  if (fromSave) {
    const sv = loadSave();
    if (sv) {
      s.player.money = sv.money; s.player.score = sv.score; s.player.x = sv.x; s.player.y = sv.y;
      s.player.health = sv.health; s.missionState.index = sv.mission; s.missionState.done = sv.done;
      if (sv.upgrades) {
        // Keep the fresh shape (new fields stay defaulted) and restore the rest.
        Object.assign(s.player.upgrades, sv.upgrades);
        if (!Array.isArray(s.player.upgrades.owned)) s.player.upgrades.owned = [];
      }
      toast('Save loaded — welcome back, Rico.');
    }
  }
  s.screen = SCREEN_PLAY;
  audio.unlock();
  announce('Playing Porto Verde.');
}
function endMissionReward(m) {
  s.player.money += m.reward; s.player.score += m.reward * 2;
  toast('MISSION COMPLETE: ' + m.title + ' — +' + '$' + m.reward);
  audio.winJingle(); audio.pickup();
  saveGame();
  if (s.missionState.index >= MISSIONS.length && !s.won) {
    s.won = true; s.screen = SCREEN_WIN;
    if (s.player.score > s.best) { s.best = s.player.score; saveBest(s.best); }
    announce('Story complete!');
  }
}
function maybeSpawnEnemies() {
  const ms = s.missionState, st = currentStep(ms);
  if (!ms.active || !st || st.type !== 'fight') return;
  const key = ms.index * 10 + ms.step;
  if (s.enemiesSpawnedFor === key) return;
  s.enemiesSpawnedFor = key;
  const kind = ms.index === 8 ? 'don' : ms.index === 6 ? 'fixer' : 'thug';
  const spawned = spawnEnemies(s.combat, st.x, st.y, st.count || 2, kind);
  if (ms.index === 8 && spawned.length > 0) {
    // The Don is the boss: far tougher than his guards, who close in around him.
    spawned[0].kind = 'don'; spawned[0].hp = 220; spawned[0].speed = 80;
    for (let i = 1; i < spawned.length; i++) { spawned[i].kind = 'guard'; spawned[i].hp = 60; }
  }
  ms.killsThisStep = 0;
  toast('Hostiles at the marker — deal with them!');
}
function spawnRoadblock() {
  // Two police cars parked across the road ahead of the player, plus a barricade.
  const p = s.player;
  const ang = p.inCar ? p.inCar.angle : p.angle;
  const cx = clamp(p.x + Math.cos(ang) * 300, 120, WORLD.width - 120);
  const cy = clamp(p.y + Math.sin(ang) * 300, 120, WORLD.height - 120);
  const px = Math.cos(ang + Math.PI / 2), py = Math.sin(ang + Math.PI / 2);
  const c1 = makeCar(cx + px * 55, cy + py * 55, ang + Math.PI / 2, 'police', '#2f6fd0');
  const c2 = makeCar(cx - px * 55, cy - py * 55, ang + Math.PI / 2, 'police', '#2f6fd0');
  s.cars.push(c1, c2);
  s.roadblocks.push({ x: cx, y: cy, cars: [c1, c2] });
  toast('POLICE ROADBLOCK ahead — find another way around!');
  audio.crash();
}
function clearRoadblocks() {
  for (const rb of s.roadblocks) {
    for (const c of rb.cars) { const i = s.cars.indexOf(c); if (i >= 0) s.cars.splice(i, 1); }
  }
  s.roadblocks = [];
}
function wantedTick(dt) {
  const p = s.player;
  if (p.wanted > 0) {
    p.wantedTimer += dt;
    if (p.wantedTimer > 9) {
      // Decay only while police are far away / player is hidden — and four
      // times slower while the helicopter keeps its spotlight on Rico.
      const nearCop = s.police.some((c) => dist(c.x, c.y, p.x, p.y) < 320);
      if (!nearCop) { p.wanted -= 0.35 * dt * (s.heli ? 0.25 : 1); if (p.wanted < 0) p.wanted = 0; }
    }
    // Wanted 5 fields up to 4 pursuit cars; lower levels cap at 3.
    const want = Math.min(p.wanted >= 5 ? POLICE.maxCops : POLICE.maxCopsLow, Math.ceil(p.wanted));
    while (s.police.length < want) {
      const a = Math.random() * Math.PI * 2;
      const car = makeCar(p.x + Math.cos(a) * 700, p.y + Math.sin(a) * 700, 0, 'police', '#2f6fd0');
      car.cruise = 300; s.police.push(car); s.cars.push(car);
    }
    if (p.wanted >= POLICE.roadblockAt && s.roadblocks.length === 0) spawnRoadblock();
    if (p.wanted < POLICE.roadblockAt && s.roadblocks.length > 0) clearRoadblocks();
    // Five stars sends the helicopter up; it leaves when the heat drops.
    if (p.wanted >= HELI.atWanted && !s.heli) {
      s.heli = spawnHeli(createHeli(), p.x, p.y);
      toast('POLICE HELICOPTER overhead — the spotlight keeps the heat on you!');
      audio.crash();
    }
    if (p.wanted < HELI.atWanted && s.heli) s.heli = null;
  } else {
    for (const c of s.police) { const i = s.cars.indexOf(c); if (i >= 0) s.cars.splice(i, 1); }
    s.police = [];
    s.heli = null;
    if (s.roadblocks.length > 0) clearRoadblocks();
  }
}
function policeTick(dt) {
  const p = s.player;
  for (const car of s.police) {
    const d = stepPolice(car, dt, s.city, p);
    if (d < 46) {
      if (p.inCar) { p.inCar.speed *= 0.6; if (Math.abs(p.inCar.speed) > 120) { audio.crash(); } }
      else if (damagePlayer(p, 12 * dt * 10)) wasted();
      if (p.inCar && Math.abs(p.inCar.speed) < 25 && p.wanted >= 2 && Math.random() < dt * 0.4) busted();
    }
  }
}
function busted() {
  s.player.money = Math.max(0, s.player.money - 150);
  s.player.wanted = 0; s.bustedCount += 1;
  if (s.player.inCar) { s.player.inCar.driver = null; s.player.inCar = null; }
  s.player.x = 700; s.player.y = 700; s.player.health = 100;
  s.screen = SCREEN_BUSTED; audio.loseJingle(); audio.siren(false);
  announce('Busted by the police.');
}
function wasted() {
  s.player.money = Math.max(0, s.player.money - 150);
  s.player.wanted = 0;
  if (s.player.inCar) { s.player.inCar.driver = null; s.player.inCar = null; }
  s.player.x = 700; s.player.y = 700; s.player.health = 100;
  s.screen = SCREEN_WASTED; audio.loseJingle(); audio.siren(false);
  announce('Wasted.');
}
function ensureCrates() {
  const ms = s.missionState, st = currentStep(ms);
  if (!ms.active || !st || st.type !== 'collect') { s.cratesSpawnedFor = -1; return; }
  const key = ms.index * 10 + ms.step;
  if (s.cratesSpawnedFor === key) return;
  s.cratesSpawnedFor = key;
  for (const c of st.crates || []) s.pickups.push({ x: c.x, y: c.y, kind: 'crate' });
}
function spawnThugCar() {
  // The vigilante job's mark: a dark-red thug car that takes off down the
  // road, tough enough to need three solid hits before it is wrecked.
  const p = s.player;
  const a = Math.random() * Math.PI * 2;
  const car = makeCar(
    clamp(p.x + Math.cos(a) * 550, 120, WORLD.width - 120),
    clamp(p.y + Math.sin(a) * 550, 120, WORLD.height - 120),
    a, 'traffic', '#7a1f1f');
  car.thug = true; car.hp = VIGILANTE.thugHp; car.cruise = 150;
  s.cars.push(car);
  return car;
}
function vigilanteRamTick() {
  // Ramming the marked thug car at speed wrecks it a hit at a time — with a
  // short cooldown so one long scrape cannot count as three hits.
  const job = s.missionState.sideJob;
  if (!job || job.kind !== 'vigilante' || !job.car || job.car.hp <= 0) return;
  const p = s.player;
  if (!p.inCar) return;
  const car = p.inCar;
  if (Math.abs(car.speed) < VIGILANTE.ramSpeed) return;
  if (dist(car.x, car.y, job.car.x, job.car.y) > VIGILANTE.ramR) return;
  if (s.time - (job.lastRam || -9) < VIGILANTE.ramCooldown) return;
  job.lastRam = s.time;
  job.car.hp -= 1;
  const a = Math.atan2(job.car.y - car.y, job.car.x - car.x);
  job.car.x += Math.cos(a) * 46; job.car.y += Math.sin(a) * 46;
  car.speed *= -0.3;
  audio.crash();
  toast(job.car.hp > 0 ? 'Thug car hit — ' + job.car.hp + ' more to wreck it!' : 'Thug car wrecked!');
}
function syncWeatherChip() {
  // The DOM weather chip over the HUD (see game/index.html) mirrors the sky.
  const chip = document.getElementById('weather-chip');
  if (!chip) return;
  if (chip.dataset.state !== s.weather.state) {
    chip.dataset.state = s.weather.state;
    chip.textContent = weatherLabel(s.weather);
  }
}
function stepGame(dt) {
  s.time += dt; s.clock += dt * 0.5;
  if (s.toastT > 0) s.toastT -= dt;
  // The weather rolls on with the clock; rain patter follows its intensity.
  stepWeather(s.weather, dt, s.clock);
  syncWeatherChip();
  audio.rain(s.weather.intensity);
  const p = s.player;
  const actions = input.takeActions();
  if (actions & ACTION_MUTE) { const m = audio.toggleMute(); toast(m ? 'Sound muted (M to unmute)' : 'Sound on'); }
  if (actions & ACTION_LIGHTS) {
    p.headlightsOn = !p.headlightsOn;
    toast(p.headlightsOn ? 'Headlights on (H to switch off)' : 'Headlights off');
  }
  if (actions & ACTION_PAUSE) {
    if (s.garageOpen) { s.garageOpen = false; return; }
    s.screen = SCREEN_PAUSED; announce('Paused.'); return;
  }
  // Garage shop: G near the garage opens it; the world freezes while shopping.
  s.nearGarage = !p.inCar && isNearGarage(p);
  if (s.nearGarage) refillNitro(p.upgrades); // nitro refills free at the garage
  if (actions & ACTION_GARAGE) {
    if (s.garageOpen) { s.garageOpen = false; }
    else if (s.nearGarage) { s.garageOpen = true; s.garageSel = 0; s.garageMsg = ''; refillNitro(p.upgrades); audio.blip(); }
  }
  if (s.garageOpen) {
    for (let i = 0; i < UPGRADES.length; i++) {
      if (input.keys.has('Digit' + (i + 1))) {
        s.garageSel = i;
        const r = buyUpgrade(p.upgrades, p, UPGRADES[i].id);
        s.garageMsg = r.reason;
        if (r.ok) { audio.pickup(); saveGame(); }
        input.keys.delete('Digit' + (i + 1));
      }
    }
    return;
  }
  // Driving or walking. Rain steals grip from every car on the road — less
  // so with Rain Tires fitted (see weather.js gripFactor).
  if (p.inCar) {
    stepDriving(p.inCar, dt, input, s.city, audio, p.upgrades, gripFactor(s.weather, p.upgrades));
    p.x = p.inCar.x; p.y = p.inCar.y; p.angle = p.inCar.angle;
    if (actions & ACTION_ENTER) { exitCar(p, s.city); audio.engineOff(); }
  } else {
    stepPlayer(p, dt, input, s.city, s.cars, audio);
    p.aimAngle = Math.atan2(input.mouse.wy - p.y, input.mouse.wx - p.x);
    if (actions & ACTION_ENTER) {
      if (tryEnterCar(p, s.cars, audio)) { toast(p.inCar.stolen ? 'Car stolen! The cops noticed.' : 'In the car — drive!'); audio.blip(); }
    }
    if (input.takeClick()) shoot(s.combat, p.x, p.y, (p.aimAngle ?? p.angle), audio);
    if (actions & ACTION_PUNCH) {
      const hits = punch(s.combat, p.x, p.y, p.angle, s.peds, s.combat.enemies, p, audio);
      if (hits > 0) { addWanted(p, 1); toast('You started a fight!'); }
    }
  }
  // Mouse world position for aiming.
  const scale = renderer.view.scale;
  input.mouse.wx = (input.mouse.x / scale - renderer.view.ox * 1) + camX();
  input.mouse.wy = (input.mouse.y / scale) + camY();
  // Traffic, peds, police.
  for (const car of s.cars) if (car.kind === 'traffic') stepTraffic(car, dt, s.city);
  stepPedestrians(s.peds, dt, s.city, p, p.wanted > 0, isRaining(s.weather));
  vigilanteRamTick();
  wantedTick(dt);
  policeTick(dt);
  if (s.heli) stepHeli(s.heli, dt, p, isRaining(s.weather));
  audio.siren(p.wanted >= 2);
  // Car hits pedestrian = crime.
  if (p.inCar && Math.abs(p.inCar.speed) > 60) {
    for (const ped of s.peds) {
      if (ped.alive && carHitsPed(p.inCar, ped)) {
        ped.alive = false; addWanted(p, 1); audio.crash();
        toast('You hit a pedestrian! Wanted level up.');
      }
    }
  }
  // Pickups.
  ensureCrates();
  for (const pk of s.pickups) {
    if (dist(p.x, p.y, pk.x, pk.y) < 34) {
      if (pk.kind === 'health') { p.health = Math.min(100, p.health + 40); toast('Health restored +40'); }
      else if (pk.kind === 'crate') {
        s.missionState.collectThisStep = (s.missionState.collectThisStep || 0) + 1;
        const st = currentStep(s.missionState);
        toast('Crate secured (' + s.missionState.collectThisStep + '/' + (st ? st.count : 3) + ')');
        audio.crate();
      } else { p.money += 100; p.score += 100; toast('Found cash +$100'); }
      if (pk.kind !== 'crate') audio.pickup();
      s.pickups.splice(s.pickups.indexOf(pk), 1); break;
    }
  }
  // Missions.
  maybeSpawnEnemies();
  if (actions & ACTION_START) {
    const m = currentMission(s.missionState);
    if (m && !s.missionState.active) {
      startMission(s.missionState);
      toast(m.intro, 6); audio.blip();
    }
  }
  const res = stepObjective(s.missionState, p, endMissionReward);
  if (res === 'step') {
    audio.pickup(); toast('Objective done — next step!');
    // A step that needs heat (mission 7 escape) brings the heat with it.
    const st = currentStep(s.missionState);
    if (st && st.minWanted && p.wanted < st.minWanted) {
      addWanted(p, st.minWanted - p.wanted);
      toast('The fixer called the cops — lose them at the hideout!');
    }
  }
  // Side jobs.
  s.sideJobTimer -= dt;
  if (s.sideJobTimer <= 0 && !s.missionState.sideJob) {
    startSideJob(s.missionState, p, Math.random, null, s.peds, () => spawnThugCar());
    if (s.missionState.sideJob) toast('SIDE JOB: ' + s.missionState.sideJob.label + ' — ' + '$' + s.missionState.sideJob.reward);
    s.sideJobTimer = 25;
  }
  const sj = stepSideJob(s.missionState, dt, p);
  if (sj && sj.pickedUp) { toast('Passenger aboard — drop them at the marker!'); audio.sideJobJingle(); }
  if (sj && sj.done) { toast('Side job done +' + '$' + sj.done.reward); audio.sideJobJingle(); audio.pickup(); }
  if (sj && sj.expired) toast('Side job expired.');
  // Combat.
  stepCombat(s.combat, dt, s.city, p, s.peds, (e) => {
    // Only real enemies count toward a fight step: a pedestrian caught by a
    // stray bullet is a crime, not a mission kill.
    if (!e.kind) return;
    s.missionState.killsThisStep = (s.missionState.killsThisStep || 0) + 1;
    p.kills += 1; p.score += 50;
    if (e.kind === 'thug' || e.kind === 'fixer' || e.kind === 'don' || e.kind === 'guard') addWanted(p, 1);
  }, (dmg) => { if (damagePlayer(p, dmg)) wasted(); }, s.cars);
  updateObjective();
  if (p.health <= 0) wasted();
  if (Math.floor(s.time * 2) % 120 === 0) saveGame();
}
function camX() {
  const p = s.player;
  const cx = p.inCar ? p.inCar.x : p.x;
  return Math.max(0, Math.min(WORLD.width - 1280, cx - 640));
}
function camY() {
  const p = s.player;
  const cy = p.inCar ? p.inCar.y : p.y;
  return Math.max(0, Math.min(WORLD.height - 720, cy - 360));
}
function handleMenuActions() {
  const actions = input.takeActions();
  if (actions & ACTION_MUTE) audio.toggleMute();
  if (actions & ACTION_START || input.takeClick()) startPlaying(false);
  if (actions & ACTION_CONTINUE) startPlaying(true); // Continue from save
}
function handleEndActions() {
  const actions = input.takeActions();
  if (actions & ACTION_START || input.takeClick()) {
    s.screen = SCREEN_PLAY; announce('Back on the street.');
  }
}
const STEP = 1 / 60, MAX_FRAME = 0.25;
let acc = 0, last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  acc += Math.min((now - last) / 1000, MAX_FRAME);
  last = now;
  if (s.screen === SCREEN_MENU) handleMenuActions();
  else if (s.screen === SCREEN_PLAY) {
    while (acc >= STEP) { stepGame(STEP); acc -= STEP; if (s.screen !== SCREEN_PLAY) { acc = 0; break; } }
  } else if (s.screen === SCREEN_PAUSED) {
    const a = input.takeActions();
    if (a & (ACTION_PAUSE | ACTION_START)) { s.screen = SCREEN_PLAY; announce('Playing.'); }
    acc = 0;
  } else handleEndActions();
  renderer.draw(s, s.screen, s.best);
  if (s.player.score > s.best) { s.best = s.player.score; saveBest(s.best); }
}
// ---- Screenshot staging (deterministic, seeded) ----
function stageShot(name) {
  const rnd = mulberry32(seed);
  if (name === 'menu') { s.screen = SCREEN_MENU; updateObjective(); }
  else if (name === 'street') {
    // Old Town in the rain: Rico on foot in the cobbled plaza, mission 8 live.
    s.screen = SCREEN_PLAY; s.player.x = 590; s.player.y = 250;
    s.clock = 16 * 60 + 30;
    setWeather(s.weather, 'rain');
    s.player.money = 3200; s.player.score = 3200; s.player.wanted = 0;
    s.missionState.active = true; s.missionState.index = 7; s.missionState.step = 1;
    s.missionState.collectThisStep = 1;
    for (const c of currentStep(s.missionState).crates) s.pickups.push({ x: c.x, y: c.y, kind: 'crate' });
    s.cratesSpawnedFor = 71;
    updateObjective();
  } else if (name === 'chase') {
    s.screen = SCREEN_PLAY;
    // Night storm chase: headlights on, wanted 4, roadblock ahead, rain falling.
    s.clock = 22 * 60;
    setWeather(s.weather, 'storm');
    const car = s.cars.find((c) => c.kind === 'player');
    s.player.inCar = car; car.driver = 'player'; car.occupied = true; car.speed = 300;
    car.x = 1600; car.y = 1200; car.angle = 0;
    s.player.x = car.x; s.player.y = car.y;
    s.player.wanted = 4; s.player.money = 4200; s.player.score = 4200;
    s.player.headlightsOn = true; // the chase runs on headlights in the storm
    s.missionState.active = true; s.missionState.index = 3; s.missionState.step = 1;
    for (let i = 0; i < 2; i++) {
      const pc = makeCar(1380 - i * 120, 1200 + (i % 2 ? 40 : -40), 0, 'police', '#2f6fd0');
      s.police.push(pc); s.cars.push(pc);
    }
    // Roadblock across the road ahead of Rico (wanted 4).
    const rb1 = makeCar(1900, 1200 - 55, Math.PI / 2, 'police', '#2f6fd0');
    const rb2 = makeCar(1900, 1200 + 55, Math.PI / 2, 'police', '#2f6fd0');
    s.cars.push(rb1, rb2);
    s.roadblocks.push({ x: 1900, y: 1200, cars: [rb1, rb2] });
    updateObjective();
  } else if (name === 'mission') {
    // Mission 8 "Storm Warning" in Old Town: Rico at the church, rain falling.
    s.screen = SCREEN_PLAY;
    s.clock = 15 * 60;
    setWeather(s.weather, 'rain');
    s.player.x = 605; s.player.y = 615; s.player.money = 2600; s.player.score = 2600;
    s.missionState.active = true; s.missionState.index = 7; s.missionState.step = 0;
    s.missionState.collectThisStep = 0;
    updateObjective();
  }
  updateObjective();
  syncWeatherChip();
  let painted = 0;
  const paint = () => {
    renderer.draw(s, s.screen, s.best);
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  };
  requestAnimationFrame(paint);
}
window.__game = {
  get state() { return s; },
  get screen() { return s.screen; },
  start: () => startPlaying(false),
  continue: () => startPlaying(true),
  startMission: () => { startMission(s.missionState); updateObjective(); },
  teleport: (x, y) => { s.player.x = x; s.player.y = y; if (s.player.inCar) { s.player.inCar.x = x; s.player.inCar.y = y; } },
  setWanted: (n) => { s.player.wanted = n; },
  enterNearestCar: () => tryEnterCar(s.player, s.cars, audio),
  openGarage: () => {
    if (!isNearGarage(s.player) || s.player.inCar) return false;
    s.garageOpen = true; s.garageSel = 0; s.garageMsg = ''; refillNitro(s.player.upgrades);
    return true;
  },
  closeGarage: () => { s.garageOpen = false; },
  buyUpgrade: (id) => {
    const r = buyUpgrade(s.player.upgrades, s.player, id);
    s.garageMsg = r.reason;
    if (r.ok) saveGame();
    return r;
  },
  get upgrades() { return s.player.upgrades; },
  get roadblocks() { return s.roadblocks; },
  get heli() { return s.heli; },
  get clock() { return s.clock; },
  get darkness() { return darknessAt(s.clock); },
  get weather() { return s.weather; },
  setWeather: (state) => setWeather(s.weather, state),
  // Start a side job on demand (playtesting): 'taxi' | 'package' | 'vigilante'.
  startSideJob: (kind) => startSideJob(s.missionState, s.player, Math.random, kind || null, s.peds, () => spawnThugCar()),
  get headlights() { return s.player.headlightsOn; },
  setClock: (mins) => { s.clock = mins; },
  newGame: () => { s = newGameState(); updateObjective(); },
};
updateObjective();
if (shot) stageShot(shot);
else {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && s.screen === SCREEN_PLAY) { s.screen = SCREEN_PAUSED; announce('Paused.'); }
  });
  announce('Porto Verde. Press Enter to start.');
  requestAnimationFrame(frame);
}
