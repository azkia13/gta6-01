# Porto Verde — Open-World Crime Game

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/azkia13/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/azkia13/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game for the make.fun **gta6-01** bounty — built from scratch in plain Canvas/JavaScript, no libraries, no network requests, no borrowed assets.

You are **Rico Vega**, a driver-for-hire pulled back into the fixer game in the sunny coastal city of **Porto Verde**. Run nine story missions for Mama Luz — from the pier package to the Marina smuggling crates, a storm-soaked stash run through Old Town, and a final showdown with the Don over his ledger — steal cars, outrun the Porto Verde police, take taxi fares and package drops on the side, tune your ride at the garage — and become King of Porto Verde.

## What's in the game

- **Open city** — road grid, building blocks, parks, plaza, hospital, beach and pier districts, Marina district with docks, moored boats and warehouses, Old Town district with a cobbled plaza, church and brick lanes, day/night cycle with dusk and dawn light
- **Weather** — clear skies, drizzle, rain and storms roll across the city; rain makes the roads slick (less grip, shorter sight) and storms throw lightning across the night sky, with rain ambience in the sound
- **On foot + driving** — walk/run with sprint stamina (Shift drains it, walking refills it), steal parked and traffic cars (E), ride motorcycles (faster launch, sharper turn), drive a slow-but-tough van, drive with real physics, nitro boost (Shift) once fitted
- **Traffic & pedestrians** — cars follow the roads, pedestrians wander and flee from danger (and put umbrellas up in the rain), dockworkers stroll the Marina
- **Wanted level (1–5 stars)** — rises on theft, hitting pedestrians and fights; police cars chase, ram (PIT-style at 4+ stars) and arrest; roadblocks at 3+ stars, up to 4 pursuit cars at 5 stars; at 5 stars a police helicopter circles overhead with a spotlight and your heat cools four times slower; heat decays when you hide
- **Headlights & lamps** — after dark every moving car throws a headlight cone and the street lamps at the junctions pool light; press H to switch Rico's headlights on any time (a storm darkens the sky further on top of the night); the HUD clock shows the time of day (dawn / day / dusk / night) and a weather chip shows the sky
- **Story missions (9)** — package runs, car theft, a market shakedown, a police getaway, the fixer slipping the net, smuggled crates at the Marina, a final showdown with the fixer, a storm-soaked stash run in Old Town, and the finale against the Don and his ledger — with dialogue, markers, rewards
- **Garage upgrades** — press G at the garage (700,500) to buy Engine Mk I/II, Armor, a Nitro kit, and Rain Tires ($700, keep half the grip the rain steals) with cash; upgrades persist in your save, nitro refills free at the garage
- **Side jobs** — taxi fares (pick the fare up where they stand, drop them at the marker against the clock), package drops, and vigilante jobs (wreck a marked thug car by ramming it at speed or shooting it up) that pay cash
- **Combat** — mouse-aimed shooting, punching, enemy thugs who shoot back
- **HUD** — health, money, score, wanted stars, mission objective, clock, speed, and a live minimap
- **Win / lose** — finish the final mission to become King of Porto Verde; get busted or wasted and restart from your save
- **Sound** — fully synthesised WebAudio (engine hum, sirens, gunshots, pickup blips); M to mute, P to pause
- **Save** — progress autosaves to localStorage; press C on the menu to continue

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk / drive |
| Shift | Sprint on foot (drains stamina) / nitro boost in a car (when fitted) |
| H | Toggle headlights |
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
- `game/src/weather.js` — rain and storm states, grip/visibility, lightning, rain rendering
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
