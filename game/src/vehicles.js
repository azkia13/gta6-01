// Driving physics. `upgrades` (garage.js) is optional: engine tiers raise top speed
// and a nitro kit lets the driver hold Shift for a boost while charges remain.
import { CAR, WORLD, clamp, dist, mulberry32 } from './config.js';
import { collideBuildings, isRoad } from './world.js';
import { carTopSpeed, hasNitro, useNitro } from './garage.js';
const CAR_COLORS = ['#e5534b', '#4fc3f7', '#f2c94c', '#e8e8e8', '#7ee787', '#ff9f43', '#c77dff', '#95a5a6'];
const MODELS = ['Sedan', 'Coupe', 'Van', 'Taxi', 'Pickup', 'Sport'];
export function makeCar(x, y, angle, kind, color) {
  return {
    x, y, angle, speed: 0, kind: kind || 'traffic', color: color || CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
    model: MODELS[Math.floor(Math.random() * MODELS.length)], w: 46, h: 24,
    stolen: false, occupied: false, driver: null, police: kind === 'police',
    targetAngle: angle, cruise: 90 + Math.random() * 70, honk: 0, stuck: 0, nitroT: 0,
  };
}
export function spawnTraffic(city, count, rnd) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const rx = city.roadsX[Math.floor(rnd() * city.roadsX.length)];
    const ry = city.roadsY[Math.floor(rnd() * city.roadsY.length)];
    const horizontal = rnd() < 0.5;
    const c = makeCar(horizontal ? rx + (rnd() - 0.5) * 600 : rx + (rnd() < 0.5 ? -22 : 22),
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
  cars.push(makeCar(1600, 800, 0, 'player', '#ffcf3f')); // Rico's own car, parked on the road by the plaza
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
export function stepDriving(car, dt, input, city, audio, upgrades) {
  const ax = input.axis();
  const fwd = ax.y < 0, back = ax.y > 0;
  const topSpeed = upgrades ? carTopSpeed(upgrades) : CAR.maxSpeed;
  // Nitro: hold Shift while moving forward; each boost burns one charge.
  let boosting = false;
  if (upgrades && fwd && input.run() && car.speed > 40) {
    if (car.nitroT > 0) { boosting = true; car.nitroT -= dt; }
    else if (hasNitro(upgrades) && useNitro(upgrades)) { boosting = true; car.nitroT = 1.1; if (audio) audio.nitro(); }
  }
  if (fwd) car.speed += (boosting ? CAR.accel * 1.9 : CAR.accel) * dt;
  else if (back) car.speed -= (car.speed > 5 ? CAR.brake : CAR.accel * 0.5) * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 180 * dt);
  car.speed = clamp(car.speed, -CAR.reverse, boosting ? topSpeed + 170 : topSpeed);
  if (Math.abs(car.speed) > 8) {
    const steer = ax.x * CAR.turn * (car.speed >= 0 ? 1 : -1) * clamp(Math.abs(car.speed) / 120, 0.3, 1);
    car.angle += steer * dt;
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (!collideBuildings(city, nx, ny, 20)) { car.x = nx; car.y = ny; }
  else { if (Math.abs(car.speed) > 150 && audio) audio.crash(); car.speed *= -0.25; }
  car.x = clamp(car.x, 30, WORLD.width - 30);
  car.y = clamp(car.y, 30, WORLD.height - 30);
  if (audio) audio.engine(clamp(Math.abs(car.speed) / CAR.maxSpeed, 0, 1));
  return Math.abs(car.speed);
}
export function carHitsPed(car, ped) {
  return Math.abs(ped.x - car.x) < 34 && Math.abs(ped.y - car.y) < 26;
}
