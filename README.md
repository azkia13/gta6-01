# Porto Verde — Open-World Crime Game

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/azkia13/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/azkia13/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game for the make.fun **gta6-01** bounty — built from scratch in plain Canvas/JavaScript, no libraries, no network requests, no borrowed assets.

You are **Rico Vega**, a driver-for-hire pulled back into the fixer game in the sunny coastal city of **Porto Verde**. Run seven story missions for Mama Luz — from the pier package to the Marina smuggling crates and a final showdown with the fixer — steal cars, outrun the Porto Verde police, take taxi fares and package drops on the side, tune your ride at the garage — and become King of Porto Verde.

## What's in the game

- **Open city** — road grid, building blocks, parks, plaza, hospital, beach and pier districts, Marina district with docks, moored boats and warehouses, day/night cycle with dusk and dawn light
- **On foot + driving** — walk/run, steal parked and traffic cars (E), ride motorcycles (faster launch, sharper turn), drive with real physics, nitro boost (Shift) once fitted
- **Traffic & pedestrians** — cars follow the roads, pedestrians wander and flee from danger, dockworkers stroll the Marina
- **Wanted level (1–5 stars)** — rises on theft, hitting pedestrians and fights; police cars chase, ram (PIT-style at 4+ stars) and arrest; roadblocks at 3+ stars, up to 4 pursuit cars at 5 stars; at 5 stars a police helicopter circles overhead with a spotlight and your heat cools four times slower; heat decays when you hide
- **Headlights & lamps** — after dark every moving car throws a headlight cone and the street lamps at the junctions pool light; the HUD clock shows the time of day (dawn / day / dusk / night)
- **Story missions (7)** — package runs, car theft, a market shakedown, a police getaway, the fixer slipping the net, smuggled crates at the Marina, and a final showdown with the fixer — with dialogue, markers, rewards
- **Garage upgrades** — press G at the garage (700,500) to buy Engine Mk I/II, Armor, and a Nitro kit with cash; upgrades persist in your save, nitro refills free at the garage
- **Side jobs** — taxi fares and package drops that pay cash
- **Combat** — mouse-aimed shooting, punching, enemy thugs who shoot back
- **HUD** — health, money, score, wanted stars, mission objective, clock, speed, and a live minimap
- **Win / lose** — finish the final mission to become King of Porto Verde; get busted or wasted and restart from your save
- **Sound** — fully synthesised WebAudio (engine hum, sirens, gunshots, pickup blips); M to mute, P to pause
- **Save** — progress autosaves to localStorage; press C on the menu to continue

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk / drive |
| Shift | Run / nitro boost (when fitted) |
| E | Steal / enter car, exit car |
| G (near garage) | Open the garage upgrade shop |
| Mouse + click | Aim and shoot |
| Space | Punch |
| Enter | Start mission / confirm |
| P / Esc | Pause |
| M | Mute |
| C (on menu) | Continue from save |

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Node 22+ and a desktop browser. No build step, no dependencies.

## Structure

- `game/src/config.js` — tuning, palette, seeded RNG
- `game/src/daynight.js` — day/night cycle, sky tint, headlight cones, street lamps
- `game/src/heli.js` — police helicopter at 5 wanted stars (orbit + spotlight)
- `game/src/world.js` — city generation and collisions
- `game/src/player.js` — Rico on foot, car entry, wanted heat
- `game/src/vehicles.js` — traffic AI, police pursuit, driving physics
- `game/src/pedestrians.js` — pedestrian AI
- `game/src/missions.js` — story missions and side jobs
- `game/src/combat.js` — shooting, punching, enemy thugs
- `game/src/audio.js` — synthesised WebAudio sound
- `game/src/render.js` — camera, city, HUD, minimap, menus
- `game/src/input.js` — keyboard + mouse
- `game/src/garage.js` — garage shop, upgrade catalogue, engine/armor/nitro effects
- `game/src/main.js` — boot, loop, screens, save/load, screenshot staging

MIT licensed. All city, character and story names are original.
