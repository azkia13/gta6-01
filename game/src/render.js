// Drawing only: camera, city, cars, people, HUD with minimap, menus, markers.
import { WORLD, PALETTE, FONT, fmtMoney, fmtClock } from './config.js';
import { darknessAt, darknessWithWeather, skyOverlay, headlightBeam, lampPositions, phaseName } from './daynight.js';
import { drawRain, stormDarkness, weatherLabel, isRaining } from './weather.js';
export const SCREEN_MENU = 'menu', SCREEN_PLAY = 'play', SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted', SCREEN_WASTED = 'wasted', SCREEN_WIN = 'win';
const BUILDING_COLORS = ['#c98a5e', '#7fa3c9', '#e0c06a', '#9b7ec2', '#8a7a5e', '#a86f4e'];
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { w: 1280, h: 720, scale: 1, ox: 0, oy: 0 };
  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / 1280, canvas.height / 720);
    view.w = canvas.width / view.scale; view.h = canvas.height / view.scale;
    view.ox = (canvas.width / view.scale - 1280) / 2;
    view.oy = (canvas.height / view.scale - 720) / 2;
  }
  resize();
  window.addEventListener('resize', resize);
  function text(s, x, y, size, color, align, bold) {
    ctx.font = (bold ? 'bold ' : '') + size + 'px ' + FONT;
    ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.textBaseline = 'top';
    ctx.fillText(s, x, y);
  }
  function drawCar(c) {
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-24, -13, 48, 26);
    if (c.bike) {
      // Motorcycle: two wheels, slim frame, rider, single headlight.
      ctx.fillStyle = '#15181d';
      ctx.beginPath(); ctx.arc(-13, 0, 6, 0, Math.PI * 2); ctx.arc(13, 0, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c.color; ctx.fillRect(-14, -4, 28, 8);
      ctx.fillStyle = '#20242c'; ctx.fillRect(1, -3, 9, 6);
      ctx.fillStyle = '#e8b06a'; ctx.beginPath(); ctx.arc(-2, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff8c9'; ctx.fillRect(14, -2, 3, 4);
      ctx.restore();
    } else if (c.van) {
      // The van: a longer, boxier body with a cab window and a cargo stripe.
      ctx.fillStyle = (c.thug && c.hp <= 0) ? '#5a5f66' : c.color;
      ctx.fillRect(-27, -14, 54, 28);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(10, -12, 12, 24);
      ctx.fillStyle = '#20242c'; ctx.fillRect(-24, -14, 6, 5); ctx.fillRect(-24, 9, 6, 5); ctx.fillRect(20, -14, 6, 5); ctx.fillRect(20, 9, 6, 5);
      ctx.fillStyle = '#fff8c9';
      ctx.fillRect(24, -10, 3, 4); ctx.fillRect(24, 6, 3, 4);
      ctx.restore();
    } else {
      ctx.fillStyle = (c.thug && c.hp <= 0) ? '#5a5f66' : (c.police ? '#2f6fd0' : c.color);
      ctx.fillRect(-23, -12, 46, 24);
      ctx.fillStyle = c.police ? '#e8e8e8' : 'rgba(255,255,255,0.85)';
      ctx.fillRect(-6, -10, 14, 20);
      ctx.fillStyle = '#20242c'; ctx.fillRect(-20, -12, 6, 5); ctx.fillRect(-20, 7, 6, 5); ctx.fillRect(16, -12, 6, 5); ctx.fillRect(16, 7, 6, 5);
      if (c.police) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(-2, -12, 6, 24); }
      ctx.fillStyle = '#fff8c9';
      ctx.fillRect(20, -9, 3, 4); ctx.fillRect(20, 5, 3, 4);
      ctx.restore();
    }
    if (c.kind === 'parked' || c.kind === 'player') {
      ctx.fillStyle = 'rgba(255,210,63,0.9)';
      ctx.font = 'bold 11px ' + FONT; ctx.textAlign = 'center';
      ctx.fillText(c.kind === 'player' ? 'YOUR CAR' : (c.bike ? 'BIKE — E' : 'E — STEAL'), c.x, c.y - 30);
    }
    // The vigilante job's mark: a red tag over the thug car, greyed out once wrecked.
    if (c.thug) {
      ctx.fillStyle = c.hp > 0 ? 'rgba(255,80,60,0.95)' : 'rgba(180,180,180,0.9)';
      ctx.font = 'bold 11px ' + FONT; ctx.textAlign = 'center';
      ctx.fillText(c.hp > 0 ? 'THUG CAR' : 'WRECKED', c.x, c.y - 32);
    }
  }
  // Night lighting, drawn in world space after the entities: street lamps pool
  // light at the junctions and every moving car throws a headlight cone.
  // A storm darkens the sky on top of the night, so the lamps burn brighter
  // under it — and Rico's own headlights (H) throw a beam even in daylight.
  function drawNightLights(s) {
    const d = darknessWithWeather(s.clock, s.weather);
    const pCar = s.player.inCar;
    if (d < 0.25 && !(s.player.headlightsOn && pCar)) return;
    if (d >= 0.25) {
      const lamps = lampPositions(s.city);
      ctx.fillStyle = 'rgba(255,214,120,' + (d * 0.16).toFixed(3) + ')';
      for (const lamp of lamps) { ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 46, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#ffe9a8';
      for (const lamp of lamps) { ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 4, 0, Math.PI * 2); ctx.fill(); }
      for (const c of s.cars) {
        if (c.kind === 'parked') continue;
        const fx = c.x + Math.cos(c.angle) * (c.bike ? 16 : 24);
        const fy = c.y + Math.sin(c.angle) * (c.bike ? 16 : 24);
        headlightBeam(ctx, fx, fy, c.angle, c.bike ? 190 : 250, c.bike ? 34 : 52);
      }
      return;
    }
    // Daylight with the headlights switched on: just Rico's own beam.
    const fx = pCar.x + Math.cos(pCar.angle) * 24;
    const fy = pCar.y + Math.sin(pCar.angle) * 24;
    headlightBeam(ctx, fx, fy, pCar.angle, 250, 52);
  }
  function drawWorld(s) {
    const { city } = s;
    ctx.fillStyle = PALETTE.grass; ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    // Grass variation patches.
    ctx.fillStyle = PALETTE.grass2;
    for (let i = 0; i < 40; i++) {
      const gx = (i * 733) % WORLD.width, gy = (i * 491) % (WORLD.height - 300);
      ctx.fillRect(gx, gy, 180, 120);
    }
    // Marina District ground: teal yard tint under the south-east docks area,
    // drawn before roads and buildings so they stay on top of it.
    if (city.marina) {
      const m = city.marina;
      ctx.fillStyle = PALETTE.marinaWater;
      ctx.fillRect(m.x, m.y, m.w, m.h);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      for (let i = 0; i < 8; i++) ctx.fillRect(m.x + 40 + i * 90, m.y + 60 + (i % 3) * 120, 60, 4);
    }
    // Old Town district ground: cobbled quarter tint under the north-west
    // blocks, drawn before roads and buildings so they stay on top of it.
    if (city.oldTown) {
      const o = city.oldTown;
      ctx.fillStyle = PALETTE.cobble;
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = PALETTE.cobble2;
      for (const lane of o.lanes) ctx.fillRect(lane.x, lane.y, lane.w, lane.h);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      for (let i = 0; i < 30; i++) ctx.fillRect(o.x + 20 + (i * 137) % o.w, o.y + 16 + (i * 89) % o.h, 46, 4);
      // Cobble plaza with a fountain ring at its heart.
      ctx.fillStyle = '#b3a98f'; ctx.fillRect(o.plaza.x, o.plaza.y, o.plaza.w, o.plaza.h);
      ctx.fillStyle = '#7fb3d9'; ctx.beginPath(); ctx.arc(o.plaza.x + 110, o.plaza.y + 70, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#cbb98f'; ctx.beginPath(); ctx.arc(o.plaza.x + 110, o.plaza.y + 70, 14, 0, Math.PI * 2); ctx.fill();
    }
    // Parks.
    for (const pk of city.parks) {
      ctx.fillStyle = PALETTE.park; ctx.fillRect(pk.x, pk.y, pk.w, pk.h);
      ctx.fillStyle = '#3f7a34';
      for (let i = 0; i < pk.trees; i++) {
        ctx.beginPath(); ctx.arc(pk.x + 20 + ((i * 67) % pk.w), pk.y + 20 + ((i * 43) % pk.h), 10, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Beach + sea + pier.
    ctx.fillStyle = PALETTE.sand; ctx.fillRect(0, city.beach.y, WORLD.width, 260);
    ctx.fillStyle = PALETTE.sea; ctx.fillRect(0, city.beach.y + 190, WORLD.width, 70);
    ctx.fillStyle = PALETTE.sea2;
    for (let i = 0; i < 12; i++) ctx.fillRect((i * 271) % WORLD.width, city.beach.y + 200 + (i % 3) * 18, 90, 5);
    ctx.fillStyle = PALETTE.pier; ctx.fillRect(city.pier.x, city.pier.y, city.pier.w, city.pier.h);
    ctx.fillStyle = '#6d4f36';
    for (let i = 0; i < 8; i++) ctx.fillRect(city.pier.x + 8, city.pier.y + 12 + i * 26, city.pier.w - 16, 4);
    // Roads.
    ctx.fillStyle = PALETTE.road;
    for (const rx of city.roadsX) ctx.fillRect(rx - WORLD.roadWidth / 2, 0, WORLD.roadWidth, city.beach.y);
    for (const ry of city.roadsY) ctx.fillRect(0, ry - WORLD.roadWidth / 2, WORLD.width, WORLD.roadWidth);
    ctx.strokeStyle = PALETTE.roadLine; ctx.lineWidth = 3; ctx.setLineDash([26, 22]);
    ctx.beginPath();
    for (const rx of city.roadsX) { ctx.moveTo(rx, 0); ctx.lineTo(rx, city.beach.y); }
    for (const ry of city.roadsY) { ctx.moveTo(0, ry); ctx.lineTo(WORLD.width, ry); }
    ctx.stroke(); ctx.setLineDash([]);
    // Sidewalks.
    ctx.fillStyle = 'rgba(185,179,164,0.5)';
    for (const rx of city.roadsX) { ctx.fillRect(rx - WORLD.roadWidth / 2 - 10, 0, 10, city.beach.y); ctx.fillRect(rx + WORLD.roadWidth / 2, 0, 10, city.beach.y); }
    // Street props: red hydrants on the junction corners, wooden benches in
    // the parks and plazas.
    for (const pr of city.props || []) {
      if (pr.kind === 'hydrant') {
        ctx.fillStyle = '#c22e2e'; ctx.fillRect(pr.x - 4, pr.y - 5, 8, 10);
        ctx.fillStyle = '#e8e8e8'; ctx.fillRect(pr.x - 3, pr.y - 8, 6, 3);
      } else {
        ctx.fillStyle = '#7a5a34'; ctx.fillRect(pr.x - 14, pr.y - 4, 28, 8);
        ctx.fillStyle = '#5e4426'; ctx.fillRect(pr.x - 14, pr.y - 10, 28, 4);
        ctx.fillRect(pr.x - 12, pr.y + 4, 3, 5); ctx.fillRect(pr.x + 9, pr.y + 4, 3, 5);
      }
    }
    // Plaza.
    ctx.fillStyle = '#cbb98f'; ctx.fillRect(city.plaza.x, city.plaza.y, city.plaza.w, city.plaza.h);
    ctx.fillStyle = '#7fb3d9'; ctx.beginPath(); ctx.arc(city.plaza.x + 120, city.plaza.y + 120, 34, 0, Math.PI * 2); ctx.fill();
    // Buildings with roofs, shadows and signs.
    for (const b of city.buildings) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = BUILDING_COLORS[b.color]; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(b.x, b.y, b.w, 10);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      const cols = Math.max(2, Math.floor(b.w / 26)), rows = Math.max(2, Math.floor(b.h / 26));
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) ctx.fillRect(b.x + 8 + i * 26, b.y + 16 + j * 26, 12, 12);
      if (b.w > 90) { ctx.fillStyle = '#2c2f36'; ctx.font = 'bold 13px ' + FONT; ctx.textAlign = 'center'; ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 - 7); }
      if (b.church) {
        // The Old Town church: bell tower, tiled roof and a cross on top.
        ctx.fillStyle = PALETTE.churchRoof;
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + b.w / 2, b.y - 26); ctx.lineTo(b.x + b.w, b.y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = PALETTE.church; ctx.fillRect(b.x + b.w - 34, b.y - 58, 26, 58);
        ctx.fillStyle = PALETTE.churchRoof; ctx.beginPath(); ctx.moveTo(b.x + b.w - 38, b.y - 58); ctx.lineTo(b.x + b.w - 21, b.y - 76); ctx.lineTo(b.x + b.w - 4, b.y - 58); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffd23f'; ctx.fillRect(b.x + b.w - 23, b.y - 96, 4, 18); ctx.fillRect(b.x + b.w - 28, b.y - 90, 14, 4);
        ctx.fillStyle = '#2c2f36'; ctx.beginPath(); ctx.arc(b.x + b.w - 21, b.y - 44, 6, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Old Town district label, pinned to its north-west corner.
    if (city.oldTown) {
      const o = city.oldTown;
      ctx.fillStyle = 'rgba(10,14,20,0.65)'; ctx.fillRect(o.x + 16, o.y + 12, 170, 34);
      ctx.fillStyle = '#e8b06a'; ctx.font = 'bold 22px ' + FONT; ctx.textAlign = 'left';
      ctx.fillText('OLD TOWN', o.x + 28, o.y + 20);
    }
    // Hospital cross.
    ctx.fillStyle = '#e8e8e8'; ctx.fillRect(city.hospital.x, city.hospital.y, city.hospital.w, city.hospital.h);
    ctx.fillStyle = '#e5534b'; ctx.fillRect(city.hospital.x + 88, city.hospital.y + 30, 24, 80); ctx.fillRect(city.hospital.x + 58, city.hospital.y + 60, 84, 24);
    // Marina District (south-east): docks, moored boats, district label.
    if (city.marina) {
      const m = city.marina;
      for (const d of m.docks) {
        ctx.fillStyle = PALETTE.pier; ctx.fillRect(d.x, d.y, d.w, d.h);
        ctx.fillStyle = '#6d4f36';
        for (let i = 0; i < Math.floor(d.h / 26); i++) ctx.fillRect(d.x + 6, d.y + 10 + i * 26, d.w - 12, 4);
      }
      for (const b of m.boats) {
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.angle);
        ctx.fillStyle = PALETTE.boatHull;
        ctx.beginPath(); ctx.moveTo(-b.w / 2, -b.h / 2); ctx.lineTo(b.w / 2, -b.h / 2); ctx.lineTo(b.w / 2 - 10, b.h / 2); ctx.lineTo(-b.w / 2 + 10, b.h / 2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = PALETTE.boatCabin; ctx.fillRect(-b.w / 4, -b.h / 4, b.w / 2, b.h / 2);
        ctx.restore();
      }
      ctx.fillStyle = 'rgba(10,14,20,0.65)'; ctx.fillRect(m.x + 20, m.y + 16, 150, 34);
      ctx.fillStyle = '#7ee8d8'; ctx.font = 'bold 22px ' + FONT; ctx.textAlign = 'left';
      ctx.fillText('MARINA', m.x + 32, m.y + 24);
    }
  }
  function drawMarker(s) {
    const t = s.missionTarget;
    if (!t) return;
    const pulse = 1 + Math.sin(s.time * 4) * 0.15;
    ctx.save(); ctx.translate(t.x, t.y);
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.moveTo(0, -44); ctx.lineTo(10, -24); ctx.lineTo(-10, -24); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawEntities(s) {
    for (const car of s.cars) drawCar(car);
    for (const p of s.peds) {
      if (!p.alive) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(p.x, p.y + 8, 9, 0, Math.PI * 2); ctx.fill();
      // An umbrella over the pedestrian when the rain is falling.
      if (p.umbrella) {
        ctx.strokeStyle = '#3a3f46'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(p.x, p.y - 4); ctx.lineTo(p.x, p.y - 16); ctx.stroke();
        ctx.fillStyle = '#e5534b';
        ctx.beginPath(); ctx.arc(p.x, p.y - 16, 12, Math.PI, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#f4f1e6'; ctx.fillRect(p.x - 1, p.y - 30, 2, 4);
      }
      ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2c2f36'; ctx.beginPath(); ctx.arc(p.x + Math.cos(p.angle) * 4, p.y + Math.sin(p.angle) * 4, 4, 0, Math.PI * 2); ctx.fill();
    }
    for (const e of s.combat.enemies) {
      if (!e.alive) continue;
      ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#8c2f2f';
      ctx.beginPath(); ctx.arc(e.x, e.y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(e.x - 12, e.y - 24, 24, 4);
      ctx.fillStyle = '#e5534b'; ctx.fillRect(e.x - 12, e.y - 24, 24 * Math.max(0, e.hp / 50), 4);
      ctx.font = 'bold 10px ' + FONT; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
      ctx.fillText(e.kind === 'fixer' ? 'FIXER' : e.kind === 'don' ? 'DON' : e.kind === 'guard' ? 'GUARD' : 'THUG', e.x, e.y - 30);
    }
    for (const b of s.combat.bullets) {
      ctx.fillStyle = '#ffe66d'; ctx.beginPath(); ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    // Pickups (cash bags / health / smuggled crates).
    for (const pk of s.pickups) {
      if (pk.kind === 'crate') {
        ctx.fillStyle = PALETTE.crate; ctx.fillRect(pk.x - 14, pk.y - 14, 28, 28);
        ctx.strokeStyle = PALETTE.crateEdge; ctx.lineWidth = 3;
        ctx.strokeRect(pk.x - 14, pk.y - 14, 28, 28);
        ctx.beginPath(); ctx.moveTo(pk.x - 14, pk.y - 14); ctx.lineTo(pk.x + 14, pk.y + 14);
        ctx.moveTo(pk.x + 14, pk.y - 14); ctx.lineTo(pk.x - 14, pk.y + 14); ctx.stroke();
        ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 10px ' + FONT; ctx.textAlign = 'center';
        ctx.fillText('CRATE', pk.x, pk.y - 22);
        continue;
      }
      ctx.fillStyle = pk.kind === 'health' ? '#ff6b6b' : '#ffd23f';
      ctx.beginPath(); ctx.arc(pk.x, pk.y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#20242c'; ctx.font = 'bold 12px ' + FONT; ctx.textAlign = 'center';
      ctx.fillText(pk.kind === 'health' ? '+' : '$', pk.x, pk.y - 4);
    }
    // Police roadblocks: striped barricade strung between the two cop cars.
    for (const rb of s.roadblocks || []) {
      const [a, b] = rb.cars;
      if (!a || !b) continue;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      ctx.save(); ctx.translate(mx, my); ctx.rotate(ang);
      for (let i = -2; i <= 2; i++) {
        ctx.fillStyle = i % 2 === 0 ? PALETTE.barricade : '#f4f1e6';
        ctx.fillRect(i * 18, -6, 18, 12);
      }
      ctx.restore();
      ctx.fillStyle = '#ff6b5e'; ctx.font = 'bold 12px ' + FONT; ctx.textAlign = 'center';
      ctx.fillText('ROADBLOCK', mx, my - 26);
    }
    // Player.
    const p = s.player;
    if (!p.inCar) {
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(0, 8, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffcf3f'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#20242c'; ctx.beginPath(); ctx.arc(Math.cos(p.angle) * 7, Math.sin(p.angle) * 7, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.stroke();
      if (s.combat.muzzle > 0) {
        ctx.fillStyle = '#ffe66d';
        ctx.beginPath(); ctx.arc(Math.cos(p.aimAngle ?? p.angle) * 26, Math.sin(p.aimAngle ?? p.angle) * 26, 8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    // Police helicopter circling overhead, spotlight pinned on Rico.
    if (s.heli && s.heli.active) {
      const h = s.heli, p = s.player;
      const pa = Math.atan2(p.y - h.y, p.x - h.x);
      const perp = pa + Math.PI / 2;
      // In the rain the spotlight sweeps side to side (see heli.js), so the
      // beam's pool slides off Rico and back instead of sitting on him.
      const sweep = h.sweep || 0;
      const tx = p.x + Math.cos(perp) * sweep, ty = p.y + Math.sin(perp) * sweep;
      const sg = ctx.createLinearGradient(h.x, h.y, tx, ty);
      sg.addColorStop(0, 'rgba(255,244,180,0.30)');
      sg.addColorStop(1, 'rgba(255,244,180,0.08)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(h.x, h.y);
      ctx.lineTo(tx + Math.cos(perp) * 55, ty + Math.sin(perp) * 55);
      ctx.lineTo(tx - Math.cos(perp) * 55, ty - Math.sin(perp) * 55);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,244,180,0.22)';
      ctx.beginPath(); ctx.arc(tx, ty, 46, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.orbit + Math.PI / 2);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(4, 6, 22, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#42566e'; ctx.beginPath(); ctx.ellipse(0, 0, 20, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c8d4e4'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#2f6fd0'; ctx.fillRect(-34, -3, 18, 6);
      ctx.fillStyle = '#9fd0ff'; ctx.beginPath(); ctx.ellipse(8, 0, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(230,235,240,0.85)'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(h.rotor) * 26, Math.sin(h.rotor) * 26);
      ctx.lineTo(-Math.cos(h.rotor) * 26, -Math.sin(h.rotor) * 26);
      ctx.stroke();
      ctx.restore();
      if (Math.sin(s.time * 6) > 0) {
        ctx.fillStyle = '#ff4b3e';
        ctx.beginPath(); ctx.arc(h.x, h.y - 12, 4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#ff6b5e'; ctx.font = 'bold 11px ' + FONT; ctx.textAlign = 'center';
      ctx.fillText('POLICE HELI', h.x, h.y - 30);
    }
  }
  function drawMinimap(s) {
    const mw = 200, mh = 150, mx = view.w - mw - 16, my = 16;
    const sx = mw / WORLD.width, sy = mh / WORLD.height;
    ctx.save();
    ctx.fillStyle = 'rgba(10,14,20,0.85)'; ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
    ctx.fillStyle = '#3f6b34'; ctx.fillRect(mx, my, mw, mh);
    ctx.fillStyle = '#3a3f46';
    for (const rx of s.city.roadsX) ctx.fillRect(mx + rx * sx - 2, my, 4, mh);
    for (const ry of s.city.roadsY) ctx.fillRect(mx, my + ry * sy, mw, 4);
    ctx.fillStyle = '#2f7fb8'; ctx.fillRect(mx, my + s.city.beach.y * sy, mw, mh - s.city.beach.y * sy);
    // Marina district marking on the minimap.
    if (s.city.marina) {
      const m = s.city.marina;
      ctx.fillStyle = '#2e8f8a'; ctx.fillRect(mx + m.x * sx, my + m.y * sy, m.w * sx, m.h * sy);
      ctx.fillStyle = '#7ee8d8'; ctx.font = 'bold 9px ' + FONT; ctx.textAlign = 'center';
      ctx.fillText('M', mx + (m.x + m.w / 2) * sx, my + (m.y + m.h / 2) * sy - 4);
    }
    // Old Town district marking on the minimap.
    if (s.city.oldTown) {
      const o = s.city.oldTown;
      ctx.fillStyle = '#8f8578'; ctx.fillRect(mx + o.x * sx, my + o.y * sy, o.w * sx, o.h * sy);
      ctx.fillStyle = '#e8b06a'; ctx.font = 'bold 9px ' + FONT; ctx.textAlign = 'center';
      ctx.fillText('OT', mx + (o.x + o.w / 2) * sx, my + (o.y + o.h / 2) * sy - 4);
    }
    const t = s.missionTarget;
    if (t) { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(mx + t.x * sx, my + t.y * sy, 5, 0, Math.PI * 2); ctx.fill(); }
    for (const car of s.cars) if (car.police) { ctx.fillStyle = '#4f8ef7'; ctx.fillRect(mx + car.x * sx - 2, my + car.y * sy - 2, 4, 4); }
    if (s.heli && s.heli.active) {
      ctx.fillStyle = '#ff8a7a';
      ctx.beginPath(); ctx.arc(mx + s.heli.x * sx, my + s.heli.y * sy, 4, 0, Math.PI * 2); ctx.fill();
    }
    const p = s.player;
    const px = p.inCar ? p.inCar.x : p.x, py = p.inCar ? p.inCar.y : p.y;
    ctx.fillStyle = '#ffcf3f'; ctx.beginPath(); ctx.arc(mx + px * sx, my + py * sy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(mx + px * sx, my + py * sy, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  function drawHud(s) {
    const p = s.player;
    ctx.fillStyle = 'rgba(10,14,20,0.82)'; ctx.fillRect(12, 12, 300, 126);
    text('RICO VEGA', 22, 20, 17, '#ffcf3f', 'left', true);
    text(fmtMoney(p.money) + '   SCORE ' + p.score, 22, 44, 16, '#f4f1e6');
    // Health bar.
    ctx.fillStyle = '#333'; ctx.fillRect(22, 68, 180, 12);
    ctx.fillStyle = p.health > 40 ? '#7ee787' : '#ff6b5e';
    ctx.fillRect(22, 68, 180 * Math.max(0, p.health / 100), 12);
    text('HP ' + Math.ceil(p.health), 208, 66, 14, '#f4f1e6');
    // Sprint stamina bar (on foot only): Shift drains it, walking refills it.
    if (!p.inCar) {
      ctx.fillStyle = '#333'; ctx.fillRect(22, 86, 180, 6);
      ctx.fillStyle = p.exhausted ? '#ff9f43' : '#6fc3e8';
      ctx.fillRect(22, 86, 180 * Math.max(0, (p.stamina ?? 100) / 100), 6);
      text(p.exhausted ? 'WINDED' : 'SPRINT', 208, 82, 11, '#c9c4b2');
    }
    // Wanted stars.
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i < p.wanted ? '#ffd23f' : 'rgba(255,255,255,0.25)';
      ctx.font = '26px ' + FONT; ctx.textAlign = 'left';
      ctx.fillText('★', 22 + i * 26, 98);
    }
    if (p.wanted > 0) text(p.wanted >= 3 ? 'POLICE HUNTING YOU' : 'WANTED', 160, 104, 13, '#ff6b5e', 'left', true);
    drawMinimap(s);
    // Objective banner.
    ctx.fillStyle = 'rgba(10,14,20,0.82)';
    const obj = s.objectiveText;
    ctx.fillRect(12, view.h - 96, Math.min(900, 24 + obj.length * 8.4), 44);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(12, view.h - 96, 5, 44);
    text(obj, 28, view.h - 84, 16, '#f4f1e6');
    text(fmtClock(s.clock) + '  ' + phaseName(s.clock).toUpperCase() + '  ' + (s.weather ? weatherLabel(s.weather) : 'CLEAR SKIES') + '  PORTO VERDE', 28, view.h - 62, 12, '#c9c4b2');
    // Speed + controls hint.
    const speed = p.inCar ? Math.round(Math.abs(p.inCar.speed) * 0.55) : 0;
    if (p.inCar) text(speed + ' km/h', view.w - 220, view.h - 60, 26, '#f4f1e6', 'right', true);
    text(p.inCar ? 'WASD drive · E exit · Shift nitro · H headlights · M mute · P pause' : 'WASD walk · Shift sprint · E steal car · Click shoot · Space punch · ENTER mission', view.w - 16, view.h - 28, 13, '#c9c4b2', 'right');
    // Garage prompt + nitro charges.
    if (s.nearGarage && !p.inCar) text('GARAGE — press G to open upgrades', view.w - 16, view.h - 96, 15, '#7ee787', 'right', true);
    if (p.upgrades && p.upgrades.nitro) text('NITRO ×' + (p.upgrades.nitroCharges || 0) + ' (Shift to boost)', view.w - 220, view.h - 88, 14, '#ff9f43', 'right', true);
    // Toast message.
    if (s.toast && s.toastT > 0) {
      ctx.fillStyle = 'rgba(10,14,20,0.85)';
      ctx.fillRect(view.w / 2 - 320, 170, 640, 52);
      text(s.toast, view.w / 2, 186, 17, '#ffd23f', 'center', true);
    }
    // Side job chip.
    if (s.missionState.sideJob) {
      const j = s.missionState.sideJob;
      text('SIDE JOB: ' + j.label + ' — ' + fmtMoney(j.reward) + ' (' + Math.ceil(s.missionState.sideTimer) + 's)', 22, 146, 14, '#7ee787', 'left', true);
    }
  }
  function drawGarage(s) {
    // Canvas-drawn shop panel: upgrade list with prices, owned marks, cash.
    const up = s.player.upgrades;
    ctx.fillStyle = 'rgba(6,10,18,0.72)'; ctx.fillRect(0, 0, view.w, view.h);
    const w = 780, h = 470;
    const x = (view.w - w) / 2, y = (view.h - h) / 2;
    ctx.fillStyle = 'rgba(12,16,24,0.96)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#7ee787'; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
    text('RICO\'S GARAGE — UPGRADES', view.w / 2, y + 24, 30, '#7ee787', 'center', true);
    text('Cash: ' + fmtMoney(s.player.money) + '   ·   Nitro refills free here', view.w / 2, y + 66, 16, '#f4f1e6', 'center');
    s.garageItems.forEach((u, i) => {
      const iy = y + 108 + i * 48;
      const owned = up.owned.includes(u.id);
      const avail = !owned && (!u.needs || up.owned.includes(u.needs));
      const afford = s.player.money >= u.price;
      ctx.fillStyle = i === s.garageSel ? 'rgba(126,231,135,0.18)' : 'rgba(255,255,255,0.04)';
      ctx.fillRect(x + 24, iy - 6, w - 48, 40);
      text((i + 1) + '. ' + u.name + ' — ' + u.desc, x + 40, iy + 4, 16, owned ? '#7ee787' : (avail ? '#f4f1e6' : '#8a8578'));
      text(owned ? 'INSTALLED' : fmtMoney(u.price), x + w - 40, iy + 4, 16, owned ? '#7ee787' : (afford ? '#ffd23f' : '#ff6b5e'), 'right', true);
    });
    text(s.garageMsg || 'Press 1-6 to buy, arrows to choose, G or Esc to leave', view.w / 2, y + h - 58, 16, '#ffd23f', 'center');
    text('Engine and armor apply to every car you drive.', view.w / 2, y + h - 30, 13, '#c9c4b2', 'center');
  }
  function drawPanel(title, lines, prompt, color) {
    ctx.fillStyle = 'rgba(6,10,18,0.72)'; ctx.fillRect(0, 0, view.w, view.h);
    const w = 760, h = 130 + lines.length * 30 + 70;
    const x = (view.w - w) / 2, y = (view.h - h) / 2;
    ctx.fillStyle = 'rgba(12,16,24,0.94)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = color || '#ffd23f'; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
    text(title, view.w / 2, y + 26, 40, color || '#ffd23f', 'center', true);
    lines.forEach((ln, i) => text(ln, view.w / 2, y + 86 + i * 30, 17, '#f4f1e6', 'center'));
    text(prompt, view.w / 2, y + h - 44, 18, '#7ee787', 'center', true);
  }
  function draw(s, screen, best) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0f16'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const p = s.player;
    const cx = p.inCar ? p.inCar.x : p.x, cy = p.inCar ? p.inCar.y : p.y;
    const camX = Math.max(0, Math.min(WORLD.width - 1280, cx - 640));
    const camY = Math.max(0, Math.min(WORLD.height - 720, cy - 360));
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox * view.scale, view.oy * view.scale);
    ctx.save();
    ctx.translate(-camX, -camY);
    // Day lighting tint.
    drawWorld(s);
    drawMarker(s);
    drawEntities(s);
    drawNightLights(s);
    ctx.restore();
    // Sun gradient overlay for the coastal look.
    const g = ctx.createLinearGradient(0, 0, 0, view.h);
    g.addColorStop(0, 'rgba(255,190,90,0.10)'); g.addColorStop(1, 'rgba(255,120,60,0.06)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, view.w, view.h);
    // Night falls over the city: dusk warms it, night darkens it (HUD stays lit).
    const night = skyOverlay(s.clock);
    if (night) { ctx.fillStyle = night; ctx.fillRect(0, 0, view.w, view.h); }
    // Storm clouds darken the sky further, on top of the day/night tint.
    if (s.weather) {
      const sd = stormDarkness(s.weather);
      if (sd > 0) { ctx.fillStyle = 'rgba(10,14,24,' + sd.toFixed(3) + ')'; ctx.fillRect(0, 0, view.w, view.h); }
      // Lightning: a storm flash whites the whole frame for a blink.
      if (s.weather.flash > 0) {
        ctx.fillStyle = 'rgba(255,255,240,' + (s.weather.flash * 0.22).toFixed(3) + ')';
        ctx.fillRect(0, 0, view.w, view.h);
      }
      // Rain streaks and splashes over the world, under the HUD.
      if (isRaining(s.weather)) drawRain(ctx, s.weather, view.w, view.h);
    }
    if (screen === SCREEN_MENU) {
      drawWorldPreview(s);
      drawPanel('PORTO VERDE', [
        'An original open-world crime story. You are Rico Vega, driver-for-hire.',
        'Steal cars, outrun the police, run missions for Mama Luz — and take the city.',
        'WASD move / drive · E steal & exit cars · Mouse aim, click to shoot · Space punch',
        'Missions: 9 story jobs + side jobs · Marina & Old Town, rain and storms, day/night cycle, bikes & garage (G)',
        'Best score: ' + best + '   ·   M mute · P pause',
      ], 'Press ENTER or click to start', '#ffd23f');
      return;
    }
    drawHud(s);
    if (s.garageOpen) { drawGarage(s); return; }
    if (screen === SCREEN_PAUSED) drawPanel('PAUSED', ['The city waits for you, Rico.', 'Your progress is saved.'], 'Press P or ENTER to resume');
    else if (screen === SCREEN_BUSTED) drawPanel('BUSTED!', ['The Porto Verde police caught you. Bail: $150.', 'Your mission progress is kept — try again.'], 'Press ENTER to get out and keep playing', '#4f8ef7');
    else if (screen === SCREEN_WASTED) drawPanel('WASTED', ['Rico went down. The hospital patched him up — $150.', 'Your mission progress is kept — try again.'], 'Press ENTER to get back on the street', '#ff6b5e');
    else if (screen === SCREEN_WIN) drawPanel('KING OF PORTO VERDE', [
      'Story complete! Rico owns the city. Final score: ' + p.score,
      'Money: ' + fmtMoney(p.money) + ' · Crimes: ' + p.crimes + ' · Best: ' + best,
      'Free roam continues — taxi fares, package drops and vigilante jobs still pay.',
    ], 'Press ENTER to keep playing in free roam', '#7ee787');
  }
  function drawWorldPreview(s) {
    // Menu backdrop: the city drawn behind the panel (camera fixed on plaza).
    ctx.save();
    ctx.translate(-900, -700);
    drawWorld(s);
    drawEntities(s);
    ctx.restore();
  }
  return { draw, view };
}
