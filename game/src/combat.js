// Combat: mouse-aimed shooting, punching, bullets, enemy thugs, muzzle flash.
import { dist, angleTo } from './config.js';
export function createCombat() {
  return { bullets: [], enemies: [], cooldown: 0, muzzle: 0, punchCd: 0 };
}
export function spawnEnemies(combat, x, y, count, kind) {
  combat.enemies = [];
  for (let i = 0; i < count; i++) {
    // The fixer (mission 7 finale) is a real boss: triple health, faster trigger
    // finger, and he holds his ground longer than his guards.
    const isFixer = kind === 'fixer' && i === 0;
    const ex = x + (Math.random() - 0.5) * 180, ey = y + (Math.random() - 0.5) * 180;
    const flankSide = i % 2 === 0 ? 1 : -1;
    combat.enemies.push({
      x: ex, y: ey,
      hp: isFixer ? 150 : 50, speed: isFixer ? 70 : 95 + Math.random() * 40, angle: 0,
      // A 'fixer' squad is one boss plus guards; other squads keep their kind.
      kind: kind === 'fixer' ? (isFixer ? 'fixer' : 'thug') : (kind || 'thug'),
      shootCd: isFixer ? 0.6 + Math.random() : 1 + Math.random() * 2, alive: true, flash: 0,
      // Flank side for the Don's guards (see stepCombat): each guard picks
      // a side of Rico to circle toward, so the squad cross-fires him.
      flank: flankSide, flankDist: 150 + Math.random() * 60,
      // Fixed flank bearing, set at spawn from where the guard stands
      // relative to the fight: the guard holds a point off Rico's shoulder
      // on this bearing instead of chasing a point that swings as it moves.
      flankAngle: Math.atan2(ey - y, ex - x) + flankSide * Math.PI / 2,
    });
  }
  return combat.enemies;
}
export function shoot(combat, px, py, angle, audio) {
  if (combat.cooldown > 0) return false;
  combat.cooldown = 0.28;
  combat.muzzle = 0.06;
  combat.bullets.push({ x: px + Math.cos(angle) * 22, y: py + Math.sin(angle) * 22, vx: Math.cos(angle) * 720, vy: Math.sin(angle) * 720, life: 0.9, friendly: true });
  if (audio) audio.gunshot();
  return true;
}
export function punch(combat, px, py, angle, peds, enemies, player, audio) {
  if (combat.punchCd > 0) return 0;
  combat.punchCd = 0.4;
  if (audio) audio.punch();
  let hits = 0;
  const hx = px + Math.cos(angle) * 30, hy = py + Math.sin(angle) * 30;
  for (const e of enemies) {
    if (e.alive && dist(hx, hy, e.x, e.y) < 34) { e.hp -= 25; e.flash = 0.15; hits++; }
  }
  for (const p of peds) {
    if (p.alive && dist(hx, hy, p.x, p.y) < 30) { p.hp -= 25; if (p.hp <= 0) { p.alive = false; hits++; } }
  }
  return hits;
}
export function stepCombat(combat, dt, city, player, peds, onEnemyDown, onPlayerHit, cars) {
  if (combat.cooldown > 0) combat.cooldown -= dt;
  if (combat.punchCd > 0) combat.punchCd -= dt;
  if (combat.muzzle > 0) combat.muzzle -= dt;
  // Bullets fly and hit enemies / peds / buildings.
  for (const b of combat.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0) continue;
    if (b.friendly) {
      for (const e of combat.enemies) {
        if (e.alive && dist(b.x, b.y, e.x, e.y) < 20) {
          e.hp -= 34; e.flash = 0.15; b.life = 0;
          if (e.hp <= 0) { e.alive = false; if (onEnemyDown) onEnemyDown(e); }
          break;
        }
      }
      if (b.life > 0) for (const p of peds) {
        if (p.alive && dist(b.x, b.y, p.x, p.y) < 16) {
          p.hp -= 34; b.life = 0;
          if (p.hp <= 0) { p.alive = false; if (onEnemyDown) onEnemyDown(p); }
          break;
        }
      }
      // Bullets can also wreck a marked thug car (vigilante side job): three
      // solid hits and it is done, no ramming required.
      if (b.life > 0 && cars) {
        for (const c of cars) {
          if (c.thug && c.hp > 0 && dist(b.x, b.y, c.x, c.y) < 26) {
            c.hp -= 1; b.life = 0;
            break;
          }
        }
      }
    } else if (dist(b.x, b.y, player.x, player.y) < 16 && !player.inCar) {
      b.life = 0;
      if (onPlayerHit) onPlayerHit(8);
    }
  }
  combat.bullets = combat.bullets.filter((b) => b.life > 0);
  // Enemies chase and shoot the player.
  for (const e of combat.enemies) {
    if (!e.alive) continue;
    if (e.flash > 0) e.flash -= dt;
    const d = dist(e.x, e.y, player.x, player.y);
    const a = angleTo(e.x, e.y, player.x, player.y);
    e.angle = a;
    if (e.kind === 'guard') {
      // The Don's guards flank instead of charging straight in: each one
      // circles toward a point off Rico's shoulder on its own fixed bearing
      // (set at spawn), so the squad shoots at him from two angles at once.
      // Standing still while they close in gets Rico cross-fired — but they
      // hold their distance instead of swarming him.
      const fx = player.x + Math.cos(e.flankAngle) * e.flankDist;
      const fy = player.y + Math.sin(e.flankAngle) * e.flankDist;
      const fa = angleTo(e.x, e.y, fx, fy);
      if (dist(e.x, e.y, fx, fy) > 40) { e.x += Math.cos(fa) * e.speed * dt; e.y += Math.sin(fa) * e.speed * dt; }
    } else if (d > 60) { e.x += Math.cos(a) * e.speed * dt; e.y += Math.sin(a) * e.speed * dt; }
    e.shootCd -= dt;
    if (e.shootCd <= 0 && d < 420 && !player.inCar) {
      e.shootCd = 1.6 + Math.random();
      combat.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, life: 1.1, friendly: false });
    }
    if (d < 30 && !player.inCar) { if (onPlayerHit) onPlayerHit(4 * dt * 10); }
  }
}
