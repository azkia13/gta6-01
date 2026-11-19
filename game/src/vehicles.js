// Driving physics. `upgrades` (garage.js) is optional: engine tiers raise top speed
// and a nitro kit lets the driver hold Shift for a boost while charges remain.
import { CAR, WORLD, BIKE, VAN, clamp, dist, mulberry32 } from './config.js';
import { collideBuildings, isRoad } from './world.js';
import { carTopSpeed, hasNitro, useNitro } from './garage.js';
const CAR_COLORS = ['#e5534b', '#4fc3f7', '#f2c94c', '#e8e8e8', '#7ee787', '#ff9f43', '#c77dff', '#95a5a6'];
const BIKE_COLORS = ['#e5534b', '#ffd23f', '#4fc3f7', '#ff9f43', '#c77dff'];
const VAN_COLORS = ['#8a7a5e', '#5e7a8a', '#a86f4e', '#7a8a5e'];
const MODELS = ['Sedan', 'Coupe', 'Van', 'Taxi', 'Pickup', 'Sport'];
export function makeCar(x, y, angle, kind, color) {
  return {
    x, y, angle, speed: 0, kind: kind || 'traffic', color: color || CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
    model: MODELS[Math.floor(Math.random() * MODELS.length)], w: 46, h: 24, bike: false,
    stolen: false, occupied: false, driver: null, police: kind === 'police',
    targetAngle: angle, cruise: 90 + Math.random() * 70, honk: 0, stuck: 0, nitroT: 0,
  };
}
// The van: a boxy workhorse with the same shape as a car object (so
// entering, driving and stealing all work unchanged) but flagged van, so
// physics treats it as the slow, tough, wet-weather hauler it is.
export function makeVan(x, y, angle, kind) {
  return {
    x, y, angle, speed: 0, kind: kind || 'parked', color: VAN_COLORS[Math.floor(Math.random() * VAN_COLORS.length)],
    model: 'Van', w: 54, h: 28, bike: false, van: true,
    stolen: false, occupied: false, driver: null, police: false,
    targetAngle: angle, cruise: 70 + Math.random() * 30, honk: 0, stuck: 0, nitroT: 0,
  };
}
// Motorcycles ride on the same car object as everything else (entering,
// driving and stealing work unchanged) but carry the bike flag, so physics
// and rendering treat them as the nimble two-wheelers they are.
export function makeBike(x, y, angle) {
  return {
    x, y, angle, speed: 0, bike: true, model: 'Bike', w: 34, h: 14,
    kind: 'parked', color: BIKE_COLORS[Math.floor(Math.random() * BIKE_COLORS.length)],
    stolen: false, occupied: false, driver: null, police: false,
    targetAngle: angle, cruise: 0, honk: 0, stuck: 0, nitroT: 0,
  };
}
export function spawnTraffic(city, count, rnd) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const rx = city.roadsX[Math.floor(rnd() * city.roadsX.length)];
    const ry = city.roadsY[Math.floor(rnd() * city.roadsY.length)];
    const horizontal = rnd() < 0.5;
    // Every fifth car on the road is a van, trundling along slower than the rest.
    const mk = i % 5 === 4 ? makeVan : makeCar;
    const c = mk(horizontal ? rx + (rnd() - 0.5) * 600 : rx + (rnd() < 0.5 ? -22 : 22),
      horizontal ? ry + (rnd() < 0.5 ? -22 : 22) : ry + (rnd() - 0.5) * 600,
      horizontal ? (rnd() < 0.5 ? 0 : Math.PI) : (rnd() < 0.5 ? Math.PI / 2 : -Math.PI / 2), 'traffic');
    c.cruise = 80 + rnd() * 80;
    cars.push(c);
  }
  // Parked cars in lots and near the plaza for the player to steal.
  for (const lot of city.lots) {
    cars.push(makeCar(lot.x + 30, lot.y + 20, 0, 'parked'));
    cars.push(makeCar(lot.x + 90, lot.y + 20, 0, 'parked'));
  }
  // A parked van by the first lot — steal it for the tough, wet-weather ride.
  cars.push(makeVan(city.lots[0].x + 60, city.lots[0].y + 45, 0, 'parked'));
  cars.push(makeCar(1600, 800, 0, 'player', '#ffcf3f')); // Rico's own car, parked on the road by the plaza
  // Parked motorcycles at roadside spots around the city — faster than any
  // car off the line, and stealing one is a crime like any other.
  const bikeSpots = [[1640, 800, 0], [2040, 1240, Math.PI], [840, 1640, Math.PI / 2], [2840, 2040, 0]];
  for (const spot of bikeSpots) cars.push(makeBike(spot[0], spot[1], spot[2]));
  return cars;
}
function turnToward(car, target, dt, rate) {
  let d = target - car.angle;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  car.angle += clamp(d, -rate * dt, rate * dt);
}
export function stepTraffic(car, dt, city) {
  if (car.driver === 'player' || car.kind === 'parked') return;
  // A wrecked thug car (vigilante side job) stays where it died.
  if (car.thug && car.hp <= 0) return;
  // Follow the road: snap to nearest road axis, keep cruising, turn at junctions.
  const onH = Math.abs(car.y - nearestRoadY(city, car.y)) < WORLD.roadWidth / 2;
  const onV = Math.abs(car.x - nearestRoadX(city, car.x)) < WORLD.roadWidth / 2;
  if (onH && !onV) car.targetAngle = Math.abs(Math.sin(car.angle)) < 0.5 ? car.targetAngle : (Math.cos(car.angle) > 0 ? 0 : Math.PI);
  if (onV && !onH) car.targetAngle = Math.abs(Math.cos(car.angle)) < 0.5 ? car.targetAngle : (Math.sin(car.angle) > 0 ? Math.PI / 2 : -Math.PI / 2);
  if (onH && onV && Math.random() < 0.002) {
    car.targetAngle = [0, Math.PI / 2, Math.PI, -Math.PI / 2][Math.floor(Math.random() * 4)];
  }
  turnToward(car, car.targetAngle, dt, 1.6);
  car.speed += (car.cruise - car.speed) * Math.min(1, dt * 1.2);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (!collideBuildings(city, nx, ny, 22)) { car.x = nx; car.y = ny; }
  else { car.targetAngle += Math.PI / 2; car.speed *= 0.4; }
  if (car.x < 40 || car.x > WORLD.width - 40 || car.y < 40 || car.y > WORLD.height - 300) car.targetAngle += Math.PI;
}
function nearestRoadX(city, x) {
  let best = city.roadsX[0], bd = 1e9;
  for (const r of city.roadsX) if (Math.abs(x - r) < bd) { bd = Math.abs(x - r); best = r; }
  return best;
}
function nearestRoadY(city, y) {
  let best = city.roadsY[0], bd = 1e9;
  for (const r of city.roadsY) if (Math.abs(y - r) < bd) { bd = Math.abs(y - r); best = r; }
  return best;
}
export function stepPolice(car, dt, city, player) {
  const d = dist(car.x, car.y, player.x, player.y);
  const ramming = (player.wanted || 0) >= 4;
  // At wanted 4+ the police stop shadowing you and ram: they aim for a point
  // just past your side/rear (PIT-style) and run faster than normal pursuit.
  let tx = player.x, ty = player.y;
  if (ramming && player.inCar) {
    const side = Math.sin((car.x * 7 + car.y * 13) % Math.PI) > 0 ? 1 : -1;
    const px = Math.cos(player.inCar.angle), py = Math.sin(player.inCar.angle);
    tx = player.x + (-py * side * 26) - px * 30;
    ty = player.y + (px * side * 26) - py * 30;
  }
  const want = Math.atan2(ty - car.y, tx - car.x);
  turnToward(car, want, dt, ramming ? 2.9 : 2.2);
  const target = ramming ? 390 : (d > 260 ? 330 : 260);
  car.speed += (target - car.speed) * Math.min(1, dt * 1.5);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (!collideBuildings(city, nx, ny, 22)) { car.x = nx; car.y = ny; }
  else { car.angle += Math.PI / 3; car.speed *= 0.5; }
  return d;
}
export function stepDriving(car, dt, input, city, audio, upgrades, grip) {
  const ax = input.axis();
  const fwd = ax.y < 0, back = ax.y > 0;
  // Rain steals grip: the tyres accelerate slower and the steering answers
  // late. `grip` is 1 on dry roads (see weather.js gripFactor). A van's wide
  // tyres hold the wet road better, so it keeps half the grip the rain
  // would otherwise steal — and it is slower and tougher all round.
  const gripMul = grip == null ? 1 : (car.van ? 1 - (1 - grip) * (1 - VAN.rainGripKeep) : grip);
  // Bikes launch harder, turn sharper and run a higher top speed than cars;
  // garage engine upgrades apply to them exactly like they do to cars.
  const accel = CAR.accel * (car.bike ? BIKE.accelMul : 1) * (car.van ? VAN.accelMul : 1) * gripMul;
  const turnRate = CAR.turn * (car.bike ? BIKE.turnMul : 1) * gripMul;
  const topSpeed = (upgrades ? carTopSpeed(upgrades) : CAR.maxSpeed) + (car.bike ? BIKE.topBonus : 0) - (car.van ? VAN.topPenalty : 0);
  // Nitro: hold Shift while moving forward; each boost burns one charge.
  let boosting = false;
  if (upgrades && fwd && input.run() && car.speed > 40) {
    if (car.nitroT > 0) { boosting = true; car.nitroT -= dt; }
    else if (hasNitro(upgrades) && useNitro(upgrades)) { boosting = true; car.nitroT = 1.1; if (audio) audio.nitro(); }
  }
  if (fwd) car.speed += (boosting ? accel * 1.9 : accel) * dt;
  else if (back) car.speed -= (car.speed > 5 ? CAR.brake : accel * 0.5) * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 180 * dt);
  car.speed = clamp(car.speed, -CAR.reverse, boosting ? topSpeed + 170 : topSpeed);
  if (Math.abs(car.speed) > 8) {
    const steer = ax.x * turnRate * (car.speed >= 0 ? 1 : -1) * clamp(Math.abs(car.speed) / 120, 0.3, 1);
    car.angle += steer * dt;
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (!collideBuildings(city, nx, ny, 20)) { car.x = nx; car.y = ny; }
  else {
    if (Math.abs(car.speed) > 150 && audio) audio.crash();
    // A van's weight soaks up a crash: it bounces off walls half as hard.
    car.speed *= car.van ? -0.25 * VAN.bounceMul : -0.25;
  }
  car.x = clamp(car.x, 30, WORLD.width - 30);
  car.y = clamp(car.y, 30, WORLD.height - 30);
  if (audio) audio.engine(clamp(Math.abs(car.speed) / CAR.maxSpeed, 0, 1));
  return Math.abs(car.speed);
}
export function carHitsPed(car, ped) {
  return Math.abs(ped.x - car.x) < 34 && Math.abs(ped.y - car.y) < 26;
}
